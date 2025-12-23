import React, { useState, useEffect } from 'react';

interface Dice2DProps {
  value: number;
  isRolling: boolean;
  onRollComplete?: (value: number) => void;
  trigger?: boolean;
  size?: number;
}

const Dice2D: React.FC<Dice2DProps> = ({ value, isRolling, onRollComplete, trigger, size = 80 }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    let spinTimer: NodeJS.Timeout;
    let completeTimer: NodeJS.Timeout;

    if (trigger) {
      setIsSpinning(true);
      // Spin randomly first (Forward spin)
      // Start from current rotation + large random amount
      const currentX = rotation.x;
      const currentY = rotation.y;

      const spinRot = {
          x: currentX + 360 * 5 + Math.floor(Math.random() * 360),
          y: currentY + 360 * 5 + Math.floor(Math.random() * 360)
      };
      setRotation(spinRot);

      // After 1s, settle to final value
      spinTimer = setTimeout(() => {
          setIsSpinning(false);
          const finalRot = getRotationForValue(value);

          const targetX = getNextTarget(spinRot.x, finalRot.x);
          const targetY = getNextTarget(spinRot.y, finalRot.y);

          setRotation({
              x: targetX,
              y: targetY
          });

          // Wait for settle animation to finish (1s) before triggering completion
          completeTimer = setTimeout(() => {
              if (onRollComplete) {
                  onRollComplete(value);
              }
          }, 1000);
      }, 1000);
    }
    return () => {
        clearTimeout(spinTimer);
        clearTimeout(completeTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, value]);

  // Helper to ensure forward rotation to target face
  const getNextTarget = (current: number, targetBase: number) => {
      // Find k such that (k * 360 + targetBase) > current
      // We add +1 to k to ensure at least one full spin or significant movement
      const k = Math.ceil((current - targetBase) / 360);
      return (k + 1) * 360 + targetBase;
  };

  // Map dice value to rotation (x, y)
  // 1: Front (0,0)
  // 6: Back (180,0) - Rotate X 180
  // 2: Left -> Need to rotate Y+90 to bring Left to Front
  // 5: Right -> Need to rotate Y-90 to bring Right to Front
  // 3: Bottom -> Need to rotate X-90 to bring Bottom to Front
  // 4: Top -> Need to rotate X+90 to bring Top to Front
  const getRotationForValue = (val: number) => {
      switch(val) {
          case 1: return { x: 0, y: 0 };
          case 6: return { x: 180, y: 0 };
          case 2: return { x: 0, y: 90 };  // Fixed: Was -90
          case 5: return { x: 0, y: -90 }; // Fixed: Was 90
          case 3: return { x: -90, y: 0 };
          case 4: return { x: 90, y: 0 };
          default: return { x: 0, y: 0 };
      }
  };

  const faceStyle = (i: number) => {
    // Scale translateZ based on size. Default 80px size -> 40px Z
    const translateZ = size / 2;
    const baseTransforms = [
        `translateZ(${translateZ}px)`, // 1
        `rotateY(-90deg) translateZ(${translateZ}px)`, // 2 (Left)
        `rotateX(90deg) translateZ(${translateZ}px)`, // 3 (Bottom)
        `rotateX(-90deg) translateZ(${translateZ}px)`, // 4 (Top)
        `rotateY(90deg) translateZ(${translateZ}px)`, // 5 (Right)
        `rotateY(180deg) translateZ(${translateZ}px)` // 6 (Back)
    ];

    return {
        width: size,
        height: size,
        position: 'absolute' as 'absolute',
        border: '2px solid #ccc',
        background: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: size * 0.5,
        fontWeight: 'bold',
        transform: baseTransforms[i-1],
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
        borderRadius: size * 0.15
    };
  };

  return (
    <div style={{ perspective: '1000px', width: size, height: size }}>
        <div
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                transition: 'transform 1s cubic-bezier(0.25, 0.1, 0.25, 1)'
            }}
        >
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={faceStyle(i)}>
                    {DotFace(i, size)}
                </div>
            ))}
        </div>
    </div>
  );
};

const DotFace = (val: number, size: number) => {
    const dotSize = size * 0.2;
    type DotPos = { top: string; left: string };

    const positions: Record<number, DotPos[]> = {
        1: [{top: '50%', left: '50%'}],
        2: [{top: '25%', left: '25%'}, {top: '75%', left: '75%'}],
        3: [{top: '25%', left: '25%'}, {top: '50%', left: '50%'}, {top: '75%', left: '75%'}],
        4: [{top: '25%', left: '25%'}, {top: '25%', left: '75%'}, {top: '75%', left: '25%'}, {top: '75%', left: '75%'}],
        5: [{top: '25%', left: '25%'}, {top: '25%', left: '75%'}, {top: '50%', left: '50%'}, {top: '75%', left: '25%'}, {top: '75%', left: '75%'}],
        6: [{top: '25%', left: '25%'}, {top: '25%', left: '75%'}, {top: '50%', left: '25%'}, {top: '50%', left: '75%'}, {top: '75%', left: '25%'}, {top: '75%', left: '75%'}]
    };

    // Japanese Dice: 1 is Red and larger
    const isOne = val === 1;
    const color = isOne ? 'red' : 'black';
    const actualDotSize = isOne ? dotSize * 1.5 : dotSize;

    const dots = positions[val] || [];

    return (
        <div style={{width: '100%', height: '100%', position: 'relative'}}>
            {dots.map((pos, idx) => (
                <div key={idx} style={{
                    position: 'absolute',
                    top: pos.top,
                    left: pos.left,
                    width: actualDotSize,
                    height: actualDotSize,
                    backgroundColor: color,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.3)'
                }}></div>
            ))}
        </div>
    );
}

export default Dice2D;
