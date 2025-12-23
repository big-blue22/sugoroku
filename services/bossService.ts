import { BossState, GameEvent, BossLog } from '../types';

export const BOSS_CONFIG = {
  name: '悪霊の神々 ベリアル',
  maxHp: 20,
  skills: {
    attack: { name: '通常攻撃', chance: 0.25 },
    heal: { name: 'ベホイミ', chance: 0.15 },
    fire: { name: '燃え盛る火炎', chance: 0.15 },
    spell: { name: '攻撃呪文', chance: 0.25 },
    skara: { name: 'スカラ', chance: 0.20 },
  }
};

export interface BattleResult {
  finalBossState: BossState;
  logs: BossLog[]; // Full history
  isVictory: boolean;
  stepsBack: number;
  goldReward: number;
}

// Helper to roll 1-100
const roll100 = () => Math.floor(Math.random() * 100) + 1;

// --- Step-by-Step Battle Logic ---

export const resolvePlayerAttack = (currentState: BossState, diceRoll: number, playerName: string, turnCount: number) => {
    let state = { ...currentState };
    let damage = diceRoll;
    const logs: BossLog[] = [];

    // Skara Check
    if (state.isSkaraActive) {
      damage = Math.floor(diceRoll * 0.5); // 0.5x
      state.isSkaraActive = false; // Wears off
      logs.push({
        turn: turnCount,
        actor: 'boss',
        action: 'スカラ解除',
        description: `${BOSS_CONFIG.name}のスカラが解除された！`
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
      description: `${playerName}の攻撃！ ベリアルに${damage}のダメージを与えた！`,
      currentBossHp: state.currentHp
    };
    logs.push(attackLog);

    const isVictory = state.currentHp <= 0;
    if (isVictory) {
        state.isDefeated = true;
        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '撃破',
            description: `${BOSS_CONFIG.name}を倒した！`
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
    let state = { ...currentState };
    const logs: BossLog[] = [];
    let damageToPlayer = 0;
    let actionType: 'ATTACK' | 'HEAL' | 'BUFF' | 'MAGIC' = 'ATTACK'; // Simplified category

    const roll = roll100();

    if (roll <= 25) {
        // A. Normal Attack
        const isStrong = Math.random() < 0.5;
        damageToPlayer = isStrong ? 12 : 6;
        actionType = 'ATTACK';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '通常攻撃',
            value: damageToPlayer,
            description: `${BOSS_CONFIG.name}の攻撃！ ${playerName}は${damageToPlayer}ダメージを受けた！`
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
            description: `${BOSS_CONFIG.name}はベホイミを唱えた！ HPが${actualHeal}回復した！`,
            currentBossHp: state.currentHp
        });

    } else if (roll <= 55) {
        // C. Fire
        damageToPlayer = 5;
        actionType = 'MAGIC';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '燃え盛る火炎',
            value: damageToPlayer,
            description: `${BOSS_CONFIG.name}は燃え盛る火炎を吐いた！ ${playerName}は${damageToPlayer}ダメージを受けた！`
        });

    } else if (roll <= 80) {
        // D. Spell
        const isLowHp = state.currentHp <= (state.maxHp / 2);
        const spellName = isLowHp ? 'イオナズン' : 'イオラ';
        damageToPlayer = isLowHp ? 8 : 4;
        actionType = 'MAGIC';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: spellName,
            value: damageToPlayer,
            description: `${BOSS_CONFIG.name}は${spellName}を唱えた！ ${playerName}は${damageToPlayer}ダメージを受けた！`
        });

    } else {
        // E. Skara
        state.isSkaraActive = true;
        actionType = 'BUFF';

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: 'スカラ',
            description: `${BOSS_CONFIG.name}はスカラを唱えた！ 守備力が上がった！`
        });
    }

    return {
        newState: state,
        damageToPlayer,
        logs,
        actionType
    };
};
