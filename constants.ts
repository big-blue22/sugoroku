import { TileType, Monster } from './types';

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

// Monster data for each zone
export const MONSTERS: Record<string, Monster> = {
  SLIME: {
    name: 'スライム',
    hp: 2,
    attack: 1,
    goldReward: 50,
    emoji: '🟢',
  },
  GHOST: {
    name: 'ゴースト',
    hp: 2,
    attack: 2,
    goldReward: 75,
    emoji: '👻',
  },
  SKELETON: {
    name: 'ガイコツ',
    hp: 3,
    attack: 3,
    goldReward: 100,
    emoji: '💀',
  },
  KRAKEN: {
    name: 'クラーゴン',
    hp: 3,
    attack: 4,
    goldReward: 125,
    emoji: '🦑',
  },
  DRAGON: {
    name: 'ドラゴン',
    hp: 4,
    attack: 5,
    goldReward: 150,
    emoji: '🐉',
  },
  KILLER_MACHINE: {
    name: 'キラーマシン',
    hp: 4,
    attack: 6, // Default, but will be randomly determined (75%: 6, 25%: 12)
    goldReward: 200,
    emoji: '🤖',
    isSpecialAttack: true,
  },
};

// Zone to Monster mapping based on themeId
export const ZONE_MONSTERS: Record<string, Monster | null> = {
  'grass': MONSTERS.SLIME,
  'fairy': MONSTERS.GHOST,
  'magma': MONSTERS.SKELETON,
  'underwater': MONSTERS.KRAKEN,
  'cave': MONSTERS.DRAGON,
  'rhone': MONSTERS.KILLER_MACHINE,
  'hargon': null, // No monsters in Hargon's Temple
};

// Battle encounter rate for each tile type
export const BATTLE_ENCOUNTER_RATES: Record<string, number> = {
  [TileType.NORMAL]: 0.25, // 25% chance
  [TileType.BAD]: 1.0,     // 100% chance (replaces old trap effects)
  // Other tile types don't trigger battles
};

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
    tileDistribution: { normal: 0.7, good: 0.2, bad: 0.1, event: 0.0 }
  },
  {
    name: '妖精の宮殿',
    start: 21, end: 40,
    themeId: 'fairy',
    tileDistribution: { normal: 0.55, good: 0.4, bad: 0.05, event: 0.0 } // Bonus heavy
  },
  {
    name: 'マグマ洞窟',
    start: 41, end: 70,
    themeId: 'magma',
    tileDistribution: { normal: 0.5, good: 0.1, bad: 0.4, event: 0.0 } // Trap heavy
  },
  {
    name: '海中のほこら',
    start: 71, end: 100,
    themeId: 'underwater',
    tileDistribution: { normal: 0.7, good: 0.2, bad: 0.1, event: 0.0 } // Balanced
  },
  {
    name: '洞窟',
    start: 101, end: 130,
    themeId: 'cave',
    tileDistribution: { normal: 0.55, good: 0.15, bad: 0.3, event: 0.0 } // Slightly hard
  },
  {
    name: 'ロンダルキア',
    start: 131, end: 170,
    themeId: 'rhone',
    tileDistribution: { normal: 0.4, good: 0.1, bad: 0.5, event: 0.0 } // Very hard (Traps)
  },
  {
    name: 'ハーゴンの教会',
    start: 171, end: 216,
    themeId: 'hargon',
    tileDistribution: { normal: 0.55, good: 0.05, bad: 0.4, event: 0.0 } // Hard + Events
  }
];

export const getZoneForIndex = (index: number): ZoneConfig => {
  return ZONES.find(z => index >= z.start && index <= z.end) || ZONES[0];
};

// Get monster for a given tile position
export const getMonsterForTile = (tilePosition: number): Monster | null => {
  const zone = getZoneForIndex(tilePosition);
  const monster = ZONE_MONSTERS[zone.themeId];
  if (!monster) return null;
  
  // Create a copy of the monster to avoid mutating the original
  const monsterCopy = { ...monster };
  
  // Special handling for Killer Machine's random attack
  if (monsterCopy.isSpecialAttack) {
    monsterCopy.attack = Math.random() < 0.75 ? 6 : 12;
  }
  
  return monsterCopy;
};

