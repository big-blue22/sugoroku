export enum TileType {
  START = 'START',
  NORMAL = 'NORMAL',
  GOOD = 'GOOD',
  BAD = 'BAD',
  EVENT = 'EVENT', // AI Generated Event
  GOAL = 'GOAL'
}

export enum GamePhase {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  EVENT_PROCESSING = 'EVENT_PROCESSING',
  GAME_OVER = 'GAME_OVER'
}

export type PopupType = 'info' | 'success' | 'danger' | 'event';

export interface Player {
  id: number;
  name: string;
  color: string; // Tailwind color class prefix e.g. 'red'
  avatar: string; // Emoji
  position: number;
  skipNextTurn: boolean;
  isWinner: boolean;
}

export interface Tile {
  id: number;
  type: TileType;
  label?: string;
  effectValue?: number; // e.g., +3 or -2
}

export interface GameEvent {
  title: string;
  description: string;
  effectType: 'MOVE_FORWARD' | 'MOVE_BACK' | 'SKIP_TURN' | 'NOTHING';
  value: number;
}

// --- Firebase / Multiplayer Types ---

export interface RoomState {
  id: string; // Room Code (e.g. "ABCD")
  hostId: string; // ID of the player who created the room (for "Start Game" permission)
  status: 'WAITING' | 'PLAYING';
  createdAt: number;

  // Game State (Synced)
  players: Player[];
  activePlayerIndex: number;
  phase: GamePhase;

  // Action Syncing
  diceValue: number | null;
  diceRollCount: number; // Increment to trigger animation on clients
  currentEvent: GameEvent | null;
  latestPopup?: { message: string; type: PopupType; timestamp: number } | null;

  // Logs
  lastLog: string | null; // Latest log message to append
  lastLogTimestamp: number;
}
