import React, { useState, useEffect, useRef } from 'react';
import { BOSS_CONFIG, BattleResult, resolvePlayerAttack, resolveBossAction } from '../services/bossService';
import { BossState, Player, BossLog } from '../types';
import Dice2D from './Dice2D';

interface BossBattleOverlayProps {
  initialBossState: BossState;
  player: Player;
  onComplete: (result: BattleResult) => void;
}

type Phase = 'START' | 'PLAYER_TURN' | 'PLAYER_ROLLING' | 'PLAYER_RESULT' | 'BOSS_TURN' | 'BOSS_RESULT' | 'RESULT';

const BossBattleOverlay: React.FC<BossBattleOverlayProps> = ({ initialBossState, player, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('START');

  // Local Battle State
  const [bossState, setBossState] = useState<BossState>({ ...initialBossState });
  const [logs, setLogs] = useState<BossLog[]>(initialBossState.logs || []);
  const [turnCount, setTurnCount] = useState(1);
  const [lastDiceValue, setLastDiceValue] = useState<number | null>(null);
  const [stepsBack, setStepsBack] = useState(0);
  const [isVictory, setIsVictory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Phase Transition Logic
  useEffect(() => {
    if (phase === 'PLAYER_RESULT') {
        const timer = setTimeout(() => {
            if (bossState.currentHp <= 0) {
                // Victory immediately
                setIsVictory(true);
                setPhase('RESULT');
            } else {
                setPhase('BOSS_TURN');
            }
        }, 1500);
        return () => clearTimeout(timer);
    }

    if (phase === 'BOSS_TURN') {
        const timer = setTimeout(() => {
            handleBossAction();
        }, 1000);
        return () => clearTimeout(timer);
    }

    if (phase === 'BOSS_RESULT') {
        const timer = setTimeout(() => {
            if (stepsBack > 0) {
                // Defeat
                setPhase('RESULT');
            } else {
                // Next Turn
                setTurnCount(prev => prev + 1);
                setPhase('PLAYER_TURN');
            }
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleStart = () => {
    setPhase('PLAYER_TURN');
  };

  const handleAttackClick = () => {
      // Generate RNG immediately before animation starts
      const roll = Math.floor(Math.random() * 6) + 1;
      setLastDiceValue(roll);
      setPhase('PLAYER_ROLLING');
  };

  const handleRollComplete = (value: number) => {
      // value here matches lastDiceValue passed to Dice2D
      // The Dice2D component now waits for animation to complete before calling this

      const result = resolvePlayerAttack(bossState, value, player.name, turnCount);
      setBossState(result.newState);
      setLogs(prev => [...prev, ...result.logs]);
      setPhase('PLAYER_RESULT');
  };

  const handleBossAction = () => {
      const result = resolveBossAction(bossState, player.name, turnCount);
      setBossState(result.newState);
      setLogs(prev => [...prev, ...result.logs]);

      if (result.damageToPlayer > 0) {
          setStepsBack(result.damageToPlayer);
      }
      setPhase('BOSS_RESULT');
  };

  const handleClose = () => {
      const finalState = { ...bossState, logs: logs };
      const result: BattleResult = {
          finalBossState: finalState,
          logs: logs,
          isVictory: isVictory,
          stepsBack: stepsBack,
          goldReward: isVictory ? 1000 : 0
      };
      onComplete(result);
  };

  // HP Color Logic (Updated to White/Yellow/Red per request)
  // MaxHP: 20
  // 50-100% (10-20): White
  // 25-49% (5-9): Yellow
  // 0-24% (0-4): Red
  const getHpColor = (hp: number) => {
    const ratio = hp / BOSS_CONFIG.maxHp;
    if (ratio < 0.25) return 'text-red-500';
    if (ratio < 0.5) return 'text-yellow-400';
    return 'text-white';
  };

  // Render Log Item
  const renderLog = (log: BossLog, index: number) => {
    const isPlayer = log.actor === 'player';
    return (
      <div key={index} className={`mb-2 p-2 rounded text-xs animate-fade-in ${isPlayer ? 'bg-blue-900/40 ml-0 mr-4' : 'bg-red-900/40 ml-4 mr-0'}`}>
        <div className="font-bold mb-1 opacity-70 flex justify-between">
          <span>{isPlayer ? player.name : BOSS_CONFIG.name}</span>
          <span>Turn {log.turn}</span>
        </div>
        <div>{log.description}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-red-600 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header / Boss Status */}
        <div className="bg-slate-800 p-6 text-center border-b border-slate-700 relative">
          <div className="text-6xl mb-4 filter drop-shadow-lg">😈</div>
          <h2 className={`text-2xl font-bold tracking-wider ${getHpColor(bossState.currentHp)} transition-colors duration-500`}>
            {BOSS_CONFIG.name}
          </h2>
          {/* Note: Numerical HP removed as per request */}

          {bossState.isSkaraActive && (
             <span className="absolute top-4 right-4 bg-yellow-600/80 text-white text-xs px-2 py-1 rounded border border-yellow-400 animate-pulse">
               🛡️ スカラ
             </span>
          )}
        </div>

        {/* Battle Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-sm text-slate-200 relative min-h-[300px]" ref={scrollRef}>

          {/* Logs */}
          <div className="pb-24">
             {phase === 'START' && (
                <div className="text-center py-8 opacity-80">
                <p className="text-xl mb-4">強大な魔物が現れた！</p>
                <p className="text-slate-400">戦いを挑みますか？</p>
                </div>
            )}
            {logs.map((log, i) => renderLog(log, i))}
          </div>

          {/* Interaction Area (Overlaying bottom of scroll area) */}
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent p-4 pt-12 flex flex-col items-center justify-center min-h-[120px]">

              {/* Player Turn: Roll Button or Dice Animation */}
              {/* Keep Dice2D visible during RESULT phase so players see what they rolled */}
              {(phase === 'PLAYER_TURN' || phase === 'PLAYER_ROLLING' || phase === 'PLAYER_RESULT') && (
                  <div className="w-full flex justify-center">
                      <Dice2D
                          isRolling={phase === 'PLAYER_ROLLING'}
                          value={lastDiceValue || 1}
                          onRollComplete={handleRollComplete}
                          trigger={phase === 'PLAYER_ROLLING'} // Start animation
                          size={80}
                      />

                      {phase === 'PLAYER_TURN' && (
                           <button
                             onClick={handleAttackClick}
                             className="absolute bottom-6 px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg border border-blue-400 animate-pulse"
                           >
                             🎲 攻撃する
                           </button>
                      )}
                  </div>
              )}

              {/* Result Phase */}
              {phase === 'RESULT' && (
                  <div className="text-center animate-bounce mb-4">
                    {isVictory ? (
                        <div className="text-yellow-400 text-2xl font-bold">
                        🏆 VICTORY! 🏆
                        <div className="text-sm text-white mt-2">賞金 1000G を手に入れた！</div>
                        </div>
                    ) : (
                        <div className="text-red-500 text-2xl font-bold">
                        💥 吹き飛ばされた！ 💥
                        <div className="text-sm text-white mt-2">{stepsBack}マス後退します...</div>
                        </div>
                    )}
                  </div>
              )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 text-center h-[80px] flex items-center justify-center">
          {phase === 'START' && (
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-lg transform transition active:scale-95"
            >
              ⚔️ 戦闘開始
            </button>
          )}

          {(phase === 'PLAYER_RESULT' || phase === 'BOSS_TURN' || phase === 'BOSS_RESULT') && (
             <div className="text-slate-400 text-xs animate-pulse flex items-center gap-2">
               <div className="w-2 h-2 bg-slate-400 rounded-full animate-ping"></div>
               バトル進行中...
             </div>
          )}

          {phase === 'RESULT' && (
            <button
              onClick={handleClose}
              className="px-8 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded shadow-lg"
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BossBattleOverlay;