// --- Tile Layout Generation ---
const generateLayout = (): TileType[] => {
  const layout: TileType[] = Array(BOARD_SIZE).fill(TileType.NORMAL);
  layout[0] = TileType.START;
  layout[BOARD_SIZE - 1] = TileType.GOAL;

  for (let i = 1; i < BOARD_SIZE - 1; i++) {
    const zone = getZoneForIndex(i);
    const dist = zone.tileDistribution;
    const rand = Math.random();

    if (rand < dist.normal) layout[i] = TileType.NORMAL;
    else if (rand < dist.normal + dist.good) layout[i] = TileType.GOOD;
    else if (rand < dist.normal + dist.good + dist.bad) layout[i] = TileType.BAD;
    else layout[i] = TileType.EVENT;
  }
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
  grass:      { width: 5, flow: 'E', bridge: null },
  fairy:      { width: 5, flow: 'E', bridge: 'E' },
  magma:      { width: 5, flow: 'E', bridge: 'E' },
  underwater: { width: 5, flow: 'S', bridge: 'S' },
  cave:       { width: 5, flow: 'W', bridge: 'W' },
  rhone:      { width: 5, flow: 'W', bridge: 'W' },
  hargon:     { width: 6, flow: 'S', bridge: 'W' },
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
        // Bridge tiles are NOT part of the "Island Plate" bounds usually,
        // but let's exclude them so the plate is just the island.
      }
    }

    // --- 2. Island (Winding Snake) ---
    // We move primarily in 'Flow' direction, wiggling in 'Cross' direction.
    // 'Cross' is +90deg from Flow.
    let flowDir = DIRS[config.flow];
    let crossDir = { x: 0, z: 0 }; // Default
    if (config.flow === 'E') crossDir = DIRS.S;
    if (config.flow === 'S') crossDir = DIRS.W;
    if (config.flow === 'W') crossDir = DIRS.N;
    if (config.flow === 'N') crossDir = DIRS.E;

    // We alternate: Move 'width' steps in Cross, then '2' steps in Flow (Gap), then 'width' steps in -Cross.
    let segmentLen = config.width;
    let gapLen = 2; // 1 tile + 1 space = 2 steps? No, we place tiles.
    // To create a gap of 1 empty tile, we need to place 2 connecting tiles.
    // T1 (end of row) -> T2 (connector 1) -> T3 (start of next row)
    // Distance T1->T3 is 2. Pos T1 to Pos T3 is 2 units.
    // Visually: [X] [ ] [X] -> Gap is 1.

    // State machine for the snake
    let state: 'cross' | 'gap' = 'cross';
    let dirMult = 1; // 1 or -1 for cross direction
    let stepsInState = 0;

    for (let i = 0; i < islandLength; i++) {
      let dx = 0, dz = 0;

      if (i === 0) {
          // First tile of island: Step away from bridge in Flow direction?
          // Or just start at cursor (which is bridge end).
          // Let's take 1 step in Flow to clear the bridge properly.
          dx = flowDir.x;
          dz = flowDir.z;
          // Reset state to start the pattern
          state = 'cross';
          stepsInState = 0;
      } else {
          // Snake Logic
          if (state === 'cross') {
             dx = crossDir.x * dirMult;
             dz = crossDir.z * dirMult;
             stepsInState++;
             if (stepsInState >= segmentLen) {
                 state = 'gap';
                 stepsInState = 0;
             }
          } else {
             // Gap state: move in Flow direction
             dx = flowDir.x;
             dz = flowDir.z;
             stepsInState++;
             if (stepsInState >= gapLen) {
                 state = 'cross';
                 stepsInState = 0;
                 dirMult *= -1; // Flip cross direction
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
