import { BossState, BossLog, BossType, DamageType } from '../types';

export interface BossSkill {
    name: string;
    chance: number; // Percent chance (0-1)
    type: 'ATTACK' | 'HEAL' | 'BUFF' | 'MAGIC' | 'DEBUFF';
    damageType?: DamageType;
}

export interface BossConfig {
    name: string;
    maxHp: number;
    skills: Record<string, BossSkill>;
    type: BossType;
    goldReward: number;
}

export const BELIAL_CONFIG: BossConfig = {
    type: 'BELIAL',
    name: '悪霊の神々 ベリアル',
    maxHp: 20,
    goldReward: 1000,
    skills: {
        attack: { name: '通常攻撃', chance: 0.25, type: 'ATTACK', damageType: 'physical' },
        heal: { name: 'ベホイミ', chance: 0.15, type: 'HEAL' },
        fire: { name: '燃え盛る火炎', chance: 0.15, type: 'MAGIC', damageType: 'breath' },
        spell: { name: '攻撃呪文', chance: 0.25, type: 'MAGIC', damageType: 'magic' },
        skara: { name: 'スカラ', chance: 0.20, type: 'BUFF' },
    }
};

export const BAZUZU_CONFIG: BossConfig = {
    type: 'BAZUZU',
    name: '悪霊の神々 バズズ',
    maxHp: 25,
    goldReward: 1100,
    skills: {
        attack: { name: '通常攻撃', chance: 0.25, type: 'ATTACK', damageType: 'physical' }, // 25% crit if HP < half
        zaraki: { name: 'ザラキ', chance: 0.25, type: 'MAGIC', damageType: 'magic' }, // 10% instant death (move to 0)
        mahotone: { name: 'マホトーン', chance: 0.20, type: 'DEBUFF', damageType: 'magic' }, // Block items
        breath: { name: 'こごえる吹雪', chance: 0.10, type: 'MAGIC', damageType: 'breath' }, // 7 dmg
        magic: { name: 'ベギラゴン', chance: 0.10, type: 'MAGIC', damageType: 'magic' }, // 6 dmg
        rariho: { name: 'ラリホー', chance: 0.10, type: 'DEBUFF', damageType: 'magic' }, // Sleep 2 turns (50% chance)
    }
};

export const ATLAS_CONFIG: BossConfig = {
    type: 'ATLAS',
    name: '悪霊の神々 アトラス',
    maxHp: 30,
    goldReward: 1200,
    skills: {
        attack: { name: '攻撃', chance: 0.90, type: 'ATTACK', damageType: 'physical' },
        wait: { name: '様子見', chance: 0.10, type: 'BUFF' }, // Acts as a "pass"
        charge: { name: '力溜め', chance: 0.20, type: 'BUFF' }, // Low HP only
    }
};

export const getBossConfig = (type: BossType = 'BELIAL'): BossConfig => {
    if (type === 'ATLAS') return ATLAS_CONFIG;
    return type === 'BAZUZU' ? BAZUZU_CONFIG : BELIAL_CONFIG;
};

// Deprecated export for backward compatibility during refactor
export const BOSS_CONFIG = BELIAL_CONFIG;

export interface BattleResult {
    finalBossState: BossState;
    logs: BossLog[]; // Full history
    isVictory: boolean;
    stepsBack: number;
    goldReward: number;
    specialEffect?: {
        type: 'ZARAKI' | 'RARIHO' | 'MAHOTONE';
        value?: number;
    };
}

// Helper to roll 1-100
const roll100 = () => Math.floor(Math.random() * 100) + 1;

// --- Step-by-Step Battle Logic ---

