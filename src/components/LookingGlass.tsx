import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sparkles, Center, Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { ManifestedSigil, SigilId } from './ManifestedSigil';

const RaytracedRing = ({ 
  scale, 
  isScanning, 
  speed, 
  axis = 'y', 
  reverse = false, 
  spinAxis = 'y', 
  spinSpeed = 0, 
  color, 
  tube = 0.042, 
  opacity = 1,
  metalness = 0.85,
  roughness = 0.18
}: any) => {
  const group = useRef<THREE.Group>(null);
  const meshGroup = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (group.current) {
      const currentSpeed = (isScanning ? speed * 2.5 : speed) * (reverse ? -1 : 1);
      if (axis === 'y' || axis === 'all') group.current.rotation.y += delta * currentSpeed;
      if (axis === 'x' || axis === 'all') group.current.rotation.x += delta * currentSpeed;
      if (axis === 'z' || axis === 'all') group.current.rotation.z += delta * currentSpeed;
      
      if (axis === 'gimbal') {
        group.current.rotation.x += delta * currentSpeed * 0.45;
        group.current.rotation.y += delta * currentSpeed * 0.75;
        group.current.rotation.z += delta * currentSpeed * 0.3;
      }
    }
    
    if (meshGroup.current && spinSpeed > 0) {
      const currentSpinSpeed = (isScanning ? spinSpeed * 2.5 : spinSpeed) * (reverse ? -1 : 1);
      if (spinAxis === 'x') meshGroup.current.rotation.x += delta * currentSpinSpeed;
      if (spinAxis === 'y') meshGroup.current.rotation.y += delta * currentSpinSpeed;
      if (spinAxis === 'z') meshGroup.current.rotation.z += delta * currentSpinSpeed;
    }
  });

  return (
    <group ref={group}>
      <group ref={meshGroup} scale={scale}>
        <Torus args={[1, tube, 32, 100]}>
          <meshPhysicalMaterial 
            color={color}
            transparent={opacity < 1}
            opacity={opacity}
            roughness={roughness}
            metalness={metalness}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={2.5}
            side={THREE.DoubleSide}
            depthWrite={opacity === 1}
          />
        </Torus>
      </group>
    </group>
  );
};

const DynamicLights = ({ isScanning }: { isScanning: boolean }) => {
  const group1 = useRef<THREE.Group>(null);
  const group2 = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (group1.current) {
      group1.current.rotation.y += delta * (isScanning ? 3 : 0.8);
      group1.current.rotation.x += delta * (isScanning ? 2 : 0.4);
    }
    if (group2.current) {
      group2.current.rotation.y -= delta * (isScanning ? 2.5 : 0.6);
      group2.current.rotation.z += delta * (isScanning ? 3.5 : 0.9);
    }
  });

  return (
    <>
      <group ref={group1}>
        <pointLight position={[5, 0, 0]} intensity={isScanning ? 5 : 2} color="#00ffff" distance={12} />
      </group>
      <group ref={group2}>
        <pointLight position={[-4, 3, 0]} intensity={4} color="#ffd700" distance={12} />
      </group>
    </>
  );
};

const CoreLight = ({ isScanning }: { isScanning: boolean }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const time = clock.getElapsedTime();
      const baseIntensity = isScanning ? 7 : 3;
      const pulsing = isScanning ? Math.sin(time * 12) * 2.5 : Math.sin(time * 3) * 0.6;
      lightRef.current.intensity = baseIntensity + pulsing;
    }
  });
  return <pointLight ref={lightRef} position={[0, 0, 0]} color={isScanning ? "#ffd700" : "#00ffff"} distance={8} />;
};

// Original Mystical Cosmic Plasma Orb matching Project Looking Glass
const CosmicPlasmaOrb = ({ isScanning }: { isScanning: boolean }) => {
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const [orbTexture, setOrbTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/orb_texture.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      setOrbTexture(tex);
    });
  }, []);

  useFrame((state, delta) => {
    if (innerRef.current) {
      innerRef.current.rotation.y += delta * (isScanning ? 0.35 : 0.08);
      innerRef.current.rotation.x += delta * (isScanning ? 0.2 : 0.04);
    }
    if (outerRef.current) {
      outerRef.current.rotation.y -= delta * (isScanning ? 0.15 : 0.03);
    }
  });

  return (
    <group scale={isScanning ? 1.05 : 1}>
      {/* Inner Cosmic Plasma Sphere */}
      <Sphere ref={innerRef} args={[1.34, 64, 64]} renderOrder={1}>
        <meshStandardMaterial
          map={orbTexture}
          color="#34384e"
          roughness={0.35}
          metalness={0.15}
          emissive="#0d1020"
          emissiveIntensity={0.5}
        />
      </Sphere>

      {/* Outer Crystal Glass Specular Shell */}
      <Sphere ref={outerRef} args={[1.38, 64, 64]} renderOrder={2}>
        <meshPhysicalMaterial
          transparent={true}
          opacity={0.32}
          roughness={0.06}
          metalness={0.12}
          transmission={0.68}
          ior={1.42}
          clearcoat={1}
          clearcoatRoughness={0.08}
          color="#060c14"
          depthWrite={false}
        />
      </Sphere>
    </group>
  );
};

