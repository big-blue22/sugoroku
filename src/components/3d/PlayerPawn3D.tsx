import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Group } from 'three';
import { Player } from '../../types';
import { Html } from '@react-three/drei';

interface PlayerPawn3DProps {
  player: Player;
  targetPosition: [number, number, number]; // The 3D coordinate where the player should be
  colorHex: string; // Hex color from constants/player config
}

const PlayerPawn3D: React.FC<PlayerPawn3DProps> = ({ player, targetPosition, colorHex }) => {
  const groupRef = useRef<Group>(null);

  // Smooth movement
  useFrame((state, delta) => {
    if (groupRef.current) {
      const currentPos = groupRef.current.position;
      const targetVec = new Vector3(...targetPosition);

      // Add a vertical offset so it stands ON the tile
      // Tile height is 0.5 (center at 0, so top is 0.25).
      // Pawn height is e.g. 1.0 (center at 0.5 + 0.25 = 0.75).
      targetVec.y = 0.75;

      // Lerp for smooth movement
      // Speed factor can be tuned.
      // Since `movePlayer` waits 400ms, we want to arrive roughly in that time.
      // Delta is usually ~0.016 (60fps).
      // Lerp factor 10 * delta gives nice slide.
      currentPos.lerp(targetVec, 10 * delta);
    }
  });

  return (
    <group ref={groupRef} position={targetPosition}>
      {/* Pawn Shape: Cone + Sphere head */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.4, 0.8, 16]} />
        <meshStandardMaterial color={colorHex} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={colorHex} />
      </mesh>

      {/* Floating Name/Avatar Tag */}
      <Html position={[0, 1.2, 0]} center>
         <div className="flex flex-col items-center pointer-events-none">
             <div className="text-2xl drop-shadow-md">{player.avatar}</div>
             <div className="text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                 {player.name}
             </div>
         </div>
      </Html>
    </group>
  );
};

export default PlayerPawn3D;
