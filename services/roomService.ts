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
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { RoomState, Player, GamePhase, INITIAL_PLAYER_STATS, RaidState, RaidParticipant, PlayerCommand } from '../types';
import { MonsterDef } from '../data/monsters';
import { initRaidBoss, processRaidRound } from './raidEngine';

const ROOMS_COLLECTION = 'rooms';
const ROOM_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours (2 days)

const cleanupExpiredRooms = async () => {
  try {
    const cutoff = Date.now() - ROOM_TTL_MS;
    const roomsRef = collection(db, ROOMS_COLLECTION);
    const q = query(roomsRef, where("createdAt", "<", cutoff), limit(400));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as RoomState;
      const lastActivity = data.lastActivityAt || data.createdAt;
      if (lastActivity < cutoff) {
        batch.delete(docSnap.ref);
      }
    });

    await batch.commit();
    console.log(`Cleaned up expired rooms.`);
  } catch (error) {
    console.error("Failed to cleanup expired rooms:", error);
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

export const createRoom = async (hostPlayerConfig: Omit<Player, 'id' | 'position' | 'isWinner' | 'stats'>): Promise<{ roomId: string, playerId: number }> => {
  // Trigger cleanup asynchronously
  cleanupExpiredRooms();

  const roomId = generateRoomId();
  const playerId = 0; // Host is always ID 0

  const hostPlayer: Player = {
    id: playerId,
    ...hostPlayerConfig,
    position: 0,
    isWinner: false,
    stats: { ...INITIAL_PLAYER_STATS },
  };

  const initialRoomState: RoomState = {
    id: roomId,
    hostId: hostPlayer.name,
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

export const joinRoom = async (roomId: string, playerConfig: Omit<Player, 'id' | 'position' | 'isWinner' | 'stats'>): Promise<{ playerId: number } | null> => {
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
    stats: { ...INITIAL_PLAYER_STATS },
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
  const nextIndex = (activeIndex + 1) % currentPlayers.length;

  const updates: Partial<RoomState> = {
    players: currentPlayers,
    activePlayerIndex: nextIndex,
    diceValue: null,
    lastLog: `👉 ${currentPlayers[nextIndex].name} のターンです。`,
    lastLogTimestamp: Date.now(),
    lastActivityAt: Date.now(),
    latestPopup: {
      message: `👉 ${currentPlayers[nextIndex].name} のターンです。`,
      type: 'info',
      timestamp: Date.now()
    }
  };

  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), updates);
};

// --- Raid Functions ---
export const joinRaid = async (roomId: string, tileId: number, monster: MonsterDef, player: Player) => {
    const roomRef = doc(db, 'rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return;

        const state = roomDoc.data() as RoomState;

        if (!state.activeRaids) state.activeRaids = {};
        if (!state.defeatedBosses) state.defeatedBosses = [];

        if (state.defeatedBosses.includes(tileId)) return; // Already dead

        let raid = state.activeRaids[tileId];
        if (!raid) {
            raid = {
                tileId,
                bossState: initRaidBoss(monster),
                participants: {},
                round: 1,
                status: 'WAITING_FOR_COMMANDS',
                logs: [`${monster.name} が現れた！`],
                turnOrder: []
            };
            state.activeRaids[tileId] = raid;
        }

        if (!raid.participants[player.id]) {
            raid.participants[player.id] = {
                playerId: player.id,
                hp: player.stats.hp,
                mp: player.stats.mp,
                stats: player.stats,
                buffs: {
                    defStage: 0, atkStage: 0, magicBarrier: 0, fubaha: 0,
                    sleep: false, sleepTurns: 0, manusa: false, manusaTurns: 0,
                    stun: false, magicAwaken: false, magicAwakenTurns: 0,
                    charge: false, chargeTurns: 0, eerieLight: 0, eerieLightTurns: 0,
                    saika: false, saikaTurns: 0, spellSeal: false, spellSealTurns: 0,
                    banished: false, banishedTurns: 0
                },
                command: null,
                cp: 0,
                isDead: player.stats.hp <= 0
            };
            raid.logs.push(`${player.name} が戦闘に参加した！`);
        }

        transaction.update(roomRef, { activeRaids: state.activeRaids });
    });
};

export const submitRaidCommand = async (roomId: string, tileId: number, playerId: number, command: PlayerCommand) => {
    const roomRef = doc(db, 'rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return;

        const state = roomDoc.data() as RoomState;
        const raid = state.activeRaids?.[tileId];
        if (!raid || raid.status !== 'WAITING_FOR_COMMANDS') return;

        const participant = raid.participants[playerId];
        if (participant && !participant.isDead) {
            participant.command = command;
            transaction.update(roomRef, { [`activeRaids.${tileId}`]: raid });
        }
    });
};

export const processRaidTurnIfNeeded = async (roomId: string, tileId: number, monster: MonsterDef, allPlayers: Player[]) => {
    const roomRef = doc(db, 'rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return;

        const state = roomDoc.data() as RoomState;
        const raid = state.activeRaids?.[tileId];
        if (!raid || raid.status !== 'WAITING_FOR_COMMANDS') return;

        // Check if all ALIVE participants have submitted commands
        const participants = Object.values(raid.participants);
        const aliveParticipants = participants.filter(p => !p.isDead && !p.buffs.banished);

        if (aliveParticipants.length === 0) {
            raid.status = 'DEFEAT';
            transaction.update(roomRef, { [`activeRaids.${tileId}`]: raid });
            return;
        }

        const allSubmitted = aliveParticipants.every(p => p.command !== null);

        if (allSubmitted) {
            raid.status = 'CALCULATING';
            const { newRaid, roundLogs } = processRaidRound(raid, monster, allPlayers);
            newRaid.logs = [...newRaid.logs, ...roundLogs];

            // Keep logs capped
            if (newRaid.logs.length > 50) newRaid.logs = newRaid.logs.slice(-50);

            transaction.update(roomRef, { [`activeRaids.${tileId}`]: newRaid });
        }
    });
};

export const finalizeRaid = async (roomId: string, tileId: number, raidState: RaidState, playersToUpdate: Player[]) => {
    const roomRef = doc(db, 'rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) return;

        const state = roomDoc.data() as RoomState;
        if (!state.activeRaids) return;

        delete state.activeRaids[tileId];

        if (raidState.status === 'VICTORY') {
            if (!state.defeatedBosses) state.defeatedBosses = [];
            state.defeatedBosses.push(tileId);
        }

        transaction.update(roomRef, {
            activeRaids: state.activeRaids,
            defeatedBosses: state.defeatedBosses,
            players: playersToUpdate
        });
    });
};
