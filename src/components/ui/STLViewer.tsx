"use client";

import * as THREE from 'three';
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { Stage } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls, Center, Bounds } from '@react-three/drei';

interface STLViewerProps {
    fileContent: ArrayBuffer;
}

const STLModel = ({ fileContent }: STLViewerProps) => {
    const geom = useMemo(() => {
        try {
            return new STLLoader().parse(fileContent);
        } catch (e) {
            console.error("Failed to parse STL file", e);
            return null;
        }
    }, [fileContent]);

    if (!geom) {
        return null; // or return a fallback mesh/error indicator
    }

    const meshRef = useRef<THREE.Mesh>(null!);
    
    // Center the geometry
    geom.center();

    return (
        <mesh ref={meshRef} geometry={geom} scale={1}>
            <meshStandardMaterial color={'#06b6d4'} metalness={0.1} roughness={0.4} />
        </mesh>
    );
};


export const STLViewer = ({ fileContent }: STLViewerProps) => {
    return (
        <Canvas 
            camera={{ position: [50, 50, 50], fov: 50 }} 
            className="w-full h-full rounded-lg bg-gray-100/50 dark:bg-gray-800/80"
        >
            <ambientLight intensity={Math.PI / 2} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
            <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
            
            <Stage preset="rembrandt" intensity={1.2} environment={null}>
                <Bounds fit clip observe margin={1.2}>
                <STLModel fileContent={fileContent} />
            </Bounds>
            </Stage>
            
            <OrbitControls makeDefault autoRotate autoRotateSpeed={0.8} />
        </Canvas>
    );
};
