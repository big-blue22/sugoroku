import React from 'react';
import { Text } from '@react-three/drei';
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

  const getLabel = () => {
    switch (type) {
      case TileType.START: return 'START';
      case TileType.GOAL: return 'GOAL';
      case TileType.GOOD: return 'LUCKY';
      case TileType.BAD: return 'TRAP';
      case TileType.EVENT: return 'EVENT';
      default: return '';
    }
  };

  const getIcon = () => {
    switch (type) {
      case TileType.START: return '🏁';
      case TileType.GOAL: return '🏆';
      case TileType.GOOD: return '⭐';
      case TileType.BAD: return '💀';
      case TileType.EVENT: return '❓';
      default: return null;
    }
  };

  const icon = getIcon();

  return (
    <group position={[x, 0.1, z]}>
      {/* Base Marker */}
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />
        <meshStandardMaterial color={getColor()} />
      </mesh>

      {/* Inner Ring for style */}
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.3, 32]} />
        <meshStandardMaterial color="white" opacity={0.5} transparent />
      </mesh>

      {/* Text Label (lying on surface) */}
      <Text
        position={[0, 0.17, 0.8]} // Positioned slightly forward
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {getLabel()}
      </Text>

      {/* Floating Icon */}
      {icon && (
        <Text
          position={[0, 1.5, 0]} // Floating above
          fontSize={1.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {icon}
        </Text>
      )}

      {/* Index Number (Debug) - commented out
      <Text
        position={[0, 0.17, -0.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.2}
        color="black"
      >
        {index}
      </Text>
      */}
    </group>
  );
};

export default Tile3D;
