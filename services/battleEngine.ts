// ============================================================
// services/battleEngine.ts - 戦闘エンジン（ソロ戦闘）
// ============================================================

import { Player, PlayerStats } from '../types';
import { MonsterDef, MonsterActionDef, getRandomMonsterForZone } from '../data/monsters';
import { SpellDef, getSpellById } from '../data/spells';

// --- Dice Utilities ---
export const rollDice = (count: number, sides: number = 6): number => {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
};

export const rollD100 = (): number => Math.floor(Math.random() * 100) + 1;

// --- Buff/Debuff State ---
export interface BuffState {
    defStage: number; // -2 to +2
    defStageTurns: number;
    atkStage: number; // 0 to +2
    atkStageTurns: number;
    magicBarrier: number; // 0-2
    magicBarrierTurns: number;
    fubaha: number; // 0-2
    fubahaTurns: number;
    manusa: boolean;
    manusaTurns: number;
    sleep: boolean;
    sleepTurns: number;
    stun: boolean;
}

export const createEmptyBuffState = (): BuffState => ({
    defStage: 0, defStageTurns: 0,
    atkStage: 0, atkStageTurns: 0,
    magicBarrier: 0, magicBarrierTurns: 0,
    fubaha: 0, fubahaTurns: 0,
    manusa: false, manusaTurns: 0,
    sleep: false, sleepTurns: 0,
    stun: false,
});

// --- Stage Multiplier ---
const getDefStageMult = (stage: number): number => {
    switch (stage) {
        case 2: return 2.0;
        case 1: return 1.5;
        case -1: return 0.5;
        case -2: return 0.25;
        default: return 1.0;
    }
};

const getAtkStageMult = (stage: number): number => {
    switch (stage) {
        case 2: return 2.0;
        case 1: return 1.5;
        default: return 1.0;
    }
};

// --- Damage Calculations ---
export const calcPhysicalDamage = (
    attackerAtk: number, defenderDef: number,
    diceCount: number, atkStage: number = 0, defStage: number = 0,
    ignoresDef: boolean = false
): number => {
    const atkEff = Math.floor(attackerAtk * getAtkStageMult(atkStage));
    const defEff = ignoresDef ? 0 : Math.floor(defenderDef * getDefStageMult(defStage));
    const diceSum = rollDice(diceCount);
    return Math.max(1, Math.floor(atkEff / 2) - Math.floor(defEff / 4) + diceSum);
};

export const calcCriticalDamage = (attackerAtk: number, diceCount: number, atkStage: number = 0): number => {
    const atkEff = Math.floor(attackerAtk * getAtkStageMult(atkStage));
    const diceSum = rollDice(diceCount);
    return Math.max(1, Math.floor(atkEff / 2) + diceSum);
};

export const calcBreathDamage = (
    breathBase: number, breathDice: number,
    defenderDef: number, defenderInt: number,
    fubahaStage: number
): number => {
    const raw = breathBase + rollDice(breathDice);
    const cut = Math.floor(defenderDef / 16) + Math.floor(defenderInt / 16);
    const afterCut = Math.max(1, raw - cut);
    const fubahaMult = fubahaStage === 2 ? 0.5 : fubahaStage === 1 ? 0.6666666667 : 1.0;
    return Math.max(1, Math.floor(afterCut * fubahaMult));
};

export const calcSpellDamage = (
    spellBase: number, spellDice: number, casterInt: number,
    defenderDef: number, defenderInt: number,
    magicBarrierStage: number
): number => {
    const raw = spellBase + casterInt + rollDice(spellDice);
    const cut = Math.floor(defenderDef / 24) + Math.floor(defenderInt / 8);
    const afterCut = Math.max(1, raw - cut);
    const barrierMult = magicBarrierStage === 2 ? 0.5 : magicBarrierStage === 1 ? 0.75 : 1.0;
    return Math.max(1, Math.floor(afterCut * barrierMult));
};

// --- Hit/Evasion ---
export const calcHitChance = (attackerSpd: number, defenderSpd: number, isManusa: boolean = false): number => {
    let hit = 0.80 + 0.02 * (attackerSpd - defenderSpd);
    hit = Math.max(0.15, Math.min(0.95, hit));
    if (isManusa) hit *= 0.5;
    return hit;
};

