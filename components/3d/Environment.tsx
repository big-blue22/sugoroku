import React, { useMemo } from 'react';
import { ZONES, getBoardPosition, ZONE_BOUNDS, GRID_SCALE } from '../../constants';
import * as THREE from 'three';

// Procedural Environment Generator
// Renders the ground mesh (Islands) and decorations for each zone
const Environment: React.FC = () => {

  const zoneMeshes = useMemo(() => {
    return ZONES.map((zone, zIdx) => {
       const bounds = ZONE_BOUNDS[zone.themeId];
       if (!bounds) return null;

       // 1. Calculate Island Plate Dimensions
       // Center in World Space
       const centerX = ((bounds.minX + bounds.maxX) / 2) * GRID_SCALE;
       const centerZ = ((bounds.minZ + bounds.maxZ) / 2) * GRID_SCALE;

       // Dimensions (Add padding to make it a "Plate" around the tiles)
       // Tiles are at integer coordinates.
       // If min=0, max=0, width needs to cover the tile size.
       // Tile radius is 1.5 (~3 width). GRID_SCALE is 4.
       // Let's add generous padding for the "Big Plane" look.
       const padding = 2.0; // Grid units
       const width = (bounds.maxX - bounds.minX + padding) * GRID_SCALE;
       const depth = (bounds.maxZ - bounds.minZ + padding) * GRID_SCALE;

       // Elevation Logic
       // Determine the "Base Y" for the plate.
       // Underwater/Cave starts at -5. Others at 0.
       let baseY = 0;
       if (zone.themeId === 'underwater' || zone.themeId === 'cave') {
           baseY = -5.0 * (GRID_SCALE * 0.5); // Match the scale in getBoardPosition
       }

       // Color
       const color = getZoneColor(zone.themeId);

       // 2. Generate Children (Bridge Blocks + Pillars + Decorations)
       const children = [];
       let bridgeLength = (zIdx === 0) ? 0 : 3;
       // Only extend bridge logic for Magma as requested, keeping others default
       if (bridgeLength > 0 && zone.themeId === 'magma') {
            bridgeLength = 8;
       }

       for (let i = zone.start; i <= zone.end; i++) {
           const isBridge = (i < zone.start + bridgeLength);
           const pos = getBoardPosition(i); // Already scaled

           // A. Bridge Tiles: Always render a block
           // EXCEPTION: Magma zone has extended plate covering the bridge, so skip block to avoid z-fighting
           if (isBridge && zone.themeId !== 'magma') {
               children.push(
                   <mesh key={`bridge-${i}`} receiveShadow position={[pos.x, pos.y - 1, pos.z]}>
                       <boxGeometry args={[3, 2, 3]} />
                       <meshStandardMaterial color={color} />
                   </mesh>
               );
           }
           // B. Island Tiles: Render Pillar IF tile is significantly above base
           else {
                // If tile is higher than base, draw a pillar down to base
                // Plate is at 'baseY'. Plate top is at 'baseY + thickness/2'.
                // Let's assume Plate thickness is 2. Top is baseY + 1.
                // Tile is at pos.y.
                // If pos.y > baseY + 1, we need a pillar.

                // Cave slopes from -5 to 0.
                // At -5, it sits on plate. At 0, it needs a tall pillar.
                if (pos.y > baseY + 2) {
                     const height = pos.y - baseY;
                     children.push(
                        <mesh key={`pillar-${i}`} position={[pos.x, baseY + height/2, pos.z]}>
                            <boxGeometry args={[2, height, 2]} />
                            <meshStandardMaterial color={color} />
                        </mesh>
                     );
                }
           }

           // C. Decorations
           // Pass local position relative to... wait, Decorations use world pos in original code?
           // Original: <group position={[p.x, p.y-2, p.z]}><Decoration ... /></group>
           // Decoration component added offsets.
           // We'll just render Decoration at the tile position.
           // Note: Original decoration logic assumed it was attached to a block at Y-2.
           // "Decoration... position={[offsetX, 2, offsetZ]}" -> Net Y = 0.
           // Now we position at [pos.x, pos.y, pos.z].
           // So we should wrap Decoration in a group at pos.
           // Adjust Y to sit on surface.
           children.push(
               <group key={`deco-${i}`} position={[pos.x, pos.y, pos.z]}>
                   <Decoration theme={zone.themeId} index={i} />
               </group>
           );
       }

       return (
         <group key={zone.name}>
            {/* Main Island Plate */}
            <mesh receiveShadow position={[centerX, baseY - 2, centerZ]}>
                <boxGeometry args={[width, 4, depth]} />
                <meshStandardMaterial color={color} />
            </mesh>

            {/* Individual Items */}
            {children}
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
        case 'magma': return '#ea580c';
        case 'underwater': return '#1e3a8a';
        case 'cave': return '#1e293b';
        case 'rhone': return '#f8fafc';
        case 'hargon': return '#581c87';
        default: return '#94a3b8';
    }
};

const Decoration: React.FC<{ theme: string; index: number }> = ({ theme, index }) => {
    const rand = (index * 1234.5678) % 1;
    if (rand > 0.3) return null;

    const side = rand > 0.15 ? 1 : -1;
    const offsetX = side * (2.5 + rand);
    const offsetZ = (rand - 0.5) * 2;

    // Adjust Y to sit on the tile surface (which is at Y=0 relative to parent)
    // Previous code: Parent Y-2. Deco Y=2. Result 0.
    // New code: Parent Y=0 (Tile surface). Deco Y=0?
    // Trees need to sit ON the ground.
    // If we want them on the Big Plate (which is down), we need to lower them?
    // The user wants "Areas with no tiles".
    // Decorations should probably be on the Big Plate, filling the void?
    // OR attached to the tile?
    // If attached to tile, they float with the path.
    // If attached to Plate, they look like environment.
    // "Environment" implies they should be on the Plate.

    // Let's try to put them on the Plate.
    // But we are inside a loop over tiles.
    // We can calculate the Plate Y.
    // This is getting complex to calculate relative Y inside the component.

    // Simplification: Keep decorations attached to tiles for now (floating islands look).
    // If I drop them to the plate, I need to know the plate height here.
    // Let's stick to "Attached to Tile" but maybe lower them slightly so they look like they grow from the pillar/air?
    // Actually, looking at the code: `position={[offsetX, 0, offsetZ]}`.

    // Let's ensure they are visible.

    switch(theme) {
        case 'grass':
            // Trees
            return (
                <group position={[offsetX, 0, offsetZ]}>
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
                <mesh position={[offsetX, 0, offsetZ]}>
                    <coneGeometry args={[0.5, 3, 4]} />
                    <meshStandardMaterial color="#7f1d1d" />
                </mesh>
            );
        case 'underwater':
            return (
                <group position={[offsetX, 0, offsetZ]}>
                     <mesh position={[0, rand, 0]}>
                        <sphereGeometry args={[0.5, 8, 8]} />
                        <meshStandardMaterial color="#22d3ee" transparent opacity={0.6} />
                     </mesh>
                </group>
            );
        case 'cave':
            return (
                <mesh position={[offsetX, -0.5, offsetZ]} rotation={[rand, rand, rand]}>
                    <dodecahedronGeometry args={[0.8]} />
                    <meshStandardMaterial color="#475569" />
                </mesh>
            );
        case 'rhone':
            return (
                <mesh position={[offsetX, 0, offsetZ]}>
                    <octahedronGeometry args={[0.7]} />
                    <meshStandardMaterial color="#bae6fd" transparent opacity={0.8} />
                </mesh>
            );
         case 'fairy':
            return (
                 <mesh position={[offsetX, rand, offsetZ]}>
                    <sphereGeometry args={[0.3]} />
                    <meshStandardMaterial color="#fdf4ff" emissive="#f0abfc" emissiveIntensity={2} />
                </mesh>
            );
        case 'hargon':
            return (
                <mesh position={[offsetX, 1, offsetZ]}>
                    <boxGeometry args={[0.6, 4, 0.6]} />
                    <meshStandardMaterial color="#3b0764" />
                </mesh>
            );
        default:
            return null;
    }
};

export default Environment;
