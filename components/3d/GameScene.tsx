import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Tile, Player } from '../../types';
import { getBoardPosition, getZoneForIndex } from '../../constants';
import Tile3D from './Tile3D';
import Environment from './Environment';
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


const CameraController: React.FC<{
  playerRefs: React.MutableRefObject<(THREE.Group | null)[]>;
  activePlayerIndex: number;
  auto: boolean
}> = ({ playerRefs, activePlayerIndex, auto }) => {
  const { camera, controls } = useThree();
  const vec = new THREE.Vector3();

  useFrame((state, delta) => {
    if (auto) {
      // Find the active player's mesh
      const activeGroup = playerRefs.current[activePlayerIndex];

      let targetPos = new THREE.Vector3(0, 0, 0);

      if (activeGroup) {
          // Track position including Y
          targetPos.copy(activeGroup.position);
      }

      // Lerp camera position to be offset from target
      // Adjust offset based on Zone? Or just generic high angle?
      const offset = new THREE.Vector3(0, 16, 20);
      const desiredPos = targetPos.clone().add(offset);

      state.camera.position.lerp(desiredPos, delta * 2);

      // Update OrbitControls target
      const orbitControls = (state.controls as any);
      if (orbitControls) {
          orbitControls.target.lerp(targetPos, delta * 2);
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
  const activePos = getBoardPosition(activePlayer.position);

  // Refs to track player meshes
  const playerRefs = useRef<(THREE.Group | null)[]>([]);

  return (
    <div className="w-full h-full absolute inset-0 bg-slate-900">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[12, 20, 30]} fov={50} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.1} />

        <CameraController
            playerRefs={playerRefs}
            activePlayerIndex={activePlayerIndex}
            auto={autoCamera}
        />

        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 50, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />

        <Environment />

        {/* Path Lines */}
        <group>
             {board.map((_, i) => {
                 if (i >= board.length - 1) return null;
                 const start = getBoardPosition(i);
                 const end = getBoardPosition(i+1);

                 // Create a line between them
                 const startVec = new THREE.Vector3(start.x, start.y, start.z);
                 const endVec = new THREE.Vector3(end.x, end.y, end.z);

                 const direction = new THREE.Vector3().subVectors(endVec, startVec);
                 const len = direction.length();

                 // Center point
                 const center = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

                 return (
                    <mesh
                        key={`path-${i}`}
                        position={[center.x, center.y + 0.02, center.z]}
                        quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize())}
                        receiveShadow
                    >
                        <boxGeometry args={[len, 0.05, 0.6]} />
                        <meshStandardMaterial color="#ffffff" />
                    </mesh>
                 )
             })}
        </group>

        {/* Tiles */}
        {board.map((tile, i) => {
          const { x, y, z } = getBoardPosition(i);
          const zone = getZoneForIndex(i);
          return <Tile3D key={tile.id} type={tile.type} x={x} y={y} z={z} index={i} theme={zone.themeId} />;
        })}

        {/* Players */}
        {players.map((p, i) => {
            const offset = getPlayerOffset(i, players, p.position);

            return (
                <PlayerPawn3D
                    key={p.id}
                    ref={(el) => (playerRefs.current[i] = el)}
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
        <Die3D
           trigger={diceTrigger}
           targetValue={diceTarget}
           position={[activePos.x + 2, activePos.y + 5, activePos.z + 2]} // Start high above
        />

      </Canvas>
    </div>
  );
};

export default GameScene;
