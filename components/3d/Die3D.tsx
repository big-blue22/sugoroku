import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface Die3DProps {
  targetValue: number;
  trigger: number; // Increment to trigger a new roll
  position: [number, number, number];
  onLand?: () => void;
}

// Pip Component: A simple cylinder
const Pip: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => {
  return (
    <mesh position={position} rotation={[0, 0, 0]}>
      <cylinderGeometry args={[0.12, 0.12, 0.01, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

// Face Component: Groups pips for a specific number
// Faces are oriented assuming the cube is centered at 0,0,0 and standard orientation
// We will rotate the pips to align with the cube faces.
// Cube size is 1. Radius to face is 0.5.
const DieFace: React.FC<{ value: number; side: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' }> = ({ value, side }) => {

  const pipColor = value === 1 ? '#ff0000' : '#000000';
  const pips: JSX.Element[] = [];

  // Helper to push pips based on 2D grid (-1 to 1) projected onto the face
  // Grid:
  // (-0.25, 0.25)  (0.25, 0.25)
  //      (0, 0)
  // (-0.25, -0.25) (0.25, -0.25)

  const offset = 0.25;
  const positions: {x: number, y: number}[] = [];

  if (value === 1) positions.push({x: 0, y: 0});
  if (value === 2) { positions.push({x: -offset, y: offset}, {x: offset, y: -offset}); }
  if (value === 3) { positions.push({x: -offset, y: offset}, {x: 0, y: 0}, {x: offset, y: -offset}); }
  if (value === 4) { positions.push({x: -offset, y: offset}, {x: offset, y: offset}, {x: -offset, y: -offset}, {x: offset, y: -offset}); }
  if (value === 5) { positions.push({x: -offset, y: offset}, {x: offset, y: offset}, {x: 0, y: 0}, {x: -offset, y: -offset}, {x: offset, y: -offset}); }
  if (value === 6) {
      positions.push(
          {x: -offset, y: offset}, {x: offset, y: offset},
          {x: -offset, y: 0},      {x: offset, y: 0},
          {x: -offset, y: -offset}, {x: offset, y: -offset}
      );
  }

  // Transform 2D face positions to 3D positions based on side
  const faceRadius = 0.51; // Slightly above surface (0.5)

  return (
      <group>
          {positions.map((p, i) => {
              let pos: [number, number, number] = [0,0,0];
              let rot: [number, number, number] = [0,0,0];

              if (side === 'top') { // Y+
                  pos = [p.x, faceRadius, p.y];
                  rot = [0, 0, 0];
              } else if (side === 'bottom') { // Y-
                  pos = [p.x, -faceRadius, -p.y]; // Mirror y for bottom to look right
                  rot = [Math.PI, 0, 0];
              } else if (side === 'front') { // Z+
                  pos = [p.x, p.y, faceRadius];
                  rot = [Math.PI/2, 0, 0];
              } else if (side === 'back') { // Z-
                  pos = [-p.x, p.y, -faceRadius];
                  rot = [-Math.PI/2, 0, 0];
              } else if (side === 'right') { // X+
                  pos = [faceRadius, p.y, -p.x];
                  rot = [0, 0, -Math.PI/2];
              } else if (side === 'left') { // X-
                  pos = [-faceRadius, p.y, p.x];
                  rot = [0, 0, Math.PI/2];
              }

              return <Pip key={i} position={pos} color={pipColor} />;
          })}
      </group>
  );
};


const Die3D: React.FC<Die3DProps> = ({ targetValue, trigger, position, onLand }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [animationState, setAnimationState] = useState<'idle' | 'falling' | 'landed'>('idle');
  const [startTime, setStartTime] = useState(0);

  // Define Rotations to bring each face to TOP (Y+)
  // Default Orientation (Identity):
  // Top: 1, Bottom: 6, Front: 2, Back: 5, Left: 4, Right: 3

  // To make X face top:
  // Target 1 (Top): ID (0,0,0)
  // Target 2 (Front): Rotate X -90 (deg) -> (-PI/2, 0, 0)
  // Target 3 (Right): Rotate Z 90 -> (0, 0, PI/2)
  // Target 4 (Left): Rotate Z -90 -> (0, 0, -PI/2)
  // Target 5 (Back): Rotate X 90 -> (PI/2, 0, 0)
  // Target 6 (Bottom): Rotate X 180 -> (PI, 0, 0)

  const TARGET_ROTATIONS: {[key: number]: [number, number, number]} = {
      1: [0, 0, 0],
      2: [-Math.PI / 2, 0, 0],
      3: [0, 0, Math.PI / 2],
      4: [0, 0, -Math.PI / 2],
      5: [Math.PI / 2, 0, 0],
      6: [Math.PI, 0, 0] // or [0, 0, PI]
  };

  useEffect(() => {
      if (trigger > 0 && groupRef.current) {
          setAnimationState('falling');
          setStartTime(Date.now());

          // Reset Start Position (High up)
          groupRef.current.position.set(position[0], position[1] + 10, position[2]);
      }
  }, [trigger, position]);

  useFrame(() => {
      if (!groupRef.current) return;
      if (animationState === 'idle') return;

      const now = Date.now();
      const elapsed = (now - startTime) / 1000; // seconds
      const duration = 1.0; // Fall duration

      if (animationState === 'falling') {
          if (elapsed < duration) {
              const progress = elapsed / duration;
              // Easing: Bounce out effect or just quadratic?
              // Simple quadratic fall for now
              // y = startY - (dropHeight * progress^2)
              // Actually let's just lerp from High to Low
              const startY = position[1] + 10;
              const endY = position[1] + 0.5; // +0.5 because box height is 1, origin center

              // Bounce effect: Let's use a easeOutBounce approximation or just simple lerp for B option
              // User chose Option B: Pre-baked animation (smooth).
              // Let's do a simple easeOutCubic for position
              const ease = 1 - Math.pow(1 - progress, 3);
              const currentY = startY - (startY - endY) * ease;

              groupRef.current.position.set(position[0], currentY, position[2]);

              // Rotation: Spin wildly, then blend to target
              // We slerp from "Random spin state" to "Target state" near the end
              const spinSpeed = 10 * (1 - progress); // Slow down spin

              if (progress < 0.7) {
                  // Random tumbling
                  groupRef.current.rotation.x += spinSpeed * 0.1;
                  groupRef.current.rotation.y += spinSpeed * 0.1;
                  groupRef.current.rotation.z += spinSpeed * 0.1;
              } else {
                  // Slerp to target
                  const targetEuler = TARGET_ROTATIONS[targetValue];
                  const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...targetEuler));

                  // We need to current rotation to interact smoothly
                  // But standard lerp is easier: just lerp Euler angles? No, Gimbal lock risk.
                  // Quaternions are safer.
                  groupRef.current.quaternion.slerp(targetQuat, 0.2);
              }

          } else {
              // Landed
              const targetEuler = TARGET_ROTATIONS[targetValue];
              groupRef.current.rotation.set(...targetEuler);
              groupRef.current.position.set(position[0], position[1] + 0.5, position[2]); // Ensure flush

              setAnimationState('landed');
              if (onLand) onLand();
          }
      }
  });

  // Render nothing if we haven't triggered yet (optional, or just sit there?)
  // Let's render it only if falling or landed. If idle (initial), hide it.
  if (trigger === 0) return null;

  return (
    <group ref={groupRef}>
      {/* The Cube Body */}
      <RoundedBox args={[1, 1, 1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="white" roughness={0.2} metalness={0.1} />
      </RoundedBox>

      {/* Faces with Pips */}
      <DieFace value={1} side="top" />    {/* Y+ */}
      <DieFace value={6} side="bottom" /> {/* Y- */}
      <DieFace value={2} side="front" />  {/* Z+ */}
      <DieFace value={5} side="back" />   {/* Z- */}
      <DieFace value={3} side="right" />  {/* X+ */}
      <DieFace value={4} side="left" />   {/* X- */}
    </group>
  );
};

export default Die3D;
