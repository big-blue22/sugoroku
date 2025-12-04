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

// Snake pattern coordinates (x, y)
// 0,0  1,0  2,0  3,0  4,0  5,0  6,0
//                                |
// 0,1  1,1  2,1  3,1  4,1  5,1  6,1
// |
// 0,2 ...
export const BOARD_COORDINATES = [
  // Row 0 (Right)
  {x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 4, y: 0}, {x: 5, y: 0}, {x: 6, y: 0},
  // Row 1 (Left)
  {x: 6, y: 1}, {x: 5, y: 1}, {x: 4, y: 1}, {x: 3, y: 1}, {x: 2, y: 1}, {x: 1, y: 1}, {x: 0, y: 1},
  // Row 2 (Right)
  {x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}, {x: 3, y: 2}, {x: 4, y: 2}, {x: 5, y: 2}, {x: 6, y: 2},
  // Row 3 (Left)
  {x: 6, y: 3}, {x: 5, y: 3}, {x: 4, y: 3}, {x: 3, y: 3}, {x: 2, y: 3}, {x: 1, y: 3}, {x: 0, y: 3},
  // Row 4 (Right - Finish)
  {x: 0, y: 4}, {x: 1, y: 4}
];
