import { TileType } from './types';

export const BOARD_SIZE = 357;
export const GRID_SCALE = 4.0;
export const ROW_LENGTH = 12; // Number of tiles per row

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
}

export const ZONES: ZoneConfig[] = [
  { name: '草原', start: 0, end: 40, themeId: 'grass' },
  { name: '妖精の宮殿', start: 41, end: 80, themeId: 'fairy' },
  { name: 'マグマ洞窟', start: 81, end: 130, themeId: 'magma' },
  { name: '海中のほこら', start: 131, end: 180, themeId: 'underwater' },
  { name: '洞窟', start: 181, end: 230, themeId: 'cave' },
  { name: 'ロンダルキア', start: 231, end: 290, themeId: 'rhone' },
  { name: 'ハーゴンの教会', start: 291, end: 356, themeId: 'hargon' }
];

export const getZoneForIndex = (index: number): ZoneConfig => {
  return ZONES.find(z => index >= z.start && index <= z.end) || ZONES[0];
};

// --- Tile Layout Generation ---
const generateLayout = (): TileType[] => {
  const layout: TileType[] = Array(BOARD_SIZE).fill(TileType.NORMAL);
  layout[0] = TileType.START;
  layout[BOARD_SIZE - 1] = TileType.GOAL;
  return layout;
};

export const BOARD_LAYOUT: TileType[] = generateLayout();


// --- 3D Path Generation ---
interface Coordinate3D {
  x: number;
  y: number;
  z: number;
}

const DIRS = {
  N: { x: 0, z: -1 },
  S: { x: 0, z: 1 },
  E: { x: 1, z: 0 },
  W: { x: -1, z: 0 },
};

interface IslandConfig {
  width: number;
  flow: 'N' | 'S' | 'E' | 'W';
  bridge: 'N' | 'S' | 'E' | 'W' | null;
}

const ISLAND_CONFIGS: Record<string, IslandConfig> = {
  grass: { width: 5, flow: 'E', bridge: null },
  fairy: { width: 5, flow: 'E', bridge: 'E' },
  magma: { width: 5, flow: 'E', bridge: 'E' },
  underwater: { width: 5, flow: 'S', bridge: 'S' },
  cave: { width: 5, flow: 'W', bridge: 'W' },
  rhone: { width: 5, flow: 'W', bridge: 'W' },
  hargon: { width: 6, flow: 'S', bridge: 'W' },
};

// Export bounds for Environment.tsx to use
export const ZONE_BOUNDS: Record<string, { minX: number, maxX: number, minZ: number, maxZ: number }> = {};

const generateCoordinates = (): Coordinate3D[] => {
  const coords: Coordinate3D[] = [];
  let cursor = { x: 0, y: 0, z: 0 };

  for (let zIdx = 0; zIdx < ZONES.length; zIdx++) {
    const zone = ZONES[zIdx];
    const config = ISLAND_CONFIGS[zone.themeId];
    const zoneLength = zone.end - zone.start + 1;

    let bridgeLength = (zIdx === 0) ? 0 : 3;
    // Fix for overlapping maps: Increase bridge length for specific zones
    if (zone.themeId === 'magma') bridgeLength = 8;
    if (zone.themeId === 'underwater') bridgeLength = 8;
    if (zone.themeId === 'cave') bridgeLength = 8;
    if (zone.themeId === 'rhone') bridgeLength = 8;
    if (zone.themeId === 'hargon') bridgeLength = 8;

    const islandLength = zoneLength - bridgeLength;

    // Track bounds for this zone
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    // --- 1. Bridge ---
    if (bridgeLength > 0 && config.bridge) {
      const dir = DIRS[config.bridge];
      let startY = cursor.y;
      let targetY = startY;
      if (zone.themeId === 'underwater') targetY = -5.0;

      for (let b = 0; b < bridgeLength; b++) {
        cursor.x += dir.x;
        cursor.z += dir.z;

        // "Safe Takeoff": Keep Y flat for the first tile to clear island padding
        // Only apply if bridge is reasonably long to avoid weird snaps on short bridges
        let progress = 0;
        if (bridgeLength > 2) {
          if (b < 1) {
            progress = 0; // Flat
          } else {
            // Remap b from [1..length-1] to [0..1]
            progress = (b - 0) / (bridgeLength - 1);
          }
        } else {
          progress = (b + 1) / bridgeLength;
        }

        cursor.y = startY + (targetY - startY) * progress;

        coords.push({ ...cursor });
      }
    }

    // --- 2. Island (Winding Snake) ---
    let flowDir = DIRS[config.flow];
    let crossDir = { x: 0, z: 0 };
    if (config.flow === 'E') crossDir = DIRS.S;
    if (config.flow === 'S') crossDir = DIRS.W;
    if (config.flow === 'W') crossDir = DIRS.N;
    if (config.flow === 'N') crossDir = DIRS.E;

    let segmentLen = config.width;
    let gapLen = 2;

    let state: 'cross' | 'gap' = 'cross';
    let dirMult = 1;
    let stepsInState = 0;

    for (let i = 0; i < islandLength; i++) {
      let dx = 0, dz = 0;

      if (i === 0) {
        dx = flowDir.x;
        dz = flowDir.z;
        state = 'cross';
        stepsInState = 0;
      } else {
        if (state === 'cross') {
          dx = crossDir.x * dirMult;
          dz = crossDir.z * dirMult;
          stepsInState++;
          if (stepsInState >= segmentLen) {
            state = 'gap';
            stepsInState = 0;
          }
        } else {
          dx = flowDir.x;
          dz = flowDir.z;
          stepsInState++;
          if (stepsInState >= gapLen) {
            state = 'cross';
            stepsInState = 0;
            dirMult *= -1;
          }
        }
      }

      cursor.x += dx;
      cursor.z += dz;

      // Elevation
      let ty = cursor.y;
      if (zone.themeId === 'underwater') ty = -5.0;
      else if (zone.themeId === 'cave') {
        const progress = i / (islandLength - 1);
        ty = -5.0 + (progress * 5.0);
      } else ty = 0;

      cursor.y = ty;
      coords.push({ ...cursor });

      // Update Bounds (Only for Island tiles)
      minX = Math.min(minX, cursor.x);
      maxX = Math.max(maxX, cursor.x);
      minZ = Math.min(minZ, cursor.z);
      maxZ = Math.max(maxZ, cursor.z);
    }

    // Save bounds
    ZONE_BOUNDS[zone.themeId] = { minX, maxX, minZ, maxZ };
  }

  while (coords.length < BOARD_SIZE) {
    coords.push({ ...cursor });
  }

  return coords.slice(0, BOARD_SIZE);
};

export const BOARD_COORDINATES = generateCoordinates();

export const getBoardPosition = (index: number) => {
  const coord = BOARD_COORDINATES[index] || { x: 0, y: 0, z: 0 };
  return {
    x: coord.x * GRID_SCALE,
    y: coord.y * (GRID_SCALE * 0.5),
    z: coord.z * GRID_SCALE
  };
};
