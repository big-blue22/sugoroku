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
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-slate-900 p-4 border-b border-red-500/30">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{monster.emoji}</span>
            <div>
              <h2 className="text-xl font-bold text-red-200">⚔️ モンスターとの戦闘!</h2>
              <p className="text-red-400/80 text-sm">{monster.name}が現れた！</p>
            </div>
          </div>
        </div>

        {/* Monster Stats */}
        <div className="p-6">
          <div className="bg-slate-800/80 rounded-xl p-4 mb-6 border border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">モンスター</span>
              <span className="text-xl font-bold text-white flex items-center gap-2">
                {monster.emoji} {monster.name}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-500 mb-1">HP</p>
                <p className="text-2xl font-bold text-red-400">❤️ {monster.hp}</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-500 mb-1">攻撃力</p>
                <p className="text-2xl font-bold text-orange-400">⚔️ {monster.attack}</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-500 mb-1">報酬</p>
                <p className="text-2xl font-bold text-yellow-400">💰 {monster.goldReward}</p>
              </div>
            </div>
          </div>

          {/* Battle Rules */}
          <div className="bg-blue-900/30 rounded-lg p-3 mb-6 border border-blue-500/30">
            <p className="text-xs text-blue-300 text-center">
              🎲 勝利条件: あなたの出目 ≧ モンスターのHP ({monster.hp})
            </p>
          </div>

          {/* Battle State */}
          {!showResult && !isRolling && (
            <div className="text-center">
              {isMyTurn ? (
                <button
                  onClick={onRollDice}
                  disabled={isRolling}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xl font-bold py-4 rounded-xl shadow-lg transform transition-all active:scale-95 border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">🎲</span>
                  サイコロを振って攻撃！
                </button>
              ) : (
                <div className="text-slate-400 animate-pulse">
                  {playerName} のターンです...
                </div>
              )}
            </div>
          )}

          {/* Rolling State */}
          {isRolling && (
            <div className="text-center py-4">
              <div className="text-5xl animate-bounce mb-3">🎲</div>
              <p className="text-lg font-bold text-red-300 animate-pulse">攻撃中...</p>
            </div>
          )}

          {/* Result Display */}
          {showResult && (
            <div className={`text-center p-6 rounded-xl ${isVictory ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
              <div className="text-5xl mb-3">{isVictory ? '🎉' : '💥'}</div>
              
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-1">あなたの出目</p>
                <p className="text-4xl font-bold text-white">🎲 {battleState.playerRoll}</p>
              </div>

              {isVictory ? (
                <div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">勝利！</h3>
                  <p className="text-yellow-400 text-lg font-bold">
                    💰 {battleState.goldEarned} G 獲得！
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-2xl font-bold text-red-400 mb-2">敗北...</h3>
                  <p className="text-orange-400 text-lg font-bold">
                    ⚔️ {battleState.tilesBack} マス後退！
                  </p>
                </div>
              )}

              {isMyTurn && (
                <button
                  onClick={onClose}
                  className={`w-full mt-6 py-3 rounded-xl font-bold transition-all active:scale-95 ${
                    isVictory 
                      ? 'bg-green-600 hover:bg-green-500 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  続ける
                </button>
              )}

              {!isMyTurn && (
                <div className="mt-4 text-slate-500 text-sm animate-pulse">
                  {playerName} の選択を待っています...
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