export const resolvePlayerAttack = (currentState: BossState, diceRoll: number, playerName: string, turnCount: number) => {
    let state = { ...currentState };
    let damage = diceRoll;
    const logs: BossLog[] = [];
    const config = getBossConfig(state.type);

    // Skara Check (Belial Only really, but generic check is fine)
    if (state.isSkaraActive) {
        damage = Math.floor(diceRoll * 0.5); // 0.5x
        state.isSkaraActive = false; // Wears off
        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: 'スカラ解除',
            description: `${config.name}のスカラが解除された！`
        });
    }

    state.currentHp -= damage;
    // Logical clamp (UI handles display clamping)
    if (state.currentHp < 0) state.currentHp = 0;

    const attackLog: BossLog = {
        turn: turnCount,
        actor: 'player',
        action: '攻撃',
        value: damage,
        description: `${playerName}の攻撃！ ${config.name}に${damage}のダメージを与えた！`,
        currentBossHp: state.currentHp,
        damageType: 'physical'
    };
    logs.push(attackLog);

    const isVictory = state.currentHp <= 0;
    if (isVictory) {
        state.isDefeated = true;
        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '撃破',
            description: `${config.name}を倒した！`
        });
    }

    return {
        newState: state,
        damageDealt: damage,
        logs,
        isVictory
    };
};

export const resolveBossAction = (currentState: BossState, playerName: string, turnCount: number) => {
    // Dispatcher
    if (currentState.type === 'ATLAS') {
        return resolveAtlasAction(currentState, playerName, turnCount);
    } else if (currentState.type === 'BAZUZU') {
        return resolveBazuzuAction(currentState, playerName, turnCount);
    } else {
        return resolveBelialAction(currentState, playerName, turnCount);
    }
};

// --- Belial Logic (Refactored) ---
const resolveBelialAction = (currentState: BossState, playerName: string, turnCount: number) => {
    let state = { ...currentState };
    const logs: BossLog[] = [];
    let damageToPlayer = 0;
    let actionType: 'ATTACK' | 'HEAL' | 'BUFF' | 'MAGIC' = 'ATTACK';
    const config = BELIAL_CONFIG;

    const roll = roll100();

    // Chances: Attack 25, Heal 15, Fire 15, Spell 25, Skara 20
    // Cumulative: 25 -> 40 -> 55 -> 80 -> 100

    if (roll <= 25) {
        // A. Normal Attack (Physical)
        const isStrong = Math.random() < 0.5;
        damageToPlayer = isStrong ? 12 : 6;
        actionType = 'ATTACK';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '通常攻撃',
            value: damageToPlayer,
            description: `${config.name}の攻撃！ ${playerName}は${damageToPlayer}ダメージを受けた！`,
            damageType: 'physical'
        });

    } else if (roll <= 40) {
        // B. Behoimi (Heal)
        const healAmount = 3;
        const oldHp = state.currentHp;
        state.currentHp = Math.min(state.maxHp, state.currentHp + healAmount);
        const actualHeal = state.currentHp - oldHp;
        actionType = 'HEAL';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: 'ベホイミ',
            value: actualHeal,
            description: `${config.name}はベホイミを唱えた！ HPが${actualHeal}回復した！`,
            currentBossHp: state.currentHp
        });

    } else if (roll <= 55) {
        // C. Fire (Breath)
        damageToPlayer = 5;
        actionType = 'MAGIC';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '燃え盛る火炎',
            value: damageToPlayer,
            description: `${config.name}は燃え盛る火炎を吐いた！ ${playerName}は${damageToPlayer}ダメージを受けた！`,
            damageType: 'breath'
        });

    } else if (roll <= 80) {
        // D. Spell (Magic)
        const isLowHp = state.currentHp <= (state.maxHp / 2);
        const spellName = isLowHp ? 'イオナズン' : 'イオラ';
        damageToPlayer = isLowHp ? 8 : 4;
        actionType = 'MAGIC';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: spellName,
            value: damageToPlayer,
            description: `${config.name}は${spellName}を唱えた！ ${playerName}は${damageToPlayer}ダメージを受けた！`,
            damageType: 'magic'
        });

    } else {
        // E. Skara
        state.isSkaraActive = true;
        actionType = 'BUFF';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: 'スカラ',
            description: `${config.name}はスカラを唱えた！ 守備力が上がった！`
        });
    }

    return {
        newState: state,
        damageToPlayer,
        logs,
        actionType,
        specialEffect: undefined
    };
};

