import React from 'react';
import { TileType } from '../../types';

interface Tile3DProps {
  type: TileType;
  x: number;
  z: number;
  index: number;
}

const Tile3D: React.FC<Tile3DProps> = ({ type, x, z, index }) => {
  const getColor = () => {
    switch (type) {
      case TileType.START: return '#3b82f6'; // Blue
      case TileType.GOAL: return '#fbbf24'; // Gold
      case TileType.GOOD: return '#fbbf24'; // Gold/Yellow
      case TileType.BAD: return '#ef4444'; // Red
      case TileType.EVENT: return '#a855f7'; // Purple
      default: return '#cbd5e1'; // Slate-300
    }
  };

  return (
    <group position={[x, 0.1, z]}>
      {/* Base Marker */}
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.1, 32]} />
        <meshStandardMaterial color={getColor()} />
      </mesh>

      {/* Inner Ring for style */}
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshStandardMaterial color="white" opacity={0.5} transparent />
      </mesh>

      {/* Index Number (Optional, for debugging or clarity) */}
      {/*
      <Text
        position={[0, 0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.3}
        color="black"
      >
        {index}
      </Text>
      */}
    </group>
  );
};

export default Tile3D;
