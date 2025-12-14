import { BossState, GameEvent } from '../types';

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

export interface BossLog {
  turn: number;
  actor: 'player' | 'boss';
  action: string;
  value?: number; // Damage or Heal amount
  description: string;
  currentBossHp?: number; // Snapshot for UI
  isCritical?: boolean;
}

export interface BattleResult {
  finalBossState: BossState;
  logs: BossLog[];
  isVictory: boolean;
  stepsBack: number; // 0 if victory or non-damage ending (shouldn't happen for non-victory unless fled?)
  goldReward: number;
}

// Helper to roll 1-100
const roll100 = () => Math.floor(Math.random() * 100) + 1;
// Helper for Dice 1-6
const rollDice = () => Math.floor(Math.random() * 6) + 1;

export const simulateBattle = (initialState: BossState, playerName: string): BattleResult => {
  // Clone state to avoid mutation
  let state = { ...initialState };
  const logs: BossLog[] = [];
  let stepsBack = 0;
  let isVictory = false;
  let turnCount = 1;

  // Battle Loop
  // Continues until:
  // 1. Boss HP <= 0 (Victory)
  // 2. Boss deals damage (Defeat/Pushback)
  // NOTE: If Boss heals/buffs, loop continues.

  let battleActive = true;

  while (battleActive) {
    // --- 1. Player Turn ---
    const playerDamageRoll = rollDice();
    let actualDamage = playerDamageRoll;

    // Skara Check
    if (state.isSkaraActive) {
      actualDamage = Math.floor(playerDamageRoll * 0.5); // 0.5x
      // Skara wears off after taking damage
      state.isSkaraActive = false;
      logs.push({
        turn: turnCount,
        actor: 'boss',
        action: 'スカラ解除',
        description: `${BOSS_CONFIG.name}のスカラが解除された！`
      });
    }

    // Apply Damage
    state.currentHp -= actualDamage;
    // Cap at 0 (can go negative logic-wise but clean for display)
    // Actually keep it purely numeric until check.

    logs.push({
      turn: turnCount,
      actor: 'player',
      action: '攻撃',
      value: actualDamage,
      description: `${playerName}の攻撃！ ベリアルに${actualDamage}のダメージを与えた！`,
      currentBossHp: Math.max(0, state.currentHp)
    });

    // Check Victory
    if (state.currentHp <= 0) {
      state.currentHp = 0;
      state.isDefeated = true;
      isVictory = true;
      battleActive = false;
      logs.push({
        turn: turnCount,
        actor: 'boss',
        action: '撃破',
        description: `${BOSS_CONFIG.name}を倒した！`
      });
      break;
    }

    // --- 2. Boss Turn ---
    const roll = roll100();

    // Determine Action
    // Cumulative probabilities:
    // Attack: 25% (1-25)
    // Heal: 15% (26-40)
    // Fire: 15% (41-55)
    // Spell: 25% (56-80)
    // Skara: 20% (81-100)

    if (roll <= 25) {
        // A. Normal Attack
        // 50% chance for 6 damage, 50% chance for 12 damage
        const isStrong = Math.random() < 0.5;
        const damage = isStrong ? 12 : 6;

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '通常攻撃',
            value: damage,
            description: `${BOSS_CONFIG.name}の攻撃！ ${playerName}は${damage}ダメージを受けた！`
        });

        stepsBack = damage;
        battleActive = false; // Player hit -> End Loop

    } else if (roll <= 40) {
        // B. Behoimi (Heal)
        const healAmount = 3;
        const oldHp = state.currentHp;
        state.currentHp = Math.min(state.maxHp, state.currentHp + healAmount);
        const actualHeal = state.currentHp - oldHp;

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: 'ベホイミ',
            value: actualHeal,
            description: `${BOSS_CONFIG.name}はベホイミを唱えた！ HPが${actualHeal}回復した！`,
            currentBossHp: state.currentHp
        });
        // Non-damage -> Continue Loop

    } else if (roll <= 55) {
        // C. Fire
        const damage = 5;
        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: '燃え盛る火炎',
            value: damage,
            description: `${BOSS_CONFIG.name}は燃え盛る火炎を吐いた！ ${playerName}は${damage}ダメージを受けた！`
        });

        stepsBack = damage;
        battleActive = false;

    } else if (roll <= 80) {
        // D. Spell
        // HP <= 50% (10) -> Ionazun (8 dmg)
        // Else -> Iora (4 dmg)
        const isLowHp = state.currentHp <= (state.maxHp / 2);
        const spellName = isLowHp ? 'イオナズン' : 'イオラ';
        const damage = isLowHp ? 8 : 4;

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: spellName,
            value: damage,
            description: `${BOSS_CONFIG.name}は${spellName}を唱えた！ ${playerName}は${damage}ダメージを受けた！`
        });

        stepsBack = damage;
        battleActive = false;

    } else {
        // E. Skara
        state.isSkaraActive = true;

        logs.push({
            turn: turnCount,
            actor: 'boss',
            action: 'スカラ',
            description: `${BOSS_CONFIG.name}はスカラを唱えた！ 守備力が上がった！`
        });
        // Non-damage -> Continue Loop
    }

    turnCount++;
  }

  return {
    finalBossState: state,
    logs,
    isVictory,
    stepsBack,
    goldReward: isVictory ? 1000 : 0
  };
};
