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
  let showTypeLabel = false;

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
    case TileType.GOOD:
      bgColor = 'bg-green-100';
      borderColor = 'border-green-300';
      icon = '🍀';
      showTypeLabel = true;
      break;
    case TileType.BAD:
      bgColor = 'bg-red-100';
      borderColor = 'border-red-300';
      icon = '🔥';
      showTypeLabel = true;
      break;
    case TileType.EVENT:
      bgColor = 'bg-purple-100';
      borderColor = 'border-purple-300';
      icon = '🔮';
      showTypeLabel = true;
      break;
    default:
      bgColor = 'bg-white';
      icon = '';
      break;
  }

  const getTypeLabel = (type: TileType) => {
    switch (type) {
        case TileType.GOOD: return '好機';
        case TileType.BAD: return '危機';
        case TileType.EVENT: return '謎';
        default: return '';
    }
  };

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
        {label === String(tile.id) ? (showTypeLabel ? getTypeLabel(tile.type) : '') : label}
      </div>
    </div>
  );
};

export default Tile;
