import { TileType } from './types';

export const BOARD_SIZE = 216;
export const GRID_SCALE = 4.0;
export const ROW_LENGTH = 12; // Unused for snake gen now, but kept for compatibility

export const PLAYER_COLORS = [
  { name: '赤', class: 'red', hex: '#ef4444' },
  { name: '青', class: 'blue', hex: '#3b82f6' },
  { name: '緑', class: 'green', hex: '#22c55e' },
  { name: '黄', class: 'yellow', hex: '#eab308' },
];

export const AVATARS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐯', '🦄'];

// --- Zone Configuration ---
// Defines the 7 main zones and their characteristics
export interface ZoneConfig {
  name: string;
  start: number;
  end: number;
  themeId: 'grass' | 'fairy' | 'magma' | 'underwater' | 'cave' | 'rhone' | 'hargon';
  tileDistribution: {
    normal: number;
    good: number;
    bad: number;
    event: number;
  };
}

export const ZONES: ZoneConfig[] = [
  {
    name: '草原',
    start: 0, end: 20,
    themeId: 'grass',
    tileDistribution: { normal: 0.6, good: 0.2, bad: 0.1, event: 0.1 }
  },
  {
    name: '妖精の宮殿',
    start: 21, end: 40,
    themeId: 'fairy',
    tileDistribution: { normal: 0.4, good: 0.4, bad: 0.05, event: 0.15 } // Bonus heavy
  },
  {
    name: 'マグマ洞窟',
    start: 41, end: 70,
    themeId: 'magma',
    tileDistribution: { normal: 0.4, good: 0.1, bad: 0.4, event: 0.1 } // Trap heavy
  },
  {
    name: '海中のほこら',
    start: 71, end: 100,
    themeId: 'underwater',
    tileDistribution: { normal: 0.5, good: 0.2, bad: 0.1, event: 0.2 } // Balanced
  },
  {
    name: '洞窟',
    start: 101, end: 130,
    themeId: 'cave',
    tileDistribution: { normal: 0.4, good: 0.15, bad: 0.3, event: 0.15 } // Slightly hard
  },
  {
    name: 'ロンダルキア',
    start: 131, end: 170,
    themeId: 'rhone',
    tileDistribution: { normal: 0.3, good: 0.1, bad: 0.5, event: 0.1 } // Very hard (Traps)
  },
  {
    name: 'ハーゴンの教会',
    start: 171, end: 216,
    themeId: 'hargon',
    tileDistribution: { normal: 0.3, good: 0.05, bad: 0.4, event: 0.25 } // Hard + Events
  }
];

export const getZoneForIndex = (index: number): ZoneConfig => {
  return ZONES.find(z => index >= z.start && index <= z.end) || ZONES[0];
};

// --- Tile Layout Generation ---
// Generates tiles based on Zone probabilities
const generateLayout = (): TileType[] => {
  const layout: TileType[] = Array(BOARD_SIZE).fill(TileType.NORMAL);

  layout[0] = TileType.START;
  layout[BOARD_SIZE - 1] = TileType.GOAL;

  for (let i = 1; i < BOARD_SIZE - 1; i++) {
    const zone = getZoneForIndex(i);
    const dist = zone.tileDistribution;
    const rand = Math.random();

    // Cumulative probability check
    if (rand < dist.normal) {
      layout[i] = TileType.NORMAL;
    } else if (rand < dist.normal + dist.good) {
      layout[i] = TileType.GOOD;
    } else if (rand < dist.normal + dist.good + dist.bad) {
      layout[i] = TileType.BAD;
    } else {
      layout[i] = TileType.EVENT;
    }
  }

  return layout;
};

export const BOARD_LAYOUT: TileType[] = generateLayout();


// --- 3D Path Generation ---
// "Turtle Graphics" style generator for organic paths
interface Coordinate3D {
  x: number;
  y: number; // Elevation
  z: number; // Depth
}

const generateCoordinates = (): Coordinate3D[] => {
  const coords: Coordinate3D[] = [];
  let currentPos = { x: 0, y: 0, z: 0 };
  let direction = 0; // 0 = +Z (Forward), 1 = +X (Right), 2 = -Z (Back), 3 = -X (Left)

  // Seed for consistency (simple pseudo-random)
  let seed = 1234;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  coords.push({ ...currentPos });

  for (let i = 1; i < BOARD_SIZE; i++) {
    const zone = getZoneForIndex(i);

    // Default movement vector
    let dx = 0;
    let dy = 0;
    let dz = 0;

    // Determine direction change based on zone
    // We want organic curves, not strict 90 degrees if possible,
    // but grid based is safer for gameplay clarity.
    // Let's stick to Grid steps (1.0 distance) but vary the direction freq.

    const turnChance = 0.3; // Chance to turn left or right
    if (random() < turnChance) {
        if (random() < 0.5) direction = (direction + 1) % 4;
        else direction = (direction + 3) % 4; // -1
    }

    // Force general forward movement (Z+) to avoid getting stuck or looping too much
    // biasing towards +Z and +X to spread out the map diagonally
    if (random() < 0.1) direction = 0; // Reset to forward occasionally

    // Zone specific overrides
    if (zone.themeId === 'cave') {
       // Cave: Go Down
       // We accept floating point positions for smooth slopes?
       // No, keeping it grid-aligned for tiles, but maybe step down every N tiles
       if (i % 3 === 0) dy = -0.8;
    } else if (zone.themeId === 'rhone') {
       // Rhone: Go Up steep
       if (i % 2 === 0) dy = 1.0;
    } else if (zone.themeId === 'underwater') {
       // Underwater: Stay low/stable
       if (currentPos.y > -5) dy = -0.2; // Sink to -5
    } else if (zone.themeId === 'hargon') {
        // Hargon: Flat plateau high up
        // Stabilize Y
    }

    // Calculate Grid Step
    // To prevent overlapping path, we might need a history check or "push" logic
    // For now, simple random walk with bias
    switch (direction) {
        case 0: dz = 1; break; // Forward
        case 1: dx = 1; break; // Right
        case 2: dz = -1; break; // Back
        case 3: dx = -1; break; // Left
    }

    // Prevent immediate back-tracking (U-turn) logic could go here
    // But simple bias +Z helps.

    // Apply change
    currentPos.x += dx;
    currentPos.y += dy;
    currentPos.z += dz;

    // Push copy
    coords.push({ ...currentPos });
  }

  // Post-processing to smooth Y or fix collisions could happen here
  // But for now, raw turtle output
  return coords;
};

// We run the generator once
export const BOARD_COORDINATES = generateCoordinates();

// Helper to get scaled world position from index
export const getBoardPosition = (index: number) => {
    const coord = BOARD_COORDINATES[index] || { x: 0, y: 0, z: 0 };
    return {
        x: coord.x * GRID_SCALE,
        y: coord.y * (GRID_SCALE * 0.5), // Scale height slightly less aggressively
        z: coord.z * GRID_SCALE
    };
};
