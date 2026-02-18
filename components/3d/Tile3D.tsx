import React from 'react';
import { Text } from '@react-three/drei';
import { TileType } from '../../types';

interface Tile3DProps {
  type: TileType;
  x: number;
  y: number; // Elevation
  z: number;
  index: number;
}

const Tile3D: React.FC<Tile3DProps> = ({ type, x, y, z, index }) => {
  const getBaseColor = () => {
    switch (type) {
      case TileType.START: return '#3b82f6'; // Blue
      case TileType.GOAL: return '#fbbf24'; // Gold
      default: return '#cbd5e1'; // Standard Slate/White for all normal tiles
    }
  };

  const getLabel = () => {
    switch (type) {
      case TileType.START: return 'START';
      case TileType.GOAL: return 'GOAL';
      default: return `${index + 1}`; // Just show tile number for clarity
    }
  };

  const getIcon = () => {
    switch (type) {
      case TileType.START: return '🏁';
      case TileType.GOAL: return '🏆';
      default: return null;
    }
  };

  const icon = getIcon();

  return (
    <group position={[x, y, z]}>
      {/* Base Marker */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 0.2, 32]} />
        <meshStandardMaterial color={getBaseColor()} />
      </mesh>

      {/* Inner Ring for style */}
      <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.6, 32]} />
        <meshStandardMaterial color="white" opacity={0.5} transparent />
      </mesh>

      {/* Text Label (lying on surface) */}
      <Text
        position={[0, 0.22, 0.8]} // Positioned slightly forward
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {getLabel()}
      </Text>

      {/* Floating Icon for Start/Goal */}
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
    </group>
  );
};

export default Tile3D;
