import React, { useState, useEffect } from 'react';
import { createRoom, joinRoom } from '../services/roomService';
import { checkFirebaseConfig } from '../services/firebase';

interface SetupScreenProps {
  onJoinGame: (roomId: string, playerId: number, playerName: string) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onJoinGame }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🧙‍♂️');
  const [color, setColor] = useState('blue');
  const [mode, setMode] = useState<'INITIAL' | 'CREATE' | 'JOIN'>('INITIAL');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check Config on Mount
  useEffect(() => {
    const missing = checkFirebaseConfig();
    if (missing.length > 0) {
      setError(`Configuration Missing: ${missing.join(', ')}. Please check GitHub Secrets.`);
    }
  }, []);

  const avatars = ['🧙‍♂️', '🧝‍♀️', '🧚', '🧞‍♂️', '🧛', '🤖', '🦊', '🐱'];
  const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'pink'];

  const getErrorMessage = (err: any): string => {
    if (err.code === 'permission-denied') {
      return "アクセスが拒否されました。Firebase ConsoleのFirestoreルールを「テストモード」に設定してください。";
    }
    return "エラーが発生しました: " + (err.message || "不明なエラー");
  };

  const handleCreateRoom = async () => {
    if (!name) return;
    setIsLoading(true);
    setError(null);

    // Timeout Promise
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timed out. Check your network or configuration.")), 10000)
    );

    try {
      const result = await Promise.race([
          createRoom({ name, avatar, color }),
          timeout
      ]) as { roomId: string, playerId: number };

      onJoinGame(result.roomId, result.playerId, name);
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err));
      setMode('INITIAL'); // Go back so user isn't stuck
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!name || !roomIdInput) return;
    setIsLoading(true);
    setError(null);

    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timed out. Check your network or configuration.")), 10000)
    );

    try {
      const result = await Promise.race([
          joinRoom(roomIdInput.toUpperCase(), { name, avatar, color }),
          timeout
      ]) as { playerId: number } | null;

      if (result) {
         onJoinGame(roomIdInput.toUpperCase(), result.playerId, name);
      }
    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'INITIAL') {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
            <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
              冒険すごろく ONLINE
            </h1>

            {error && (
                <div className="bg-red-900/50 text-red-200 p-4 rounded-lg mb-6 border border-red-700 text-sm font-bold">
                    ⚠️ {error}
                </div>
            )}

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">名前</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="あなたの名前"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">アバター</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {avatars.map(a => (
                            <button
                                key={a}
                                onClick={() => setAvatar(a)}
                                className={`text-2xl w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-all ${avatar === a ? 'border-blue-500 bg-slate-700 scale-110' : 'border-transparent hover:bg-slate-700'}`}
                            >
                                {a}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">カラー</label>
                    <div className="flex gap-2">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                style={{ backgroundColor: c === 'blue' ? '#3b82f6' : c === 'red' ? '#ef4444' : c === 'green' ? '#22c55e' : c === 'yellow' ? '#eab308' : c === 'purple' ? '#a855f7' : '#ec4899' }}
                            />
                        ))}
                    </div>
                </div>

                <div className="pt-4 flex gap-4">
                    <button
                        onClick={() => setMode('CREATE')}
                        disabled={!name || !!error} // Disable if config error
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
                    >
                        ルーム作成
                    </button>
                    <button
                        onClick={() => setMode('JOIN')}
                        disabled={!name || !!error}
                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl font-bold transition-all border border-slate-600"
                    >
                        参加する
                    </button>
                </div>
            </div>
          </div>
        </div>
      );
  }

  if (mode === 'CREATE') {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
             <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 text-center">
                 <h2 className="text-xl font-bold mb-4">ルームを作成中...</h2>
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                 {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                 {!isLoading && handleCreateRoom() /* Auto trigger */}
             </div>
          </div>
      )
  }

  if (mode === 'JOIN') {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
            <button onClick={() => setMode('INITIAL')} className="text-sm text-slate-400 mb-4 hover:text-white">← 戻る</button>
            <h2 className="text-2xl font-bold text-center mb-6">ルームに参加</h2>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">ルームID (4文字)</label>
                    <input
                        type="text"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                        maxLength={4}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-green-500 outline-none transition-all uppercase placeholder-slate-700"
                        placeholder="ABCD"
                    />
                </div>

                {error && (
                    <div className="bg-red-900/30 text-red-400 p-3 rounded text-sm border border-red-900/50">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleJoinRoom}
                    disabled={isLoading || roomIdInput.length < 4}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl font-bold transition-all shadow-lg shadow-green-900/20"
                >
                    {isLoading ? '参加中...' : 'ルームに入る'}
                </button>
            </div>
          </div>
        </div>
      );
  }

  return null;
};

export default SetupScreen;
