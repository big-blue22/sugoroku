import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BOARD_LAYOUT, BOARD_SIZE, BOARD_COORDINATES } from './constants';
import { GamePhase, Player, Tile, TileType, GameEvent } from './types';
import SetupScreen from './components/SetupScreen';
import TileComponent from './components/Tile';
import Popup, { PopupType } from './components/Popup';
import PlayerPawn from './components/PlayerPawn';
import { generateGameEvent } from './services/gameService';

// --- Helper to build the board structure ---
const buildBoard = (): Tile[] => {
  return BOARD_LAYOUT.map((type, index) => ({
    id: index,
    type,
    // Add default values for good/bad tiles for simple logic
    effectValue: type === TileType.GOOD ? 3 : type === TileType.BAD ? -3 : 0
  }));
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [board] = useState<Tile[]>(buildBoard());

  // Ref to keep track of latest players state for async operations
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Game State for UI
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [isProcessingEvent, setIsProcessingEvent] = useState(false);
  const [turnActive, setTurnActive] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Popup State
  const [popupData, setPopupData] = useState<{ msg: string; type: PopupType } | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  // Scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const triggerPopup = (msg: string, type: PopupType = 'info', duration = 2000) => {
    setPopupData({ msg, type });
    setShowPopup(true);
    setTimeout(() => {
      setShowPopup(false);
    }, duration);
  };

  const handleStartGame = (configs: { name: string; color: string; avatar: string }[]) => {
    const newPlayers: Player[] = configs.map((c, i) => ({
      id: i,
      ...c,
      position: 0,
      skipNextTurn: false,
      isWinner: false,
    }));
    setPlayers(newPlayers);
    setPhase(GamePhase.PLAYING);
    addLog("🏁 ゲーム開始！冒険の始まりです！");
    triggerPopup("🏁 ゲーム開始！\nゴール目指して頑張ろう！", 'info', 2500);
    
    setTimeout(() => {
        addLog(`👉 ${newPlayers[0].name} のターンです。`);
        triggerPopup(`${newPlayers[0].name} の番です`, 'info');
    }, 2600);
  };

  const nextTurn = useCallback(() => {
    setDiceValue(null);
    let nextIndex = (activePlayerIndex + 1) % players.length;
    
    // Check for skip
    let nextPlayer = players[nextIndex];
    if (nextPlayer.skipNextTurn) {
        addLog(`🚫 ${nextPlayer.name} は休みです。`);
        triggerPopup(`🚫 ${nextPlayer.name} は\n一回休みです`, 'danger');
        
        // Reset skip flag
        setPlayers(prev => prev.map((p, i) => i === nextIndex ? { ...p, skipNextTurn: false } : p));
        
        // Short delay before skipping to next
        setTimeout(() => {
             let nextNextIndex = (nextIndex + 1) % players.length;
             setActivePlayerIndex(nextNextIndex);
             addLog(`👉 ${players[nextNextIndex].name} のターンです。`);
             triggerPopup(`${players[nextNextIndex].name} の番です`, 'info');
             setTurnActive(false);
        }, 2000);
        return;
    }

    setActivePlayerIndex(nextIndex);
    addLog(`👉 ${players[nextIndex].name} のターンです。`);
    triggerPopup(`${players[nextIndex].name} の番です`, 'info');
    setTurnActive(false);
  }, [activePlayerIndex, players]);

  const updatePlayerPosition = (playerId: number, pos: number) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, position: pos } : p));
  };

  const movePlayer = async (playerId: number, steps: number) => {
    const player = playersRef.current.find(p => p.id === playerId);
    if (!player) return 0;

    let currentPos = player.position;
    const direction = steps > 0 ? 1 : -1;
    let remainingSteps = Math.abs(steps);

    return new Promise<number>(async (resolve) => {
      while (remainingSteps > 0) {
        const nextPos = currentPos + direction;

        // Check boundaries
        if (nextPos >= BOARD_SIZE - 1) {
          updatePlayerPosition(playerId, BOARD_SIZE - 1);
          currentPos = BOARD_SIZE - 1;
          break; // Stop at goal
        }
        if (nextPos <= 0) {
          updatePlayerPosition(playerId, 0);
          currentPos = 0;
          break; // Stop at start
        }

        updatePlayerPosition(playerId, nextPos);
        currentPos = nextPos;
        remainingSteps--;

        // Wait for animation
        await new Promise(r => setTimeout(r, 400));
      }
      resolve(currentPos);
    });
  };

  const handleTileEffect = async (finalPosition: number) => {
    const tile = board[finalPosition];
    const currentPlayer = players[activePlayerIndex];

    addLog(`${currentPlayer.name} はマス ${finalPosition} に止まりました。`);

    if (tile.type === TileType.GOAL) {
      setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, isWinner: true } : p));
      setPhase(GamePhase.GAME_OVER);
      addLog(`🎉🎉 ${currentPlayer.name} がゴールしました！ 優勝！ 🎉🎉`);
      triggerPopup(`🎉 優勝！！ 🎉\n${currentPlayer.name} おめでとう！`, 'success', 5000);
      return;
    }

    if (tile.type === TileType.GOOD && tile.effectValue) {
      addLog(`✨ 好機到来！ ${tile.effectValue}マス進みます。`);
      triggerPopup(`✨ ラッキー！\n${tile.effectValue}マス進みます！`, 'success');
      await new Promise(r => setTimeout(r, 1500));
      await movePlayer(currentPlayer.id, tile.effectValue);
      nextTurn();
    } else if (tile.type === TileType.BAD && tile.effectValue) {
      addLog(`💥 罠だ！ ${Math.abs(tile.effectValue)}マス戻ります。`);
      triggerPopup(`💥 うわっ！\n${Math.abs(tile.effectValue)}マス戻されてしまった...`, 'danger');
      await new Promise(r => setTimeout(r, 1500));
      await movePlayer(currentPlayer.id, tile.effectValue);
      nextTurn();
    } else if (tile.type === TileType.EVENT) {
      setPhase(GamePhase.EVENT_PROCESSING);
      setIsProcessingEvent(true);
      triggerPopup(`🔮 イベント発生！\n運命のカードを引きます...`, 'event', 2000);
      
      const event = await generateGameEvent(currentPlayer.name);
      
      setIsProcessingEvent(false);
      setCurrentEvent(event);
      addLog(`🔮 イベント: 「${event.title}」`);
    } else {
      // Normal tile or Start
      nextTurn();
    }
  };

  const applyEventEffect = async () => {
    if (!currentEvent) return;
    const currentPlayer = players[activePlayerIndex];
    const val = currentEvent.value;

    let popupMsg = "";
    let popupType: PopupType = 'info';

    if (currentEvent.effectType === 'MOVE_FORWARD') {
      await movePlayer(currentPlayer.id, val);
      addLog(`${currentPlayer.name} は ${val} マス進んだ。`);
      popupMsg = `💨 ${val} マス進んだ！`;
      popupType = 'success';
    } else if (currentEvent.effectType === 'MOVE_BACK') {
      await movePlayer(currentPlayer.id, -val);
      addLog(`${currentPlayer.name} は ${val} マス戻った。`);
      popupMsg = `💦 ${val} マス戻った...`;
      popupType = 'danger';
    } else if (currentEvent.effectType === 'SKIP_TURN') {
      setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, skipNextTurn: true } : p));
      addLog(`${currentPlayer.name} は次回のターン休み。`);
      popupMsg = `💤 次回は一回休み`;
      popupType = 'danger';
    } else {
      addLog(`特に何も起こらなかった。`);
      popupMsg = `何も起きなかった`;
    }

    triggerPopup(popupMsg, popupType);

    setCurrentEvent(null);
    setPhase(GamePhase.PLAYING);
    
    // Wait for popup to be read
    setTimeout(() => {
        nextTurn();
    }, 1500);
  };

  const handleRollDice = async () => {
    if (isRolling || turnActive) return;
    setIsRolling(true);
    setTurnActive(true);
    
    // Animation simulation
    let roll = 1;
    for (let i = 0; i < 10; i++) {
        roll = Math.floor(Math.random() * 6) + 1;
        setDiceValue(roll);
        await new Promise(r => setTimeout(r, 80));
    }

    setIsRolling(false);
    addLog(`${players[activePlayerIndex].name} は ${roll} を出した！`);
    triggerPopup(`🎲 ${roll} が出ました！`, 'info', 1000);

    // Move logic
    // Wait a brief moment so user sees the dice result popup
    await new Promise(r => setTimeout(r, 1000));
    const finalPos = await movePlayer(players[activePlayerIndex].id, roll);
    
    // Check effects
    setTimeout(() => handleTileEffect(finalPos), 500);
  };

  if (phase === GamePhase.SETUP) {
    return <SetupScreen onStartGame={handleStartGame} />;
  }

  const activePlayer = players[activePlayerIndex];

  // --- Constants for Board Rendering ---
  const TILE_WIDTH = 120;
  const TILE_HEIGHT = 120;
  const GAP = 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 font-sans">
      
      {/* Popup Overlay */}
      <Popup 
        message={popupData?.msg || null} 
        type={popupData?.type || 'info'} 
        isVisible={showPopup} 
      />

      {/* Header */}
      <header className="p-4 bg-slate-800 shadow-lg z-10 flex justify-between items-center border-b border-slate-700">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          冒険すごろく
        </h1>
        <div className="text-sm text-slate-400">
          参加人数: {players.length}人
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left: The Board */}
        <div className="flex-grow relative bg-slate-900 p-0 lg:p-4 overflow-auto perspective-board-container flex justify-center items-center">

            {/* 3D Scene Container */}
            <div
                className="relative transition-transform duration-500"
                style={{
                   width: '1000px', // Approx 8 columns * 120
                   height: '700px', // Approx 5 rows * 120 + padding
                   perspective: '1200px',
                   transformStyle: 'preserve-3d'
                }}
            >
                {/* The Board Plane */}
                <div
                    className="absolute inset-0 bg-slate-800/30 rounded-3xl border-4 border-slate-700 shadow-2xl"
                    style={{
                        transform: 'rotateX(60deg) rotateZ(0deg)',
                        transformStyle: 'preserve-3d',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* Render Tiles */}
                    {board.map((tile, i) => {
                        const coords = BOARD_COORDINATES[i] || {x: 0, y: 0};
                        return (
                             <TileComponent
                                key={tile.id}
                                tile={tile}
                                className="w-28 h-28 hover:translate-z-2 hover:shadow-xl transition-all duration-300"
                                style={{
                                    position: 'absolute',
                                    left: `${coords.x * TILE_WIDTH + 20}px`,
                                    top: `${coords.y * TILE_HEIGHT + 20}px`,
                                    transform: 'translateZ(1px)', // Slight lift to prevent z-fighting
                                    width: '110px',
                                    height: '110px'
                                }}
                            />
                        );
                    })}

                    {/* Path Connectors (Simple arrows or lines) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" style={{ transform: 'translateZ(0px)' }}>
                       {board.map((_, i) => {
                           if (i >= board.length - 1) return null;
                           const start = BOARD_COORDINATES[i];
                           const end = BOARD_COORDINATES[i+1];
                           if (!start || !end) return null;

                           const x1 = start.x * TILE_WIDTH + 20 + 55; // Center of tile
                           const y1 = start.y * TILE_HEIGHT + 20 + 55;
                           const x2 = end.x * TILE_WIDTH + 20 + 55;
                           const y2 = end.y * TILE_HEIGHT + 20 + 55;

                           return (
                               <line
                                 key={`path-${i}`}
                                 x1={x1} y1={y1} x2={x2} y2={y2}
                                 stroke="white"
                                 strokeWidth="4"
                                 strokeDasharray="8 8"
                               />
                           );
                       })}
                    </svg>
                </div>

                {/* Players Layer (Independent of Board Plane Rotation usually, but if we want them ON the board, they need to be in the scene) */}
                {/*
                    If we put players inside the rotated board div, they rotate with it.
                    We need to counter-rotate them (done in PlayerPawn).
                    But positioning is easier if they are children of the rotated board.
                */}
                 <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        transform: 'rotateX(60deg) rotateZ(0deg)', // Match board rotation
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {players.map((player) => {
                        const coords = BOARD_COORDINATES[player.position] || {x: 0, y: 0};
                        return (
                            <PlayerPawn
                                key={player.id}
                                avatar={player.avatar}
                                color={player.color}
                                x={coords.x}
                                y={coords.y}
                                isMoving={isRolling && player.id === activePlayer.id} // rough approximation
                            />
                        );
                    })}
                </div>

            </div>
        </div>

        {/* Right: Controls & Logs */}
        <div className="w-full lg:w-96 bg-slate-800 border-l border-slate-700 flex flex-col shadow-2xl z-20">
          
          {/* Active Player Info */}
          <div className="p-6 border-b border-slate-700 bg-slate-800">
            {phase === GamePhase.GAME_OVER ? (
               <div className="text-center">
                 <div className="text-6xl mb-4">🏆</div>
                 <h2 className="text-2xl font-bold text-yellow-400 mb-2">ゲーム終了！</h2>
                 <p className="text-white">優勝は {players.find(p => p.isWinner)?.name} です！</p>
                 <button 
                   onClick={() => window.location.reload()}
                   className="mt-6 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 font-bold"
                 >
                   もう一度遊ぶ
                 </button>
               </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className={`w-20 h-20 rounded-full border-4 border-white bg-${activePlayer.color}-500 flex items-center justify-center text-4xl shadow-lg mb-3 relative`}>
                   {activePlayer.avatar}
                   <div className="absolute -bottom-2 px-2 py-0.5 bg-white text-slate-900 text-xs font-bold rounded-full whitespace-nowrap">
                     現在地: {activePlayer.position}
                   </div>
                </div>
                <h2 className="text-2xl font-bold mb-1">{activePlayer.name}</h2>
                <div className="text-slate-400 text-sm mb-6">あなたの番です！</div>

                {/* Dice / Action Area */}
                {phase === GamePhase.PLAYING && (
                  <div className="flex flex-col items-center w-full">
                    <div className="w-24 h-24 bg-white rounded-xl shadow-inner flex items-center justify-center mb-4 border-4 border-slate-300">
                       <span className={`text-5xl font-bold text-slate-800 ${isRolling ? 'animate-bounce' : ''}`}>
                         {diceValue ?? '?'}
                       </span>
                    </div>
                    <button
                      onClick={handleRollDice}
                      disabled={isRolling || turnActive}
                      className={`w-full py-3 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${
                        isRolling || turnActive
                          ? 'bg-slate-600 cursor-not-allowed text-slate-400' 
                          : `bg-gradient-to-r from-${activePlayer.color}-500 to-${activePlayer.color}-600 hover:brightness-110 shadow-lg shadow-${activePlayer.color}-500/40`
                      }`}
                    >
                      {isRolling ? 'コロコロ...' : 'サイコロを振る 🎲'}
                    </button>
                  </div>
                )}

                {/* Event Processing State */}
                {phase === GamePhase.EVENT_PROCESSING && (
                   <div className="w-full p-4 bg-slate-700/50 rounded-xl border border-purple-500/30">
                     {isProcessingEvent ? (
                       <div className="flex flex-col items-center py-4">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mb-2"></div>
                         <p className="text-purple-300 animate-pulse">イベント発生中...</p>
                       </div>
                     ) : currentEvent ? (
                       <div className="text-center animate-fade-in">
                          <div className="text-4xl mb-2">🔮</div>
                          <h3 className="text-lg font-bold text-purple-300 mb-1">{currentEvent.title}</h3>
                          <p className="text-sm text-slate-300 mb-4 italic">"{currentEvent.description}"</p>
                          <div className="text-xs font-bold uppercase tracking-wider text-purple-200 mb-4 bg-purple-900/50 py-1 rounded">
                            効果: {
                                currentEvent.effectType === 'MOVE_FORWARD' ? '進む' :
                                currentEvent.effectType === 'MOVE_BACK' ? '戻る' :
                                currentEvent.effectType === 'SKIP_TURN' ? '一回休み' : 'なし'
                            } 
                            {currentEvent.value > 0 && ` (${currentEvent.value})`}
                          </div>
                          <button
                            onClick={applyEventEffect}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition-colors"
                          >
                            結果を受け入れる
                          </button>
                       </div>
                     ) : null}
                   </div>
                )}
              </div>
            )}
          </div>

          {/* Game Log */}
          <div className="flex-grow flex flex-col p-4 overflow-hidden bg-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ゲームログ</h3>
            <div 
              ref={logContainerRef}
              className="flex-grow overflow-y-auto space-y-2 pr-2 scrollbar-hide"
            >
              {logs.length === 0 && <div className="text-slate-600 text-sm italic">ここにゲームの履歴が表示されます...</div>}
              {logs.map((log, i) => (
                <div key={i} className="text-sm p-2 bg-slate-700/50 rounded border-l-2 border-blue-500 animate-fade-in">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
