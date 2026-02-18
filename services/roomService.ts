import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  limit,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { RoomState, Player, GamePhase } from '../types';

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

export const createRoom = async (hostPlayerConfig: Omit<Player, 'id' | 'position' | 'isWinner'>): Promise<{ roomId: string, playerId: number }> => {
  // Trigger cleanup asynchronously
  cleanupExpiredRooms();

  const roomId = generateRoomId();
  const playerId = 0; // Host is always ID 0

  const hostPlayer: Player = {
    id: playerId,
    ...hostPlayerConfig,
    position: 0,
    isWinner: false,
  };

  const initialRoomState: RoomState = {
    id: roomId,
    hostId: hostPlayer.name, // Using name as ID for simplicity in this scope
    status: 'WAITING',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    players: [hostPlayer],
    activePlayerIndex: 0,
    phase: GamePhase.SETUP,
    diceValue: null,
    diceRollCount: 0,
    lastLog: `🏁 ルーム ${roomId} が作成されました！`,
    lastLogTimestamp: Date.now()
  };

  // Create the room document
  await setDoc(doc(db, ROOMS_COLLECTION, roomId), initialRoomState);

  return { roomId, playerId };
};

export const joinRoom = async (roomId: string, playerConfig: Omit<Player, 'id' | 'position' | 'isWinner'>): Promise<{ playerId: number } | null> => {
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
    isWinner: false,
  };

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
  // Move to next player index
  let nextIndex = (activeIndex + 1) % currentPlayers.length;
  let nextPlayer = currentPlayers[nextIndex];

  // Final update
  const updates: Partial<RoomState> = {
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

  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), updates);
};
