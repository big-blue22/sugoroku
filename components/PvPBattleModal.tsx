import React, { useState, useEffect } from 'react';
import { Player, PvPBattleState } from '../types';

interface PvPBattleModalProps {
    isOpen: boolean;
    battleState: PvPBattleState | null;
    challenger: Player | null;
    defender: Player | null;
    myPlayerId: number | null;
    onRoll: () => void;
    onComplete: () => void;
    isRolling: boolean;
}

const PvPBattleModal: React.FC<PvPBattleModalProps> = ({
    isOpen,
    battleState,
    challenger,
    defender,
    myPlayerId,
    onRoll,
    onComplete,
    isRolling,
}) => {
    const [showResult, setShowResult] = useState(false);
    const [animatingDice, setAnimatingDice] = useState<'challenger' | 'defender' | null>(null);

    useEffect(() => {
        if (battleState?.phase === 'RESULT' && !showResult) {
            // Delay to show the dramatic result
            setTimeout(() => setShowResult(true), 500);
        }
    }, [battleState?.phase]);

    useEffect(() => {
        if (!isOpen) {
            setShowResult(false);
            setAnimatingDice(null);
        }
    }, [isOpen]);

    if (!isOpen || !battleState || !challenger || !defender) return null;

    const isChallenger = myPlayerId === battleState.challengerId;
    const isDefender = myPlayerId === battleState.defenderId;
    const isMyTurn =
        (battleState.phase === 'CHALLENGER_ROLL' && isChallenger) ||
        (battleState.phase === 'DEFENDER_ROLL' && isDefender);

    const getPhaseText = () => {
        switch (battleState.phase) {
            case 'WAITING':
                return 'バトル開始！';
            case 'CHALLENGER_ROLL':
                return `${challenger.name} の攻撃！`;
            case 'DEFENDER_ROLL':
                return `${defender.name} の反撃！`;
            case 'RESULT':
                return '決着！';
            default:
                return '';
        }
    };

    const winner = battleState.winnerId !== null
        ? (battleState.winnerId === challenger.id ? challenger : defender)
        : null;
    const loser = battleState.winnerId !== null
        ? (battleState.winnerId === challenger.id ? defender : challenger)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-red-500/50 rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-slide-up">

                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 p-4 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg relative z-10 flex items-center justify-center gap-2">
                        <span className="text-3xl">⚔️</span>
                        PvP バトル！
                        <span className="text-3xl">⚔️</span>
                    </h2>
                    <p className="text-white/80 text-sm mt-1 relative z-10">{getPhaseText()}</p>
                </div>

                {/* Battle Arena */}
                <div className="p-6">

                    {/* VS Display */}
                    <div className="flex items-center justify-between mb-6">

                        {/* Challenger */}
                        <div className={`flex-1 text-center p-4 rounded-xl transition-all ${battleState.phase === 'CHALLENGER_ROLL'
                                ? 'bg-red-500/20 border-2 border-red-500 scale-105'
                                : 'bg-slate-800/50 border border-slate-600'
                            }`}>
                            <div className="text-5xl mb-2">{challenger.avatar}</div>
                            <p className="font-bold text-white truncate">{challenger.name}</p>
                            <p className="text-yellow-400 text-sm">💰 {challenger.gold || 0}G</p>

                            {/* Challenger Dice */}
                            {battleState.challengerRoll !== null && (
                                <div className="mt-3 text-4xl font-bold text-white bg-slate-900 rounded-lg py-2 border border-slate-600 animate-bounce">
                                    🎲 {battleState.challengerRoll}
                                </div>
                            )}
                        </div>

                        {/* VS */}
                        <div className="mx-4 text-3xl font-bold text-red-500 animate-pulse">
                            VS
                        </div>

                        {/* Defender */}
                        <div className={`flex-1 text-center p-4 rounded-xl transition-all ${battleState.phase === 'DEFENDER_ROLL'
                                ? 'bg-blue-500/20 border-2 border-blue-500 scale-105'
                                : 'bg-slate-800/50 border border-slate-600'
                            }`}>
                            <div className="text-5xl mb-2">{defender.avatar}</div>
                            <p className="font-bold text-white truncate">{defender.name}</p>
                            <p className="text-yellow-400 text-sm">💰 {defender.gold || 0}G</p>

                            {/* Defender Dice */}
                            {battleState.defenderRoll !== null && (
                                <div className="mt-3 text-4xl font-bold text-white bg-slate-900 rounded-lg py-2 border border-slate-600 animate-bounce">
                                    🎲 {battleState.defenderRoll}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stakes Display */}
                    <div className="text-center mb-6 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                        <p className="text-yellow-400 text-sm font-bold">
                            💰 賭け金: {battleState.goldStolen}G
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                            敗者から勝者へゴールドが移動します
                        </p>
                    </div>

                    {/* Rolling Animation */}
                    {isRolling && (
                        <div className="text-center mb-6 animate-fade-in">
                            <div className="text-6xl animate-bounce mb-2">🎲</div>
                            <p className="text-white font-bold animate-pulse">サイコロを振っています...</p>
                        </div>
                    )}

                    {/* Result Display */}
                    {showResult && winner && loser && (
                        <div className="text-center mb-6 animate-fade-in">
                            <div className="text-6xl mb-3">
                                {battleState.winnerId === myPlayerId ? '🎉' : '💀'}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                {winner.name} の勝利！
                            </h3>
                            <p className="text-yellow-400 text-lg">
                                💰 {battleState.goldStolen}G を獲得！
                            </p>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-4">
                        {battleState.phase === 'RESULT' ? (
                            showResult && (
                                <button
                                    onClick={onComplete}
                                    className={`w-full py-4 rounded-xl font-bold text-xl transition-all active:scale-95 shadow-lg ${battleState.winnerId === myPlayerId
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white'
                                            : 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white'
                                        }`}
                                >
                                    続ける
                                </button>
                            )
                        ) : isMyTurn ? (
                            <button
                                onClick={onRoll}
                                disabled={isRolling}
                                className={`w-full py-4 rounded-xl font-bold text-xl transition-all shadow-lg flex items-center justify-center gap-2 ${isRolling
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white active:scale-95'
                                    }`}
                            >
                                <span className="text-2xl">🎲</span>
                                {isRolling ? '振っています...' : 'サイコロを振る！'}
                            </button>
                        ) : (
                            <div className="text-center text-slate-400 animate-pulse py-4 bg-slate-800/50 rounded-lg border border-slate-600">
                                {battleState.phase === 'CHALLENGER_ROLL'
                                    ? `${challenger.name} がサイコロを振っています...`
                                    : `${defender.name} がサイコロを振っています...`
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PvPBattleModal;
