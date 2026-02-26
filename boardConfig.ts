import { Tile, TileType } from './types';
import boardConfigData from './data/BoardConfig_v1.json';

// --- Types for raw JSON ---
interface RawTile {
    id: number;
    zone: string;
    zone_name: string;
    tile_key: string;
    tile_label: string;
    meta: {
        forced?: boolean;
    };
}

interface RawZone {
    zone: string;
    start: number;
    end: number;
    name: string;
}

interface RawBossInfo {
    id: number;
    boss_name: string;
}

interface BoardConfig {
    version: string;
    seed: string;
    tile_legend: Record<string, string>;
    zones: RawZone[];
    z7_boss_tiles: RawBossInfo[];
    tiles: RawTile[];
}

const config = boardConfigData as BoardConfig;

// --- Map tile_key to TileType ---
const TILE_KEY_MAP: Record<string, TileType> = {
    VILLAGE: TileType.VILLAGE,
    BOSS: TileType.BOSS,
    MONSTER: TileType.MONSTER,
    TREASURE: TileType.TREASURE,
    TRAP: TileType.TRAP,
    EMPTY: TileType.EMPTY,
    CASINO: TileType.CASINO,
};

// --- Build board from config ---
const z7BossMap = new Map<number, string>();
config.z7_boss_tiles.forEach((b) => {
    z7BossMap.set(b.id, b.boss_name);
});

export const buildBoardFromConfig = (): Tile[] => {
    return config.tiles.map((raw) => {
        const tileType = TILE_KEY_MAP[raw.tile_key] || TileType.EMPTY;
        const bossName = z7BossMap.get(raw.id);

        return {
            id: raw.id,
            type: tileType,
            zone: raw.zone,
            zoneName: raw.zone_name,
            label: raw.tile_label,
            meta: {
                ...(raw.meta?.forced ? { forced: true } : {}),
                ...(bossName ? { bossName } : {}),
            },
        };
    });
};

export const BOARD_FROM_CONFIG = buildBoardFromConfig();

// Export zone info
export const CONFIG_ZONES = config.zones;
export const BOARD_SIZE_FROM_CONFIG = config.tiles.length;
