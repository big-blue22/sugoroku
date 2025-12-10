import React, { useMemo } from 'react';
import { ZONES, getBoardPosition } from '../../constants';
import * as THREE from 'three';

// Procedural Environment Generator
// Renders the ground mesh and decorations for each zone
const Environment: React.FC = () => {

  const zoneMeshes = useMemo(() => {
    return ZONES.map((zone) => {
       // Construct a mesh for this zone
       // We collect all points in this zone
       const points = [];
       for (let i = zone.start; i <= zone.end; i++) {
           const pos = getBoardPosition(i);
           points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
       }

       const color = getZoneColor(zone.themeId);

       return (
         <group key={zone.name}>
            {points.map((p, i) => (
                <group key={i} position={[p.x, p.y - 2, p.z]}>
                    {/* Ground Block */}
                    <mesh receiveShadow position={[0, 0, 0]}>
                        <boxGeometry args={[6, 4, 6]} /> {/* Wide & Deep blocks */}
                        <meshStandardMaterial color={color} />
                    </mesh>

                    {/* Decorations */}
                    <Decoration theme={zone.themeId} index={i} />
                </group>
            ))}
         </group>
       );
    });
  }, []);

  return <group>{zoneMeshes}</group>;
};

const getZoneColor = (theme: string) => {
    switch(theme) {
        case 'grass': return '#4ade80';
        case 'fairy': return '#f0abfc';
        case 'magma': return '#450a0a'; // Dark Red/Black
        case 'underwater': return '#1e3a8a'; // Deep Blue
        case 'cave': return '#1e293b'; // Slate 800
        case 'rhone': return '#f8fafc'; // White
        case 'hargon': return '#581c87'; // Purple 900
        default: return '#94a3b8';
    }
};

// Simple decorations based on theme
const Decoration: React.FC<{ theme: string; index: number }> = ({ theme, index }) => {
    // Deterministic random
    const rand = (index * 1234.5678) % 1;

    // Only decorate 30% of tiles
    if (rand > 0.3) return null;

    // Offset from center to not block path
    // Decorations are child of the ground block which is at Y-2
    // So we need to put them up at Y=2 (surface)
    const side = rand > 0.15 ? 1 : -1;
    const offsetX = side * (2.5 + rand);
    const offsetZ = (rand - 0.5) * 2;

    switch(theme) {
        case 'grass':
            // Trees (Cone + Cylinder)
            return (
                <group position={[offsetX, 2, offsetZ]}>
                    <mesh position={[0, 1, 0]}>
                        <coneGeometry args={[0.8, 2, 8]} />
                        <meshStandardMaterial color="#166534" />
                    </mesh>
                    <mesh position={[0, -0.5, 0]}>
                        <cylinderGeometry args={[0.2, 0.2, 1]} />
                        <meshStandardMaterial color="#78350f" />
                    </mesh>
                </group>
            );
        case 'magma':
            // Spikes
            return (
                <mesh position={[offsetX, 1, offsetZ]}>
                    <coneGeometry args={[0.5, 3, 4]} />
                    <meshStandardMaterial color="#7f1d1d" />
                </mesh>
            );
        case 'underwater':
            // Coral/Bubbles (Spheres)
            return (
                <group position={[offsetX, 1, offsetZ]}>
                     <mesh position={[0, rand, 0]}>
                        <sphereGeometry args={[0.5, 8, 8]} />
                        <meshStandardMaterial color="#22d3ee" transparent opacity={0.6} />
                     </mesh>
                </group>
            );
        case 'cave':
            // Rocks
            return (
                <mesh position={[offsetX, 0.5, offsetZ]} rotation={[rand, rand, rand]}>
                    <dodecahedronGeometry args={[0.8]} />
                    <meshStandardMaterial color="#475569" />
                </mesh>
            );
        case 'rhone':
            // Ice Crystals
            return (
                <mesh position={[offsetX, 1, offsetZ]}>
                    <octahedronGeometry args={[0.7]} />
                    <meshStandardMaterial color="#bae6fd" transparent opacity={0.8} />
                </mesh>
            );
         case 'fairy':
            // Floating lights
            return (
                 <mesh position={[offsetX, 2 + rand, offsetZ]}>
                    <sphereGeometry args={[0.3]} />
                    <meshStandardMaterial color="#fdf4ff" emissive="#f0abfc" emissiveIntensity={2} />
                </mesh>
            );
        case 'hargon':
            // Pillars
            return (
                <mesh position={[offsetX, 2, offsetZ]}>
                    <boxGeometry args={[0.6, 4, 0.6]} />
                    <meshStandardMaterial color="#3b0764" />
                </mesh>
            );
        default:
            return null;
    }
};

export default Environment;
