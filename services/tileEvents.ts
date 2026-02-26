// ============================================================
// services/tileEvents.ts - タイルイベント処理
// ============================================================

import { Player, PlayerStats, TileType, Tile } from '../types';
import { rollDice, rollD100, simulateSoloBattle, BattleResult, checkLevelUp } from './battleEngine';
import { getRandomMonsterForZone, MonsterDef } from '../data/monsters';
import { ZONES } from '../constants';

// --- Zone number from zone string ---
const getZoneNumber = (zone: string): number => {
    return parseInt(zone.replace('Z', ''));
};

// --- Village Start Position (for death penalty) ---
export const getVillageStartPosition = (currentPosition: number): number => {
    const zones = ZONES;
    for (let i = zones.length - 1; i >= 0; i--) {
        if (currentPosition >= zones[i].start) {
            return zones[i].start;
        }
    }
    return 0;
};

// ============================================================
// Treasure Chest (d100)
// ============================================================
export interface TreasureResult {
    type: 'gold' | 'hp_recovery' | 'mp_recovery' | 'mimic';
    message: string;
    goldChange: number;
    hpChange: number;
    mpChange: number;
    // Mimic battle
    mimicBattle?: BattleResult;
}

const TREASURE_GOLD_RANGES: Record<string, [number, number]> = {
    Z1: [80, 160], Z2: [140, 280], Z3: [220, 420],
    Z4: [300, 560], Z5: [420, 780], Z6: [560, 1040], Z7: [700, 1300],
};

export const resolveTreasure = (player: Player, tile: Tile): TreasureResult => {
    const roll = rollD100();
    const zone = tile.zone;

    if (roll <= 70) {
        // GOLD入手
        const range = TREASURE_GOLD_RANGES[zone] || [80, 160];
        const gold = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
        return {
            type: 'gold', goldChange: gold, hpChange: 0, mpChange: 0,
            message: `💰 宝箱から ${gold}G を発見！`,
        };
    } else if (roll <= 80) {
        // HP35%回復 + 罠ペナルティ解除
        const heal = Math.floor(player.stats.maxHp * 0.35);
        return {
            type: 'hp_recovery', goldChange: 0, hpChange: heal, mpChange: 0,
            message: `💚 宝箱から薬草が！ HPが ${heal} 回復！`,
        };
    } else if (roll <= 90) {
        // MP35%回復
        const mpHeal = Math.floor(player.stats.maxMp * 0.35);
        return {
            type: 'mp_recovery', goldChange: 0, hpChange: 0, mpChange: mpHeal,
            message: `💙 宝箱から魔法の水が！ MPが ${mpHeal} 回復！`,
        };
    } else {
        // ミミック (強化雑魚戦)
        const zoneNum = getZoneNumber(zone);
        const baseMon = getRandomMonsterForZone(zoneNum);
        if (baseMon) {
            const mimicMonster: MonsterDef = {
                ...baseMon,
                name: `ミミック(${baseMon.name})`,
                hp: Math.floor(baseMon.hp * 1.5),
                goldMin: Math.floor(baseMon.goldMin * 1.6),
                goldMax: Math.floor(baseMon.goldMax * 1.6),
                exp: Math.floor(baseMon.exp * 1.6),
            };
            const result = simulateSoloBattle(player.stats, mimicMonster);
            return {
                type: 'mimic', goldChange: result.goldReward, hpChange: 0, mpChange: 0,
                message: `📦 宝箱はミミックだった！`,
                mimicBattle: result,
            };
        }
        // Fallback: no monster data for this zone
        return {
            type: 'gold', goldChange: 100, hpChange: 0, mpChange: 0,
            message: `💰 宝箱から 100G を発見！`,
        };
    }
};

// ============================================================
// Trap (d100)
// ============================================================
export interface TrapResult {
    type: 'gold_stolen' | 'damage' | 'retreat' | 'skip_turn' | 'next_battle_debuff' | 'ambush';
    message: string;
    goldChange: number;
    hpChange: number;
    positionChange: number;
    skipTurns: number;
    // Ambush battle
    ambushBattle?: BattleResult;
}

export const resolveTrap = (player: Player, tile: Tile): TrapResult => {
    const roll = rollD100();
    const zone = tile.zone;
    const zoneNum = getZoneNumber(zone);
    const isZ7 = zone === 'Z7';

    if (roll <= 25) {
        // GOLD盗難
        const stolen = Math.max(50, Math.floor(player.stats.gold * 0.10));
        return {
            type: 'gold_stolen', goldChange: -stolen, hpChange: 0,
            positionChange: 0, skipTurns: 0,
            message: `💸 罠！ ${stolen}G を盗まれた！`,
        };
    } else if (roll <= 50) {
        // ダメージ
        const maxHpRatio = isZ7 ? 0.15 : 0.12;
        const dmg = Math.max(1, Math.floor(player.stats.maxHp * maxHpRatio) + rollDice(1));
        return {
            type: 'damage', goldChange: 0, hpChange: -dmg,
            positionChange: 0, skipTurns: 0,
            message: `💥 罠！ ${dmg} ダメージを受けた！`,
        };
    } else if (roll <= 70) {
        // 後退
        const retreat = isZ7 ? rollDice(1, 4) + 1 : rollDice(1, 4);
        return {
            type: 'retreat', goldChange: 0, hpChange: 0,
            positionChange: -retreat, skipTurns: 0,
            message: `⬅️ 罠！ ${retreat}マス後退！`,
        };
    } else if (roll <= 85) {
        // 足止め
        const skip = isZ7 ? 2 : 1;
        return {
            type: 'skip_turn', goldChange: 0, hpChange: 0,
            positionChange: 0, skipTurns: skip,
            message: `⛓️ 罠！ ${skip}ターンスキップ！`,
        };
    } else if (roll <= 95) {
        // 次戦闘DEF-1デバフ
        return {
            type: 'next_battle_debuff', goldChange: 0, hpChange: 0,
            positionChange: 0, skipTurns: 0,
            message: `🛡️ 罠！ 次の戦闘で守備力が下がる...`,
        };
    } else {
        // 奇襲 (そのゾーンの通常雑魚戦を即座に開始)
        const mon = getRandomMonsterForZone(zoneNum);
        if (mon) {
            const result = simulateSoloBattle(player.stats, mon);
            return {
                type: 'ambush', goldChange: result.goldReward, hpChange: 0,
                positionChange: 0, skipTurns: 0,
                message: `⚡ 奇襲！ ${mon.name}が飛び出してきた！`,
                ambushBattle: result,
            };
        }
        return {
            type: 'damage', goldChange: 0, hpChange: -5,
            positionChange: 0, skipTurns: 0,
            message: `💥 罠！ 5 ダメージを受けた！`,
        };
    }
};

// ============================================================
// Casino (Z1-Z6 only)
// ============================================================
export interface CasinoResult {
    won: boolean;
    goldChange: number;
    message: string;
}

export const playCasino = (betAmount: number): CasinoResult => {
    const won = Math.random() < 0.5;
    if (won) {
        return { won: true, goldChange: betAmount, message: `🎰 ダブルアップ成功！ ${betAmount}G 獲得！` };
    } else {
        return { won: false, goldChange: -betAmount, message: `🎰 ダブルアップ失敗... ${betAmount}G 失った...` };
    }
};
