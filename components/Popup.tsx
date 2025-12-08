import React from 'react';

export type PopupType = 'info' | 'success' | 'danger' | 'event';

interface PopupProps {
  message: string | null;
  type: PopupType;
  isVisible: boolean;
}

const Popup: React.FC<PopupProps> = ({ message, type, isVisible }) => {
  if (!message) return null;

  let bgClass = '';
  let icon = '';

  switch (type) {
    case 'success':
      bgClass = 'bg-green-600';
      icon = '✨';
      break;
    case 'danger':
      bgClass = 'bg-red-600';
      icon = '💥';
      break;
    case 'event':
      bgClass = 'bg-purple-600';
      icon = '🔮';
      break;
    default: // info
      bgClass = 'bg-blue-600';
      icon = '📢';
      break;
  }

  return (
    <div 
      className={`
        fixed top-[15%] left-1/2 transform -translate-x-1/2 -translate-y-1/2
        z-50 pointer-events-none transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'}
      `}
    >
      <div className={`${bgClass} text-white px-8 py-4 rounded-2xl shadow-2xl border-2 border-white/20 flex flex-col items-center justify-center min-w-[300px] text-center backdrop-blur-sm`}>
        <div className="text-4xl mb-2">{icon}</div>
        <div className="text-xl font-bold tracking-wider drop-shadow-md whitespace-pre-wrap">
          {message}
        </div>
      </div>
    </div>
  );
};

export default Popup;