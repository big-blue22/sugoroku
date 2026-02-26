// ============================================================
// components/BattleScreen.tsx - 対話型戦闘UIコンポーネント
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { PlayerStats } from '../types';
import {
    BattleState,
    BattlePhase,
    BattleLogEntry,
    PlayerCommand,
    initBattle,
    executePlayerAction,
} from '../services/battleEngine';
import { MonsterDef } from '../data/monsters';
import { PLAYER_SPELLS, SpellDef } from '../data/spells';

interface BattleScreenProps {
    playerStats: PlayerStats;
    monster: MonsterDef;
    playerSpells: string[];
    isMimic?: boolean;
    onBattleEnd: (result: {
        victory: boolean;
        playerHpAfter: number;
        playerMpAfter: number;
        goldReward: number;
        expReward: number;
    }) => void;
}

// --- Monster Emoji Map ---
const getMonsterEmoji = (name: string): string => {
    if (name.includes('スライム')) return '🟢';
    if (name.includes('ゴースト')) return '👻';
    if (name.includes('ガイコツ')) return '💀';
    if (name.includes('クラーゴン')) return '🐙';
    if (name.includes('ドラゴン')) return '🐉';
    if (name.includes('キラーマシン')) return '🤖';
    if (name.includes('ヤマタノオロチ')) return '🐍';
    if (name.includes('ボストロール')) return '👹';
    if (name.includes('レヴナント')) return '🧟';
    if (name.includes('バラモス')) return '😈';
    if (name.includes('ゼッペル')) return '🧙';
    if (name.includes('ネクロバルサ')) return '☠️';
    if (name.includes('ミミック')) return '📦';
    return '👾';
};

// --- HP Bar Component ---
const HpBar: React.FC<{ current: number; max: number; color: string; label: string }> = ({ current, max, color, label }) => {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    const barColor = pct > 50 ? color : pct > 25 ? '#eab308' : '#ef4444';

    return (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-300">{label}</span>
                <span className="font-mono text-slate-400">{current} / {max}</span>
            </div>
            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
            </div>
        </div>
    );
};