export const LookingGlass = React.memo(({ isScanning, activeSigil }: { isScanning: boolean; activeSigil?: SigilId | null }) => {
  return (
    <div className="w-full flex flex-col items-center">
      {/* 3D Resonator Canvas Container */}
      <div className="relative w-full max-w-2xl aspect-square mx-auto flex items-center justify-center my-4 rounded-full overflow-visible">
        {/* Dynamic ambient glow behind the 3D canvas */}
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
          <div 
            className={`absolute w-3/4 h-3/4 rounded-full blur-3xl transition-all duration-1000 ${
              isScanning ? 'bg-cyan-500/40 scale-125 animate-pulse' : 'bg-cyan-950/20 scale-100'
            }`}
          />
          <div 
            className={`absolute w-1/2 h-1/2 rounded-full blur-2xl transition-all duration-1000 delay-100 ${
              isScanning ? 'bg-amber-500/30 scale-140 animate-pulse' : 'bg-transparent scale-100'
            }`}
          />
        </div>
        
        <div className="absolute inset-0 z-10 pointer-events-auto">
          <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 10.5], fov: 50 }} performance={{ min: 0.5 }}>
            <ambientLight intensity={1.1} />
            
            <Suspense fallback={null}>
              <Environment resolution={128}>
                <ambientLight intensity={1.8} />
                <pointLight position={[5, 0, 0]} intensity={4} color="#00ffff" distance={15} />
                <pointLight position={[-4, 3, 0]} intensity={4} color="#ffd700" distance={15} />
              </Environment>
              
              <DynamicLights isScanning={isScanning} />
              <CoreLight isScanning={isScanning} />

              <Center>
                <Float speed={isScanning ? 2.5 : 1} rotationIntensity={0.5} floatIntensity={1.0}>
                  {/* Central Cosmic Plasma Crystal Orb */}
                  <CosmicPlasmaOrb isScanning={isScanning} />
                  
                  {/* Manifested Red-Hot Metal Sigil inside the Orb */}
                  <ManifestedSigil isScanning={isScanning} activeSigil={activeSigil || null} />
                  
                  {/* Ring III: Inner Gimbal Ring (Teal / Cyan) */}
                  <RaytracedRing 
                    scale={1.65} 
                    color="#00e5ff"
                    tube={0.034}
                    speed={1.0} 
                    axis="gimbal" 
                    spinAxis="z"
                    spinSpeed={2.2}
                    isScanning={isScanning}
                    opacity={0.9}
                    metalness={0.82}
                    roughness={0.2}
                  />

                  {/* Ring II: Middle Gimbal Ring (Teal / Cyan) */}
                  <RaytracedRing 
                    scale={2.15} 
                    color="#0d6e75"
                    tube={0.042}
                    speed={0.7} 
                    axis="gimbal" 
                    spinAxis="y"
                    spinSpeed={1.8}
                    isScanning={isScanning}
                    opacity={0.92}
                    metalness={0.85}
                    roughness={0.22}
                  />
                  
                  {/* Ring I: Outer Gimbal Ring (Gold) */}
                  <RaytracedRing 
                    scale={2.75} 
                    color="#caa452"
                    tube={0.046}
                    speed={0.35} 
                    axis="gimbal" 
                    spinAxis="y"
                    spinSpeed={1.2}
                    reverse={true} 
                    isScanning={isScanning}
                    opacity={1}
                    metalness={0.92}
                    roughness={0.16}
                  />
                </Float>
              </Center>
              
              {/* Quantum Particles */}
              <Sparkles 
                count={isScanning ? 100 : 50} 
                scale={6} 
                size={isScanning ? 3.5 : 1.8} 
                speed={isScanning ? 0.8 : 0.2} 
                color="#00e5ff" 
                opacity={0.5}
              />
              <Sparkles 
                count={30} 
                scale={4.5} 
                size={isScanning ? 4 : 2} 
                speed={isScanning ? 1.2 : 0.35} 
                color="#ffd700" 
                opacity={0.45}
              />
            </Suspense>
            
            <OrbitControls 
              enableZoom={false} 
              enablePan={false} 
              autoRotate={true}
              autoRotateSpeed={isScanning ? 3.5 : 0.8}
            />
          </Canvas>
        </div>
        
        {/* Front UI telemetry reticles during active scan */}
        {isScanning && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-cyan-400/50 rounded-full animate-ping opacity-20" />
            <div className="absolute w-64 h-64 border border-cyan-300/30 rounded-full animate-[spin_4s_linear_infinite] border-t-cyan-400" />
            <div className="absolute w-72 h-72 border border-amber-400/30 rounded-full animate-[spin_6s_linear_infinite_reverse] border-b-amber-400" />
            <div className="absolute w-80 h-80 border border-teal-400/30 rounded-full animate-[spin_8s_linear_infinite] border-l-teal-400" />
            <div className="mt-72 text-center">
              <span className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase bg-black/80 px-3 py-1 rounded border border-cyan-500/40 shadow-lg animate-pulse">
                ARGON QUANTUM CORE: ENGAGED // TEMPORAL CALIBRATION ACTIVE
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

LookingGlass.displayName = 'LookingGlass';