// --- Bazuzu Logic ---
const resolveBazuzuAction = (currentState: BossState, playerName: string, turnCount: number) => {
    let state = { ...currentState };
    const logs: BossLog[] = [];
    let damageToPlayer = 0;
    let actionType: string = 'ATTACK';
    const config = BAZUZU_CONFIG;
    let specialEffect: { type: 'ZARAKI' | 'RARIHO' | 'MAHOTONE', value?: number } | undefined = undefined;

    const roll = roll100();

    // Chances:
    // Attack 25
    // Zaraki 25
    // Mahotone 20
    // Breath 10
    // Magic 10
    // Rariho 10

    // Cumulative:
    // 25 -> Attack
    // 50 -> Zaraki
    // 70 -> Mahotone
    // 80 -> Breath
    // 90 -> Magic
    // 100 -> Rariho

    if (roll <= 25) {
        // A. Normal Attack (Physical)
        // If HP <= 50%, 25% chance of Crit (14), else 7
        const isLowHp = state.currentHp <= (state.maxHp / 2);
        let dmg = 7;
        let isCrit = false;

        if (isLowHp && Math.random() < 0.25) {
            dmg = 14;
            isCrit = true;
        }

        damageToPlayer = dmg;
        actionType = 'ATTACK';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: isCrit ? '痛恨の一撃' : '通常攻撃',
            value: dmg,
            description: isCrit
                ? `${config.name}の痛恨の一撃！ ${playerName}に${dmg}の大ダメージ！`
                : `${config.name}の攻撃！ ${playerName}は${dmg}ダメージを受けた！`,
            damageType: 'physical',
            isCritical: isCrit
        });

    } else if (roll <= 50) {
        // B. Zaraki (Instant Death / Move to 0)
        // 25% chance to use. Success rate 10%.
        const success = Math.random() < 0.10;
        actionType = 'MAGIC';

        if (success) {
            specialEffect = { type: 'ZARAKI' };
            logs.push({
                turn: turnCount,
                actor: 'boss',
                action: 'ザラキ',
                description: `${config.name}はザラキを唱えた！ 即死呪文が命中！ ${playerName}は目の前が真っ暗になった... (振り出しに戻る)`,
                damageType: 'magic'
            });
        } else {
            logs.push({
                turn: turnCount,
                actor: 'boss',
                action: 'ザラキ',
                description: `${config.name}はザラキを唱えた！ しかし、${playerName}には効かなかった！`,
                damageType: 'magic'
            });
        }

    } else if (roll <= 70) {
        // C. Mahotone (Seal Items)
        // 20% chance. Duration = 2 (Current + Next)
        actionType = 'DEBUFF';
        specialEffect = { type: 'MAHOTONE', value: 2 };

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: 'マホトーン',
            description: `${config.name}はマホトーンを唱えた！ ${playerName}の呪文とアイテムが封じられた！`,
            damageType: 'magic'
        });

    } else if (roll <= 80) {
        // D. Cogoeru Fubuki (Breath)
        // 10% chance. 7 Dmg.
        damageToPlayer = 7;
        actionType = 'MAGIC';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: 'こごえる吹雪',
            value: 7,
            description: `${config.name}はこごえる吹雪を吐いた！ ${playerName}は凍えそうな寒さで${damageToPlayer}ダメージを受けた！`,
            damageType: 'breath'
        });

    } else if (roll <= 90) {
        // E. Begiragon (Magic)
        // 10% chance. 6 Dmg.
        damageToPlayer = 6;
        actionType = 'MAGIC';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: 'ベギラゴン',
            value: 6,
            description: `${config.name}はベギラゴンを唱えた！ 閃光が走り、${playerName}は${damageToPlayer}ダメージを受けた！`,
            damageType: 'magic'
        });

    } else {
        // F. Rariho (Sleep)
        // 10% chance to use. 50% chance to succeed.
        // Sleep for 2 turns (skips).
        const success = Math.random() < 0.50;
        actionType = 'DEBUFF';

        if (success) {
            specialEffect = { type: 'RARIHO', value: 2 };
            logs.push({
                turn: turnCount,
                actor: 'boss',
                action: 'ラリホー',
                description: `${config.name}はラリホーを唱えた！ ${playerName}は眠ってしまった... (2ターン行動不能)`,
                damageType: 'magic'
            });
        } else {
             logs.push({
                turn: turnCount,
                actor: 'boss',
                action: 'ラリホー',
                description: `${config.name}はラリホーを唱えた！ しかし、${playerName}は目をぱっちり開けている！`,
                damageType: 'magic'
            });
        }
    }

    return {
        newState: state,
        damageToPlayer,
        logs,
        actionType,
        specialEffect
    };
};