// --- Main Battle Screen ---
const BattleScreen: React.FC<BattleScreenProps> = ({
    playerStats,
    monster,
    playerSpells,
    isMimic = false,
    onBattleEnd,
}) => {
    const [battleState, setBattleState] = useState<BattleState>(() =>
        initBattle(playerStats, monster, playerSpells, isMimic)
    );
    const [showSpells, setShowSpells] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [shakeMonster, setShakeMonster] = useState(false);
    const [shakePlayer, setShakePlayer] = useState(false);
    const [flashScreen, setFlashScreen] = useState('');
    const logEndRef = useRef<HTMLDivElement>(null);
    const prevLogLength = useRef(1);

    // When new log entries appear, animate
    useEffect(() => {
        if (battleState.log.length > prevLogLength.current) {
            const newEntries = battleState.log.slice(prevLogLength.current);
            for (const entry of newEntries) {
                if (entry.type === 'player_action') setShakeMonster(true);
                if (entry.type === 'enemy_action') setShakePlayer(true);
                if (entry.type === 'enemy_action' && entry.text.includes('ダメージ')) {
                    setFlashScreen('red');
                }
            }
            prevLogLength.current = battleState.log.length;

            // Reset animations
            setTimeout(() => {
                setShakeMonster(false);
                setShakePlayer(false);
                setFlashScreen('');
            }, 500);
        }
    }, [battleState.log.length]);

    // Scroll log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [battleState.log.length]);

    // Handle player command
    const handleCommand = (cmd: PlayerCommand) => {
        if (isAnimating) return;
        if (battleState.phase !== 'player_turn') return;

        setIsAnimating(true);
        setShowSpells(false);

        // Small delay for dramatic effect
        setTimeout(() => {
            const newState = executePlayerAction(battleState, cmd);
            setBattleState(newState);
            setIsAnimating(false);
        }, 300);
    };

    // Get available spells
    const availableSpells = playerSpells
        .map(id => PLAYER_SPELLS.find(s => s.id === id))
        .filter((s): s is SpellDef => s !== undefined);

    const isPlayerTurn = battleState.phase === 'player_turn' && !isAnimating;
    const isBattleOver = battleState.phase === 'victory' || battleState.phase === 'defeat';
    const monsterEmoji = getMonsterEmoji(monster.name);
    const monsterHpPct = (battleState.monsterHp / monster.hp) * 100;

    // Get log entry color
    const getLogColor = (type: BattleLogEntry['type']): string => {
        switch (type) {
            case 'player_action': return 'text-blue-300';
            case 'enemy_action': return 'text-red-300';
            case 'heal': return 'text-green-300';
            case 'status': return 'text-yellow-300';
            case 'result': return 'text-amber-400 font-bold';
            case 'damage': return 'text-orange-300';
            default: return 'text-slate-300';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
        >
            {/* Flash overlay */}
            {flashScreen && (
                <div
                    className="absolute inset-0 z-[101] pointer-events-none animate-pulse"
                    style={{ backgroundColor: flashScreen, opacity: 0.15 }}
                />
            )}

            <div className="w-full max-w-2xl mx-4 flex flex-col h-[95vh] max-h-[700px]">

                {/* === TOP: Monster Area === */}
                <div className="bg-gradient-to-b from-indigo-900/60 to-slate-900/80 backdrop-blur-md rounded-t-2xl border border-indigo-500/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className={`text-4xl ${shakeMonster ? 'animate-bounce' : ''}`}
                                style={{ filter: monsterHpPct <= 25 ? 'hue-rotate(60deg) brightness(0.8)' : 'none' }}>
                                {monsterEmoji}
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-white">{monster.name}</h2>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span>ATK:{monster.atk}</span>
                                    <span>DEF:{monster.def}</span>
                                    <span>SPD:{monster.spd}</span>
                                    {monster.isBoss && <span className="px-1.5 py-0.5 bg-red-500/30 text-red-300 rounded font-bold">BOSS</span>}
                                </div>
                            </div>
                        </div>
                        <div className="text-right text-sm text-slate-400">
                            R.{battleState.round}
                        </div>
                    </div>
                    <HpBar current={battleState.monsterHp} max={monster.hp} color="#ef4444" label="HP" />
                </div>

                {/* === MIDDLE: Battle Log === */}
                <div className="flex-1 bg-slate-900/90 border-x border-slate-700/50 overflow-hidden flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                        {battleState.log.map((entry, i) => (
                            <div
                                key={i}
                                className={`text-sm py-1 px-2 rounded ${getLogColor(entry.type)} ${i === battleState.log.length - 1 ? 'bg-slate-800/50' : ''}`}
                                style={{
                                    animation: i >= prevLogLength.current - 2 ? 'fadeIn 0.5s ease-out' : 'none',
                                }}
                            >
                                {entry.text}
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                </div>

                {/* === BOTTOM: Player Area + Commands === */}
                <div className={`bg-gradient-to-t from-slate-800/90 to-slate-900/80 backdrop-blur-md rounded-b-2xl border border-slate-600/30 ${shakePlayer ? 'animate-pulse' : ''}`}>
                    {/* Player Stats */}
                    <div className="p-3 border-b border-slate-700/50">
                        <div className="grid grid-cols-2 gap-2">
                            <HpBar current={battleState.playerHp} max={playerStats.maxHp} color="#22c55e" label="❤️ HP" />
                            <HpBar current={battleState.playerMp} max={playerStats.maxMp} color="#3b82f6" label="💧 MP" />
                        </div>
                        {/* Buff indicators */}
                        <div className="flex gap-1 mt-2 flex-wrap">
                            {battleState.playerBuffs.defending && (
                                <span className="px-1.5 py-0.5 bg-blue-500/30 text-blue-300 text-[10px] rounded">🛡️防御中</span>
                            )}
                            {battleState.playerBuffs.defStage > 0 && (
                                <span className="px-1.5 py-0.5 bg-green-500/30 text-green-300 text-[10px] rounded">🛡️DEF+{battleState.playerBuffs.defStage}</span>
                            )}
                            {battleState.playerBuffs.defStage < 0 && (
                                <span className="px-1.5 py-0.5 bg-red-500/30 text-red-300 text-[10px] rounded">🛡️DEF{battleState.playerBuffs.defStage}</span>
                            )}
                            {battleState.playerBuffs.magicBarrier > 0 && (
                                <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-[10px] rounded">🔮バリア{battleState.playerBuffs.magicBarrier}</span>
                            )}
                            {battleState.playerBuffs.fubaha > 0 && (
                                <span className="px-1.5 py-0.5 bg-cyan-500/30 text-cyan-300 text-[10px] rounded">❄️フバーハ{battleState.playerBuffs.fubaha}</span>
                            )}
                            {battleState.playerBuffs.manusa && (
                                <span className="px-1.5 py-0.5 bg-yellow-500/30 text-yellow-300 text-[10px] rounded">😵マヌーサ</span>
                            )}
                            {battleState.playerBuffs.sleep && (
                                <span className="px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 text-[10px] rounded">💤睡眠</span>
                            )}
                        </div>
                    </div>

                    {/* Commands */}
                    <div className="p-3">
                        {!isBattleOver && !showSpells && (
                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    disabled={!isPlayerTurn}
                                    onClick={() => handleCommand({ type: 'attack' })}
                                    className={`py-3 rounded-xl font-bold text-sm transition-all border
                    ${isPlayerTurn
                                            ? 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white border-red-400/50 shadow-lg shadow-red-900/30 active:scale-95'
                                            : 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="text-xl mb-0.5">⚔️</div>
                                    攻撃
                                </button>
                                <button
                                    disabled={!isPlayerTurn}
                                    onClick={() => handleCommand({ type: 'defend' })}
                                    className={`py-3 rounded-xl font-bold text-sm transition-all border
                    ${isPlayerTurn
                                            ? 'bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-blue-400/50 shadow-lg shadow-blue-900/30 active:scale-95'
                                            : 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="text-xl mb-0.5">🛡️</div>
                                    防御
                                </button>
                                <button
                                    disabled={!isPlayerTurn || availableSpells.length === 0}
                                    onClick={() => setShowSpells(true)}
                                    className={`py-3 rounded-xl font-bold text-sm transition-all border
                    ${isPlayerTurn && availableSpells.length > 0
                                            ? 'bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 text-white border-purple-400/50 shadow-lg shadow-purple-900/30 active:scale-95'
                                            : 'bg-slate-700 text-slate-500 border-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="text-xl mb-0.5">✨</div>
                                    呪文
                                </button>
                                <button
                                    disabled={true}
                                    className="py-3 rounded-xl font-bold text-sm bg-slate-700 text-slate-500 border border-slate-600 cursor-not-allowed"
                                >
                                    <div className="text-xl mb-0.5">🎒</div>
                                    道具
                                </button>
                            </div>
                        )}

                        {/* Spell Selection */}
                        {!isBattleOver && showSpells && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-purple-300">✨ 呪文を選択</span>
                                    <button
                                        onClick={() => setShowSpells(false)}
                                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/50"
                                    >
                                        ← 戻る
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto custom-scrollbar">
                                    {availableSpells.map(spell => {
                                        const canCast = battleState.playerMp >= spell.mpCost;
                                        return (
                                            <button
                                                key={spell.id}
                                                disabled={!isPlayerTurn || !canCast}
                                                onClick={() => handleCommand({ type: 'spell', spellId: spell.id })}
                                                className={`px-3 py-2 rounded-lg text-left transition-all text-sm
                          ${isPlayerTurn && canCast
                                                        ? 'bg-purple-600/30 hover:bg-purple-500/40 text-purple-200 border border-purple-500/30 active:scale-95'
                                                        : 'bg-slate-700/30 text-slate-500 border border-slate-600/30 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold">{spell.name}</span>
                                                    <span className={`text-xs ${canCast ? 'text-blue-300' : 'text-red-400'}`}>
                                                        MP{spell.mpCost}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{spell.description}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Battle Over */}
                        {isBattleOver && (
                            <div className="text-center">
                                <div className={`text-3xl mb-2 ${battleState.phase === 'victory' ? 'animate-bounce' : ''}`}>
                                    {battleState.phase === 'victory' ? '🎉' : '💀'}
                                </div>
                                <h3 className={`text-xl font-bold mb-1 ${battleState.phase === 'victory' ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {battleState.phase === 'victory' ? '勝利！' : '敗北...'}
                                </h3>
                                {battleState.phase === 'victory' && (
                                    <p className="text-sm text-slate-300 mb-3">
                                        💰 {battleState.goldReward}G   📈 {battleState.expReward}EXP
                                    </p>
                                )}
                                {battleState.phase === 'defeat' && (
                                    <p className="text-sm text-slate-400 mb-3">村に戻されます...</p>
                                )}
                                <button
                                    onClick={() => onBattleEnd({
                                        victory: battleState.phase === 'victory',
                                        playerHpAfter: battleState.playerHp,
                                        playerMpAfter: battleState.playerMp,
                                        goldReward: battleState.goldReward,
                                        expReward: battleState.expReward,
                                    })}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 border border-white/10"
                                >
                                    {battleState.phase === 'victory' ? '報酬を受け取る' : '続ける'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CSS Animation */}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default BattleScreen;
