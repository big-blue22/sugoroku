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
    let timer1: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;

    if (trigger) {
      setIsSpinning(true);

      // Phase 1: Spin fast randomly (Linear transition will be applied via style)
      // We want to ensure the random spin is substantially "forward"
      // Current rotation might be large if we rolled before.
      const currentX = rotation.x;
      const currentY = rotation.y;

      // Spin at least 2 full turns (720) + random
      const randX = currentX + 720 + Math.floor(Math.random() * 360 * 2);
      const randY = currentY + 720 + Math.floor(Math.random() * 360 * 2);

      setRotation({ x: randX, y: randY });

      // Phase 2: Settle to final value (Ease-out)
      timer1 = setTimeout(() => {
          setIsSpinning(false);
          const finalBase = getRotationForValue(value);

          // Calculate target rotation that is > randX/randY and matches finalBase
          // This prevents "rewinding" the spin
          const calculateTarget = (current: number, targetBase: number) => {
              const normTarget = ((targetBase % 360) + 360) % 360;
              const normCurrent = ((current % 360) + 360) % 360;

              let diff = normTarget - normCurrent;
              // Ensure we move forward to hit the target
              if (diff <= 0) diff += 360;

              // Add at least 1 full rotation (360) for the settling phase
              return current + diff + 360;
          };

          const finalX = calculateTarget(randX, finalBase.x);
          const finalY = calculateTarget(randY, finalBase.y);

          setRotation({
              x: finalX,
              y: finalY
          });

          // Call onRollComplete AFTER the settling animation (1s) finishes
          timer2 = setTimeout(() => {
              if (onRollComplete) {
                  onRollComplete(value);
              }
          }, 1000);

      }, 500); // Wait 0.5s for the "fast spin" part
    }
    return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
    };
  }, [trigger, value]);

  // Map dice value to rotation (x, y)
  const getRotationForValue = (val: number) => {
      switch(val) {
          case 1: return { x: 0, y: 0 };
          case 6: return { x: 180, y: 0 }; // Face 6 is typically opposite 1.
          // Swapped logic for 2 and 5 based on Face Construction
          // Face 2 (Left): Needs rotateY(90) to come to Front
          case 2: return { x: 0, y: 90 };
          // Face 5 (Right): Needs rotateY(-90) to come to Front
          case 5: return { x: 0, y: -90 };

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
        `rotateY(-90deg) translateZ(${translateZ}px)`, // 2
        `rotateX(90deg) translateZ(${translateZ}px)`, // 3
        `rotateX(-90deg) translateZ(${translateZ}px)`, // 4
        `rotateY(90deg) translateZ(${translateZ}px)`, // 5
        `rotateY(180deg) translateZ(${translateZ}px)` // 6
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
                // Dynamic transition: Linear for spin, Cubic-Bezier for settle
                transition: isSpinning
                    ? 'transform 0.5s linear'
                    : 'transform 1s cubic-bezier(0.25, 0.1, 0.25, 1)'
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
