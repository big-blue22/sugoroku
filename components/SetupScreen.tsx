import React, { useState } from 'react';
import { AVATARS, PLAYER_COLORS } from '../constants';

interface SetupScreenProps {
  onStartGame: (players: { name: string; color: string; avatar: string }[]) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame }) => {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [configs, setConfigs] = useState(
    Array(4).fill(null).map((_, i) => ({
      name: `プレイヤー ${i + 1}`,
      color: PLAYER_COLORS[i].class,
      avatar: AVATARS[i],
    }))
  );

  const handleConfigChange = (index: number, field: string, value: string) => {
    const newConfigs = [...configs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setConfigs(newConfigs);
  };

  const handleStart = () => {
    const activePlayers = configs.slice(0, playerCount);
    onStartGame(activePlayers);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900 text-white">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
          AI冒険すごろく
        </h1>
        <p className="text-slate-400 text-center mb-8 text-sm">Gemini AI ゲームマスターと一緒に冒険へ出かけよう！</p>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-2 text-slate-300">プレイ人数</label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                onClick={() => setPlayerCount(num)}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                  playerCount === num 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {num}人
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {configs.slice(0, playerCount).map((config, idx) => (
            <div key={idx} className="flex items-center space-x-3 bg-slate-700/50 p-3 rounded-xl border border-slate-600">
              <div className="flex-shrink-0">
                <select 
                  value={config.avatar}
                  onChange={(e) => handleConfigChange(idx, 'avatar', e.target.value)}
                  className="bg-slate-800 border border-slate-600 rounded p-1 text-xl cursor-pointer"
                >
                  {AVATARS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => handleConfigChange(idx, 'name', e.target.value)}
                  className="w-full bg-transparent border-b border-slate-500 focus:border-blue-400 outline-none px-1 py-1 text-sm font-medium"
                  placeholder="名前"
                />
              </div>
              <div className="flex space-x-1">
                {PLAYER_COLORS.map(color => (
                  <button
                    key={color.class}
                    onClick={() => handleConfigChange(idx, 'color', color.class)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      config.color === color.class ? 'border-white scale-110' : 'border-transparent opacity-50'
                    } bg-${color.class}-500`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-lg shadow-xl shadow-blue-900/50 transition-all transform hover:scale-[1.02]"
        >
          冒険を始める
        </button>
      </div>
    </div>
  );
};

export default SetupScreen;