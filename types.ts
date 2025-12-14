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
  BATTLE = 'BATTLE',
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
  gold: number; // Player's gold/currency
}

// Monster Definition
export interface Monster {
  name: string;
  hp: number;
  attack: number; // Number of tiles to move back on defeat
  goldReward: number;
  emoji: string;
  isSpecialAttack?: boolean; // For special attack calculation (e.g., Killer Machine)
}

// Battle State (Regular Monsters)
export interface BattleState {
  isActive: boolean;
  monster: Monster | null;
  playerRoll: number | null;
  result: 'pending' | 'victory' | 'defeat' | null;
  goldEarned: number;
  tilesBack: number;
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

// --- Boss Battle Types ---
export interface BossState {
  currentHp: number;
  maxHp: number;
  isDefeated: boolean;
  isSkaraActive: boolean; // 0.5x damage taken
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
  currentEvent: GameEvent | null;
  latestPopup?: { message: string; type: PopupType; timestamp: number } | null;

  // Battle State
  battleState?: BattleState | null;

  // Boss State (Global Persistence)
  bossState?: BossState;

  // Logs
  lastLog: string | null; // Latest log message to append
  lastLogTimestamp: number;
}
