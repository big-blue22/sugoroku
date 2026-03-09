// ============================================================
// data/spells.ts - プレイヤー呪文定義
// ============================================================

export type SpellTarget = 'self' | 'single_ally' | 'single_enemy' | 'all_enemies' | 'all_allies';
export type SpellCategory = 'heal' | 'support' | 'debuff' | 'attack';

export interface SpellDef {
    id: string;
    name: string;
    mpCost: number;
    category: SpellCategory;
    target: SpellTarget;
    description: string;

    // Heal spells
    healBase?: number;
    healDice?: number; // Nd6
    healIntScale?: boolean; // floor(INT/2)
    fullHeal?: boolean; // ベホマ

    // Buff/Debuff
    buffType?: 'def_stage' | 'atk_stage' | 'magic_barrier' | 'fubaha' | 'manusa' | 'rukanan';
    buffValue?: number; // +1, -1, -2, or set_to value
    buffSetTo?: boolean; // if true, buffValue is set directly
    buffDuration?: number;

    // Attack magic
    spellBase?: number;
    spellDice?: number; // Nd6
}

// --- Player Spells ---
export const PLAYER_SPELLS: SpellDef[] = [
    // 回復
    {
        id: 'hoimi', name: 'ホイミ', mpCost: 3, category: 'heal',
        target: 'single_ally', description: '味方1人のHPを少し回復',
        healBase: 4, healDice: 1, healIntScale: true,
    },
    {
        id: 'behoimi', name: 'ベホイミ', mpCost: 5, category: 'heal',
        target: 'single_ally', description: '味方1人のHPを回復',
        healBase: 8, healDice: 2, healIntScale: true,
    },
    {
        id: 'behoim', name: 'ベホイム', mpCost: 7, category: 'heal',
        target: 'single_ally', description: '味方1人のHPを大きく回復',
        healBase: 14, healDice: 1, healIntScale: true,
    },
    {
        id: 'behoma', name: 'ベホマ', mpCost: 14, category: 'heal',
        target: 'single_ally', description: '味方1人のHPを全回復',
        fullHeal: true,
    },

    // 補助
    {
        id: 'sukuruto', name: 'スクルト', mpCost: 4, category: 'support',
        target: 'self', description: '自身のDEF段階を+1（最大+2）',
        buffType: 'def_stage', buffValue: 1, buffDuration: 5,
    },
    {
        id: 'magic_barrier', name: 'マジックバリア', mpCost: 4, category: 'support',
        target: 'self', description: '呪文ダメージを軽減',
        buffType: 'magic_barrier', buffValue: 1, buffDuration: 5,
    },
    {
        id: 'fubaha', name: 'フバーハ', mpCost: 5, category: 'support',
        target: 'self', description: 'ブレスダメージを軽減',
        buffType: 'fubaha', buffValue: 1, buffDuration: 5,
    },
    {
        id: 'sukara', name: 'スカラ', mpCost: 8, category: 'support',
        target: 'self', description: '自身のDEF段階を+2にセット',
        buffType: 'def_stage', buffValue: 2, buffSetTo: true, buffDuration: 5,
    },

    // 妨害
    {
        id: 'manusa', name: 'マヌーサ', mpCost: 4, category: 'debuff',
        target: 'single_enemy', description: '敵の命中率を低下',
        buffType: 'manusa', buffDuration: 3,
    },
    {
        id: 'rukanan', name: 'ルカナン', mpCost: 3, category: 'debuff',
        target: 'single_enemy', description: '敵のDEF段階を-1',
        buffType: 'def_stage', buffValue: -1, buffDuration: 5,
    },
    {
        id: 'rukani', name: 'ルカニ', mpCost: 6, category: 'debuff',
        target: 'single_enemy', description: '敵のDEF段階を-2',
        buffType: 'def_stage', buffValue: -2, buffDuration: 5,
    },
];

// Shop spell availability per zone
export const SPELL_SHOP: Record<string, { spellId: string; price: number }[]> = {
    Z1: [{ spellId: 'hoimi', price: 150 }],
    Z2: [
        { spellId: 'sukuruto', price: 280 },
        { spellId: 'rukanan', price: 280 },
        { spellId: 'manusa', price: 280 },
    ],
    Z3: [
        { spellId: 'behoimi', price: 400 },
        { spellId: 'magic_barrier', price: 480 },
    ],
    Z4: [
        { spellId: 'behoim', price: 650 },
        { spellId: 'fubaha', price: 560 },
    ],
    Z5: [{ spellId: 'rukani', price: 650 }],
    Z6: [
        { spellId: 'behoma', price: 2200 },
        { spellId: 'sukara', price: 1400 },
    ],
};

// Inn prices per zone
export const INN_PRICES: Record<string, number> = {
    Z1: 80, Z2: 140, Z3: 220, Z4: 320, Z5: 460, Z6: 650, Z7: 900,
};

export const getSpellById = (id: string): SpellDef | undefined => {
    return PLAYER_SPELLS.find(s => s.id === id);
};

// --- Items (Consumables) ---
export interface ItemDef {
    id: string;
    name: string;
    price: number;
    description: string;
}

export const ITEMS: ItemDef[] = [
    { id: 'boost_s', name: 'ブーストダイスS', price: 80, description: '攻撃ダイス+1d6' },
    { id: 'boost_m', name: 'ブーストダイスM', price: 150, description: '攻撃ダイス+2d6' },
    { id: 'boost_l', name: 'ブーストダイスL', price: 210, description: '攻撃ダイス+3d6' },
    { id: 'trap_guard', name: 'トラップガード', price: 260, description: '罠を1回防ぐ(所持上限1)' },
    { id: 'slow_dice_1', name: 'のろのろダイス', price: 90, description: '次の移動ダイスを1d4にする' },
    { id: 'slow_dice_2', name: '超のろのろダイス', price: 140, description: '次の移動ダイスを1d3にする' },
];

export const ITEM_SHOP: string[] = ['boost_s', 'boost_m', 'boost_l', 'trap_guard', 'slow_dice_1', 'slow_dice_2'];
