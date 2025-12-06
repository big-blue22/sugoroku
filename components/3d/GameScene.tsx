import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Tile, Player } from '../../types';
import { BOARD_COORDINATES, GRID_SCALE } from '../../constants';
import Tile3D from './Tile3D';
import Terrain from './Terrain';
import PlayerPawn3D from './PlayerPawn3D';
import Die3D from './Die3D';

interface GameSceneProps {
  board: Tile[];
  players: Player[];
  activePlayerIndex: number;
  autoCamera: boolean;
  diceTrigger?: number;
  diceTarget?: number;
}

// Helper to convert grid coords to 3D world coords
const getPosition = (index: number) => {
  const coords = BOARD_COORDINATES[index] || {x: 0, y: 0};
  return {
    x: coords.x * GRID_SCALE,
    z: coords.y * GRID_SCALE
  };
};

// Calculate offsets for multiple players on the same tile (Square Formation)
const getPlayerOffset = (playerIndex: number, allPlayers: Player[], currentPlayerPosIndex: number) => {
  // Find all players at this position
  const playersOnTile = allPlayers.filter(p => p.position === currentPlayerPosIndex);

  // If only one player, center them
  if (playersOnTile.length <= 1) return { x: 0, z: 0 };

  // Sort players by ID to ensure consistent ordering of slots
  playersOnTile.sort((a, b) => a.id - b.id);
  const slotIndex = playersOnTile.findIndex(p => p.id === allPlayers[playerIndex].id);

  // Define 4 slots (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
  // Distance from center
  const d = 0.6;

  switch (slotIndex) {
    case 0: return { x: -d, z: -d }; // Top-Left
    case 1: return { x: d, z: -d };  // Top-Right
    case 2: return { x: -d, z: d };  // Bottom-Left
    case 3: return { x: d, z: d };   // Bottom-Right
    default: return { x: 0, z: 0 };  // Fallback
  }
};


const CameraController: React.FC<{ target: THREE.Vector3; auto: boolean }> = ({ target, auto }) => {
  const { camera, controls } = useThree();
  const vec = new THREE.Vector3();

  useFrame((state, delta) => {
    if (auto) {
      // Lerp camera position to be offset from target
      const offset = new THREE.Vector3(0, 16, 20); // Higher and further back for larger grid
      const desiredPos = target.clone().add(offset);

      state.camera.position.lerp(desiredPos, delta * 2);
      // Look at target
      // We can't use lookAt directly every frame if we use OrbitControls because OrbitControls fights it.
      // But if we update OrbitControls target, it works.
      const orbitControls = (state.controls as any);
      if (orbitControls) {
          orbitControls.target.lerp(target, delta * 2);
          orbitControls.update();
      }
    }
  });
  return null;
};

const GameScene: React.FC<GameSceneProps> = ({
  board,
  players,
  activePlayerIndex,
  autoCamera,
  diceTrigger = 0,
  diceTarget = 1
}) => {

  const activePlayer = players[activePlayerIndex];
  const activePos = getPosition(activePlayer.position);
  // We need to account for the offset in camera targeting too?
  // Maybe just target the center of the tile to avoid jitter if they swap slots.
  // Or targeting the specific player is fine, the offset is small.
  // Let's target the tile center for stability.
  const targetVec = new THREE.Vector3(activePos.x, 0, activePos.z);

  return (
    <div className="w-full h-full absolute inset-0 bg-slate-900">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[12, 20, 30]} fov={50} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.1} />

        <CameraController target={targetVec} auto={autoCamera} />

        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        <Terrain />

        {/* Path Lines */}
        <group>
             {board.map((_, i) => {
                 if (i >= board.length - 1) return null;
                 const start = getPosition(i);
                 const end = getPosition(i+1);

                 // Create a line between them
                 // Using a thin box for the path
                 const dx = end.x - start.x;
                 const dz = end.z - start.z;
                 const len = Math.sqrt(dx*dx + dz*dz);
                 const angle = Math.atan2(dz, dx);

                 return (
                    <mesh
                        key={`path-${i}`}
                        position={[(start.x + end.x)/2, 0.02, (start.z + end.z)/2]}
                        rotation={[0, -angle, 0]}
                    >
                        <planeGeometry args={[len, 0.4]} />
                        <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
                        {/* Dotted effect? Just simple transparent white for now */}
                    </mesh>
                 )
             })}
        </group>

        {/* Tiles */}
        {board.map((tile, i) => {
          const { x, z } = getPosition(i);
          return <Tile3D key={tile.id} type={tile.type} x={x} z={z} index={i} />;
        })}

        {/* Players */}
        {players.map((p, i) => {
            const offset = getPlayerOffset(i, players, p.position);

            return (
                <PlayerPawn3D
                    key={p.id}
                    id={p.id}
                    avatar={p.avatar}
                    color={p.color}
                    targetIndex={p.position}
                    offset={offset}
                    isActive={i === activePlayerIndex}
                />
            );
        })}

        {/* 3D Die */}
        {/* We place it slightly offset from the active player so it doesn't land ON them */}
        <Die3D
           trigger={diceTrigger}
           targetValue={diceTarget}
           position={[activePos.x + 2, 0, activePos.z + 2]} // Offset by 2 units
        />

      </Canvas>
    </div>
  );
};

export default GameScene;
