// ============================================================
// data/monsters.ts - 雑魚モンスター＆ボスデータ
// ============================================================

export interface MonsterActionDef {
    id: string;
    name: string;
    weight: number;
    type: 'physical' | 'physical_strong' | 'critical' | 'breath' | 'spell' | 'status' | 'buff' | 'special';
    // physical
    diceCount?: number; // Nd6
    // breath
    breathBase?: number;
    breathDice?: number;
    // spell
    spellBase?: number;
    spellDice?: number;
    // AOE
    isAOE?: boolean;
    // status
    statusEffect?: 'manusa' | 'rariho' | 'stun' | 'rukani' | 'rukanan';
    statusChance?: number;
    // critical
    ignoresDef?: boolean;
    // special flags
    battleOnce?: boolean; // 1戦闘1回
    finalDamageMult?: number; // 最終ダメージ倍率
    consecutive_ban?: boolean; // 2連続禁止
}

export interface MonsterDef {
    id: string;
    name: string;
    zone: number; // 1-7
    isBoss: boolean;
    hp: number;
    atk: number;
    def: number;
    spd: number;
    int: number;
    // Resistances
    manusaResist: number;
    sleepResist: number;
    stunResist: number;
    // Rewards (range for regular, total for boss)
    goldMin: number;
    goldMax: number;
    exp: number;
    // Actions
    actions: MonsterActionDef[];
    // Boss phase B actions (HP <= 50%)
    phaseBActions?: MonsterActionDef[];
    // Boss phase B HP threshold (default 0.5)
    phaseBThreshold?: number;
}

// ============================================================
// REGULAR MONSTERS (ソロ戦闘)
// ============================================================

