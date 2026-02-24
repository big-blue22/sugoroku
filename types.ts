export const TileType = {
  START: 'START',
  NORMAL: 'NORMAL',
  GOAL: 'GOAL'
} as const;
export type TileType = typeof TileType[keyof typeof TileType];

export const GamePhase = {
  SETUP: 'SETUP',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER'
} as const;
export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

export type PopupType = 'info' | 'success' | 'danger' | 'event';

export interface Player {
  id: number;
  name: string;
  color: string;
  avatar: string;
  position: number;
  isWinner: boolean;
}

export interface Tile {
  id: number;
  type: TileType;
  label?: string;
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
