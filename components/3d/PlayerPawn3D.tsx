import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector3, Group } from 'three';
import { Html } from '@react-three/drei';
import { getBoardPosition } from '../../constants';

interface PlayerPawn3DProps {
  id: number;
  name: string;
  avatar: string;
  color: string;
  targetIndex: number;
  offset: { x: number; z: number };
  isActive: boolean;
}

const PlayerPawn3D = forwardRef<Group, PlayerPawn3DProps>(({ id, name, avatar, color, targetIndex, offset, isActive }, ref) => {
  const groupRef = useRef<Group>(null);

  // Expose groupRef to parent
  useImperativeHandle(ref, () => groupRef.current!);

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
         const pos = getBoardPosition(targetIndex);
         groupRef.current.position.set(pos.x + offset.x, pos.y, pos.z + offset.z);
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

        // Ensure startY matches the previous tile's surface (minus offset/jump)
        // Actually, groupRef.current.position is already where we want to start from (including any previous slight errors or current location)

        const nextPos = getBoardPosition(nextIndex);
        endPosRef.current.set(nextPos.x + offset.x, nextPos.y, nextPos.z + offset.z);

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

            // Linear X/Z/Y
            const currX = THREE.MathUtils.lerp(startPosRef.current.x, endPosRef.current.x, p);
            const currZ = THREE.MathUtils.lerp(startPosRef.current.z, endPosRef.current.z, p);
            // We also lerp base Y so we go up/down slopes
            const currBaseY = THREE.MathUtils.lerp(startPosRef.current.y, endPosRef.current.y, p);

            // Parabolic Y (Jump) on top of Base Y
            const jumpHeight = 2.0;
            const jumpY = Math.sin(p * Math.PI) * jumpHeight;

            groupRef.current.position.set(currX, currBaseY + jumpY, currZ);

            // Face direction of movement
            if (startPosRef.current.distanceTo(endPosRef.current) > 0.1) {
                 groupRef.current.lookAt(endPosRef.current.x, currBaseY + jumpY, endPosRef.current.z);
            }
        }
    } else {
        // Idle correction
        // If external offset prop changes (e.g. 2nd player joins same tile), we need to slide to new offset
        const targetPos = getBoardPosition(visualIndexRef.current);
        const targetVec = new Vector3(targetPos.x + offset.x, targetPos.y, targetPos.z + offset.z);

        if (groupRef.current.position.distanceTo(targetVec) > 0.01) {
             // Slide smoothly to new slot position
             groupRef.current.position.lerp(targetVec, delta * 5);
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
        <div className="flex flex-col items-center pointer-events-none select-none" style={{ opacity: 0.9 }}>
            <div className="text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded mb-1 whitespace-nowrap backdrop-blur-sm">
                {name}
            </div>
            <div className="text-4xl filter drop-shadow-lg">
                {avatar}
            </div>
        </div>
      </Html>
    </group>
  );
});

export default PlayerPawn3D;