export const REGULAR_MONSTERS: MonsterDef[] = [
    // --- Z1 ---
    {
        id: 'z1_slime', name: 'スライム', zone: 1, isBoss: false,
        hp: 30, atk: 10, def: 10, spd: 10, int: 4,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 30, goldMax: 60, exp: 20,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 80, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 20, type: 'physical_strong', diceCount: 3 },
        ],
    },
    // --- Z2 ---
    {
        id: 'z2_slime', name: 'スライム', zone: 2, isBoss: false,
        hp: 38, atk: 12, def: 12, spd: 12, int: 4,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 45, goldMax: 90, exp: 30,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 75, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 25, type: 'physical_strong', diceCount: 3 },
        ],
    },
    {
        id: 'z2_ghost', name: 'ゴースト', zone: 2, isBoss: false,
        hp: 42, atk: 12, def: 10, spd: 14, int: 10,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 55, goldMax: 110, exp: 35,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 45, type: 'physical', diceCount: 2 },
            { id: 'manusa', name: 'マヌーサ', weight: 25, type: 'status', statusEffect: 'manusa', statusChance: 0.5, consecutive_ban: true },
            { id: 'rariho', name: 'ラリホー', weight: 30, type: 'status', statusEffect: 'rariho', statusChance: 0.4, consecutive_ban: true },
        ],
    },
    // --- Z3 ---
    {
        id: 'z3_slime', name: 'スライム', zone: 3, isBoss: false,
        hp: 46, atk: 14, def: 14, spd: 13, int: 5,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 70, goldMax: 130, exp: 45,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 70, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 30, type: 'physical_strong', diceCount: 3 },
        ],
    },
    {
        id: 'z3_ghost', name: 'ゴースト', zone: 3, isBoss: false,
        hp: 54, atk: 14, def: 12, spd: 15, int: 12,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 90, goldMax: 170, exp: 55,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 40, type: 'physical', diceCount: 2 },
            { id: 'manusa', name: 'マヌーサ', weight: 25, type: 'status', statusEffect: 'manusa', statusChance: 0.5, consecutive_ban: true },
            { id: 'rariho', name: 'ラリホー', weight: 35, type: 'status', statusEffect: 'rariho', statusChance: 0.4, consecutive_ban: true },
        ],
    },
    {
        id: 'z3_skeleton', name: 'ガイコツ', zone: 3, isBoss: false,
        hp: 62, atk: 18, def: 16, spd: 12, int: 6,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 110, goldMax: 210, exp: 70,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 55, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 25, type: 'physical_strong', diceCount: 3 },
            { id: 'rukani', name: 'ルカニ', weight: 20, type: 'status', statusEffect: 'rukani' },
        ],
    },
    // --- Z4 ---
    {
        id: 'z4_slime', name: 'スライム', zone: 4, isBoss: false,
        hp: 58, atk: 16, def: 16, spd: 14, int: 6,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 110, goldMax: 200, exp: 70,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 65, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 35, type: 'physical_strong', diceCount: 3 },
        ],
    },
    {
        id: 'z4_ghost', name: 'ゴースト', zone: 4, isBoss: false,
        hp: 70, atk: 16, def: 14, spd: 16, int: 14,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 140, goldMax: 260, exp: 90,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 35, type: 'physical', diceCount: 2 },
            { id: 'manusa', name: 'マヌーサ', weight: 25, type: 'status', statusEffect: 'manusa', statusChance: 0.5, consecutive_ban: true },
            { id: 'rariho', name: 'ラリホー', weight: 40, type: 'status', statusEffect: 'rariho', statusChance: 0.4, consecutive_ban: true },
        ],
    },
    {
        id: 'z4_skeleton', name: 'ガイコツ', zone: 4, isBoss: false,
        hp: 84, atk: 20, def: 18, spd: 13, int: 8,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 180, goldMax: 330, exp: 110,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 50, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 30, type: 'physical_strong', diceCount: 3 },
            { id: 'rukani', name: 'ルカニ', weight: 20, type: 'status', statusEffect: 'rukani' },
        ],
    },
    {
        id: 'z4_kragon', name: 'クラーゴン', zone: 4, isBoss: false,
        hp: 92, atk: 20, def: 20, spd: 14, int: 10,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 220, goldMax: 400, exp: 140,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 55, type: 'physical', diceCount: 2 },
            { id: 'breath', name: 'ブレス', weight: 45, type: 'breath', breathBase: 10, breathDice: 2, consecutive_ban: true },
        ],
    },
    // --- Z5 ---
    {
        id: 'z5_ghost', name: 'ゴースト', zone: 5, isBoss: false,
        hp: 88, atk: 18, def: 16, spd: 17, int: 16,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 220, goldMax: 400, exp: 140,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 30, type: 'physical', diceCount: 2 },
            { id: 'manusa', name: 'マヌーサ', weight: 25, type: 'status', statusEffect: 'manusa', statusChance: 0.5, consecutive_ban: true },
            { id: 'rariho', name: 'ラリホー', weight: 45, type: 'status', statusEffect: 'rariho', statusChance: 0.4, consecutive_ban: true },
        ],
    },
    {
        id: 'z5_skeleton', name: 'ガイコツ', zone: 5, isBoss: false,
        hp: 110, atk: 22, def: 20, spd: 14, int: 10,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 260, goldMax: 480, exp: 170,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 45, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 35, type: 'physical_strong', diceCount: 3 },
            { id: 'rukani', name: 'ルカニ', weight: 20, type: 'status', statusEffect: 'rukani' },
        ],
    },
    {
        id: 'z5_kragon', name: 'クラーゴン', zone: 5, isBoss: false,
        hp: 125, atk: 22, def: 22, spd: 15, int: 12,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 320, goldMax: 600, exp: 210,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 45, type: 'physical', diceCount: 2 },
            { id: 'breath', name: 'ブレス', weight: 55, type: 'breath', breathBase: 12, breathDice: 2, consecutive_ban: true },
        ],
    },
    {
        id: 'z5_dragon', name: 'ドラゴン', zone: 5, isBoss: false,
        hp: 140, atk: 24, def: 24, spd: 16, int: 12,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 420, goldMax: 780, exp: 280,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 45, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 15, type: 'physical_strong', diceCount: 3 },
            { id: 'breath', name: 'ブレス', weight: 40, type: 'breath', breathBase: 12, breathDice: 2, consecutive_ban: true },
        ],
    },
    // --- Z6 ---
    {
        id: 'z6_skeleton', name: 'ガイコツ', zone: 6, isBoss: false,
        hp: 150, atk: 24, def: 22, spd: 15, int: 12,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 420, goldMax: 760, exp: 260,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 40, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 40, type: 'physical_strong', diceCount: 3 },
            { id: 'rukani', name: 'ルカニ', weight: 20, type: 'status', statusEffect: 'rukani' },
        ],
    },
    {
        id: 'z6_kragon', name: 'クラーゴン', zone: 6, isBoss: false,
        hp: 170, atk: 24, def: 24, spd: 16, int: 14,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 520, goldMax: 940, exp: 320,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 40, type: 'physical', diceCount: 2 },
            { id: 'breath', name: 'ブレス', weight: 60, type: 'breath', breathBase: 14, breathDice: 2, consecutive_ban: true },
        ],
    },
    {
        id: 'z6_dragon', name: 'ドラゴン', zone: 6, isBoss: false,
        hp: 210, atk: 28, def: 26, spd: 18, int: 14,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 700, goldMax: 1300, exp: 420,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 40, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 15, type: 'physical_strong', diceCount: 3 },
            { id: 'breath', name: 'ブレス', weight: 45, type: 'breath', breathBase: 14, breathDice: 2, consecutive_ban: true },
        ],
    },
    {
        id: 'z6_killermachine', name: 'キラーマシン', zone: 6, isBoss: false,
        hp: 240, atk: 30, def: 30, spd: 20, int: 10,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 900, goldMax: 1700, exp: 560,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 45, type: 'physical', diceCount: 2 },
            { id: 'strong', name: '強攻撃', weight: 35, type: 'physical_strong', diceCount: 3 },
            { id: 'critical', name: '痛恨の一撃', weight: 20, type: 'critical', diceCount: 4, ignoresDef: false, consecutive_ban: true },
        ],
    },
];

