export enum TileType {
  START = 'START',
  NORMAL = 'NORMAL',
  GOAL = 'GOAL'
}

export enum GamePhase {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export type PopupType = 'info' | 'success' | 'danger' | 'event';

export interface Player {
  id: number;
  name: string;
  color: string; // Tailwind color class prefix e.g. 'red'
  avatar: string; // Emoji
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
  id: string; // Room Code (e.g. "ABCD")
  hostId: string; // ID of the player who created the room (for "Start Game" permission)
  status: 'WAITING' | 'PLAYING';
  createdAt: number;
  lastActivityAt?: number; // Last activity timestamp for TTL management

  // Game State (Synced)
  players: Player[];
  activePlayerIndex: number;
  phase: GamePhase;

  // Action Syncing
  diceValue: number | null;
  diceRollCount: number; // Increment to trigger animation on clients
  latestPopup?: { message: string; type: PopupType; timestamp: number } | null;

  // Logs
  lastLog: string | null; // Latest log message to append
  lastLogTimestamp: number;
}
