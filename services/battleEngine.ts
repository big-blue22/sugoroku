// ============================================================
// services/battleEngine.ts - ターン制対話型戦闘エンジン
// ============================================================

import { PlayerStats } from '../types';
import { MonsterDef, MonsterActionDef } from '../data/monsters';
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
    defending: boolean; // Defend this turn
}

export const createEmptyBuffState = (): BuffState => ({
    defStage: 0, defStageTurns: 0,
    atkStage: 0, atkStageTurns: 0,
    magicBarrier: 0, magicBarrierTurns: 0,
    fubaha: 0, fubahaTurns: 0,
    manusa: false, manusaTurns: 0,
    sleep: false, sleepTurns: 0,
    stun: false,
    defending: false,
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
    b.defending = false; // Reset defend each turn
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
// Interactive Battle State
// ============================================================
export type BattlePhase = 'player_turn' | 'enemy_turn' | 'victory' | 'defeat' | 'animating';

export interface BattleState {
    phase: BattlePhase;
    round: number;
    // Player
    playerHp: number;
    playerMp: number;
    playerStats: PlayerStats;
    playerBuffs: BuffState;
    playerSpells: string[];
    // Monster
    monster: MonsterDef;
    monsterHp: number;
    monsterBuffs: BuffState;
    monsterLastAction: string;
    isMimic: boolean;
    // Log
    log: BattleLogEntry[];
    // Rewards
    goldReward: number;
    expReward: number;
}

export const initBattle = (
    playerStats: PlayerStats,
    monster: MonsterDef,
    playerSpells: string[] = [],
    isMimic: boolean = false
): BattleState => {
    return {
        phase: 'player_turn',
        round: 1,
        playerHp: playerStats.hp,
        playerMp: playerStats.mp,
        playerStats,
        playerBuffs: createEmptyBuffState(),
        playerSpells,
        monster,
        monsterHp: monster.hp,
        monsterBuffs: createEmptyBuffState(),
        monsterLastAction: '',
        isMimic,
        log: [{ text: `${monster.name} が現れた！`, type: 'info' }],
        goldReward: 0,
        expReward: 0,
    };
};

// ============================================================
// Player Actions
// ============================================================

export type PlayerCommand =
    | { type: 'attack' }
    | { type: 'defend' }
    | { type: 'spell'; spellId: string }
    | { type: 'item'; itemId: string };

export const executePlayerAction = (state: BattleState, command: PlayerCommand): BattleState => {
    let s = { ...state, log: [...state.log], playerBuffs: { ...state.playerBuffs }, monsterBuffs: { ...state.monsterBuffs } };

    // Reset defend
    s.playerBuffs.defending = false;

    // Check sleep/stun
    if (s.playerBuffs.sleep) {
        s.log.push({ text: `あなたは眠っている…`, type: 'status' });
        return executeMonsterAction(s);
    }
    if (s.playerBuffs.stun) {
        s.log.push({ text: `あなたは動けない！`, type: 'status' });
        s.playerBuffs.stun = false;
        return executeMonsterAction(s);
    }

    switch (command.type) {
        case 'attack': {
            const hitChance = calcHitChance(s.playerStats.spd, s.monster.spd, s.monsterBuffs.manusa);
            if (Math.random() < hitChance) {
                const dmg = calcPhysicalDamage(
                    s.playerStats.atk, s.monster.def, 2,
                    s.playerBuffs.atkStage, s.monsterBuffs.defStage
                );
                s.monsterHp = Math.max(0, s.monsterHp - dmg);
                s.log.push({ text: `あなたの攻撃！ ${s.monster.name}に ${dmg} ダメージ！`, type: 'player_action' });
            } else {
                s.log.push({ text: `あなたの攻撃はミス！`, type: 'player_action' });
            }
            break;
        }
        case 'defend': {
            s.playerBuffs.defending = true;
            s.log.push({ text: `あなたは防御の構えをとった！`, type: 'player_action' });
            break;
        }
        case 'spell': {
            const spell = getSpellById(command.spellId);
            if (!spell || s.playerMp < spell.mpCost) {
                s.log.push({ text: `MPが足りない！`, type: 'info' });
                // Return without moving to enemy turn - let player choose again
                return s;
            }
            s.playerMp -= spell.mpCost;

            if (spell.category === 'heal') {
                const heal = calcHeal(spell, s.playerStats.int);
                const actualHeal = Math.min(heal, s.playerStats.maxHp - s.playerHp);
                s.playerHp = Math.min(s.playerStats.maxHp, s.playerHp + heal);
                s.log.push({ text: `${spell.name}を唱えた！ HPが ${actualHeal} 回復！`, type: 'heal' });
            } else if (spell.category === 'support') {
                if (spell.buffType === 'def_stage') {
                    if (spell.buffSetTo) {
                        s.playerBuffs.defStage = spell.buffValue || 2;
                    } else {
                        s.playerBuffs.defStage = Math.min(2, s.playerBuffs.defStage + (spell.buffValue || 1));
                    }
                    s.playerBuffs.defStageTurns = spell.buffDuration || 5;
                    s.log.push({ text: `${spell.name}を唱えた！ 守備力が上がった！`, type: 'status' });
                } else if (spell.buffType === 'magic_barrier') {
                    s.playerBuffs.magicBarrier = Math.min(2, s.playerBuffs.magicBarrier + 1);
                    s.playerBuffs.magicBarrierTurns = spell.buffDuration || 5;
                    s.log.push({ text: `${spell.name}を唱えた！ 呪文耐性が上がった！`, type: 'status' });
                } else if (spell.buffType === 'fubaha') {
                    s.playerBuffs.fubaha = Math.min(2, s.playerBuffs.fubaha + 1);
                    s.playerBuffs.fubahaTurns = spell.buffDuration || 5;
                    s.log.push({ text: `${spell.name}を唱えた！ ブレス耐性が上がった！`, type: 'status' });
                }
            } else if (spell.category === 'debuff') {
                if (spell.buffType === 'manusa') {
                    const resist = s.monster.manusaResist;
                    const chance = Math.min(0.95, 0.5 * resist);
                    if (Math.random() < chance) {
                        s.monsterBuffs.manusa = true;
                        s.monsterBuffs.manusaTurns = 3;
                        s.log.push({ text: `${spell.name}を唱えた！ ${s.monster.name}の目がくらんだ！`, type: 'status' });
                    } else {
                        s.log.push({ text: `${spell.name}を唱えた！ しかし効かなかった！`, type: 'status' });
                    }
                } else if (spell.buffType === 'def_stage') {
                    s.monsterBuffs.defStage = Math.max(-2, s.monsterBuffs.defStage + (spell.buffValue || -1));
                    s.monsterBuffs.defStageTurns = spell.buffDuration || 5;
                    s.log.push({ text: `${spell.name}を唱えた！ ${s.monster.name}の守備力が下がった！`, type: 'status' });
                }
            }
            break;
        }
        case 'item': {
            // TODO: Item implementation
            s.log.push({ text: `アイテムを使った！`, type: 'info' });
            break;
        }
    }

    // Check monster defeat after player action
    if (s.monsterHp <= 0) {
        return resolveBattleEnd(s, true);
    }

    // Monster turn
    return executeMonsterAction(s);
};

// ============================================================
// Monster AI Turn
// ============================================================
const executeMonsterAction = (state: BattleState): BattleState => {
    let s = { ...state, log: [...state.log], playerBuffs: { ...state.playerBuffs }, monsterBuffs: { ...state.monsterBuffs } };

    // Determine which action set to use
    const isPhaseB = s.monster.phaseBActions && s.monsterHp <= s.monster.hp * (s.monster.phaseBThreshold || 0.5);
    const actions = isPhaseB ? s.monster.phaseBActions! : s.monster.actions;

    // Filter by consecutive ban
    let available = actions.filter(a => {
        if (a.consecutive_ban && a.id === s.monsterLastAction) return false;
        return true;
    });
    if (available.length === 0) available = actions;

    // Weighted random selection
    const totalWeight = available.reduce((sum, a) => sum + a.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosen: MonsterActionDef = available[0];
    for (const a of available) {
        roll -= a.weight;
        if (roll <= 0) { chosen = a; break; }
    }
    s.monsterLastAction = chosen.id;

    // Execute monster action
    const applyDamageToPlayer = (rawDmg: number): number => {
        let finalDmg = rawDmg;
        if (s.playerBuffs.defending) {
            finalDmg = Math.max(1, Math.floor(finalDmg * 0.5));
        }
        // Wake up from sleep on damage
        if (s.playerBuffs.sleep) {
            s.playerBuffs.sleep = false;
            s.playerBuffs.sleepTurns = 0;
            s.log.push({ text: `ダメージで目が覚めた！`, type: 'status' });
        }
        s.playerHp = Math.max(0, s.playerHp - finalDmg);
        return finalDmg;
    };

    switch (chosen.type) {
        case 'physical':
        case 'physical_strong': {
            const hitChance = calcHitChance(s.monster.spd, s.playerStats.spd, s.playerBuffs.manusa);
            if (Math.random() < hitChance) {
                let dmg = calcPhysicalDamage(
                    s.monster.atk, s.playerStats.def,
                    chosen.diceCount || 2, s.monsterBuffs.atkStage, s.playerBuffs.defStage
                );
                if (chosen.finalDamageMult) dmg = Math.max(1, Math.floor(dmg * chosen.finalDamageMult));
                const finalDmg = applyDamageToPlayer(dmg);
                s.log.push({ text: `${s.monster.name}の${chosen.name}！ ${finalDmg} ダメージ！`, type: 'enemy_action' });
            } else {
                s.log.push({ text: `${s.monster.name}の${chosen.name}はミス！`, type: 'enemy_action' });
            }
            break;
        }
        case 'critical': {
            const hitChance = calcHitChance(s.monster.spd, s.playerStats.spd, s.playerBuffs.manusa);
            if (Math.random() < hitChance) {
                let dmg = chosen.ignoresDef
                    ? calcCriticalDamage(s.monster.atk, chosen.diceCount || 4, s.monsterBuffs.atkStage)
                    : calcPhysicalDamage(s.monster.atk, s.playerStats.def, chosen.diceCount || 4, s.monsterBuffs.atkStage, s.playerBuffs.defStage);
                const finalDmg = applyDamageToPlayer(dmg);
                s.log.push({ text: `${s.monster.name}の${chosen.name}！💥 ${finalDmg} ダメージ！`, type: 'enemy_action' });
            } else {
                s.log.push({ text: `${s.monster.name}の${chosen.name}はミス！`, type: 'enemy_action' });
            }
            break;
        }
        case 'breath': {
            let dmg = calcBreathDamage(
                chosen.breathBase || 0, chosen.breathDice || 2,
                s.playerStats.def, s.playerStats.int, s.playerBuffs.fubaha
            );
            const finalDmg = applyDamageToPlayer(dmg);
            s.log.push({ text: `${s.monster.name}の${chosen.name}！🔥 ${finalDmg} ダメージ！`, type: 'enemy_action' });
            break;
        }
        case 'spell': {
            let dmg = calcSpellDamage(
                chosen.spellBase || 0, chosen.spellDice || 1, s.monster.int,
                s.playerStats.def, s.playerStats.int, s.playerBuffs.magicBarrier
            );
            const finalDmg = applyDamageToPlayer(dmg);
            s.log.push({ text: `${s.monster.name}の${chosen.name}！✨ ${finalDmg} ダメージ！`, type: 'enemy_action' });
            break;
        }
        case 'status': {
            if (chosen.statusEffect === 'manusa') {
                const chance = Math.min(0.95, (chosen.statusChance || 0.5) * 1.0);
                if (Math.random() < chance) {
                    s.playerBuffs.manusa = true;
                    s.playerBuffs.manusaTurns = 3;
                    s.log.push({ text: `${s.monster.name}の${chosen.name}！ 目がくらんだ！😵`, type: 'status' });
                } else {
                    s.log.push({ text: `${s.monster.name}の${chosen.name}！ しかし効かなかった！`, type: 'status' });
                }
            } else if (chosen.statusEffect === 'rariho') {
                const chance = Math.min(0.95, (chosen.statusChance || 0.4) * 1.0);
                if (Math.random() < chance) {
                    s.playerBuffs.sleep = true;
                    s.playerBuffs.sleepTurns = rollDice(1, 3);
                    s.log.push({ text: `${s.monster.name}の${chosen.name}！ 眠ってしまった！💤`, type: 'status' });
                } else {
                    s.log.push({ text: `${s.monster.name}の${chosen.name}！ しかし効かなかった！`, type: 'status' });
                }
            } else if (chosen.statusEffect === 'stun') {
                s.playerBuffs.stun = true;
                s.log.push({ text: `${s.monster.name}の${chosen.name}！ 動けない！⚡`, type: 'status' });
            } else if (chosen.statusEffect === 'rukani' || chosen.statusEffect === 'rukanan') {
                const drop = chosen.statusEffect === 'rukani' ? -2 : -1;
                s.playerBuffs.defStage = Math.max(-2, s.playerBuffs.defStage + drop);
                s.playerBuffs.defStageTurns = 5;
                s.log.push({ text: `${s.monster.name}の${chosen.name}！ 守備力が下がった！🛡️↓`, type: 'status' });
            }
            break;
        }
        case 'buff': {
            if (chosen.id === 'sukuruto') {
                s.monsterBuffs.defStage = Math.min(2, s.monsterBuffs.defStage + 1);
                s.monsterBuffs.defStageTurns = 5;
                s.log.push({ text: `${s.monster.name}はスクルトを唱えた！ 守備力が上がった！`, type: 'status' });
            } else if (chosen.id === 'baikillto') {
                s.monsterBuffs.atkStage = 2;
                s.monsterBuffs.atkStageTurns = 5;
                s.log.push({ text: `${s.monster.name}はバイキルトを唱えた！ 攻撃力が上がった！💪`, type: 'status' });
            } else if (chosen.id === 'awaken') {
                s.log.push({ text: `${s.monster.name}は魔力覚醒！ 呪文威力が上がった！🔮`, type: 'status' });
            } else {
                s.log.push({ text: `${s.monster.name}は力を溜めている...`, type: 'status' });
            }
            break;
        }
    }

    // Check for player defeat
    if (s.playerHp <= 0) {
        return resolveBattleEnd(s, false);
    }

    // End of round - tick buffs
    s.playerBuffs = tickBuffs(s.playerBuffs);
    s.monsterBuffs = tickBuffs(s.monsterBuffs);
    s.round++;

    // Safety limit
    if (s.round > 50) {
        return resolveBattleEnd(s, false);
    }

    // Next player turn
    s.phase = 'player_turn';
    return s;
};

// ============================================================
// Battle Resolution
// ============================================================
const resolveBattleEnd = (state: BattleState, victory: boolean): BattleState => {
    const s = { ...state, log: [...state.log] };

    if (victory) {
        const goldReward = s.monster.goldMin + Math.floor(Math.random() * (s.monster.goldMax - s.monster.goldMin + 1));
        const mimicMult = s.isMimic ? 1.6 : 1.0;
        s.goldReward = Math.floor(goldReward * mimicMult);
        s.expReward = Math.floor(s.monster.exp * mimicMult);
        s.phase = 'victory';
        s.log.push({ text: `${s.monster.name} を倒した！`, type: 'result' });
        s.log.push({ text: `💰 ${s.goldReward}G と ${s.expReward}EXP を獲得！`, type: 'result' });
    } else {
        s.goldReward = 0;
        s.expReward = 0;
        s.phase = 'defeat';
        s.log.push({ text: `あなたは倒れてしまった...💀`, type: 'result' });
    }

    return s;
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

// ============================================================
// Legacy: Auto-simulate for tileEvents (mimic/ambush only)
// ============================================================
export const simulateSoloBattle = (
    playerStats: PlayerStats,
    monster: MonsterDef,
    playerSpells: string[] = []
): { victory: boolean; playerHpAfter: number; playerMpAfter: number; goldReward: number; expReward: number; monsterName: string } => {
    let state = initBattle(playerStats, monster, playerSpells);

    // Auto-battle loop
    for (let i = 0; i < 100; i++) {
        if (state.phase === 'victory' || state.phase === 'defeat') break;

        if (state.phase === 'player_turn') {
            // Simple AI: heal if low, otherwise attack
            let cmd: PlayerCommand = { type: 'attack' };
            const hpRatio = state.playerHp / state.playerStats.maxHp;
            if (hpRatio < 0.3 && state.playerMp >= 3) {
                if (playerSpells.includes('behoma') && state.playerMp >= 14) cmd = { type: 'spell', spellId: 'behoma' };
                else if (playerSpells.includes('behoim') && state.playerMp >= 7) cmd = { type: 'spell', spellId: 'behoim' };
                else if (playerSpells.includes('behoimi') && state.playerMp >= 5) cmd = { type: 'spell', spellId: 'behoimi' };
                else if (playerSpells.includes('hoimi') && state.playerMp >= 3) cmd = { type: 'spell', spellId: 'hoimi' };
            }
            state = executePlayerAction(state, cmd);
        }
    }

    return {
        victory: state.phase === 'victory',
        playerHpAfter: Math.max(0, state.playerHp),
        playerMpAfter: Math.max(0, state.playerMp),
        goldReward: state.goldReward,
        expReward: state.expReward,
        monsterName: monster.name,
    };
};
