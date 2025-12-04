import React from 'react';

interface PlayerPawnProps {
  avatar: string;
  color: string;
  x: number;
  y: number;
  isMoving?: boolean;
}

const PlayerPawn: React.FC<PlayerPawnProps> = ({ avatar, color, x, y, isMoving }) => {
  // Calculate position based on grid coordinates
  // Assuming each tile is roughly 6rem (96px) + gap, let's say 110px spacing for now.
  // We will fine tune this to match the board rendering logic in App.tsx.
  // Let's use percentages or strictly matching units.
  // Using calc for dynamic positioning.

  // These styles make it a 3D box
  const boxStyle = {
    transformStyle: 'preserve-3d' as const,
    transform: `rotateX(-60deg) translateY(-20px)`, // Counter-rotate to stand up, lift up slightly
  };

  // Base size of the pawn
  const size = "w-10 h-10 sm:w-12 sm:h-12";
  const colorClass = `bg-${color}-500`;
  const darkerColorClass = `bg-${color}-700`;

  return (
    <div
      className={`absolute transition-all duration-500 ease-in-out z-20`}
      style={{
        left: `calc(${x} * 120px + 60px)`, // 120px stride, 60px offset (center of tile)
        top: `calc(${y} * 120px + 50px)`,
        transformStyle: 'preserve-3d'
      }}
    >
        {/* The 3D Object Container */}
        <div className="relative" style={boxStyle}>
            {/* Shadow */}
            <div className="absolute top-10 left-1 w-full h-full bg-black/30 rounded-full blur-sm transform scale-x-125 scale-y-50 rotate-x-60" />

            {/* Front Face (Avatar) */}
            <div className={`absolute ${size} ${colorClass} rounded-lg flex items-center justify-center border-2 border-white/50 shadow-inner`}
                 style={{ transform: 'translateZ(10px)' }}>
                 <span className="text-2xl sm:text-3xl filter drop-shadow-md">{avatar}</span>
            </div>

            {/* Back Face */}
            <div className={`absolute ${size} ${colorClass} rounded-lg`}
                 style={{ transform: 'translateZ(-10px)' }}>
            </div>

            {/* Side Faces (Thickness) */}
            <div className={`absolute h-full w-5 ${darkerColorClass} left-0 origin-left border-l border-white/20`}
                 style={{ transform: 'rotateY(-90deg) translateZ(0)' }}></div>

            <div className={`absolute h-full w-5 ${darkerColorClass} right-0 origin-right border-r border-white/20`}
                 style={{ transform: 'rotateY(90deg) translateZ(0)' }}></div>

            <div className={`absolute w-full h-5 ${darkerColorClass} top-0 origin-top border-t border-white/20`}
                 style={{ transform: 'rotateX(90deg) translateZ(0)' }}></div>

             {/* Jumping animation if moving? (Can add later) */}
        </div>

        {/* Name tag floating above */}
        {/* <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/50 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm"
             style={{ transform: 'rotateX(-60deg)' }}>
             Player
        </div> */}
    </div>
  );
};

export default PlayerPawn;
