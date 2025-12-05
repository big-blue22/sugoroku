import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  // Online Multiplayer Mode Verified
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

  // Derived State (local caching of animations)
  const [localDiceValue, setLocalDiceValue] = useState<number | null>(null);
  // We use this to trigger the 3D dice. Increments when roomState.diceRollCount changes.
  const [dice3DTrigger, setDice3DTrigger] = useState(0);

  // --- Subscriptions & Effect Handling ---

  // Reconnection Logic
  useEffect(() => {
    const savedRoom = localStorage.getItem('sugoroku_roomId');
    const savedPlayerId = localStorage.getItem('sugoroku_playerId');
    const savedName = localStorage.getItem('sugoroku_playerName');

    if (savedRoom && savedPlayerId && savedName) {
       setRoomId(savedRoom);
       setMyPlayerId(Number(savedPlayerId));
       setMyPlayerName(savedName);
    }
  }, []);

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
          // Prevent duplicates by checking if the last log in our array matches (simple check)
          // A timestamp check is better but for now string check is ok if messages are unique enough or we just append.
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
  }, [logs]);

  // Handle Dice Animation Trigger
  useEffect(() => {
      if (roomState?.diceRollCount && roomState.diceValue) {
          setLocalDiceValue(roomState.diceValue);
          setDice3DTrigger(prev => prev + 1);
          setIsRolling(true); // Visual indicator start

          // Stop rolling visual after a moment
          setTimeout(() => setIsRolling(false), 2000);
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
      // Local log fallback, mainly for debug
      // In multiplayer, we rely on roomState.lastLog usually.
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

      // Save session
      localStorage.setItem('sugoroku_roomId', id);
      localStorage.setItem('sugoroku_playerId', pId.toString());
      localStorage.setItem('sugoroku_playerName', pName);
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
      // We don't move yet. We just show the roll.
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

      // Update Player Position in DB (Triggers movement animation on all clients)
      const updatedPlayers = roomState.players.map(p =>
          p.id === activePlayer.id ? { ...p, position: targetPos } : p
      );

      await updateGameState(roomId, {
          players: updatedPlayers,
          lastLog: `${activePlayer.name} は ${roll} マス進み、マス ${targetPos} に止まった。`,
          lastLogTimestamp: Date.now()
      });

      // Wait for movement animation (approx 0.5s per tile? No, hopping is fast. Fixed time?)
      // Let's wait 1.5s
      await new Promise(r => setTimeout(r, 1500));

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
          // Move again
          await new Promise(r => setTimeout(r, 1000));
          const newPos = Math.min(BOARD_SIZE - 1, pos + tile.effectValue);

          const newPlayers = currentPlayers.map(p => p.id === player.id ? { ...p, position: newPos } : p);
          await updateGameState(roomId, {
              players: newPlayers,
              lastLog: `✨ ラッキー！ ${tile.effectValue}マス進みます。`,
              lastLogTimestamp: Date.now()
          });

          await new Promise(r => setTimeout(r, 1500));
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

          await new Promise(r => setTimeout(r, 1500));
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

           // Note: applyEventEffect will be called by the user clicking the button

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

      await new Promise(r => setTimeout(r, 1500));
      await nextTurn(roomId, newPlayers, roomState.activePlayerIndex);
  };


  // --- Render ---

  if (!roomId || !roomState) {
    return <SetupScreen onJoinGame={handleJoinGame} />;
  }

  // Lobby
  if (roomState.status === 'WAITING') {
      const isHost = roomState.hostId === myPlayerName; // Simple check
      // Actually hostId might be 'PlayerName' from createRoom logic.

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
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 font-sans">
      <Popup 
        message={popupData?.msg || null} 
        type={popupData?.type || 'info'} 
        isVisible={showPopup} 
      />

      <header className="p-4 bg-slate-800 shadow-lg z-10 flex justify-between items-center border-b border-slate-700">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          冒険すごろく ONLINE
        </h1>
        <div className="text-sm text-slate-400">
            ルーム: <span className="font-mono font-bold text-white">{roomId}</span> | あなた: {myPlayerName}
        </div>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-grow relative bg-slate-900 overflow-hidden h-[50vh] lg:h-auto">
             <GameScene
               board={board}
               players={roomState.players}
               activePlayerIndex={roomState.activePlayerIndex}
               autoCamera={autoCamera}
               diceTrigger={dice3DTrigger}
               diceTarget={roomState.diceValue || 1}
             />
             <div className="absolute top-4 right-4 z-10">
                <button
                   onClick={() => setAutoCamera(!autoCamera)}
                   className={`px-3 py-1 text-xs rounded-full font-bold shadow-lg transition-colors ${
                       autoCamera
                       ? 'bg-blue-600 text-white hover:bg-blue-500'
                       : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                   }`}
                >
                   {autoCamera ? '🎥 自動追従 ON' : '🎥 自動追従 OFF'}
                </button>
             </div>
        </div>

        <div className="w-full lg:w-96 bg-slate-800 border-l border-slate-700 flex flex-col shadow-2xl z-20">
          <div className="p-6 border-b border-slate-700 bg-slate-800">
            {roomState.phase === GamePhase.GAME_OVER ? (
               <div className="text-center">
                 <div className="text-6xl mb-4">🏆</div>
                 <h2 className="text-2xl font-bold text-yellow-400 mb-2">ゲーム終了！</h2>
                 <p className="text-white">優勝は {roomState.players.find(p => p.isWinner)?.name} です！</p>
                 <button 
                   onClick={() => {
                       localStorage.clear();
                       window.location.reload();
                   }}
                   className="mt-6 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 font-bold"
                 >
                   ロビーに戻る
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
                <div className={`text-sm mb-6 ${isMyTurn ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                    {isMyTurn ? '👉 あなたの番です！' : '待機中...'}
                </div>

                {roomState.phase === GamePhase.PLAYING && (
                  <div className="flex flex-col items-center w-full">
                    <div className="w-24 h-24 bg-white rounded-xl shadow-inner flex items-center justify-center mb-4 border-4 border-slate-300">
                       <span className={`text-5xl font-bold text-slate-800 ${isRolling ? 'animate-bounce' : ''}`}>
                         {roomState.diceValue ?? '?'}
                       </span>
                    </div>
                    <button
                      onClick={handleRollDice}
                      disabled={!isMyTurn || isRolling}
                      className={`w-full py-3 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${
                        !isMyTurn || isRolling
                          ? 'bg-slate-600 cursor-not-allowed text-slate-400' 
                          : `bg-gradient-to-r from-${activePlayer.color}-500 to-${activePlayer.color}-600 hover:brightness-110 shadow-lg shadow-${activePlayer.color}-500/40`
                      }`}
                    >
                      {isRolling ? 'コロコロ...' : 'サイコロを振る 🎲'}
                    </button>
                  </div>
                )}

                {roomState.phase === GamePhase.EVENT_PROCESSING && roomState.currentEvent && (
                   <div className="w-full p-4 bg-slate-700/50 rounded-xl border border-purple-500/30">
                       <div className="text-center animate-fade-in">
                          <div className="text-4xl mb-2">🔮</div>
                          <h3 className="text-lg font-bold text-purple-300 mb-1">{roomState.currentEvent.title}</h3>
                          <p className="text-sm text-slate-300 mb-4 italic">"{roomState.currentEvent.description}"</p>
                          <div className="text-xs font-bold uppercase tracking-wider text-purple-200 mb-4 bg-purple-900/50 py-1 rounded">
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
                                className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition-colors"
                              >
                                結果を受け入れる
                              </button>
                          ) : (
                              <div className="text-xs text-center text-slate-500">プレイヤーの選択待ち...</div>
                          )}
                       </div>
                   </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-grow flex flex-col p-4 overflow-hidden bg-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ゲームログ</h3>
            <div 
              ref={logContainerRef}
              className="flex-grow overflow-y-auto space-y-2 pr-2 scrollbar-hide"
            >
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
// Verified at Fri Dec  5 13:12:09 UTC 2025
