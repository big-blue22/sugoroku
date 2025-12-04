import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import { Tile, Player } from '../../types';
import Tile3D from './Tile3D';
import PlayerPawn3D from './PlayerPawn3D';
import { BOARD_COORDINATES, PLAYER_COLORS } from '../../constants';

interface GameSceneProps {
  board: Tile[];
  players: Player[];
}

const TILE_SPACING = 2.2;

const GameScene: React.FC<GameSceneProps> = ({ board, players }) => {

  // Map board index to 3D world coordinates
  const getTileWorldPosition = (index: number): [number, number, number] => {
    const coords = BOARD_COORDINATES[index] || { x: 0, y: 0 };
    // Center the board roughly.
    // Assuming max X is 6, max Y is 4. Center is approx 3, 2.
    const x = (coords.x - 3) * TILE_SPACING;
    const z = (coords.y - 2) * TILE_SPACING;
    return [x, 0, z];
  };

  return (
    <div className="w-full h-full bg-slate-900">
      <Canvas shadows camera={{ position: [0, 8, 12], fov: 45 }}>
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
        />

        {/* Environment */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="city" />

        {/* Board */}
        <group>
            {board.map((tile, i) => (
                <Tile3D
                    key={tile.id}
                    tile={tile}
                    position={getTileWorldPosition(i)}
                />
            ))}
        </group>

        {/* Players */}
        {players.map((player) => {
            const hex = PLAYER_COLORS.find(c => c.name === player.color.replace('red', '赤').replace('blue', '青').replace('green', '緑').replace('yellow', '黄'))?.hex
                        || (player.color === 'red' ? '#ef4444' :
                            player.color === 'blue' ? '#3b82f6' :
                            player.color === 'green' ? '#22c55e' : '#eab308');

            return (
                <PlayerPawn3D
                    key={player.id}
                    player={player}
                    targetPosition={getTileWorldPosition(player.position)}
                    colorHex={hex}
                />
            );
        })}

        {/* Controls */}
        <OrbitControls
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2.2}
            enablePan={true}
            enableZoom={true}
            minDistance={5}
            maxDistance={30}
        />
      </Canvas>
    </div>
  );
};

export default GameScene;
