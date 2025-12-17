import React, { useState, useEffect } from 'react';

interface Dice2DProps {
  value: number;
  isRolling: boolean;
  onRollComplete?: (value: number) => void;
  trigger?: boolean;
  size?: number;
}

const Dice2D: React.FC<Dice2DProps> = ({ value, isRolling, onRollComplete, trigger, size = 60 }) => {
  const [displayValue, setDisplayValue] = useState(1);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (trigger) {
      setAnimating(true);
      let count = 0;
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
        count++;
        if (count > 10) { // Roll for approx 1s (10 * 100ms)
          clearInterval(interval);
          setAnimating(false);
          setDisplayValue(value); // Set final value
          if (onRollComplete) onRollComplete(value);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [trigger, value, onRollComplete]);

  // Dot positions
  const getDots = (val: number) => {
    switch (val) {
      case 1: return [{ x: 50, y: 50, color: 'red', size: 25 }];
      case 2: return [{ x: 20, y: 20 }, { x: 80, y: 80 }];
      case 3: return [{ x: 20, y: 20 }, { x: 50, y: 50 }, { x: 80, y: 80 }];
      case 4: return [{ x: 20, y: 20 }, { x: 80, y: 20 }, { x: 20, y: 80 }, { x: 80, y: 80 }];
      case 5: return [{ x: 20, y: 20 }, { x: 80, y: 20 }, { x: 50, y: 50 }, { x: 20, y: 80 }, { x: 80, y: 80 }];
      case 6: return [{ x: 20, y: 20 }, { x: 80, y: 20 }, { x: 20, y: 50 }, { x: 80, y: 50 }, { x: 20, y: 80 }, { x: 80, y: 80 }];
      default: return [];
    }
  };

  const dots = getDots(animating ? displayValue : value); // Use final value if not animating, but ensure displayValue is sync if just rendered static

  // If not animating and trigger is false, just show value.
  // Actually, displayValue tracks animation state.
  const currentVal = animating ? displayValue : value;
  const currentDots = getDots(currentVal);

  return (
    <div
      className="bg-white rounded-xl shadow-xl flex relative border border-slate-300"
      style={{
        width: size,
        height: size,
        transform: animating ? 'rotate(360deg)' : 'rotate(0deg)',
        transition: 'transform 0.5s ease-in-out'
      }}
    >
      {currentDots.map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${dot.size || 18}%`,
            height: `${dot.size || 18}%`,
            backgroundColor: dot.color || 'black',
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </div>
  );
};

export default Dice2D;
