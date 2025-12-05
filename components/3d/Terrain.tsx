import React from 'react';

// Removing unused props for cleaner interface
const Terrain: React.FC = () => {
  // GRID_SCALE is now 4.0.
  // Board extents: X goes 0..6 (x4 = 24), Y goes 0..4 (x4 = 16).
  // Center is roughly 12, 8.

  // We'll make the terrain large enough to cover the new area comfortably.
  // Width: ~50, Depth: ~30.

  return (
    <group position={[12, -0.1, 8]}>
       {/* Center the group roughly.
           Grid is x=0..6 (*4 = 0..24), y=0..4 (*4 = 0..16).
           Center is x=12, z=8.
       */}

      {/* Zone 1: Grass (Top rows) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[50, 16]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>

       {/* Zone 2: Sand (Middle rows) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow>
        <planeGeometry args={[50, 8]} />
        <meshStandardMaterial color="#fcd34d" />
      </mesh>

      {/* Zone 3: Rock/Snow (Bottom rows) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 14]} receiveShadow>
        <planeGeometry args={[50, 16]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Ocean/Void below everything just in case */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
};

export default Terrain;
