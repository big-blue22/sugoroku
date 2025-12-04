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
