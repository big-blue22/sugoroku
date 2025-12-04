import React, { useRef, useState } from 'react';
import { Vector3 } from 'three';
import { Text } from '@react-three/drei';
import { Tile, TileType } from '../../types';

interface Tile3DProps {
  tile: Tile;
  position: [number, number, number];
}

const TILE_COLORS: Record<TileType, string> = {
  [TileType.START]: '#3b82f6', // blue
  [TileType.NORMAL]: '#ffffff', // white
  [TileType.GOOD]: '#22c55e',   // green
  [TileType.BAD]: '#ef4444',    // red
  [TileType.EVENT]: '#a855f7',  // purple
  [TileType.GOAL]: '#eab308',   // yellow
};

const Tile3D: React.FC<Tile3DProps> = ({ tile, position }) => {
  const [hovered, setHovered] = useState(false);

  // Height of the tile
  const height = 0.5;
  const size = 1.8; // Grid spacing is 2.0, so 1.8 leaves a gap

  const color = TILE_COLORS[tile.type] || '#cccccc';

  return (
    <group position={position}>
      {/* Shadow / Base */}
      <mesh position={[0, -height/2, 0]} receiveShadow>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial
            color={color}
            roughness={0.4}
            metalness={0.1}
        />
      </mesh>

      {/* Hover effect highlight */}
      {hovered && (
        <mesh position={[0, 0, 0]}>
             <boxGeometry args={[size + 0.1, height + 0.1, size + 0.1]} />
             <meshBasicMaterial color="white" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}

      {/* Label/Icon on top */}
      <group position={[0, height/2 + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
         {/* We rotate text to lie flat or stand up?
             If camera is angled, lying flat is often good, or billboard.
             Let's make it float slightly above and look at camera?
             Actually for a board game, lying flat on the tile is standard.
         */}
         <Text
           fontSize={0.5}
           color="black"
           anchorX="center"
           anchorY="middle"
           position={[0, 0, 0.01]} // slightly above surface
         >
           {tile.id}
         </Text>

         <Text
            fontSize={0.3}
            color="#333"
            position={[0, -0.5, 0.01]}
            anchorX="center"
         >
            {getTileLabel(tile.type)}
         </Text>
      </group>

      {/* Invisible hit box for hover */}
      <mesh
        position={[0, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        visible={false}
      >
        <boxGeometry args={[size, height * 2, size]} />
      </mesh>
    </group>
  );
};

function getTileLabel(type: TileType): string {
    switch (type) {
        case TileType.START: return "START";
        case TileType.GOAL: return "GOAL";
        case TileType.GOOD: return "好機";
        case TileType.BAD: return "危機";
        case TileType.EVENT: return "?";
        default: return "";
    }
}

export default Tile3D;
