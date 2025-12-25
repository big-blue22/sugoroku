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
import { BELIAL_CONFIG } from './bossService';

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

export const createRoom = async (hostPlayerConfig: Omit<Player, 'id' | 'position' | 'turnSkipCount' | 'isWinner' | 'gold' | 'sealTurns' | 'items'>): Promise<{ roomId: string, playerId: number }> => {
  // Trigger cleanup asynchronously
  cleanupExpiredRooms();

  const roomId = generateRoomId();
  const playerId = 0; // Host is always ID 0

  const hostPlayer: Player = {
    id: playerId,
    ...hostPlayerConfig,
    position: 0,
    turnSkipCount: 0,
    sealTurns: 0,
    items: [],
    isWinner: false,
    gold: 0
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
    currentEvent: null,
    bossState: {
      type: 'BELIAL', // Default boss to ensure type is set
      currentHp: 20,
      maxHp: 20,
      isDefeated: false,
      isSkaraActive: false,
      logs: []
    },
    lastLog: `🏁 ルーム ${roomId} が作成されました！`,
    lastLogTimestamp: Date.now()
  };

  // Create the room document
  await setDoc(doc(db, ROOMS_COLLECTION, roomId), initialRoomState);

  return { roomId, playerId };
};

export const joinRoom = async (roomId: string, playerConfig: Omit<Player, 'id' | 'position' | 'turnSkipCount' | 'isWinner' | 'gold' | 'sealTurns' | 'items'>): Promise<{ playerId: number } | null> => {
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
    turnSkipCount: 0,
    sealTurns: 0,
    items: [],
    isWinner: false,
    gold: 0
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

  // Logic:
  // 1. Decrement sealTurns for the PREVIOUS player (the one who just finished)
  //    This represents the passage of time for their personal effects.
  let updatedPlayers = [...currentPlayers];

  if ((updatedPlayers[activeIndex].sealTurns || 0) > 0) {
      const prevSeal = updatedPlayers[activeIndex].sealTurns;
      updatedPlayers[activeIndex] = {
          ...updatedPlayers[activeIndex],
          sealTurns: prevSeal - 1
      };
      // Note: If sealTurns was 1, it is now 0 (Free).
      // If sealTurns was 2 (Just applied by boss), it is now 1 (Sealed for next turn).
  }

  // Check if the NEW active player (nextIndex) needs to skip
  // If turnSkipCount > 0, we decrement it and skip them.
  // We might need to loop if multiple people are skipping.

  let loopCount = 0;
  let skippedLog = "";

  while (loopCount < updatedPlayers.length) {
      nextPlayer = updatedPlayers[nextIndex];

      // Migrate old bool to new number if needed (backward compat)
      if (nextPlayer.skipNextTurn) {
          nextPlayer.turnSkipCount = (nextPlayer.turnSkipCount || 0) + 1;
          nextPlayer.skipNextTurn = false;
      }

      if ((nextPlayer.turnSkipCount || 0) > 0) {
          // Decrement and Skip
          updatedPlayers[nextIndex] = {
              ...nextPlayer,
              turnSkipCount: nextPlayer.turnSkipCount - 1
          };

          skippedLog = `🚫 ${nextPlayer.name} は眠っています... (残り${updatedPlayers[nextIndex].turnSkipCount}回)`;

          // Move to next
          nextIndex = (nextIndex + 1) % updatedPlayers.length;
          loopCount++;
      } else {
          // Found a valid player
          break;
      }
  }

  // Final update
  const updates: Partial<RoomState> = {
      players: updatedPlayers,
      activePlayerIndex: nextIndex,
      diceValue: null,
      lastLog: skippedLog ? `${skippedLog} 次は ${updatedPlayers[nextIndex].name} の番です。` : `👉 ${updatedPlayers[nextIndex].name} のターンです。`,
      lastLogTimestamp: Date.now(),
      lastActivityAt: Date.now()
  };

  // Add Popup only if it's a normal turn change
  if (!skippedLog) {
      updates.latestPopup = {
          message: `👉 ${updatedPlayers[nextIndex].name} のターンです。`,
          type: 'info',
          timestamp: Date.now()
      };
  }

  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), updates);
};
