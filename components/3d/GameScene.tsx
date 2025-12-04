import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Tile, Player } from '../../types';
import { BOARD_COORDINATES } from '../../constants';
import Tile3D from './Tile3D';
import Terrain from './Terrain';
import PlayerPawn3D from './PlayerPawn3D';

interface GameSceneProps {
  board: Tile[];
  players: Player[];
  activePlayerIndex: number;
  autoCamera: boolean;
}

// Helper to convert grid coords to 3D world coords
const GRID_SCALE = 2.0;
const getPosition = (index: number) => {
  const coords = BOARD_COORDINATES[index] || {x: 0, y: 0};
  return {
    x: coords.x * GRID_SCALE,
    z: coords.y * GRID_SCALE
  };
};

const CameraController: React.FC<{ target: THREE.Vector3; auto: boolean }> = ({ target, auto }) => {
  const { camera, controls } = useThree();
  const vec = new THREE.Vector3();

  useFrame((state, delta) => {
    if (auto) {
      // Lerp camera position to be offset from target
      const offset = new THREE.Vector3(0, 8, 10); // High angle view
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

const GameScene: React.FC<GameSceneProps> = ({ board, players, activePlayerIndex, autoCamera }) => {

  const activePlayer = players[activePlayerIndex];
  const activePos = getPosition(activePlayer.position);
  const targetVec = new THREE.Vector3(activePos.x, 0, activePos.z);

  return (
    <div className="w-full h-full absolute inset-0 bg-slate-900">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[6, 10, 15]} fov={50} />
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
            const { x, z } = getPosition(p.position);
            return (
                <PlayerPawn3D
                    key={p.id}
                    id={p.id}
                    avatar={p.avatar}
                    color={p.color}
                    targetX={x}
                    targetZ={z}
                    isActive={i === activePlayerIndex}
                />
            );
        })}

      </Canvas>
    </div>
  );
};

export default GameScene;
