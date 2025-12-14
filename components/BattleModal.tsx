import React, { useState } from 'react';
import { Monster, BattleState } from '../types';

interface BattleModalProps {
  isOpen: boolean;
  monster: Monster | null;
  playerName: string;
  isMyTurn: boolean;
  battleState: BattleState;
  onRollDice: () => void;
  onClose: () => void;
  isRolling: boolean;
}

const BattleModal: React.FC<BattleModalProps> = ({
  isOpen,
  monster,
  playerName,
  isMyTurn,
  battleState,
  onRollDice,
  onClose,
  isRolling,
}) => {
  if (!isOpen || !monster) return null;

  const showResult = battleState.result !== 'pending' && battleState.result !== null;
  const isVictory = battleState.result === 'victory';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border-2 border-red-500/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up">

        {/* Main Content Area */}
        <div className="p-8 text-center">

            {/* Monster Display (Visible during Action, Rolling, and Defeat) */}
            {(isRolling || !showResult || !isVictory) && (
                <div className="flex flex-col items-center">
                    {/* Monster Name (Top) */}
                    <h2 className="text-2xl font-bold text-white mb-6 tracking-wider">
                        {monster.name}
                    </h2>

                    {/* Monster Image (Center) */}
                    <div className="relative mb-10">
                        {/* Glow effect behind emoji */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="text-9xl relative z-10 filter drop-shadow-2xl transform hover:scale-110 transition-transform duration-300">
                            {monster.emoji}
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Rolling State */}
            {isRolling ? (
                <div className="py-8 animate-fade-in">
                    <div className="text-6xl animate-bounce mb-6">🎲</div>
                    <p className="text-xl font-bold text-white animate-pulse">
                        サイコロをふっています（戦闘中）
                    </p>
                </div>
            ) : showResult ? (
                /* 2. Result State */
                <div className={`py-4 rounded-xl ${isVictory ? 'bg-green-900/20' : 'bg-red-900/20'} animate-fade-in`}>
                    <div className="text-6xl mb-4">{isVictory ? '🎉' : '💥'}</div>

                    <div className="mb-6">
                        <p className="text-slate-400 text-sm mb-1">あなたの出目</p>
                        <p className="text-5xl font-bold text-white">🎲 {battleState.playerRoll}</p>
                    </div>

                    {isVictory ? (
                        <div className="mb-6">
                            <h3 className="text-3xl font-bold text-green-400 mb-2">勝利！</h3>
                        </div>
                    ) : (
                        <div className="mb-6">
                            <h3 className="text-3xl font-bold text-red-400 mb-2">敗北...</h3>
                        </div>
                    )}

                    {isMyTurn ? (
                        <button
                            onClick={onClose}
                            className={`w-full py-4 rounded-xl font-bold text-xl transition-all active:scale-95 shadow-lg ${
                                isVictory
                                ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/30'
                                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30'
                            }`}
                        >
                            続ける
                        </button>
                    ) : (
                        <div className="mt-4 text-slate-500 text-sm animate-pulse">
                            {playerName} の選択を待っています...
                        </div>
                    )}
                </div>
            ) : (
                /* 3. Action State (Initial) - Button Only (Monster is handled above) */
                <div className="flex flex-col items-center">
                    {/* Action Button */}
                    {isMyTurn ? (
                        <button
                            onClick={onRollDice}
                            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xl font-bold py-4 rounded-xl shadow-lg transform transition-all active:scale-95 border border-white/10 flex items-center justify-center gap-2"
                        >
                            <span className="text-2xl">🎲</span>
                            サイコロを振る
                        </button>
                    ) : (
                        <div className="text-slate-400 animate-pulse bg-slate-800/50 py-3 px-6 rounded-lg w-full">
                            {playerName} のターンです...
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default BattleModal;
