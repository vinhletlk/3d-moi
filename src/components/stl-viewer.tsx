"use client";

import React, { Suspense, lazy } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

// Lazy load react-three-fiber and drei components
const Canvas = lazy(() => import('@react-three/fiber').then(module => ({ default: module.Canvas })));
const useLoader = lazy(() => import('@react-three/fiber').then(module => ({ default: module.useLoader }))) as any; // Cast because lazy doesn't play nice with hooks
const OrbitControls = lazy(() => import('@react-three/drei').then(module => ({ default: module.OrbitControls })));
const Center = lazy(() => import('@react-three/drei').then(module => ({ default: module.Center })));
const Environment = lazy(() => import('@react-three/drei').then(module => ({ default: module.Environment })));
const Bounds = lazy(() => import('@react-three/drei').then(module => ({ default: module.Bounds })));


interface StlViewerProps {
  fileUrl: string;
}

const Model = ({ url }: { url: string }) => {
  const geom = (useLoader as any)(STLLoader, url);
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
    <Suspense fallback={null}>
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
    </Suspense>
  );
}

export default StlViewer;