// --- Atlas Logic ---
const resolveAtlasAction = (currentState: BossState, playerName: string, turnCount: number) => {
    let state = { ...currentState };
    const logs: BossLog[] = [];
    let damageToPlayer = 0;
    let actionType: string = 'ATTACK';
    const config = ATLAS_CONFIG;

    // Check for existing Charge
    const isCharged = state.isChargeActive;
    // Always consume charge
    if (isCharged) {
        state.isChargeActive = false;
    }

    const roll = roll100();
    const currentHp = state.currentHp;
    const isLowHp = currentHp <= (state.maxHp / 2); // <= 15

    // Decision Logic
    // If High HP (>15): 90% Attack, 10% Wait
    // If Low HP (<=15): 70% Attack, 20% Charge, 10% Wait

    // We can map this to 0-100 ranges.
    let decision: 'ATTACK' | 'CHARGE' | 'WAIT' = 'ATTACK';

    if (!isLowHp) {
        if (roll <= 90) decision = 'ATTACK';
        else decision = 'WAIT';
    } else {
        if (roll <= 70) decision = 'ATTACK';
        else if (roll <= 90) decision = 'CHARGE'; // 71-90 (20%)
        else decision = 'WAIT'; // 91-100 (10%)
    }

    if (decision === 'ATTACK') {
        // Attack Logic: 20% Crit (16 dmg), 80% Normal (8 dmg)
        // Sub-roll for crit
        const critRoll = Math.random();
        const isCrit = critRoll < 0.20;

        let baseDmg = isCrit ? 16 : 8;

        // Apply Charge Multiplier
        if (isCharged) {
            baseDmg *= 2;
        }

        damageToPlayer = baseDmg;
        actionType = 'ATTACK';

        const chargedText = isCharged ? '（力溜め効果で2倍！）' : '';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: isCrit ? '痛恨の一撃' : '攻撃',
            value: damageToPlayer,
            description: isCrit
                ? `${config.name}の痛恨の一撃！${chargedText} ${playerName}に${damageToPlayer}の大ダメージ！`
                : `${config.name}の攻撃！${chargedText} ${playerName}は${damageToPlayer}ダメージを受けた！`,
            damageType: 'physical',
            isCritical: isCrit
        });

    } else if (decision === 'CHARGE') {
        // Charge Logic
        state.isChargeActive = true;
        actionType = 'BUFF';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '力溜め',
            description: `${config.name}は力を溜めている... 次のターンの攻撃威力が2倍になる！`,
        });

    } else {
        // Wait Logic
        actionType = 'BUFF'; // technically nothing

        // If charge was active and we waited, it's wasted (consumed at top of function).
        // Log explicitly if charge was wasted? Or just generic message.
        const wastedText = isCharged ? '（力溜めが無駄になった...）' : '';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '様子見',
            description: `${config.name}は様子を見ている... 何もしなかった。${wastedText}`,
        });
    }

    return {
        newState: state,
        damageToPlayer,
        logs,
        actionType,
        specialEffect: undefined
    };
};
