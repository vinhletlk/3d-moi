"use client";

import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center, Environment, Bounds } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';

interface StlViewerProps {
  fileUrl: string;
}

const Model = ({ url }: { url: string }) => {
  const geom = useLoader(STLLoader, url);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('hsl(var(--primary))'),
    metalness: 0.1,
    roughness: 0.6,
  });

  return (
    <mesh geometry={geom} material={material} castShadow receiveShadow>
    </mesh>
  );
};

export function StlViewer({ fileUrl }: StlViewerProps) {
  return (
    <Canvas camera={{ position: [0, 0, 200], fov: 50 }} shadows>
      <ambientLight intensity={0.7} />
      <directionalLight 
        position={[10, 20, 15]} 
        intensity={1.5} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.2}>
            <Center>
                <Model url={fileUrl} />
            </Center>
        </Bounds>
        <Environment preset="city" />
      </Suspense>
      <OrbitControls makeDefault />
    </Canvas>
  );
}

export default StlViewer;

    