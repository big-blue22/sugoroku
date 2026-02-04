import React, { useState, useEffect, useRef } from 'react';
import { RouletteEffect } from '../types';
import { ROULETTE_EFFECTS } from '../constants';

interface RouletteModalProps {
    isOpen: boolean;
    isMyTurn: boolean;
    playerName: string;
    onSpin: () => void;
    onComplete: (effect: RouletteEffect) => void;
    selectedEffect: RouletteEffect | null;
    isSpinning: boolean;
}

const RouletteModal: React.FC<RouletteModalProps> = ({
    isOpen,
    isMyTurn,
    playerName,
    onSpin,
    onComplete,
    selectedEffect,
    isSpinning,
}) => {
    const [rotation, setRotation] = useState(0);
    const [displayedEffect, setDisplayedEffect] = useState<RouletteEffect | null>(null);
    const [showResult, setShowResult] = useState(false);
    const spinIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle spinning animation
    useEffect(() => {
        if (isSpinning) {
            setShowResult(false);
            setDisplayedEffect(null);

            let speed = 50;
            let currentIndex = 0;

            const spin = () => {
                currentIndex = (currentIndex + 1) % ROULETTE_EFFECTS.length;
                setDisplayedEffect(ROULETTE_EFFECTS[currentIndex]);
                setRotation(prev => prev + 45);

                // Slow down gradually
                speed += 15;

                if (speed < 400) {
                    spinIntervalRef.current = setTimeout(spin, speed);
                }
            };

            spin();
        } else if (selectedEffect && !showResult) {
            // Spinning stopped, show result
            setDisplayedEffect(selectedEffect);
            setShowResult(true);
        }

        return () => {
            if (spinIntervalRef.current) {
                clearTimeout(spinIntervalRef.current);
            }
        };
    }, [isSpinning, selectedEffect]);

    if (!isOpen) return null;

    const getEffectColor = (effectType: string) => {
        switch (effectType) {
            case 'MOVE_FORWARD':
            case 'JACKPOT':
            case 'GOLD_GAIN':
                return 'from-green-500 to-emerald-600';
            case 'MOVE_BACK':
            case 'GOLD_LOSE':
            case 'CURSE':
                return 'from-red-500 to-rose-600';
            case 'TELEPORT_RANDOM':
            case 'SWAP_POSITION':
                return 'from-purple-500 to-violet-600';
            default:
                return 'from-gray-500 to-slate-600';
        }
    };

    const isPositiveEffect = (effectType: string) => {
        return ['MOVE_FORWARD', 'JACKPOT', 'GOLD_GAIN', 'SHIELD'].includes(effectType);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-yellow-500/50 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up">

                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 p-4 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjIpIi8+PC9zdmc+')] opacity-50"></div>
                    <h2 className="text-2xl font-bold text-white drop-shadow-lg relative z-10">
                        🎰 運命のルーレット 🎰
                    </h2>
                </div>

                {/* Main Content */}
                <div className="p-8 text-center">

                    {/* Roulette Wheel Display */}
                    <div className="relative mb-8">
                        {/* Outer glow */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>

                        {/* Wheel */}
                        <div
                            className="relative mx-auto w-40 h-40 rounded-full border-8 border-yellow-500 shadow-2xl overflow-hidden"
                            style={{
                                transform: `rotate(${rotation}deg)`,
                                transition: isSpinning ? 'none' : 'transform 0.3s ease-out',
                                background: 'conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #8b5cf6, #ec4899, #ef4444)'
                            }}
                        >
                            {/* Center */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900 rounded-full border-4 border-yellow-400 flex items-center justify-center shadow-inner">
                                <span className="text-3xl animate-bounce">
                                    {isSpinning ? '🎲' : (displayedEffect?.emoji || '❓')}
                                </span>
                            </div>
                        </div>

                        {/* Arrow pointer */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-yellow-400 drop-shadow-lg"></div>
                        </div>
                    </div>

                    {/* Effect Display */}
                    {displayedEffect && (
                        <div className={`mb-6 p-4 rounded-xl bg-gradient-to-r ${getEffectColor(displayedEffect.effectType)} shadow-lg transform transition-all ${showResult ? 'scale-110' : 'scale-100'}`}>
                            <div className="text-4xl mb-2">{displayedEffect.emoji}</div>
                            <h3 className="text-xl font-bold text-white mb-1">{displayedEffect.name}</h3>
                            <p className="text-white/90 text-sm">{displayedEffect.description}</p>
                        </div>
                    )}

                    {/* Spinning State */}
                    {isSpinning && (
                        <div className="text-yellow-400 font-bold animate-pulse text-lg">
                            ルーレット回転中...
                        </div>
                    )}

                    {/* Result State */}
                    {showResult && selectedEffect && (
                        <div className="space-y-4 animate-fade-in">
                            <div className={`text-2xl font-bold ${isPositiveEffect(selectedEffect.effectType) ? 'text-green-400' : 'text-red-400'}`}>
                                {isPositiveEffect(selectedEffect.effectType) ? '🎉 ラッキー！' : '😱 アンラッキー...'}
                            </div>

                            {isMyTurn ? (
                                <button
                                    onClick={() => onComplete(selectedEffect)}
                                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 rounded-xl font-bold text-xl text-white shadow-lg transition-all active:scale-95 border border-yellow-300/30"
                                >
                                    結果を受け入れる
                                </button>
                            ) : (
                                <div className="text-slate-400 animate-pulse py-3 bg-slate-800/50 rounded-lg">
                                    {playerName} の選択を待っています...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Initial Spin Button */}
                    {!isSpinning && !showResult && (
                        <>
                            {isMyTurn ? (
                                <button
                                    onClick={onSpin}
                                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 rounded-xl font-bold text-xl text-white shadow-lg transition-all active:scale-95 border border-yellow-300/30 flex items-center justify-center gap-3"
                                >
                                    <span className="text-2xl animate-spin">🎰</span>
                                    ルーレットを回す！
                                </button>
                            ) : (
                                <div className="text-slate-400 animate-pulse py-4 bg-slate-800/50 rounded-lg border border-slate-600">
                                    {playerName} がルーレットを回します...
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RouletteModal;
