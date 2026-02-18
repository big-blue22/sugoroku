import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, Player, Tile, TileType, RoomState } from './types';
import SetupScreen from './components/SetupScreen';
import Popup, { PopupType } from './components/Popup';
import GameScene from './components/3d/GameScene';
import {
    subscribeToRoom,
    startGame,
    updateGameState,
    nextTurn
} from './services/roomService';
import { BOARD_LAYOUT, BOARD_SIZE } from './constants';

const buildBoard = (): Tile[] => {
    return BOARD_LAYOUT.map((type, index) => ({
        id: index,
        type,
    }));
};

const App: React.FC = () => {
    // Multiplayer State
    const [roomId, setRoomId] = useState<string | null>(null);
    const [myPlayerId, setMyPlayerId] = useState<number | null>(null); // This is an index in the array
    const [myPlayerName, setMyPlayerName] = useState<string>("");
    const [roomState, setRoomState] = useState<RoomState | null>(null);

    const [board] = useState<Tile[]>(buildBoard());
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Local UI State
    const [logs, setLogs] = useState<string[]>([]);
    const [showPopup, setShowPopup] = useState(false);
    const [popupData, setPopupData] = useState<{ msg: string; type: PopupType } | null>(null);
    const [autoCamera, setAutoCamera] = useState(true);
    const [isRolling, setIsRolling] = useState(false);
    const [isProcessingTurn, setIsProcessingTurn] = useState(false); // Lock for active player during logic execution
    const [isBoardBusy, setIsBoardBusy] = useState(false); // Global lock when pieces are moving

    // Track last processed popup to avoid duplication
    const lastProcessedPopupTime = useRef<number>(0);
    const prevPlayersRef = useRef<Player[]>([]);

    // Refactored UI State
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [activeTab, setActiveTab] = useState<'players' | 'logs'>('players');

    // Derived State (local caching of animations)
    const [localDiceValue, setLocalDiceValue] = useState<number | null>(null);
    // We use this to trigger the 3D dice. Increments when roomState.diceRollCount changes.
    const [dice3DTrigger, setDice3DTrigger] = useState(0);

    // --- Subscriptions & Effect Handling ---

    useEffect(() => {
        if (!roomId) return;

        const unsubscribe = subscribeToRoom(roomId, (data) => {
            setRoomState(data);
        });

        return () => unsubscribe();
    }, [roomId]);

    // Handle Board Movement Lock (Prevents rolling while pieces move)
    useEffect(() => {
        if (!roomState) return;

        const currentPlayers = roomState.players;
        const prevPlayers = prevPlayersRef.current;
        let maxDist = 0;

        if (prevPlayers.length > 0) {
            currentPlayers.forEach(p => {
                const prev = prevPlayers.find(pp => pp.id === p.id);
                if (prev && prev.position !== p.position) {
                    const dist = Math.abs(p.position - prev.position);
                    if (dist > maxDist) maxDist = dist;
                }
            });
        }

        // Update ref for next compare
        prevPlayersRef.current = currentPlayers;

        if (maxDist > 0) {
            setIsBoardBusy(true);
            // Calculate animation time (match logic in handleRollDice + buffer)
            // 500ms per tile + 500ms buffer
            const animTime = (maxDist * 500) + 500;

            const timer = setTimeout(() => {
                setIsBoardBusy(false);
            }, animTime);

            return () => clearTimeout(timer);
        }
    }, [roomState?.players]);

    // Handle Logs Sync
    useEffect(() => {
        if (roomState?.lastLog && roomState.lastLogTimestamp) {
            setLogs(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg !== roomState.lastLog) {
                    return [...prev, roomState.lastLog!];
                }
                return prev;
            });
        }
    }, [roomState?.lastLogTimestamp, roomState?.lastLog]);

    // Handle Shared Popup Sync
    useEffect(() => {
        if (roomState?.latestPopup && roomState.latestPopup.timestamp > lastProcessedPopupTime.current) {
            lastProcessedPopupTime.current = roomState.latestPopup.timestamp;
            triggerPopup(roomState.latestPopup.message, roomState.latestPopup.type, 3000);
        }
    }, [roomState?.latestPopup]);

    // Scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, activeTab, showInfoPanel]);

    // Handle Dice Animation Trigger
    useEffect(() => {
        if (roomState?.diceRollCount && roomState.diceValue) {
            setLocalDiceValue(roomState.diceValue);
            setDice3DTrigger(prev => prev + 1);
            setIsRolling(true); // Visual indicator start

            // Stop rolling visual after a moment
            setTimeout(() => {
                setIsRolling(false);
                // Trigger Popup for everyone
                triggerPopup(`${roomState.diceValue} が出ました！`, 'info', 3000);
            }, 2000);
        }
    }, [roomState?.diceRollCount, roomState?.diceValue]);


    // --- Helper Functions ---

    const addLog = (msg: string) => {
        console.log(msg);
    };

    const triggerPopup = (msg: string, type: PopupType = 'info', duration = 2000) => {
        setPopupData({ msg, type });
        setShowPopup(true);
        setTimeout(() => {
            setShowPopup(false);
        }, duration);
    };

    const handleJoinGame = (id: string, pId: number, pName: string) => {
        setRoomId(id);
        setMyPlayerId(pId);
        setMyPlayerName(pName);
    };

    const handleStartGame = async () => {
        if (!roomId) return;
        await startGame(roomId);
    };

    // --- Core Game Logic (Active Player Only) ---

    const handleRollDice = async () => {
        if (!roomId || !roomState || isRolling || isProcessingTurn || isBoardBusy) return;

        const activePlayer = roomState.players[roomState.activePlayerIndex];
        // Only active player can roll
        if (activePlayer.id !== myPlayerId) return;

        setIsProcessingTurn(true);
        setIsRolling(true);

        try {
            const roll = Math.floor(Math.random() * 6) + 1;

            // Update DB with Dice Roll
            await updateGameState(roomId, {
                diceValue: roll,
                diceRollCount: (roomState.diceRollCount || 0) + 1,
                lastLog: `${activePlayer.name} は ${roll} を出した！`,
                lastLogTimestamp: Date.now()
            });

            // Wait for animation (approx 1.5s - 2s)
            await new Promise(r => setTimeout(r, 2000));

            // Calculate Move
            const currentPos = activePlayer.position;
            let targetPos = currentPos + roll;

            if (targetPos >= BOARD_SIZE - 1) targetPos = BOARD_SIZE - 1;

            // Update Player Position in DB
            const updatedPlayers = roomState.players.map(p =>
                p.id === activePlayer.id ? { ...p, position: targetPos } : p
            );

            let logMessage = `${activePlayer.name} は ${roll} マス進み、マス ${targetPos} に止まった。`;

            await updateGameState(roomId, {
                players: updatedPlayers,
                lastLog: logMessage,
                lastLogTimestamp: Date.now()
            });

            // Dynamic wait time based on distance
            const dist = Math.abs(targetPos - currentPos);
            const waitTime = (dist * 500) + 500;
            await new Promise(r => setTimeout(r, waitTime));

            // Check Goal
            if (targetPos === BOARD_SIZE - 1) {
                 const winners = updatedPlayers.map(p => p.id === activePlayer.id ? { ...p, isWinner: true } : p);
                await updateGameState(roomId, {
                    players: winners,
                    phase: GamePhase.GAME_OVER,
                    lastLog: `🎉🎉 ${activePlayer.name} がゴールしました！ 優勝！ 🎉🎉`,
                    lastLogTimestamp: Date.now()
                });
                return;
            }

            // Next Turn
             await nextTurn(roomId, updatedPlayers, roomState.activePlayerIndex);

        } catch (error: any) {
            console.error("Dice roll failed:", error);
            setIsRolling(false);
            triggerPopup(`エラーが発生しました: ${error.message || '不明なエラー'}`, 'danger');
        } finally {
            setIsProcessingTurn(false);
        }
    };

    // --- Render ---

    if (!roomId || !roomState) {
        return <SetupScreen onJoinGame={handleJoinGame} />;
    }

    // Lobby
    if (roomState.status === 'WAITING') {
        const isHost = roomState.hostId === myPlayerName;

        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
                <div className="w-full max-w-lg bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
                    <h2 className="text-3xl font-bold text-center mb-2">待機中...</h2>
                    <p className="text-center text-slate-400 mb-8">他のプレイヤーを待っています</p>

                    <div className="bg-slate-900 rounded-xl p-6 mb-8 text-center border border-slate-700">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">ルームID</p>
                        <div className="text-5xl font-mono tracking-widest text-blue-400 font-bold select-all cursor-pointer hover:text-blue-300 transition-colors">
                            {roomState.id}
                        </div>
                        <p className="text-xs text-slate-600 mt-2">このIDを友達に教えてください</p>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-slate-400 mb-4">参加プレイヤー ({roomState.players.length})</h3>
                        <div className="space-y-3">
                            {roomState.players.map(p => (
                                <div key={p.id} className="flex items-center bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                                    <span className="text-2xl mr-3">{p.avatar}</span>
                                    <span className="font-bold flex-grow">{p.name}</span>
                                    {p.name === roomState.hostId && <span className="px-2 py-1 bg-yellow-600/30 text-yellow-400 text-xs rounded border border-yellow-600/50">HOST</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {isHost ? (
                        <button
                            onClick={handleStartGame}
                            className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-xl transition-all shadow-lg shadow-green-900/20 active:scale-95"
                        >
                            ゲームスタート！ 🚀
                        </button>
                    ) : (
                        <div className="text-center text-slate-500 animate-pulse">
                            ホストが開始するのを待っています...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Game View
    const activePlayer = roomState.players[roomState.activePlayerIndex];
    const isMyTurn = activePlayer.id === myPlayerId;

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
            <Popup
                message={popupData?.msg || null}
                type={popupData?.type || 'info'}
                isVisible={showPopup}
            />

            {/* --- Game Scene (Background) --- */}
            <div className="absolute inset-0 z-0">
                <GameScene
                    board={board}
                    players={roomState.players}
                    activePlayerIndex={roomState.activePlayerIndex}
                    autoCamera={autoCamera}
                    diceTrigger={dice3DTrigger}
                    diceTarget={roomState.diceValue || 1}
                />
            </div>

            {/* --- HUD: Top Left Room Info --- */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3 animate-fade-in pointer-events-none">
                <div className="bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-600 shadow-xl flex items-center gap-3">
                    <span className="text-xs text-slate-400">ID: <span className="font-mono font-bold text-blue-300 text-sm">{roomId}</span></span>
                    <span className="w-px h-4 bg-slate-600"></span>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{roomState.players.find(p => p.id === myPlayerId)?.avatar}</span>
                        <span className="text-sm font-bold truncate max-w-[120px]">{myPlayerName}</span>
                    </div>
                </div>
            </div>

            {/* --- HUD: Bottom Right Menu Button (RELOCATED) --- */}
            <button
                onClick={() => setShowInfoPanel(!showInfoPanel)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-xl border border-slate-600 transition-all active:scale-95"
            >
                {showInfoPanel ? (
                    <span className="text-xl font-bold">✖</span>
                ) : (
                    <span className="text-xl font-bold">☰</span>
                )}
            </button>

            {/* --- Info Panel (Floating Widget) --- */}
            <div
                className={`fixed bottom-20 right-6 w-80 h-96 z-40 bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-slate-700 rounded-xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${showInfoPanel ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                    }`}
            >
                {/* Tabs Header */}
                <div className="flex border-b border-slate-700 bg-slate-800/50">
                    <button
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'players' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                        onClick={() => setActiveTab('players')}
                    >
                        プレイヤー
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'logs' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                        onClick={() => setActiveTab('logs')}
                    >
                        ログ {logs.length > 0 && <span className="ml-1 text-[10px] bg-slate-700 text-slate-300 px-1.5 rounded-full">{logs.length}</span>}
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar bg-slate-900/50">
                    {activeTab === 'players' && (
                        <div className="space-y-2">
                            {roomState.players.map(p => (
                                <div key={p.id} className={`flex items-center p-3 rounded-lg border transition-colors ${p.id === roomState.activePlayerIndex
                                    ? `bg-slate-800 border-${p.color}-500/50 shadow-md`
                                    : 'bg-slate-800/30 border-slate-700/50'
                                    }`}>
                                    <span className="text-2xl mr-3">{p.avatar}</span>
                                    <div className="flex-grow">
                                        <div className="flex items-center justify-between">
                                            <span className={`font-bold text-sm ${p.id === myPlayerId ? 'text-blue-300' : 'text-slate-300'}`}>
                                                {p.name} {p.id === myPlayerId && '(自分)'}
                                            </span>
                                            {p.id === roomState.activePlayerIndex && (
                                                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded border border-green-500/30">TURN</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                            <span>マス: {p.position}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div ref={logContainerRef} className="flex flex-col h-full overflow-y-auto space-y-2">
                            {logs.length === 0 && (
                                <div className="text-center text-slate-600 text-sm py-8">まだ履歴はありません</div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className="text-xs p-2 bg-slate-800/50 rounded border-l-2 border-slate-600 text-slate-300 leading-relaxed flex-shrink-0">
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>


            {/* --- HUD: Auto Camera Button (Top Right) --- */}
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={() => setAutoCamera(!autoCamera)}
                    className={`px-4 py-2 rounded-full font-bold shadow-xl transition-all border text-sm flex items-center gap-2 ${autoCamera
                        ? 'bg-blue-600/90 text-white border-blue-400 hover:bg-blue-500'
                        : 'bg-slate-800/90 text-slate-300 border-slate-600 hover:bg-slate-700'
                        }`}
                >
                    <span>{autoCamera ? '🎥 ON' : '🎥 OFF'}</span>
                    <span className="text-xs font-normal opacity-80">自動カメラ</span>
                </button>
            </div>

            {/* --- Action Operation Panel (Bottom Center) --- */}
            <div className="absolute bottom-8 left-0 w-full z-20 flex flex-col items-center justify-end pointer-events-none px-4">

                {/* Active Player Indicator (When it's NOT my turn) */}
                {roomState.phase === GamePhase.PLAYING && !isMyTurn && (
                    <div className="mb-4 bg-slate-800/80 backdrop-blur px-6 py-3 rounded-2xl border border-slate-600 shadow-xl flex items-center gap-3 animate-fade-in-up">
                        <span className="text-3xl">{activePlayer.avatar}</span>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">現在のターン</p>
                            <p className="text-lg font-bold">{activePlayer.name} が考え中...</p>
                        </div>
                    </div>
                )}

                {/* --- MAIN ACTION WINDOW (Only when needed) --- */}

                {/* 1. Dice Roll Window */}
                {roomState.phase === GamePhase.PLAYING && isMyTurn && !isRolling && !isProcessingTurn && !isBoardBusy && (
                    <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-indigo-500/50 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-slide-up relative overflow-hidden">
                        {/* Decorative glow */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                        <div className="text-center mb-4">
                            <h3 className="text-lg font-bold text-white">あなたのターン</h3>
                            <p className="text-slate-400 text-sm">行動を選択してください</p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleRollDice}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold py-4 rounded-xl shadow-lg transform transition-all active:scale-95 border border-white/10 flex items-center justify-center gap-2"
                            >
                                <span className="text-2xl">🎲</span>
                                サイコロ
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. Rolling Indicator Window */}
                {isRolling && (
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-500/50 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in text-center">
                        <div className="text-5xl animate-bounce mb-3">🎲</div>
                        <h3 className="font-bold text-blue-300 text-lg">運命のダイスロール...</h3>
                        <p className="text-slate-400 text-xs mt-1">結果を待っています</p>
                    </div>
                )}
            </div>

            {/* --- Game Over Modal --- */}
            {roomState.phase === GamePhase.GAME_OVER && (
                <div className="absolute inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl border border-yellow-500/30 text-center max-w-lg w-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none"></div>
                        <div className="text-7xl mb-6 animate-bounce">🏆</div>
                        <h2 className="text-3xl font-bold text-yellow-400 mb-2">ゲーム終了！</h2>
                        <div className="py-8">
                            <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">WINNER</p>
                            <p className="text-4xl font-bold text-white mb-2">{roomState.players.find(p => p.isWinner)?.name}</p>
                            <p className="text-slate-400">おめでとうございます！</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95"
                        >
                            ロビーに戻る
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