// ============================================================
// BOSS MONSTERS
// ============================================================

export const BOSS_MONSTERS: MonsterDef[] = [
    // Z1 ヤマタノオロチ
    {
        id: 'z1_boss', name: 'ヤマタノオロチ', zone: 1, isBoss: true,
        hp: 220, atk: 16, def: 22, spd: 12, int: 6,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 3000, goldMax: 3000, exp: 450,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 60, type: 'physical', diceCount: 2 },
            { id: 'fire_breath', name: '燃え盛る火炎', weight: 40, type: 'breath', breathBase: 13, breathDice: 2, isAOE: true, consecutive_ban: true },
        ],
        phaseBActions: [
            { id: 'attack', name: '通常攻撃', weight: 80, type: 'physical', diceCount: 2 },
            { id: 'fire_breath_weak', name: '火の息', weight: 20, type: 'breath', breathBase: 10, breathDice: 2, isAOE: true, consecutive_ban: true },
        ],
    },
    // Z2 ボストロール
    {
        id: 'z2_boss', name: 'ボストロール', zone: 2, isBoss: true,
        hp: 320, atk: 22, def: 30, spd: 10, int: 6,
        manusaResist: 1.5, sleepResist: 1.75, stunResist: 1.0,
        goldMin: 3600, goldMax: 3600, exp: 600,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 50, type: 'physical', diceCount: 2 },
            { id: 'critical', name: '痛恨の一撃', weight: 25, type: 'critical', diceCount: 4, ignoresDef: true, consecutive_ban: true },
            { id: 'rukanan', name: 'ルカナン', weight: 25, type: 'status', statusEffect: 'rukanan', isAOE: true },
        ],
    },
    // Z3 レヴナント
    {
        id: 'z3_boss', name: 'レヴナント', zone: 3, isBoss: true,
        hp: 360, atk: 18, def: 24, spd: 16, int: 14,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 4500, goldMax: 4500, exp: 800,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 35, type: 'physical', diceCount: 2 },
            { id: 'manusa', name: 'マヌーサ', weight: 20, type: 'status', statusEffect: 'manusa', statusChance: 0.5 },
            { id: 'mera', name: 'メラ', weight: 20, type: 'spell', spellBase: 1, spellDice: 1 },
            { id: 'io', name: 'イオ', weight: 25, type: 'spell', spellBase: 2, spellDice: 1, isAOE: true, consecutive_ban: true },
        ],
        phaseBActions: [
            { id: 'fire_breath', name: '激しい炎', weight: 35, type: 'breath', breathBase: 11, breathDice: 2, isAOE: true, consecutive_ban: true },
            { id: 'begiragon', name: 'ベギラゴン', weight: 35, type: 'spell', spellBase: 5, spellDice: 1, isAOE: true, consecutive_ban: true },
            { id: 'awaken', name: '魔力覚醒', weight: 30, type: 'buff' },
        ],
    },
    // Z4 バラモス
    {
        id: 'z4_boss', name: 'バラモス', zone: 4, isBoss: true,
        hp: 520, atk: 22, def: 34, spd: 14, int: 16,
        manusaResist: 0.4, sleepResist: 0.25, stunResist: 1.0,
        goldMin: 6000, goldMax: 6000, exp: 1100,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 25, type: 'physical', diceCount: 2 },
            { id: 'merami', name: 'メラミ', weight: 20, type: 'spell', spellBase: 3, spellDice: 1 },
            { id: 'iora', name: 'イオラ', weight: 20, type: 'spell', spellBase: 4, spellDice: 1, isAOE: true, consecutive_ban: true },
            { id: 'manusa', name: 'マヌーサ', weight: 15, type: 'status', statusEffect: 'manusa', statusChance: 0.5 },
            { id: 'fire_breath', name: '激しい炎', weight: 20, type: 'breath', breathBase: 13, breathDice: 2, isAOE: true, consecutive_ban: true },
        ],
        phaseBActions: [
            { id: 'attack', name: '通常攻撃', weight: 15, type: 'physical', diceCount: 2 },
            { id: 'critical', name: '痛恨の一撃', weight: 15, type: 'critical', diceCount: 4, ignoresDef: true, consecutive_ban: true },
            { id: 'iora', name: 'イオラ', weight: 20, type: 'spell', spellBase: 4, spellDice: 1, isAOE: true, consecutive_ban: true },
            { id: 'merami', name: 'メラミ', weight: 15, type: 'spell', spellBase: 3, spellDice: 1 },
            { id: 'fire_breath', name: '激しい炎', weight: 20, type: 'breath', breathBase: 13, breathDice: 2, isAOE: true, consecutive_ban: true },
            { id: 'manusa', name: 'マヌーサ', weight: 15, type: 'status', statusEffect: 'manusa', statusChance: 0.5 },
        ],
    },
    // Z5 ゼッペル
    {
        id: 'z5_boss', name: 'ゼッペル', zone: 5, isBoss: true,
        hp: 480, atk: 20, def: 26, spd: 16, int: 18,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 10800, goldMax: 10800, exp: 1700,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 25, type: 'physical', diceCount: 2 },
            { id: 'sukuruto', name: 'スクルト', weight: 25, type: 'buff' },
            { id: 'iora', name: 'イオラ', weight: 25, type: 'spell', spellBase: 4, spellDice: 1, isAOE: true, consecutive_ban: true },
            { id: 'merami', name: 'メラミ', weight: 25, type: 'spell', spellBase: 3, spellDice: 1 },
        ],
        phaseBActions: [
            { id: 'merazoma', name: 'メラゾーマ', weight: 30, type: 'spell', spellBase: 6, spellDice: 1 },
            { id: 'sukuruto', name: 'スクルト', weight: 20, type: 'buff' },
            { id: 'iora', name: 'イオラ', weight: 20, type: 'spell', spellBase: 4, spellDice: 1, isAOE: true, consecutive_ban: true },
            { id: 'merami', name: 'メラミ', weight: 15, type: 'spell', spellBase: 3, spellDice: 1 },
            { id: 'attack', name: '通常攻撃', weight: 15, type: 'physical', diceCount: 2 },
        ],
    },
    // Z6 ネクロバルサ
    {
        id: 'z6_boss', name: 'ネクロバルサ', zone: 6, isBoss: true,
        hp: 720, atk: 22, def: 38, spd: 18, int: 12,
        manusaResist: 1.0, sleepResist: 1.0, stunResist: 1.0,
        goldMin: 15000, goldMax: 15000, exp: 2400,
        actions: [
            { id: 'attack', name: '通常攻撃', weight: 40, type: 'physical', diceCount: 2 },
            { id: 'rariho', name: 'ラリホー', weight: 30, type: 'status', statusEffect: 'rariho', statusChance: 0.4, consecutive_ban: true },
            { id: 'critical', name: '痛恨の一撃', weight: 30, type: 'critical', diceCount: 4, ignoresDef: true, consecutive_ban: true },
        ],
        phaseBActions: [
            { id: 'baikillto', name: 'バイキルト', weight: 25, type: 'buff' },
            { id: 'attack', name: '通常攻撃', weight: 30, type: 'physical', diceCount: 2 },
            { id: 'rariho', name: 'ラリホー', weight: 20, type: 'status', statusEffect: 'rariho', statusChance: 0.4, consecutive_ban: true },
            { id: 'critical', name: '痛恨の一撃', weight: 25, type: 'critical', diceCount: 4, ignoresDef: true, consecutive_ban: true },
        ],
    },
];

// Get random monster for a zone
export const getRandomMonsterForZone = (zoneNum: number): MonsterDef | null => {
    const candidates = REGULAR_MONSTERS.filter(m => m.zone === zoneNum);
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
};

// Get boss for a zone
export const getBossForZone = (zoneNum: number): MonsterDef | null => {
    return BOSS_MONSTERS.find(m => m.zone === zoneNum) || null;
};
