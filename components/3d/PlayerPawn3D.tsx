import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector3, Group } from 'three';
import { Html } from '@react-three/drei';
import { BOARD_COORDINATES, GRID_SCALE } from '../../constants';

interface PlayerPawn3DProps {
  id: number;
  avatar: string;
  color: string;
  targetIndex: number;
  offset: { x: number; z: number };
  isActive: boolean;
}

const getPosition = (index: number) => {
  const coords = BOARD_COORDINATES[index] || {x: 0, y: 0};
  return {
    x: coords.x * GRID_SCALE,
    z: coords.y * GRID_SCALE
  };
};

const PlayerPawn3D: React.FC<PlayerPawn3DProps> = ({ id, avatar, color, targetIndex, offset, isActive }) => {
  const groupRef = useRef<Group>(null);

  // Track where we are visually (index) without triggering re-renders
  const visualIndexRef = useRef(targetIndex);

  // Queue of steps to animate through
  const queueRef = useRef<number[]>([]);
  const isAnimatingRef = useRef(false);

  // Animation state
  const startPosRef = useRef(new Vector3());
  const endPosRef = useRef(new Vector3());
  const progressRef = useRef(0);
  const currentTargetIndexRef = useRef<number | null>(null);

  // Initialize position on mount
  useEffect(() => {
     if (groupRef.current) {
         const pos = getPosition(targetIndex);
         groupRef.current.position.set(pos.x + offset.x, 0, pos.z + offset.z);
         visualIndexRef.current = targetIndex;
     }
  }, []);

  // Watch for changes in targetIndex
  useEffect(() => {
      const currentVisual = visualIndexRef.current;
      if (targetIndex === currentVisual) return;

      // Calculate path from current visual position to new target
      const path: number[] = [];
      if (targetIndex > currentVisual) {
          // Forward
          for (let i = currentVisual + 1; i <= targetIndex; i++) {
              path.push(i);
          }
      } else {
          // Backward
          for (let i = currentVisual - 1; i >= targetIndex; i--) {
              path.push(i);
          }
      }

      if (path.length > 0) {
          queueRef.current = path;
      } else {
          // Just in case
          visualIndexRef.current = targetIndex;
      }
  }, [targetIndex]);


  // Color mapping
  const getColor = (c: string) => {
    switch (c) {
      case 'red': return '#ef4444';
      case 'blue': return '#3b82f6';
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      default: return '#cbd5e1';
    }
  };

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Check if we have a target to move to
    if (currentTargetIndexRef.current === null && queueRef.current.length > 0) {
        // Start next hop
        const nextIndex = queueRef.current.shift()!;
        currentTargetIndexRef.current = nextIndex;

        // Setup start/end vectors
        startPosRef.current.copy(groupRef.current.position);
        startPosRef.current.y = 0; // Ensure start is on ground

        const nextPos = getPosition(nextIndex);
        endPosRef.current.set(nextPos.x + offset.x, 0, nextPos.z + offset.z);

        progressRef.current = 0;
        isAnimatingRef.current = true;
    }

    if (isAnimatingRef.current && currentTargetIndexRef.current !== null) {
        // Animate
        const duration = 0.5; // seconds per hop
        progressRef.current += delta / duration;

        if (progressRef.current >= 1) {
            // Finished this hop
            groupRef.current.position.copy(endPosRef.current);
            visualIndexRef.current = currentTargetIndexRef.current;
            currentTargetIndexRef.current = null;

            // Check if queue is empty
            if (queueRef.current.length === 0) {
                isAnimatingRef.current = false;
            }
        } else {
            // Interpolate
            const p = progressRef.current;

            // Linear X/Z
            const currX = THREE.MathUtils.lerp(startPosRef.current.x, endPosRef.current.x, p);
            const currZ = THREE.MathUtils.lerp(startPosRef.current.z, endPosRef.current.z, p);

            // Parabolic Y (Jump)
            const jumpHeight = 2.0;
            const currY = Math.sin(p * Math.PI) * jumpHeight;

            groupRef.current.position.set(currX, currY, currZ);

            // Face direction of movement
            if (startPosRef.current.distanceTo(endPosRef.current) > 0.1) {
                 groupRef.current.lookAt(endPosRef.current.x, currY, endPosRef.current.z);
            }
        }
    } else {
        // Idle correction
        // If external offset prop changes (e.g. 2nd player joins same tile), we need to slide to new offset
        const targetPos = getPosition(visualIndexRef.current);
        const targetVec = new Vector3(targetPos.x + offset.x, 0, targetPos.z + offset.z);

        if (groupRef.current.position.distanceTo(targetVec) > 0.01) {
             // Slide smoothly to new slot position
             groupRef.current.position.lerp(targetVec, delta * 5);
        }

        // Idle animation for active player
        if (isActive && !isAnimatingRef.current) {
            // Gentle rotation or bounce?
            // groupRef.current.rotation.y += delta;
        }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Shadow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <circleGeometry args={[0.3, 32]} />
         <meshBasicMaterial color="black" opacity={0.3} transparent />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.5, 4, 8]} />
        <meshStandardMaterial color={getColor(color)} />
      </mesh>

      {/* Face/Avatar */}
      <Html position={[0, 1.2, 0]} center transform sprite>
        <div className="text-4xl pointer-events-none select-none filter drop-shadow-lg" style={{ opacity: 0.9 }}>
            {avatar}
        </div>
      </Html>
    </group>
  );
};

export default PlayerPawn3D;
