import React from 'react';
import { Text } from '@react-three/drei';
import { TileType } from '../../types';

interface Tile3DProps {
  type: TileType;
  x: number;
  y: number; // Elevation
  z: number;
  index: number;
  theme: string;
}

const Tile3D: React.FC<Tile3DProps> = ({ type, x, y, z, index, theme }) => {
  const getBaseColor = () => {
    switch (type) {
      case TileType.START: return '#3b82f6'; // Blue
      case TileType.GOAL: return '#fbbf24'; // Gold
      case TileType.GOOD: return '#fbbf24'; // Gold/Yellow
      case TileType.BAD: return '#ef4444'; // Red
      case TileType.EVENT: return '#a855f7'; // Purple
      default:
        // Default color based on theme
        switch(theme) {
            case 'grass': return '#cbd5e1'; // Slate
            case 'magma': return '#7f1d1d'; // Dark Red
            case 'underwater': return '#0e7490'; // Cyan/Blue
            case 'cave': return '#334155'; // Dark Slate
            case 'rhone': return '#e2e8f0'; // White-ish
            case 'hargon': return '#4c1d95'; // Violet
            case 'fairy': return '#f5d0fe'; // Pink
            default: return '#cbd5e1';
        }
    }
  };

  const getGeometry = () => {
     // Different shapes for themes?
     // For now, consistent Cylinder is best for gameplay clarity,
     // but we can vary the "Base Marker" slightly.
     // e.g. Box for Magma/Cave?
     const isBoxy = theme === 'magma' || theme === 'cave' || theme === 'hargon';

     if (isBoxy) {
         return <boxGeometry args={[2.5, 0.2, 2.5]} />;
     }
     return <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />;
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
    <group position={[x, y + 0.1, z]}>
      {/* Base Marker */}
      <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
        {getGeometry()}
        <meshStandardMaterial color={getBaseColor()} />
      </mesh>

      {/* Inner Ring for style (Only for cylindrical themes) */}
      {(theme !== 'magma' && theme !== 'cave' && theme !== 'hargon') && (
        <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 1.3, 32]} />
            <meshStandardMaterial color="white" opacity={0.5} transparent />
        </mesh>
      )}

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
    </group>
  );
};

export default Tile3D;
