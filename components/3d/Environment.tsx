import React, { useMemo, useRef } from 'react';
import { ZONES, getBoardPosition, ZONE_BOUNDS, GRID_SCALE } from '../../constants';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

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
            let bridgeLength = (zIdx === 0) ? 0 : 3;
            if (zIdx !== 0 && (zone.themeId === 'magma' || zone.themeId === 'underwater' || zone.themeId === 'rhone' || zone.themeId === 'hargon')) {
                bridgeLength = 8;
            }

            const children = [];

            for (let i = zone.start; i <= zone.end; i++) {
                const isBridge = (i < zone.start + bridgeLength);
                const pos = getBoardPosition(i); // Already scaled

                // A. Bridge Tiles: Always render a block
                if (isBridge) {
                    children.push(
                        <mesh key={`bridge-${i}`} receiveShadow position={[pos.x, pos.y - 1 + 0.02, pos.z]}>
                            <boxGeometry args={[2.5, 2, 2.5]} /> {/* Made slightly thinner than tiles for depth */}
                            <meshStandardMaterial color={color} roughness={0.8} />
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
                            <mesh key={`pillar-${i}`} receiveShadow position={[pos.x, baseY + height / 2, pos.z]}>
                                <boxGeometry args={[2, height, 2]} />
                                <meshStandardMaterial color={color} roughness={0.8} />
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
                        <meshStandardMaterial color={color} roughness={0.9} />
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
    switch (theme) {
        case 'grass': return '#166534'; // Darker richer green for base, contrast with path
        case 'fairy': return '#d946ef'; // Richer fuchsia/pink
        case 'magma': return '#b91c1c'; // Deep red/crimson
        case 'underwater': return '#1e40af'; // Deep blue
        case 'cave': return '#0f172a'; // Near black for cave darkness
        case 'rhone': return '#cbd5e1'; // Icy slate
        case 'hargon': return '#4c1d95'; // Deep dark violet
        default: return '#64748b';
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

    // Animation References mostly replaced by <Float>
    // But we can add specific rotation to some objects via ref
    const objRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (!objRef.current) return;
        if (theme === 'cave') {
            objRef.current.rotation.y += 0.01;
            objRef.current.rotation.z += 0.005;
        } else if (theme === 'magma') {
            // Very subtle scale pulsing for magma spikes
            const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.05;
            objRef.current.scale.set(1, scale, 1);
        }
    });

    switch (theme) {
        case 'grass':
            // Trees
            return (
                <group position={[offsetX, 0, offsetZ]}>
                    <Float speed={0} rotationIntensity={0.2} floatIntensity={0}>
                        <mesh position={[0, 1.2, 0]} castShadow>
                            <coneGeometry args={[0.8, 2.5, 8]} />
                            <meshStandardMaterial color="#22c55e" roughness={0.9} />
                        </mesh>
                    </Float>
                    <mesh position={[0, -0.2, 0]} castShadow>
                        <cylinderGeometry args={[0.2, 0.3, 1]} />
                        <meshStandardMaterial color="#78350f" />
                    </mesh>
                </group>
            );
        case 'magma':
            // Spikes
            return (
                <group position={[offsetX, 0, offsetZ]} ref={objRef}>
                    <mesh castShadow receiveShadow>
                        <coneGeometry args={[0.6, 3, 4]} />
                        <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={0.5} roughness={0.2} />
                    </mesh>
                </group>
            );
        case 'underwater':
            return (
                <group position={[offsetX, 0, offsetZ]}>
                    <Float speed={5} rotationIntensity={1} floatIntensity={2} floatingRange={[0, 2]}>
                        <mesh position={[0, rand, 0]}>
                            <sphereGeometry args={[0.4, 16, 16]} />
                            <meshStandardMaterial color="#67e8f9" transparent opacity={0.6} roughness={0} />
                        </mesh>
                    </Float>
                </group>
            );
        case 'cave':
            return (
                <group position={[offsetX, 0, offsetZ]} ref={objRef}>
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5} floatingRange={[0, 1]}>
                        <mesh position={[0, 0, 0]} rotation={[rand, rand, rand]} castShadow>
                            <dodecahedronGeometry args={[0.8]} />
                            <meshStandardMaterial color="#a8a29e" metalness={0.6} roughness={0.4} />
                        </mesh>
                    </Float>
                </group>
            );
        case 'rhone':
            return (
                <group position={[offsetX, 0, offsetZ]}>
                    <Float speed={1} rotationIntensity={0} floatIntensity={0}>
                        <mesh castShadow>
                            <octahedronGeometry args={[0.8]} />
                            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.8} roughness={0.1} envMapIntensity={1} />
                        </mesh>
                    </Float>
                </group>
            );
        case 'fairy':
            return (
                <group position={[offsetX, rand + 1, offsetZ]}>
                    <Float speed={4} rotationIntensity={2} floatIntensity={1} floatingRange={[-0.5, 0.5]}>
                        <mesh>
                            <sphereGeometry args={[0.25]} />
                            <meshStandardMaterial color="#fdf4ff" emissive="#f472b6" emissiveIntensity={3} />
                        </mesh>
                    </Float>
                </group>
            );
        case 'hargon':
            return (
                <group position={[offsetX, 1, offsetZ]}>
                    <Float speed={0} rotationIntensity={0.1} floatIntensity={0}>
                        <mesh castShadow>
                            <boxGeometry args={[0.6, 4, 0.6]} />
                            <meshStandardMaterial color="#9333ea" roughness={0.2} metalness={0.8} />
                        </mesh>
                    </Float>
                </group>
            );
        default:
            return null;
    }
};

export default Environment;
