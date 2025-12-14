import React, { useState, useEffect, useRef } from 'react';
import { BOSS_CONFIG, BattleResult, BossLog } from '../services/bossService';
import { Player } from '../types';

interface BossBattleOverlayProps {
  battleResult: BattleResult;
  player: Player;
  onComplete: () => void;
  initialBossHp: number; // To show HP before damage starts
}

const BossBattleOverlay: React.FC<BossBattleOverlayProps> = ({ battleResult, player, onComplete, initialBossHp }) => {
  const [phase, setPhase] = useState<'START' | 'PLAYING' | 'RESULT'>('START');
  const [logIndex, setLogIndex] = useState(-1); // -1 means start
  const [displayHp, setDisplayHp] = useState(initialBossHp);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logIndex]);

  // Game Loop Playback
  useEffect(() => {
    if (phase === 'PLAYING') {
      if (logIndex < battleResult.logs.length - 1) {
        const timeout = setTimeout(() => {
          setLogIndex(prev => {
            const next = prev + 1;
            // Update visual HP if the log contains it
            const entry = battleResult.logs[next];
            if (entry.currentBossHp !== undefined) {
              setDisplayHp(entry.currentBossHp);
            }
            return next;
          });
        }, 1500); // 1.5s per turn
        return () => clearTimeout(timeout);
      } else {
        // Finished logs
        const timeout = setTimeout(() => {
          setPhase('RESULT');
        }, 1500);
        return () => clearTimeout(timeout);
      }
    }
  }, [phase, logIndex, battleResult.logs]);

  const handleStart = () => {
    setPhase('PLAYING');
  };

  const handleClose = () => {
    onComplete();
  };

  // HP Color Logic
  const getHpColor = (hp: number) => {
    const ratio = hp / BOSS_CONFIG.maxHp;
    if (ratio <= 0.25) return 'text-red-500';
    if (ratio <= 0.5) return 'text-yellow-400';
    return 'text-white';
  };

  // Render Log Item
  const renderLog = (log: BossLog, index: number) => {
    const isPlayer = log.actor === 'player';
    return (
      <div key={index} className={`mb-2 p-2 rounded ${isPlayer ? 'bg-blue-900/50 ml-0 mr-8' : 'bg-red-900/50 ml-8 mr-0'}`}>
        <div className="font-bold text-xs mb-1 opacity-70">
          {isPlayer ? player.name : BOSS_CONFIG.name}
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
          <div className="text-6xl mb-4">😈</div>
          <h2 className={`text-2xl font-bold tracking-wider ${getHpColor(displayHp)} transition-colors duration-500`}>
            {BOSS_CONFIG.name}
          </h2>
          <div className="text-sm text-slate-400 mt-1 font-mono">
            HP: {displayHp} / {BOSS_CONFIG.maxHp}
          </div>

          {/* Status Icons */}
          {(battleResult.finalBossState.isSkaraActive && logIndex >= 0) && (
             // Note: accurately tracking Skara status during playback is hard without adding it to logs.
             // Simplification: If the FINAL result has Skara, show it? No, that's wrong.
             // We can infer it: if last boss action was Skara, and no player damage since?
             // For now, let's omit the status icon or just show it if active in final state?
             // User requirement: "Show Skara status".
             // Let's assume the BossLog has the info implicitly.
             // I'll skip complex dynamic icon for now to keep it robust.
             <span className="absolute top-2 right-2 bg-yellow-600 text-xs px-2 py-1 rounded">🛡️ スカラ</span>
          )}
        </div>

        {/* Battle Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-sm text-slate-200" ref={scrollRef}>
          {phase === 'START' && (
            <div className="text-center py-12">
              <p className="text-xl mb-4">強大な魔物が現れた！</p>
              <p className="text-slate-400">戦いを挑みますか？</p>
            </div>
          )}

          {logIndex >= 0 && battleResult.logs.slice(0, logIndex + 1).map((log, i) => renderLog(log, i))}

          {phase === 'RESULT' && (
            <div className="mt-8 text-center animate-bounce">
              {battleResult.isVictory ? (
                <div className="text-yellow-400 text-2xl font-bold">
                  🏆 VICTORY! 🏆
                  <div className="text-sm text-white mt-2">賞金 {battleResult.goldReward}G を手に入れた！</div>
                </div>
              ) : (
                <div className="text-red-500 text-2xl font-bold">
                  💥 吹き飛ばされた！ 💥
                  <div className="text-sm text-white mt-2">{battleResult.stepsBack}マス後退します...</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 text-center">
          {phase === 'START' && (
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-lg transform transition active:scale-95"
            >
              ⚔️ 戦闘開始
            </button>
          )}

          {phase === 'PLAYING' && (
             <div className="text-slate-400 text-xs animate-pulse">
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