// --- Healing ---
export const calcHeal = (spell: SpellDef, casterInt: number): number => {
    if (spell.fullHeal) return 9999;
    const base = spell.healBase || 0;
    const dice = spell.healDice ? rollDice(spell.healDice) : 0;
    const intBonus = spell.healIntScale ? Math.floor(casterInt / 2) : 0;
    return base + intBonus + dice;
};

// --- Buff Turn Tick ---
export const tickBuffs = (buffs: BuffState): BuffState => {
    const b = { ...buffs };
    if (b.defStageTurns > 0) {
        b.defStageTurns--;
        if (b.defStageTurns === 0) b.defStage = 0;
    }
    if (b.atkStageTurns > 0) {
        b.atkStageTurns--;
        if (b.atkStageTurns === 0) b.atkStage = 0;
    }
    if (b.magicBarrierTurns > 0) {
        b.magicBarrierTurns--;
        if (b.magicBarrierTurns === 0) b.magicBarrier = 0;
    }
    if (b.fubahaTurns > 0) {
        b.fubahaTurns--;
        if (b.fubahaTurns === 0) b.fubaha = 0;
    }
    if (b.manusaTurns > 0) {
        b.manusaTurns--;
        if (b.manusaTurns === 0) b.manusa = false;
    }
    if (b.sleepTurns > 0) {
        b.sleepTurns--;
        if (b.sleepTurns === 0) b.sleep = false;
    }
    b.stun = false; // stun lasts exactly 1 turn
    return b;
};

// ============================================================
// Battle Log
// ============================================================
export interface BattleLogEntry {
    text: string;
    type: 'info' | 'player_action' | 'enemy_action' | 'damage' | 'heal' | 'status' | 'result';
}

// ============================================================
// Solo Battle Simulation (auto-battle for Monster tiles)
// ============================================================
export interface BattleResult {
    victory: boolean;
    playerHpAfter: number;
    playerMpAfter: number;
    goldReward: number;
    expReward: number;
    log: BattleLogEntry[];
    monsterName: string;
}

