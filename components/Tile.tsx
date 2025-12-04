import React from 'react';
import { TileType, Tile as TileInterface, Player } from '../types';

interface TileProps {
  tile: TileInterface;
  playersOnTile: Player[];
}

const Tile: React.FC<TileProps> = ({ tile, playersOnTile }) => {
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

  // Helper to translate internal types to display text (optional, currently mainly using icons)
  const getTypeLabel = (type: TileType) => {
    switch (type) {
        case TileType.GOOD: return '好機';
        case TileType.BAD: return '危機';
        case TileType.EVENT: return '謎';
        default: return '';
    }
  };

  return (
    <div className={`
      relative flex flex-col items-center justify-center 
      w-full h-24 sm:h-28 rounded-lg border-b-4 
      ${bgColor} ${borderColor} 
      tile-shadow transition-transform hover:scale-[1.02]
    `}>
      {/* Tile Content */}
      <span className="text-xs font-bold text-slate-400 absolute top-1 left-2">
        {tile.id}
      </span>
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-xs font-bold uppercase ${tile.type === TileType.START || tile.type === TileType.GOAL ? 'text-white' : 'text-slate-600'}`}>
        {label === String(tile.id) ? (showTypeLabel ? getTypeLabel(tile.type) : '') : label}
      </div>

      {/* Players on this tile */}
      <div className="absolute bottom-1 w-full flex justify-center space-x-1 px-1">
        {playersOnTile.map((p) => (
          <div 
            key={p.id}
            className={`
              w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-xs sm:text-sm bg-${p.color}-500
              transform -translate-y-1 transition-all duration-300
            `}
            title={p.name}
          >
            {p.avatar}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tile;