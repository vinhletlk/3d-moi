"use client";

import * as THREE from 'three';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Suspense } from 'react';

function Model({ url }: { url: string }) {
  const geom = useLoader(STLLoader, url);

  const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
    color: 'hsl(var(--primary))',
    metalness: 0.25,
    roughness: 0.75,
  }));
  
  return (
     <primitive object={mesh} />
  )
}

export function STLViewer({ stlDataUri }: { stlDataUri: string }) {
  if (!stlDataUri) {
    return null;
  }
  
  return (
    <Canvas camera={{ position: [0, 100, 200], fov: 35 }}>
      <ambientLight intensity={Math.PI / 2} />
      <spotLight position={[200, 200, 200]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
      <pointLight position={[-200, -200, -200]} decay={0} intensity={Math.PI} />
      <Suspense fallback={null}>
        <Center>
          <Model url={stlDataUri} />
        </Center>
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
}
