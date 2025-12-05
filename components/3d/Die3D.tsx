import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface Die3DProps {
  targetValue: number;
  trigger: number; // Increment to trigger a new roll
  position: [number, number, number];
  onLand?: () => void;
}

// Function to draw a die face on a canvas and return a texture
const createDieFaceTexture = (value: number, size: number = 256): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Pip settings
  const pipSize = size * 0.18;
  const pipColor = value === 1 ? '#ff0000' : '#000000';
  ctx.fillStyle = pipColor;

  // Helper to draw circle
  const drawPip = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, pipSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const center = size / 2;
  const offset = size * 0.25;

  if (value === 1) {
    // Number 1 is often larger
    const largePipSize = size * 0.25;
    ctx.beginPath();
    ctx.arc(center, center, largePipSize / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
      // Standard positions
      // Top-Left, Top-Right
      // Mid-Left, Mid-Right
      // Bot-Left, Bot-Right
      const tl = { x: center - offset, y: center - offset };
      const tr = { x: center + offset, y: center - offset };
      const ml = { x: center - offset, y: center };
      const mr = { x: center + offset, y: center };
      const bl = { x: center - offset, y: center + offset };
      const br = { x: center + offset, y: center + offset };
      const cc = { x: center, y: center };

      if (value === 2) { drawPip(tl.x, tl.y); drawPip(br.x, br.y); }
      if (value === 3) { drawPip(tl.x, tl.y); drawPip(cc.x, cc.y); drawPip(br.x, br.y); }
      if (value === 4) { drawPip(tl.x, tl.y); drawPip(tr.x, tr.y); drawPip(bl.x, bl.y); drawPip(br.x, br.y); }
      if (value === 5) { drawPip(tl.x, tl.y); drawPip(tr.x, tr.y); drawPip(cc.x, cc.y); drawPip(bl.x, bl.y); drawPip(br.x, br.y); }
      if (value === 6) {
          drawPip(tl.x, tl.y); drawPip(tr.x, tr.y);
          drawPip(ml.x, ml.y); drawPip(mr.x, mr.y);
          drawPip(bl.x, bl.y); drawPip(br.x, br.y);
      }
  }

  return new THREE.CanvasTexture(canvas);
};

export const Die3D: React.FC<Die3DProps> = ({ targetValue, trigger, position, onLand }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [animationState, setAnimationState] = useState<'idle' | 'falling' | 'landed'>('idle');
  const [startTime, setStartTime] = useState(0);
  const [dropPosition, setDropPosition] = useState<[number, number, number]>(position);

  // Generate Textures only once
  const materials = useMemo(() => {
    // BoxGeometry Face Mapping: Right, Left, Top, Bottom, Front, Back
    // My Logic assumes:
    // Top (Y+): 1
    // Bottom (Y-): 6
    // Front (Z+): 2
    // Back (Z-): 5
    // Right (X+): 3
    // Left (X-): 4

    // Therefore, material array indices should be:
    // 0: Right -> Value 3
    // 1: Left -> Value 4
    // 2: Top -> Value 1
    // 3: Bottom -> Value 6
    // 4: Front -> Value 2
    // 5: Back -> Value 5

    const order = [3, 4, 1, 6, 2, 5];
    return order.map(val => {
        const tex = createDieFaceTexture(val);
        return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.2, metalness: 0.1 });
    });
  }, []);

  const TARGET_ROTATIONS: {[key: number]: [number, number, number]} = {
      1: [0, 0, 0],
      2: [-Math.PI / 2, 0, 0],
      3: [0, 0, Math.PI / 2],
      4: [0, 0, -Math.PI / 2],
      5: [Math.PI / 2, 0, 0],
      6: [Math.PI, 0, 0]
  };

  // Only restart animation when TRIGGER changes
  useEffect(() => {
      if (trigger > 0 && groupRef.current) {
          setAnimationState('falling');
          setStartTime(Date.now());
          setDropPosition(position); // Lock in the position at moment of trigger

          // Reset Start Position (High up) relative to the locked dropPosition
          groupRef.current.position.set(position[0], position[1] + 10, position[2]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]); // Removed 'position' to prevent looping when player moves

  useFrame(() => {
      if (!groupRef.current) return;
      if (animationState === 'idle') return;

      const now = Date.now();
      const elapsed = (now - startTime) / 1000; // seconds
      const duration = 1.0; // Fall duration

      // Use dropPosition, not current prop position
      const targetPos = dropPosition;

      if (animationState === 'falling') {
          if (elapsed < duration) {
              const progress = elapsed / duration;
              const startY = targetPos[1] + 10;
              const endY = targetPos[1] + 0.5;

              const ease = 1 - Math.pow(1 - progress, 3);
              const currentY = startY - (startY - endY) * ease;

              groupRef.current.position.set(targetPos[0], currentY, targetPos[2]);

              const spinSpeed = 10 * (1 - progress);

              if (progress < 0.7) {
                  groupRef.current.rotation.x += spinSpeed * 0.1;
                  groupRef.current.rotation.y += spinSpeed * 0.1;
                  groupRef.current.rotation.z += spinSpeed * 0.1;
              } else {
                  const targetEuler = TARGET_ROTATIONS[targetValue];
                  const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...targetEuler));
                  groupRef.current.quaternion.slerp(targetQuat, 0.2);
              }

          } else {
              // Landed
              const targetEuler = TARGET_ROTATIONS[targetValue];
              groupRef.current.rotation.set(...targetEuler);
              groupRef.current.position.set(targetPos[0], targetPos[1] + 0.5, targetPos[2]);

              setAnimationState('landed');
              if (onLand) onLand();
          }
      }
  });

  if (trigger === 0) return null;

  return (
    <group ref={groupRef}>
      {/* Box with textures */}
      <mesh material={materials}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  );
};
