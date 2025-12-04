import { TileType } from './types';

export const BOARD_SIZE = 30;

export const PLAYER_COLORS = [
  { name: '赤', class: 'red', hex: '#ef4444' },
  { name: '青', class: 'blue', hex: '#3b82f6' },
  { name: '緑', class: 'green', hex: '#22c55e' },
  { name: '黄', class: 'yellow', hex: '#eab308' },
];

export const AVATARS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐯', '🦄'];

// A fixed board layout for consistency, but could be randomized
export const BOARD_LAYOUT: TileType[] = [
  TileType.START,
  TileType.NORMAL,
  TileType.NORMAL,
  TileType.GOOD,
  TileType.NORMAL,
  TileType.BAD,    // 5
  TileType.NORMAL,
  TileType.EVENT,
  TileType.NORMAL,
  TileType.GOOD,
  TileType.NORMAL, // 10
  TileType.BAD,
  TileType.EVENT,
  TileType.NORMAL,
  TileType.NORMAL,
  TileType.GOOD,   // 15
  TileType.NORMAL,
  TileType.EVENT,
  TileType.BAD,
  TileType.NORMAL,
  TileType.NORMAL, // 20
  TileType.EVENT,
  TileType.GOOD,
  TileType.BAD,
  TileType.NORMAL,
  TileType.EVENT,  // 25
  TileType.BAD,
  TileType.GOOD,
  TileType.NORMAL,
  TileType.GOAL
];