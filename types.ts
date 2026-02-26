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
}
