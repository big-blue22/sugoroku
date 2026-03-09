import React, { useState } from 'react';
import { RaidState, PlayerCommand, Player } from '../types';
import { MonsterDef } from '../data/monsters';

interface RaidBattleScreenProps {
    raidState: RaidState;
    monster: MonsterDef;
    myPlayerId: number;
    allPlayers: Player[];
    onCommandSubmit: (command: PlayerCommand) => void;
}

export const RaidBattleScreen: React.FC<RaidBattleScreenProps> = ({ raidState, monster, myPlayerId, allPlayers, onCommandSubmit }) => {
    const [selectedAction, setSelectedAction] = useState<PlayerCommand | null>(null);

    const me = raidState.participants[myPlayerId];
    if (!me) return <div className="p-4 text-white">エラー: レイドに参加していません。</div>;

    const hasSubmitted = me.command !== null;
    const isWaitingForOthers = raidState.status === 'WAITING_FOR_COMMANDS' && hasSubmitted;

    const handleSubmit = () => {
        if (selectedAction) {
            onCommandSubmit(selectedAction);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-100 font-sans z-50">
            <h1 className="text-3xl font-bold mb-4 text-red-500">🔥 レイドバトル 🔥</h1>

            <div className="flex gap-4 w-full max-w-5xl">
                {/* Left: Players */}
                <div className="w-1/3 bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <h2 className="text-xl font-bold mb-4">参加プレイヤー</h2>
                    {Object.values(raidState.participants).map(p => {
                        const pInfo = allPlayers.find(ap => ap.id === p.playerId);
                        return (
                            <div key={p.playerId} className={`p-3 rounded mb-2 border ${p.playerId === myPlayerId ? 'border-yellow-500 bg-slate-700' : 'border-slate-600 bg-slate-700/50'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold">{pInfo?.name || `Player${p.playerId}`} {p.isDead && '💀'}</span>
                                    <span className="text-xs px-2 py-1 bg-slate-900 rounded border border-slate-600">
                                        {p.command ? '入力完了' : '考え中...'}
                                    </span>
                                </div>
                                <div className="flex gap-2 text-sm font-mono">
                                    <span className={p.hp <= 0 ? 'text-red-500' : 'text-green-400'}>HP: {p.hp}/{p.stats.maxHp}</span>
                                    <span className="text-blue-400">MP: {p.mp}/{p.stats.maxMp}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Center/Right: Boss and UI */}
                <div className="w-2/3 flex flex-col gap-4">
                    {/* Boss Info */}
                    <div className="bg-slate-800 p-8 rounded-xl border border-red-900 flex flex-col items-center">
                        <div className="text-6xl mb-4">👑</div>
                        <h2 className="text-3xl font-bold mb-2">{monster.name}</h2>
                        <div className="w-full bg-slate-900 h-6 rounded-full border border-slate-700 overflow-hidden relative">
                            <div
                                className="h-full bg-red-600 transition-all duration-500"
                                style={{ width: `${Math.max(0, (raidState.bossState.hp / raidState.bossState.maxHp) * 100)}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono text-white drop-shadow-md">
                                {raidState.bossState.hp} / {raidState.bossState.maxHp}
                            </div>
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 h-48 overflow-y-auto font-mono text-sm text-slate-300">
                        {raidState.logs.length === 0 ? (
                            <div className="text-slate-500 text-center italic mt-16">戦闘開始！</div>
                        ) : (
                            raidState.logs.map((log, i) => (
                                <div key={i} className="mb-1 pb-1 border-b border-slate-800/50">{log}</div>
                            ))
                        )}
                    </div>

                    {/* Action Menu */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        {me.isDead ? (
                            <div className="text-center text-red-400 font-bold p-4">あなたは死んでいます。観戦中...</div>
                        ) : isWaitingForOthers ? (
                            <div className="text-center text-slate-400 font-bold p-4">他のプレイヤーの入力を待っています...</div>
                        ) : (
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => setSelectedAction({ type: 'attack' })}
                                    className={`px-6 py-3 rounded font-bold transition ${selectedAction?.type === 'attack' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                >
                                    攻撃
                                </button>
                                <button
                                    onClick={() => setSelectedAction({ type: 'defend' })}
                                    className={`px-6 py-3 rounded font-bold transition ${selectedAction?.type === 'defend' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                >
                                    防御
                                </button>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!selectedAction}
                                    className="px-8 py-3 bg-green-600 text-white font-bold rounded shadow hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                                >
                                    決定
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
