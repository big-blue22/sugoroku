import { TileType } from './types';

export const BOARD_SIZE = 216;
export const GRID_SCALE = 4.0;
export const ROW_LENGTH = 12; // Number of tiles per row

export const PLAYER_COLORS = [
  { name: '赤', class: 'red', hex: '#ef4444' },
  { name: '青', class: 'blue', hex: '#3b82f6' },
  { name: '緑', class: 'green', hex: '#22c55e' },
  { name: '黄', class: 'yellow', hex: '#eab308' },
];

export const AVATARS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐯', '🦄'];

// Generate a pattern for the board layout
// This ensures the board is populated with a mix of events
const generateLayout = (): TileType[] => {
  const layout: TileType[] = Array(BOARD_SIZE).fill(TileType.NORMAL);

  layout[0] = TileType.START;
  layout[BOARD_SIZE - 1] = TileType.GOAL;

  // Simple deterministic pattern for the middle tiles
  // N, N, G, N, B, N, E, N, N, B, G, E (Length 12 pattern)
  const pattern = [
    TileType.NORMAL, TileType.NORMAL, TileType.GOOD,
    TileType.NORMAL, TileType.BAD,    TileType.NORMAL,
    TileType.EVENT,  TileType.NORMAL, TileType.NORMAL,
    TileType.BAD,    TileType.GOOD,   TileType.EVENT
  ];

  for (let i = 1; i < BOARD_SIZE - 1; i++) {
    // Use modulo to cycle through the pattern
    layout[i] = pattern[(i - 1) % pattern.length];
  }

  return layout;
};

export const BOARD_LAYOUT: TileType[] = generateLayout();

// Generate snake pattern coordinates dynamically
// Row 0: 0 -> 11 (Left to Right)
// Row 1: 11 -> 0 (Right to Left)
// ...
const generateCoordinates = () => {
  const coords = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    const row = Math.floor(i / ROW_LENGTH);
    const colIndex = i % ROW_LENGTH;

    // Even rows (0, 2, 4...) go Left to Right (0 -> 11)
    // Odd rows (1, 3, 5...) go Right to Left (11 -> 0)
    const x = (row % 2 === 0) ? colIndex : (ROW_LENGTH - 1) - colIndex;
    const y = row;

    coords.push({ x, y });
  }
  return coords;
};

export const BOARD_COORDINATES = generateCoordinates();
