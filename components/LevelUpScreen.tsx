// ============================================================
// components/LevelUpScreen.tsx - ステ振りUI
// ============================================================
import React, { useState } from 'react';
import { PlayerStats } from '../types';

interface LevelUpScreenProps {
    playerStats: PlayerStats;
    onConfirm: (allocations: StatAllocations) => void;
}

export interface StatAllocations {
    hp: number;
    mp: number;
    atk: number;
    def: number;
    spd: number;
    int: number;
}

const STAT_CONFIG = [
    { key: 'hp' as const, label: 'HP', icon: '❤️', desc: '+6 per SP', perPoint: 6, color: '#22c55e' },
    { key: 'mp' as const, label: 'MP', icon: '💧', desc: '+2 per SP', perPoint: 2, color: '#3b82f6' },
    { key: 'atk' as const, label: 'ATK', icon: '⚔️', desc: '+1 per SP', perPoint: 1, color: '#ef4444' },
    { key: 'def' as const, label: 'DEF', icon: '🛡️', desc: '+1 per SP', perPoint: 1, color: '#f59e0b' },
    { key: 'spd' as const, label: 'SPD', icon: '💨', desc: '+1 per SP', perPoint: 1, color: '#14b8a6' },
    { key: 'int' as const, label: 'INT', icon: '🔮', desc: '+1 per SP', perPoint: 1, color: '#a855f7' },
];

const LevelUpScreen: React.FC<LevelUpScreenProps> = ({ playerStats, onConfirm }) => {
    const [allocations, setAllocations] = useState<StatAllocations>({
        hp: 0, mp: 0, atk: 0, def: 0, spd: 0, int: 0,
    });

    const totalUsed = Object.values(allocations).reduce((s, v) => s + v, 0);
    const remaining = playerStats.sp - totalUsed;

    const addPoint = (stat: keyof StatAllocations) => {
        if (remaining <= 0) return;
        setAllocations(prev => ({ ...prev, [stat]: prev[stat] + 1 }));
    };

    const removePoint = (stat: keyof StatAllocations) => {
        if (allocations[stat] <= 0) return;
        setAllocations(prev => ({ ...prev, [stat]: prev[stat] - 1 }));
    };

    const getPreviewValue = (key: keyof StatAllocations): string => {
        const cfg = STAT_CONFIG.find(c => c.key === key)!;
        const bonus = allocations[key] * cfg.perPoint;
        if (key === 'hp') return `${playerStats.maxHp} → ${playerStats.maxHp + bonus}`;
        if (key === 'mp') return `${playerStats.maxMp} → ${playerStats.maxMp + bonus}`;
        return `${playerStats[key]} → ${playerStats[key] + bonus}`;
    };

    const handleConfirm = () => {
        if (totalUsed === 0 && remaining > 0) return; // Must allocate at least something or all
        onConfirm(allocations);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
        >
            <div className="w-full max-w-md mx-4">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-5xl mb-3 animate-bounce">🎉</div>
                    <h1 className="text-3xl font-bold text-yellow-400 mb-1">
                        レベルアップ！
                    </h1>
                    <p className="text-lg text-white">
                        Lv.{playerStats.level - 1} → <span className="text-yellow-300 font-bold">Lv.{playerStats.level}</span>
                    </p>
                </div>

                {/* SP Counter */}
                <div className="bg-indigo-900/60 backdrop-blur-md rounded-2xl border border-indigo-500/30 p-4 mb-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-indigo-300">残りSP</span>
                        <div className="flex items-center gap-2">
                            {[...Array(playerStats.sp)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-4 h-4 rounded-full border-2 transition-all ${i < remaining
                                            ? 'bg-yellow-400 border-yellow-300 shadow-sm shadow-yellow-400/50'
                                            : 'bg-slate-600 border-slate-500'
                                        }`}
                                />
                            ))}
                            <span className="text-xl font-mono font-bold text-yellow-400 ml-2">
                                {remaining}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stat Allocation */}
                <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 space-y-3">
                    {STAT_CONFIG.map(cfg => (
                        <div key={cfg.key} className="flex items-center gap-3">
                            <div className="w-8 text-center text-lg">{cfg.icon}</div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold text-slate-200">{cfg.label}</span>
                                    <span className="text-xs text-slate-400 font-mono">
                                        {getPreviewValue(cfg.key)}
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-500">{cfg.desc}</div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => removePoint(cfg.key)}
                                    disabled={allocations[cfg.key] <= 0}
                                    className={`w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-all
                    ${allocations[cfg.key] > 0
                                            ? 'bg-slate-700 hover:bg-slate-600 text-white active:scale-90'
                                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    −
                                </button>
                                <span className={`w-6 text-center font-bold text-lg ${allocations[cfg.key] > 0 ? 'text-yellow-400' : 'text-slate-600'
                                    }`}>
                                    {allocations[cfg.key]}
                                </span>
                                <button
                                    onClick={() => addPoint(cfg.key)}
                                    disabled={remaining <= 0}
                                    className={`w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center transition-all
                    ${remaining > 0
                                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-90 shadow-md shadow-indigo-900/30'
                                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Confirm Button */}
                <button
                    onClick={handleConfirm}
                    disabled={remaining > 0}
                    className={`w-full mt-4 py-4 rounded-2xl font-bold text-lg transition-all border
            ${remaining === 0
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white border-yellow-400/30 shadow-lg shadow-yellow-900/30 active:scale-95'
                            : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                        }`}
                >
                    {remaining === 0 ? '✨ 確定する' : `あと ${remaining}SP 振ってください`}
                </button>
            </div>
        </div>
    );
};

export default LevelUpScreen;
