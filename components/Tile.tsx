import React from 'react';
import { TileType, Tile as TileInterface } from '../types';

interface TileProps {
  tile: TileInterface;
  style?: React.CSSProperties;
  className?: string;
}

const Tile: React.FC<TileProps> = ({ tile, style, className }) => {
  let bgColor = 'bg-slate-200';
  let borderColor = 'border-slate-300';
  let icon = '';
  let label = String(tile.id);

  switch (tile.type) {
    case TileType.START:
      bgColor = 'bg-blue-500';
      borderColor = 'border-blue-600';
      icon = '🚀';
      label = 'スタート';
      break;
    case TileType.GOAL:
      bgColor = 'bg-yellow-400';
      borderColor = 'border-yellow-600';
      icon = '👑';
      label = 'ゴール';
      break;
    default:
      bgColor = 'bg-white';
      icon = '';
      break;
  }

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
      <div className={`text-xs font-bold uppercase ${tile.type === TileType.START || tile.type === TileType.GOAL ? 'text-white' : 'text-slate-600'}`}>
        {label}
      </div>
    </div>
  );
};

export default Tile;
