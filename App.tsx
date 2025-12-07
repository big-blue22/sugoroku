import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, Player, Tile, TileType, RoomState } from './types';
import SetupScreen from './components/SetupScreen';
import Popup, { PopupType } from './components/Popup';
import GameScene from './components/3d/GameScene';
import { generateGameEvent } from './services/gameService';
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
    effectValue: type === TileType.GOOD ? 3 : type === TileType.BAD ? -3 : 0
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
  const [showInfoPanel, setShowInfoPanel] = useState(false);

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

  // Scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, showInfoPanel]);

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

  // Handle Events Popups
  useEffect(() => {
      if (roomState?.currentEvent) {
          triggerPopup(`🔮 イベント: ${roomState.currentEvent.title}`, 'event', 3000);
          addLog(`🔮 イベント: 「${roomState.currentEvent.title}」`);
      }
  }, [roomState?.currentEvent]);


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
      if (!roomId || !roomState || isRolling) return;

      const activePlayer = roomState.players[roomState.activePlayerIndex];
      // Only active player can roll
      if (activePlayer.id !== myPlayerId) return;

      setIsRolling(true);

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
      if (targetPos <= 0) targetPos = 0; // Should not happen on fwd roll

      // Update Player Position in DB
      const updatedPlayers = roomState.players.map(p =>
          p.id === activePlayer.id ? { ...p, position: targetPos } : p
      );

      await updateGameState(roomId, {
          players: updatedPlayers,
          lastLog: `${activePlayer.name} は ${roll} マス進み、マス ${targetPos} に止まった。`,
          lastLogTimestamp: Date.now()
      });

      // Dynamic wait time based on distance
      const dist = Math.abs(targetPos - currentPos);
      const waitTime = (dist * 500) + 500;
      await new Promise(r => setTimeout(r, waitTime));

      // Handle Effects
      await handleTileEffect(targetPos, activePlayer, updatedPlayers);
  };

  const handleTileEffect = async (pos: number, player: Player, currentPlayers: Player[]) => {
      if (!roomId) return;
      const tile = board[pos];

      if (tile.type === TileType.GOAL) {
          const winners = currentPlayers.map(p => p.id === player.id ? { ...p, isWinner: true } : p);
          await updateGameState(roomId, {
              players: winners,
              phase: GamePhase.GAME_OVER,
              lastLog: `🎉🎉 ${player.name} がゴールしました！ 優勝！ 🎉🎉`,
              lastLogTimestamp: Date.now()
          });
          return;
      }

      if (tile.type === TileType.GOOD && tile.effectValue) {
          await new Promise(r => setTimeout(r, 1000));
          const newPos = Math.min(BOARD_SIZE - 1, pos + tile.effectValue);

          const newPlayers = currentPlayers.map(p => p.id === player.id ? { ...p, position: newPos } : p);
          await updateGameState(roomId, {
              players: newPlayers,
              lastLog: `✨ ラッキー！ ${tile.effectValue}マス進みます。`,
              lastLogTimestamp: Date.now()
          });

          const dist = Math.abs(newPos - pos);
          const waitTime = (dist * 500) + 500;
          await new Promise(r => setTimeout(r, waitTime));
          await nextTurn(roomId, newPlayers, roomState!.activePlayerIndex);

      } else if (tile.type === TileType.BAD && tile.effectValue) {
          await new Promise(r => setTimeout(r, 1000));
          const newPos = Math.max(0, pos + tile.effectValue);

          const newPlayers = currentPlayers.map(p => p.id === player.id ? { ...p, position: newPos } : p);
          await updateGameState(roomId, {
              players: newPlayers,
              lastLog: `💥 罠だ！ ${Math.abs(tile.effectValue)}マス戻ります。`,
              lastLogTimestamp: Date.now()
          });

          const dist = Math.abs(newPos - pos);
          const waitTime = (dist * 500) + 500;
          await new Promise(r => setTimeout(r, waitTime));
          await nextTurn(roomId, newPlayers, roomState!.activePlayerIndex);

      } else if (tile.type === TileType.EVENT) {
           await updateGameState(roomId, {
               phase: GamePhase.EVENT_PROCESSING,
               lastLog: `🔮 イベント発生！運命のカードを引きます...`,
               lastLogTimestamp: Date.now()
           });

           const event = await generateGameEvent(player.name);

           await updateGameState(roomId, {
               currentEvent: event,
               lastLog: `🔮 イベント: 「${event.title}」`,
               lastLogTimestamp: Date.now()
           });

      } else {
          await nextTurn(roomId, currentPlayers, roomState!.activePlayerIndex);
      }
  };

  const handleApplyEvent = async () => {
      if (!roomId || !roomState || !roomState.currentEvent) return;
      const player = roomState.players[roomState.activePlayerIndex];
      // Only active player
      if (player.id !== myPlayerId) return;

      const event = roomState.currentEvent;
      const val = event.value;
      let newPlayers = [...roomState.players];
      let currentPlayer = newPlayers[roomState.activePlayerIndex];

      // Store original pos to calc distance
      const originalPos = currentPlayer.position;

      if (event.effectType === 'MOVE_FORWARD') {
          currentPlayer.position = Math.min(BOARD_SIZE - 1, currentPlayer.position + val);
      } else if (event.effectType === 'MOVE_BACK') {
          currentPlayer.position = Math.max(0, currentPlayer.position - val);
      } else if (event.effectType === 'SKIP_TURN') {
          currentPlayer.skipNextTurn = true;
      }

      newPlayers[roomState.activePlayerIndex] = currentPlayer;

      await updateGameState(roomId, {
          players: newPlayers,
          currentEvent: null,
          phase: GamePhase.PLAYING,
          lastLog: `${player.name} はイベントの結果を受け入れました。`,
          lastLogTimestamp: Date.now()
      });

      // Dynamic wait if moved
      if (event.effectType === 'MOVE_FORWARD' || event.effectType === 'MOVE_BACK') {
           const dist = Math.abs(currentPlayer.position - originalPos);
           const waitTime = (dist * 500) + 500;
           await new Promise(r => setTimeout(r, waitTime));
      } else {
           await new Promise(r => setTimeout(r, 1500));
      }

      await nextTurn(roomId, newPlayers, roomState.activePlayerIndex);
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
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 animate-fade-in">
         <div className="bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-600 shadow-xl flex items-center gap-3">
            <span className="text-xs text-slate-400">ID: <span className="font-mono font-bold text-blue-300 text-sm">{roomId}</span></span>
            <span className="w-px h-4 bg-slate-600"></span>
            <div className="flex items-center gap-2">
                <span className="text-lg">{roomState.players.find(p => p.id === myPlayerId)?.avatar}</span>
                <span className="text-sm font-bold truncate max-w-[120px]">{myPlayerName}</span>
            </div>
         </div>
      </div>

      {/* --- HUD: Top Right Menu Button --- */}
      <button
        onClick={() => setShowInfoPanel(!showInfoPanel)}
        className="absolute top-4 right-4 z-50 p-3 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-md rounded-full border border-slate-600 shadow-xl transition-all active:scale-95 text-xl"
      >
        {showInfoPanel ? '✖' : '☰'}
      </button>

      {/* --- HUD: Auto Camera Button (Bottom Left) --- */}
      <div className="absolute bottom-6 left-6 z-10">
        <button
            onClick={() => setAutoCamera(!autoCamera)}
            className={`px-4 py-2 rounded-full font-bold shadow-xl transition-all border ${
                autoCamera
                ? 'bg-blue-600/90 text-white border-blue-400 hover:bg-blue-500'
                : 'bg-slate-800/90 text-slate-300 border-slate-600 hover:bg-slate-700'
            }`}
        >
            {autoCamera ? '🎥 自動追従 ON' : '🎥 自動追従 OFF'}
        </button>
      </div>

      {/* --- Action Area (Bottom Center) --- */}
      <div className="absolute bottom-8 left-0 w-full z-20 flex flex-col items-center justify-end pointer-events-none px-4">

         {/* Active Player Indicator (When it's NOT my turn) */}
         {roomState.phase === GamePhase.PLAYING && !isMyTurn && (
             <div className="mb-4 bg-slate-800/80 backdrop-blur px-6 py-3 rounded-2xl border border-slate-600 shadow-xl flex items-center gap-3 animate-bounce-slight">
                 <span className="text-3xl">{activePlayer.avatar}</span>
                 <div>
                     <p className="text-xs text-slate-400 font-bold uppercase">現在のターン</p>
                     <p className="text-lg font-bold">{activePlayer.name} が考え中...</p>
                 </div>
             </div>
         )}

         {/* Roll Dice Button (When it IS my turn) */}
         {roomState.phase === GamePhase.PLAYING && isMyTurn && !isRolling && (
             <button
                onClick={handleRollDice}
                className="pointer-events-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xl font-bold py-4 px-12 rounded-2xl shadow-2xl shadow-blue-900/50 transform transition-all active:scale-95 hover:-translate-y-1 border-2 border-white/20"
             >
                🎲 サイコロを振る
             </button>
         )}

         {/* Rolling Indicator */}
         {isRolling && (
             <div className="mb-8 bg-slate-800/80 backdrop-blur px-8 py-4 rounded-xl border border-blue-500/50 shadow-xl text-center">
                 <div className="text-4xl animate-spin mb-2">🎲</div>
                 <p className="font-bold text-blue-300">運命のダイスロール...</p>
             </div>
         )}

         {/* Event Processing Action */}
         {roomState.phase === GamePhase.EVENT_PROCESSING && roomState.currentEvent && (
             <div className="pointer-events-auto w-full max-w-lg bg-slate-800/95 backdrop-blur-xl p-6 rounded-2xl border border-purple-500 shadow-2xl animate-slide-up relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                 <div className="text-center">
                    <div className="text-5xl mb-3">🔮</div>
                    <h3 className="text-xl font-bold text-purple-200 mb-1">{roomState.currentEvent.title}</h3>
                    <p className="text-slate-300 mb-6 italic">"{roomState.currentEvent.description}"</p>

                    <div className="inline-block px-3 py-1 bg-purple-900/50 rounded border border-purple-500/30 text-xs font-bold text-purple-300 mb-6 uppercase tracking-wider">
                        効果: {
                            roomState.currentEvent.effectType === 'MOVE_FORWARD' ? '進む' :
                            roomState.currentEvent.effectType === 'MOVE_BACK' ? '戻る' :
                            roomState.currentEvent.effectType === 'SKIP_TURN' ? '一回休み' : 'なし'
                        }
                        {roomState.currentEvent.value > 0 && ` (${roomState.currentEvent.value})`}
                    </div>

                    {isMyTurn ? (
                        <button
                            onClick={handleApplyEvent}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95"
                        >
                            結果を受け入れる
                        </button>
                    ) : (
                        <div className="text-center text-slate-500 animate-pulse bg-slate-900/50 py-2 rounded-lg">
                            {activePlayer.name} の選択を待っています...
                        </div>
                    )}
                 </div>
             </div>
         )}
      </div>

      {/* --- Info Panel (Slide-over) --- */}
      <div
        className={`fixed z-40 bg-slate-900/95 backdrop-blur-xl shadow-2xl border-slate-700 flex flex-col transition-transform duration-300 ease-out
            lg:top-0 lg:right-0 lg:h-full lg:w-96 lg:border-l lg:translate-y-0
            inset-x-0 bottom-0 h-[70vh] rounded-t-2xl border-t
            ${showInfoPanel ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-x-full lg:translate-y-0'}
        `}
      >
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-200">ゲーム情報</h2>
              <button onClick={() => setShowInfoPanel(false)} className="lg:hidden text-slate-400 p-2">
                  ⬇ 閉じる
              </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-6">
              {/* Player List */}
              <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">プレイヤー</h3>
                  <div className="space-y-2">
                      {roomState.players.map(p => (
                          <div key={p.id} className={`flex items-center p-3 rounded-lg border transition-colors ${
                              p.id === roomState.activePlayerIndex
                              ? `bg-slate-800 border-${p.color}-500/50 shadow-md`
                              : 'bg-slate-800/50 border-slate-700'
                          }`}>
                              <span className="text-2xl mr-3">{p.avatar}</span>
                              <div className="flex-grow">
                                  <div className="flex items-center justify-between">
                                      <span className={`font-bold ${p.id === myPlayerId ? 'text-blue-300' : 'text-slate-300'}`}>
                                          {p.name} {p.id === myPlayerId && '(あなた)'}
                                      </span>
                                      {p.id === roomState.activePlayerIndex && (
                                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded border border-green-500/30">TURN</span>
                                      )}
                                  </div>
                                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                      <span>現在地: {p.position}</span>
                                      {p.skipNextTurn && <span className="text-red-400">⚠ 休み</span>}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Game Log */}
              <div className="flex flex-col h-64">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex justify-between items-center">
                      ログ
                      <span className="bg-slate-700 text-slate-400 px-2 py-0.5 rounded text-[10px]">{logs.length}</span>
                  </h3>
                  <div
                    ref={logContainerRef}
                    className="flex-grow overflow-y-auto space-y-2 pr-2 bg-slate-800/50 rounded-lg p-2 border border-slate-700/50"
                  >
                      {logs.length === 0 && (
                          <div className="text-center text-slate-600 text-sm py-4">まだ履歴はありません</div>
                      )}
                      {logs.map((log, i) => (
                          <div key={i} className="text-xs p-2 bg-slate-700/30 rounded border-l-2 border-blue-500/50 text-slate-300 leading-relaxed">
                              {log}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
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