export const simulateSoloBattle = (
    playerStats: PlayerStats,
    monster: MonsterDef,
    playerSpells: string[] = []
): BattleResult => {
    const log: BattleLogEntry[] = [];
    let pHp = playerStats.hp;
    let pMp = playerStats.mp;
    const pBuffs = createEmptyBuffState();
    let mHp = monster.hp;
    const mBuffs = createEmptyBuffState();
    let lastMonsterAction = '';

    log.push({ text: `${monster.name} が現れた！`, type: 'info' });

    const maxRounds = 50; // Safety limit

    for (let round = 0; round < maxRounds; round++) {
        if (pHp <= 0 || mHp <= 0) break;

        // --- Determine turn order by SPD ---
        const playerFirst = playerStats.spd >= monster.spd;

        const doPlayerTurn = () => {
            if (pHp <= 0 || mHp <= 0) return;

            // Skip if sleeping
            if (pBuffs.sleep) {
                log.push({ text: `あなたは眠っている…`, type: 'status' });
                return;
            }
            if (pBuffs.stun) {
                log.push({ text: `あなたは動けない！`, type: 'status' });
                pBuffs.stun = false;
                return;
            }

            // AI: Simple auto-battle strategy
            // 1. If HP < 30% and has heal spell and MP, heal
            // 2. Otherwise attack
            let action = 'attack';
            const hpRatio = pHp / playerStats.maxHp;

            if (hpRatio < 0.3 && pMp >= 3) {
                // Try to heal
                if (playerSpells.includes('behoma') && pMp >= 14) action = 'behoma';
                else if (playerSpells.includes('behoim') && pMp >= 7) action = 'behoim';
                else if (playerSpells.includes('behoimi') && pMp >= 5) action = 'behoimi';
                else if (playerSpells.includes('hoimi') && pMp >= 3) action = 'hoimi';
            }

            if (action === 'attack') {
                // Physical attack
                const hitChance = calcHitChance(playerStats.spd, monster.spd, mBuffs.manusa);
                if (Math.random() < hitChance) {
                    const dmg = calcPhysicalDamage(playerStats.atk, monster.def, 2, pBuffs.atkStage, mBuffs.defStage);
                    mHp = Math.max(0, mHp - dmg);
                    log.push({ text: `あなたの攻撃！ ${monster.name}に ${dmg} ダメージ！`, type: 'player_action' });
                } else {
                    log.push({ text: `あなたの攻撃はミス！`, type: 'player_action' });
                }
            } else {
                // Cast heal spell
                const spell = getSpellById(action);
                if (spell) {
                    pMp -= spell.mpCost;
                    const heal = calcHeal(spell, playerStats.int);
                    const actualHeal = Math.min(heal, playerStats.maxHp - pHp);
                    pHp = Math.min(playerStats.maxHp, pHp + heal);
                    log.push({ text: `あなたは${spell.name}を唱えた！ HPが ${actualHeal} 回復！`, type: 'heal' });
                }
            }
        };

        const doMonsterTurn = () => {
            if (pHp <= 0 || mHp <= 0) return;

            // Determine which action set to use
            const isPhaseB = monster.phaseBActions && mHp <= monster.hp * (monster.phaseBThreshold || 0.5);
            const actions = isPhaseB ? monster.phaseBActions! : monster.actions;

            // Filter by consecutive ban
            let available = actions.filter(a => {
                if (a.consecutive_ban && a.id === lastMonsterAction) return false;
                return true;
            });
            if (available.length === 0) available = actions;

            // Weighted random selection
            const totalWeight = available.reduce((s, a) => s + a.weight, 0);
            let roll = Math.random() * totalWeight;
            let chosen: MonsterActionDef = available[0];
            for (const a of available) {
                roll -= a.weight;
                if (roll <= 0) { chosen = a; break; }
            }
            lastMonsterAction = chosen.id;

            // Execute action
            switch (chosen.type) {
                case 'physical':
                case 'physical_strong': {
                    const hitChance = calcHitChance(monster.spd, playerStats.spd, pBuffs.manusa);
                    if (Math.random() < hitChance) {
                        let dmg = calcPhysicalDamage(
                            monster.atk, playerStats.def,
                            chosen.diceCount || 2, mBuffs.atkStage, pBuffs.defStage
                        );
                        if (chosen.finalDamageMult) dmg = Math.max(1, Math.floor(dmg * chosen.finalDamageMult));
                        // Wake up from sleep on damage
                        if (pBuffs.sleep) {
                            pBuffs.sleep = false;
                            pBuffs.sleepTurns = 0;
                            log.push({ text: `ダメージで目が覚めた！`, type: 'status' });
                        }
                        pHp = Math.max(0, pHp - dmg);
                        log.push({ text: `${monster.name}の${chosen.name}！ ${dmg} ダメージ！`, type: 'enemy_action' });
                    } else {
                        log.push({ text: `${monster.name}の${chosen.name}はミス！`, type: 'enemy_action' });
                    }
                    break;
                }
                case 'critical': {
                    const hitChance = calcHitChance(monster.spd, playerStats.spd, pBuffs.manusa);
                    if (Math.random() < hitChance) {
                        let dmg = chosen.ignoresDef
                            ? calcCriticalDamage(monster.atk, chosen.diceCount || 4, mBuffs.atkStage)
                            : calcPhysicalDamage(monster.atk, playerStats.def, chosen.diceCount || 4, mBuffs.atkStage, pBuffs.defStage);
                        if (pBuffs.sleep) {
                            pBuffs.sleep = false;
                            pBuffs.sleepTurns = 0;
                        }
                        pHp = Math.max(0, pHp - dmg);
                        log.push({ text: `${monster.name}の${chosen.name}！ ${dmg} ダメージ！`, type: 'enemy_action' });
                    } else {
                        log.push({ text: `${monster.name}の${chosen.name}はミス！`, type: 'enemy_action' });
                    }
                    break;
                }
                case 'breath': {
                    const dmg = calcBreathDamage(
                        chosen.breathBase || 0, chosen.breathDice || 2,
                        playerStats.def, playerStats.int, pBuffs.fubaha
                    );
                    if (pBuffs.sleep) {
                        pBuffs.sleep = false;
                        pBuffs.sleepTurns = 0;
                    }
                    pHp = Math.max(0, pHp - dmg);
                    log.push({ text: `${monster.name}の${chosen.name}！ ${dmg} ダメージ！`, type: 'enemy_action' });
                    break;
                }
                case 'spell': {
                    const dmg = calcSpellDamage(
                        chosen.spellBase || 0, chosen.spellDice || 1, monster.int,
                        playerStats.def, playerStats.int, pBuffs.magicBarrier
                    );
                    if (pBuffs.sleep) {
                        pBuffs.sleep = false;
                        pBuffs.sleepTurns = 0;
                    }
                    pHp = Math.max(0, pHp - dmg);
                    log.push({ text: `${monster.name}の${chosen.name}！ ${dmg} ダメージ！`, type: 'enemy_action' });
                    break;
                }
                case 'status': {
                    if (chosen.statusEffect === 'manusa') {
                        const chance = Math.min(0.95, (chosen.statusChance || 0.5) * 1.0);
                        if (Math.random() < chance) {
                            pBuffs.manusa = true;
                            pBuffs.manusaTurns = 3;
                            log.push({ text: `${monster.name}の${chosen.name}！ 目がくらんだ！`, type: 'status' });
                        } else {
                            log.push({ text: `${monster.name}の${chosen.name}！ しかし効かなかった！`, type: 'status' });
                        }
                    } else if (chosen.statusEffect === 'rariho') {
                        const chance = Math.min(0.95, (chosen.statusChance || 0.4) * 1.0);
                        if (Math.random() < chance) {
                            pBuffs.sleep = true;
                            pBuffs.sleepTurns = rollDice(1, 3);
                            log.push({ text: `${monster.name}の${chosen.name}！ 眠ってしまった！`, type: 'status' });
                        } else {
                            log.push({ text: `${monster.name}の${chosen.name}！ しかし効かなかった！`, type: 'status' });
                        }
                    } else if (chosen.statusEffect === 'stun') {
                        pBuffs.stun = true;
                        log.push({ text: `${monster.name}の${chosen.name}！ 動けない！`, type: 'status' });
                    } else if (chosen.statusEffect === 'rukani' || chosen.statusEffect === 'rukanan') {
                        const drop = chosen.statusEffect === 'rukani' ? -2 : -1;
                        pBuffs.defStage = Math.max(-2, pBuffs.defStage + drop);
                        pBuffs.defStageTurns = 5;
                        log.push({ text: `${monster.name}の${chosen.name}！ 守備力が下がった！`, type: 'status' });
                    }
                    break;
                }
                case 'buff': {
                    // Monster self-buff (simplified)
                    if (chosen.id === 'sukuruto') {
                        mBuffs.defStage = Math.min(2, mBuffs.defStage + 1);
                        mBuffs.defStageTurns = 5;
                        log.push({ text: `${monster.name}はスクルトを唱えた！ 守備力が上がった！`, type: 'status' });
                    } else if (chosen.id === 'baikillto') {
                        mBuffs.atkStage = 2;
                        mBuffs.atkStageTurns = 5;
                        log.push({ text: `${monster.name}はバイキルトを唱えた！ 攻撃力が上がった！`, type: 'status' });
                    } else if (chosen.id === 'awaken') {
                        log.push({ text: `${monster.name}は魔力覚醒！ 呪文威力が上がった！`, type: 'status' });
                    } else {
                        log.push({ text: `${monster.name}は力を溜めている...`, type: 'status' });
                    }
                    break;
                }
            }
        };

        // Execute turns in order
        if (playerFirst) {
            doPlayerTurn();
            doMonsterTurn();
        } else {
            doMonsterTurn();
            doPlayerTurn();
        }

        // Tick buffs (end of round)
        Object.assign(pBuffs, tickBuffs(pBuffs));
        Object.assign(mBuffs, tickBuffs(mBuffs));
    }

    // Determine result
    const victory = mHp <= 0 && pHp > 0;
    let goldReward = 0;
    let expReward = 0;

    if (victory) {
        goldReward = monster.goldMin + Math.floor(Math.random() * (monster.goldMax - monster.goldMin + 1));
        expReward = monster.exp;
        log.push({ text: `${monster.name} を倒した！ ${goldReward}G と ${expReward}EXP を獲得！`, type: 'result' });
    } else {
        log.push({ text: `あなたは倒れてしまった...`, type: 'result' });
    }

    return {
        victory,
        playerHpAfter: Math.max(0, pHp),
        playerMpAfter: Math.max(0, pMp),
        goldReward,
        expReward,
        log,
        monsterName: monster.name,
    };
};

// --- Level Up ---
export const getRequiredExp = (currentLevel: number): number => {
    return 400 + 100 * currentLevel;
};

export const checkLevelUp = (stats: PlayerStats): { leveled: boolean; newStats: PlayerStats; spGained: number } => {
    const required = getRequiredExp(stats.level);
    if (stats.exp >= required) {
        return {
            leveled: true,
            newStats: {
                ...stats,
                level: stats.level + 1,
                exp: stats.exp - required,
            },
            spGained: 3,
        };
    }
    return { leveled: false, newStats: stats, spGained: 0 };
};
