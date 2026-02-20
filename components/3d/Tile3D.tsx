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
      case TileType.START: return '#3b82f6'; // Blue
      case TileType.GOAL: return '#fbbf24'; // Gold
      default:
        // Default color based on theme
        switch (theme) {
          case 'grass': return '#94a3b8'; // Lighter Slate for path standing out from bright green grass
          case 'magma': return '#450a0a'; // Darker for lava path
          case 'underwater': return '#0891b2'; // Cyan/Blue
          case 'cave': return '#475569'; // Dark Slate
          case 'rhone': return '#f1f5f9'; // White-ish
          case 'hargon': return '#581c87'; // Violet
          case 'fairy': return '#fbcfe8'; // Pink
          default: return '#cbd5e1';
        }
    }
  };

  const getEmissive = () => {
    if (type === TileType.START) return '#1d4ed8'; // Emissive Blue
    if (type === TileType.GOAL) return '#d97706'; // Emissive Gold
    return '#000000'; // No emission for normal tiles
  };

  const getGeometry = () => {
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
      default: return '';
    }
  };

  const getIcon = () => {
    switch (type) {
      case TileType.START: return '🏁';
      case TileType.GOAL: return '🏆';
      default: return null;
    }
  };

  const isSpecial = type === TileType.START || type === TileType.GOAL;
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
              emissiveIntensity={isSpecial ? 0.8 : 0}
              roughness={isSpecial ? 0.2 : 0.6} // Special tiles are shinier
              metalness={isSpecial ? 0.5 : 0.1}
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
