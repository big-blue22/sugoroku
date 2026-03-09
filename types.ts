// --- Tile Types (from BoardConfig_v1) ---
export enum TileType {
  VILLAGE = 'VILLAGE',
  BOSS = 'BOSS',
  MONSTER = 'MONSTER',
  TREASURE = 'TREASURE',
  TRAP = 'TRAP',
  EMPTY = 'EMPTY',
  CASINO = 'CASINO',
}

export enum GamePhase {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export type PopupType = 'info' | 'success' | 'danger' | 'event';

// --- Player ---
export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  int: number;
  level: number;
  exp: number;
  gold: number;
  sp: number; // Stat Points for allocation
}

export const INITIAL_PLAYER_STATS: PlayerStats = {
  hp: 40,
  maxHp: 40,
  mp: 12,
  maxMp: 12,
  atk: 14,
  def: 22,
  spd: 14,
  int: 12,
  level: 1,
  exp: 0,
  gold: 0,
  sp: 0,
};

export interface Player {
  id: number;
  name: string;
  color: string;
  avatar: string;
  position: number;
  isWinner: boolean;
  stats: PlayerStats;
}

export interface Tile {
  id: number;
  type: TileType;
  zone: string;
  zoneName: string;
  label: string;
  meta?: {
    forced?: boolean;
    bossName?: string;
  };
}

// --- Firebase / Multiplayer Types ---

export interface RoomState {
  id: string;
  hostId: string;
  status: 'WAITING' | 'PLAYING';
  createdAt: number;
  lastActivityAt?: number;

  // Game State (Synced)
  players: Player[];
  activePlayerIndex: number;
  phase: GamePhase;

  // Action Syncing
  diceValue: number | null;
  diceRollCount: number;
  latestPopup?: { message: string; type: PopupType; timestamp: number } | null;

  // Logs
  lastLog: string | null;
  lastLogTimestamp: number;

  // Raid State
  activeRaids?: Record<number, RaidState>; // Key is tileId
  defeatedBosses?: number[]; // Array of tileIds
}


// --- Raid (Multiplayer Boss) Types ---
export interface BuffState {
    defStage: number; // -2 to +2
    atkStage: number; // 0 to +2
    magicBarrier: number; // 0, 1, 2
    fubaha: number; // 0, 1, 2
    sleep: boolean;
    sleepTurns: number;
    manusa: boolean;
    manusaTurns: number;
    stun: boolean;
    magicAwaken: boolean;
    magicAwakenTurns: number;
    charge: boolean; // Next physical attack x2
    chargeTurns: number;
    eerieLight: number; // 0, 1, 2 (stage of magic vulnerability)
    eerieLightTurns: number;
    saika: boolean; // 1.2x damage taken
    saikaTurns: number;
    spellSeal: boolean; // Black mist
    spellSealTurns: number;
    banished: boolean; // Bashirura
    banishedTurns: number;
}

export interface PlayerCommand {
    type: 'attack' | 'spell' | 'item' | 'defend';
    spellId?: string;
    itemId?: string;
    targetId?: string; // 'boss' or playerId
}

export interface RaidParticipant {
    playerId: number;
    hp: number;
    mp: number;
    stats: PlayerStats; // snapshot or reference
    buffs: BuffState;
    command: PlayerCommand | null;
    cp: number; // Contribution points
    isDead: boolean;
}

export interface RaidBossState {
    id: string; // e.g. 'z1_boss'
    hp: number;
    maxHp: number;
    buffs: BuffState;
    lastActionId: string | null;
    consecutiveActionCount: number;
    phase: 'A' | 'B';
    actionHistory: string[]; // for tracking cycle rules like every_3_boss_actions
}

export interface RaidState {
    tileId: number; // Which tile this raid is happening on
    bossState: RaidBossState;
    participants: Record<number, RaidParticipant>;
    round: number;
    status: 'WAITING_FOR_PLAYERS' | 'WAITING_FOR_COMMANDS' | 'CALCULATING' | 'VICTORY' | 'DEFEAT' | 'TRANSITIONING';
    logs: string[];
    turnOrder: number[]; // Array of playerIds + 'boss' indicating execution order
}
