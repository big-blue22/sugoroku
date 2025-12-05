import React from 'react';

// Removing unused props for cleaner interface
const Terrain: React.FC = () => {
  // We can create a large plane.
  // Let's make it slightly larger than the grid.
  // Coordinates in app are roughly 0..7 in X and 0..5 in Y.
  // So a plane of size 20x15 should cover it comfortably.

  // We want zones.
  // Path is snake-like.
  // Let's just do simple colored bands based on Z depth since the snake moves down Z.
  // Row 0-1 (Z=0, Z=2) -> Grass
  // Row 2-3 (Z=4, Z=6) -> Sand
  // Row 4 (Z=8) -> Snow/Rock

  // Creating 3 separate planes for simplicity or one big plane with vertex colors.
  // Three separate planes is easiest to control visually without complex shaders.

  return (
    <group position={[6, -0.1, 4]}>
       {/* Center the group roughly.
           Grid is x=0..6 (*2 = 0..12), y=0..4 (*2 = 0..8).
           Center is x=6, z=4.
       */}

      {/* Zone 1: Grass (Top rows) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -5]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>

       {/* Zone 2: Sand (Middle rows) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
        <planeGeometry args={[30, 4]} />
        <meshStandardMaterial color="#fcd34d" />
      </mesh>

      {/* Zone 3: Rock/Snow (Bottom rows) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 7]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Ocean/Void below everything just in case */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
};

export default Terrain;
