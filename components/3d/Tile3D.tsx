import React from 'react';
import { Text, Float } from '@react-three/drei';
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
      case TileType.VILLAGE: return '#22c55e'; // Green
      case TileType.BOSS: return '#dc2626'; // Red
      case TileType.MONSTER: return '#f97316'; // Orange
      case TileType.TREASURE: return '#eab308'; // Gold
      case TileType.TRAP: return '#a855f7'; // Purple
      case TileType.CASINO: return '#ec4899'; // Pink/Neon
      case TileType.EMPTY:
      default:
        // Zone-based colors for empty tiles
        switch (theme) {
          case 'grass': return '#cbd5e1'; // Bright Slate
          case 'magma': return '#fca5a5'; // Light red/pinkish
          case 'underwater': return '#67e8f9'; // Bright Cyan
          case 'cave': return '#94a3b8'; // Medium bright slate
          case 'rhone': return '#ffffff'; // Pure White
          case 'hargon': return '#d8b4fe'; // Light purple
          case 'fairy': return '#fbcfe8'; // Pink
          default: return '#cbd5e1';
        }
    }
  };

  const getEmissive = () => {
    switch (type) {
      case TileType.VILLAGE: return '#15803d';
      case TileType.BOSS: return '#b91c1c';
      case TileType.MONSTER: return '#c2410c';
      case TileType.TREASURE: return '#a16207';
      case TileType.TRAP: return '#7e22ce';
      case TileType.CASINO: return '#be185d';
      default: return getBaseColor();
    }
  };

  const isSpecial = type !== TileType.EMPTY;

  const getGeometry = () => {
    const isBoxy = theme === 'magma' || theme === 'cave' || theme === 'hargon';

    if (isBoxy) {
      return <boxGeometry args={[2.5, 0.2, 2.5]} />;
    }
    return <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />;
  };

  const getLabel = () => {
    switch (type) {
      case TileType.VILLAGE: return '村';
      case TileType.BOSS: return 'BOSS';
      case TileType.MONSTER: return '';
      case TileType.TREASURE: return '';
      case TileType.TRAP: return '';
      case TileType.CASINO: return 'CASINO';
      default: return '';
    }
  };

  const getIcon = () => {
    switch (type) {
      case TileType.VILLAGE: return '🏠';
      case TileType.BOSS: return '👑';
      case TileType.MONSTER: return '⚔️';
      case TileType.TREASURE: return '💰';
      case TileType.TRAP: return '☠️';
      case TileType.CASINO: return '🎰';
      default: return null;
    }
  };

  const icon = getIcon();

  return (
    <group position={[x, y, z]}>
      {/* Dynamic Floating Animation for the entire tile group */}
      <Float
        speed={2} // Animation speed
        rotationIntensity={0.05} // Subtle rotation
        floatIntensity={0.2} // Subtle bounce
        floatingRange={[-0.05, 0.05]} // How high/low it floats
      >
        <group position={[0, 0.1, 0]}>
          {/* Base Marker */}
          <mesh castShadow receiveShadow position={[0, 0.05, 0]}>
            {getGeometry()}
            <meshStandardMaterial
              color={getBaseColor()}
              emissive={getEmissive()}
              emissiveIntensity={isSpecial ? 0.6 : 0.2}
              roughness={isSpecial ? 0.3 : 0.5}
              metalness={isSpecial ? 0.4 : 0.1}
            />
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
            position={[0, 0.17, 0.8]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {getLabel()}
          </Text>

          {/* Floating Icon wrapped in its own Float for extra bounciness */}
          {icon && (
            <Float speed={3} floatIntensity={0.5} floatingRange={[0, 0.2]}>
              <Text
                position={[0, 1.5, 0]}
                fontSize={1.5}
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="#000000"
              >
                {icon}
              </Text>
            </Float>
          )}
        </group>
      </Float>
    </group>
  );
};

export default Tile3D;
