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
interface Coordinate3D {
  x: number;
  y: number; // Elevation
  z: number; // Depth
}

// Direction vectors
const DIRS = {
  N: { x: 0, z: -1 }, // North (Negative Z)
  S: { x: 0, z: 1 },  // South (Positive Z)
  E: { x: 1, z: 0 },  // East (Positive X)
  W: { x: -1, z: 0 }, // West (Negative X)
};

interface IslandConfig {
  width: number; // Width of the snake grid
  flow: 'N' | 'S' | 'E' | 'W'; // General direction of the island expansion
  bridge: 'N' | 'S' | 'E' | 'W' | null; // Direction of the bridge FROM the previous zone
}

const ISLAND_CONFIGS: Record<string, IslandConfig> = {
  grass:      { width: 5, flow: 'E', bridge: null }, // Start
  fairy:      { width: 5, flow: 'E', bridge: 'E' },
  magma:      { width: 5, flow: 'E', bridge: 'E' }, // Expand East
  underwater: { width: 5, flow: 'S', bridge: 'S' }, // Turn South
  cave:       { width: 5, flow: 'W', bridge: 'W' }, // Turn West
  rhone:      { width: 5, flow: 'W', bridge: 'W' }, // Continue West
  hargon:     { width: 6, flow: 'S', bridge: 'S' }, // Turn South (final area)
};

const generateCoordinates = (): Coordinate3D[] => {
  const coords: Coordinate3D[] = [];

  // Trackers
  let currentPos = { x: 0, y: 0, z: 0 };
  let cursor = { ...currentPos };

  // Loop through all tiles
  // We process zone by zone to handle bridges and islands cleanly
  for (let zIdx = 0; zIdx < ZONES.length; zIdx++) {
    const zone = ZONES[zIdx];
    const config = ISLAND_CONFIGS[zone.themeId];

    const zoneLength = zone.end - zone.start + 1;
    let bridgeLength = (zIdx === 0) ? 0 : 3; // First 3 tiles are bridge (except start)
    const islandLength = zoneLength - bridgeLength;

    // --- 1. Generate Bridge ---
    if (bridgeLength > 0 && config.bridge) {
      const dir = DIRS[config.bridge];

      // Special Elevation Logic for Bridge
      // Magma -> Underwater: Drop from 0 to -5
      // Cave -> Rhone: No change (Cave ends at 0)

      let startY = cursor.y;
      let targetY = startY;

      if (zone.themeId === 'underwater') targetY = -5.0;

      for (let b = 0; b < bridgeLength; b++) {
        cursor.x += dir.x;
        cursor.z += dir.z;

        // Interpolate Y
        const progress = (b + 1) / bridgeLength;
        cursor.y = startY + (targetY - startY) * progress;

        coords.push({ ...cursor });
      }
    }

    // --- 2. Generate Island ---
    // We want to fill a rectangle of `width` roughly moving in `flow` direction.
    // To do this, we treat the island as a local 2D grid (u, v) where 'u' is the flow direction, 'v' is cross.

    // Determine vectors for 'u' (forward) and 'v' (right/cross)
    let uDir = DIRS[config.flow];
    let vDir = { x: 0, z: 0 };

    // Cross direction is usually clockwise 90deg from Flow
    if (config.flow === 'E') vDir = DIRS.S;
    if (config.flow === 'S') vDir = DIRS.W;
    if (config.flow === 'W') vDir = DIRS.N;
    if (config.flow === 'N') vDir = DIRS.E;

    // Ensure we start the island cleanly relative to the bridge end
    // We want the island to "attach" to the bridge.
    // The cursor is currently at the last bridge tile.
    // The first island tile should be +1 in the Flow direction?
    // Or we can just start snaking.

    const islandStartBase = { ...cursor };

    for (let i = 0; i < islandLength; i++) {
      // Calculate local grid position (u, v)
      // Snake pattern:
      // u increases every 'width' steps?
      // No, we want width to be the cross-section.
      // So 'v' loops 0..width-1, then u increments.

      const u = Math.floor(i / config.width);
      const vRaw = i % config.width;

      // Snake: If u is odd, invert v to connect ends
      const v = (u % 2 === 0) ? vRaw : (config.width - 1 - vRaw);

      // Calculate World Position
      // Pos = Start + (u * uDir) + (v * vDir)
      // Plus an initial offset to separate from bridge?
      // Let's add 1 unit of uDir to clear the bridge.

      const uOffset = u + 1;
      // Center the v-offset so the bridge enters the middle?
      // Or just Start at corner? Corner is simpler.

      const tx = islandStartBase.x + (uOffset * uDir.x) + (v * vDir.x);
      const tz = islandStartBase.z + (uOffset * uDir.z) + (v * vDir.z);

      // Elevation Logic
      let ty = cursor.y; // Default to current (which is bridge end)

      if (zone.themeId === 'underwater') {
        ty = -5.0;
      } else if (zone.themeId === 'cave') {
        // Rise from -5 to 0
        const progress = i / (islandLength - 1);
        ty = -5.0 + (progress * 5.0);
      } else {
        ty = 0;
      }

      // Special fix: If we are just starting the island, ensure we don't overlap the bridge tile
      // The logic `uOffset = u + 1` ensures we are at least 1 step away in Flow direction.

      coords.push({ x: tx, y: ty, z: tz });

      // Update cursor for next steps (though we calculate absolute)
      cursor = { x: tx, y: ty, z: tz };
    }
  }

  // Ensure we have exactly BOARD_SIZE coords
  // (The loops above rely on ZONES start/end. The sum of lengths should match)
  // Just in case of off-by-one errors in config vs math:
  while (coords.length < BOARD_SIZE) {
    coords.push({ ...cursor });
  }

  return coords.slice(0, BOARD_SIZE);
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
