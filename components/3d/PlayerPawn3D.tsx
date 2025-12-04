import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector3, Group } from 'three';
import { Html } from '@react-three/drei';

interface PlayerPawn3DProps {
  id: number;
  avatar: string;
  color: string;
  targetX: number;
  targetZ: number;
  isActive: boolean;
}

const PlayerPawn3D: React.FC<PlayerPawn3DProps> = ({ id, avatar, color, targetX, targetZ, isActive }) => {
  const groupRef = useRef<Group>(null);
  const currentPos = useRef(new Vector3(targetX, 0, targetZ));
  const jumpTime = useRef(0);

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

    const target = new Vector3(targetX, 0, targetZ);
    const dist = currentPos.current.distanceTo(target);

    // If we are far from target, move towards it
    if (dist > 0.05) {
      // Move logic
      const speed = 4.0; // Units per second
      const step = speed * delta;

      // Interpolate X/Z linearly
      currentPos.current.x += (target.x - currentPos.current.x) * Math.min(1, step * 2);
      currentPos.current.z += (target.z - currentPos.current.z) * Math.min(1, step * 2);

      // Simple jump arc: sin wave based on distance or time
      // Let's assume we want to jump "up" while moving.
      // Height based on how close we are to the middle of the move?
      // Since target changes abruptly, calculating "middle" is tricky without storing 'startPos'.
      // But we can just make it bounce if it's moving.

      const isMoving = dist > 0.1;
      if (isMoving) {
          jumpTime.current += delta * 15;
          currentPos.current.y = Math.abs(Math.sin(jumpTime.current)) * 0.5;
      } else {
          currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, 0, delta * 10);
          jumpTime.current = 0;
      }

    } else {
        // Snap to exact if close
        currentPos.current.x = targetX;
        currentPos.current.z = targetZ;
        currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, 0, delta * 10);
    }

    groupRef.current.position.copy(currentPos.current);

    // Idle animation for active player
    if (isActive && dist < 0.1) {
        groupRef.current.rotation.y += delta;
    } else {
        // Reset rotation or keep it? Let's reset smoothly
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 5);
    }
  });

  return (
    <group ref={groupRef} position={[targetX, 0, targetZ]}>
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
