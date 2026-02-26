import React from 'react';
import { TileType, Tile as TileInterface } from '../types';

interface TileProps {
  tile: TileInterface;
  style?: React.CSSProperties;
  className?: string;
}

const getTileVisuals = (type: TileType) => {
  switch (type) {
    case TileType.VILLAGE:
      return { bgColor: 'bg-green-500', borderColor: 'border-green-600', icon: '🏠', label: '村' };
    case TileType.BOSS:
      return { bgColor: 'bg-red-600', borderColor: 'border-red-800', icon: '👑', label: 'ボス' };
    case TileType.MONSTER:
      return { bgColor: 'bg-orange-500', borderColor: 'border-orange-600', icon: '⚔️', label: '' };
    case TileType.TREASURE:
      return { bgColor: 'bg-yellow-400', borderColor: 'border-yellow-600', icon: '💰', label: '宝箱' };
    case TileType.TRAP:
      return { bgColor: 'bg-purple-500', borderColor: 'border-purple-700', icon: '☠️', label: '罠' };
    case TileType.CASINO:
      return { bgColor: 'bg-pink-500', borderColor: 'border-pink-700', icon: '🎰', label: 'カジノ' };
    case TileType.EMPTY:
    default:
      return { bgColor: 'bg-white', borderColor: 'border-slate-300', icon: '', label: '' };
  }
};

const Tile: React.FC<TileProps> = ({ tile, style, className }) => {
  const { bgColor, borderColor, icon, label } = getTileVisuals(tile.type);

  return (
    <div
      style={style}
      className={`
        flex flex-col items-center justify-center
        rounded-lg border-b-4
        ${bgColor} ${borderColor}
        shadow-lg
        ${className || ''}
      `}
    >
      <span className="text-xs font-bold text-slate-400/70 absolute top-1 left-2">
        {tile.id}
      </span>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-xs font-bold uppercase ${tile.type !== TileType.EMPTY ? 'text-white' : 'text-slate-600'}`}>
        {label}
      </div>
    </div>
  );
};

export default Tile;
