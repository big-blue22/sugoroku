import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  serverTimestamp,
  query,
  where,
  limit,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { RoomState, Player, GamePhase, GameEvent } from '../types';
import { BOARD_LAYOUT } from '../constants';

const ROOMS_COLLECTION = 'rooms';
const ROOM_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours (2 days)

const cleanupExpiredRooms = async () => {
  try {
    const cutoff = Date.now() - ROOM_TTL_MS;
    const roomsRef = collection(db, ROOMS_COLLECTION);
    // Limit to 400 to respect Firestore batch limit of 500
    const q = query(roomsRef, where("createdAt", "<", cutoff), limit(400));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as RoomState;
      // Use lastActivityAt if available, otherwise fall back to createdAt
      const lastActivity = data.lastActivityAt || data.createdAt;
      if (lastActivity < cutoff) {
        batch.delete(docSnap.ref);
      }
    });

    await batch.commit();
    console.log(`Cleaned up expired rooms.`);
  } catch (error) {
    console.error("Failed to cleanup expired rooms:", error);
    // Suppress error so it doesn't break room creation
  }
};

// Generate a random 4-character room code
const generateRoomId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createRoom = async (hostPlayerConfig: Omit<Player, 'id' | 'position' | 'skipNextTurn' | 'isWinner' | 'gold'>): Promise<{ roomId: string, playerId: number }> => {
  // Trigger cleanup asynchronously
  cleanupExpiredRooms();

  const roomId = generateRoomId();
  const playerId = 0; // Host is always ID 0

  const hostPlayer: Player = {
    id: playerId,
    ...hostPlayerConfig,
    position: 0,
    skipNextTurn: false,
    isWinner: false,
    gold: 0
  };

  const initialRoomState: RoomState = {
    id: roomId,
    hostId: hostPlayer.name, // Using name as ID for simplicity in this scope, or we could generate a UUID
    status: 'WAITING',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    players: [hostPlayer],
    activePlayerIndex: 0,
    phase: GamePhase.SETUP,
    diceValue: null,
    diceRollCount: 0,
    currentEvent: null,
    bossState: {
      currentHp: 20,
      maxHp: 20,
      isDefeated: false,
      isSkaraActive: false
    },
    lastLog: `🏁 ルーム ${roomId} が作成されました！`,
    lastLogTimestamp: Date.now()
  };

  // Create the room document
  await setDoc(doc(db, ROOMS_COLLECTION, roomId), initialRoomState);

  return { roomId, playerId };
};

export const joinRoom = async (roomId: string, playerConfig: Omit<Player, 'id' | 'position' | 'skipNextTurn' | 'isWinner' | 'gold'>): Promise<{ playerId: number } | null> => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error("ルームが見つかりません");
  }

  const roomData = roomSnap.data() as RoomState;

  if (roomData.status !== 'WAITING') {
    throw new Error("ゲームは既に開始されています");
  }

  const newPlayerId = roomData.players.length;
  const newPlayer: Player = {
    id: newPlayerId,
    ...playerConfig,
    position: 0,
    skipNextTurn: false,
    isWinner: false,
    gold: 0
  };

  // Add player to the array
  // Note: Race conditions are possible here if 2 join exactly at once without transactions.
  // For this scale, arrayUnion might not work for complex objects if not exact match,
  // so we read-modify-write or use update with full list.
  // Safe approach for simple object array: Read, Append, Update.

  const updatedPlayers = [...roomData.players, newPlayer];

  await updateDoc(roomRef, {
    players: updatedPlayers,
    lastLog: `👋 ${newPlayer.name} が参加しました！`,
    lastLogTimestamp: Date.now(),
    lastActivityAt: Date.now()
  });

  return { playerId: newPlayerId };
};

export const subscribeToRoom = (roomId: string, onUpdate: (data: RoomState) => void) => {
  return onSnapshot(doc(db, ROOMS_COLLECTION, roomId), (doc) => {
    if (doc.exists()) {
      onUpdate(doc.data() as RoomState);
    }
  });
};

export const startGame = async (roomId: string) => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, {
    status: 'PLAYING',
    phase: GamePhase.PLAYING,
    lastLog: "🏁 ゲーム開始！冒険の始まりです！",
    lastLogTimestamp: Date.now(),
    lastActivityAt: Date.now()
  });
};

export const updateGameState = async (roomId: string, updates: Partial<RoomState>) => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, { ...updates, lastActivityAt: Date.now() });
};

// Helper for "Next Turn" logic (call from Active Player client)
export const nextTurn = async (roomId: string, currentPlayers: Player[], activeIndex: number) => {
  let nextIndex = (activeIndex + 1) % currentPlayers.length;
  let nextPlayer = currentPlayers[nextIndex];

  let updates: Partial<RoomState> = {};

  if (nextPlayer.skipNextTurn) {
    // Reset skip flag
    const updatedPlayers = currentPlayers.map((p, i) => i === nextIndex ? { ...p, skipNextTurn: false } : p);
    updates = {
        players: updatedPlayers,
        lastLog: `🚫 ${nextPlayer.name} は休みです。`,
        lastLogTimestamp: Date.now()
    };

    // Recursive or multi-step?
    // Simply setting the log and update is enough, then we need to actually skip them.
    // However, handling "Double Skip" requires a loop.
    // For simplicity: If skipped, we set them to un-skipped, notify, and pass turn to NEXT immediately?
    // Or just let the UI handle the "Skip" message and then the HOST/Client calls nextTurn AGAIN?
    // Better: Handle it in one go if possible, but async delay is nice for UI.
    // Let's just set the updates to "Skip Phase" and let the client auto-advance after delay?
    // No, stateless is better.

    // If skipped, we move to the ONE AFTER.
    let actualNextIndex = (nextIndex + 1) % currentPlayers.length;

    updates = {
        players: updatedPlayers, // Saved the "skip used" state
        activePlayerIndex: actualNextIndex,
        diceValue: null,
        lastLog: `🚫 ${nextPlayer.name} は休みです。次は ${currentPlayers[actualNextIndex].name} の番です。`,
        lastLogTimestamp: Date.now(),
        lastActivityAt: Date.now()
    };

  } else {
    updates = {
        activePlayerIndex: nextIndex,
        diceValue: null,
        lastLog: `👉 ${nextPlayer.name} のターンです。`,
        lastLogTimestamp: Date.now(),
        lastActivityAt: Date.now(),
        latestPopup: {
          message: `👉 ${nextPlayer.name} のターンです。`,
          type: 'info',
          timestamp: Date.now()
        }
    };
  }

  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), updates);
};
