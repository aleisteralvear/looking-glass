import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, Center, Sphere, Torus, MeshTransmissionMaterial } from '@react-three/drei';
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
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const raysGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();
    if (lightRef.current) {
      const baseIntensity = isScanning ? 7.5 : 3.2;
      const pulsing = isScanning ? Math.sin(time * 12) * 2.5 : Math.sin(time * 3.5) * 0.7;
      lightRef.current.intensity = baseIntensity + pulsing;
    }

    if (raysGroupRef.current) {
      // Gently waving solar rays rotation & dynamic scale pulse
      const raySpinSpeed = isScanning ? 2.2 : 0.6;
      raysGroupRef.current.rotation.z += delta * raySpinSpeed;
      raysGroupRef.current.rotation.y += delta * (raySpinSpeed * 0.5);
      const waveScale = 1.0 + Math.sin(time * (isScanning ? 8.0 : 3.0)) * 0.08;
      raysGroupRef.current.scale.set(waveScale, waveScale, waveScale);
    }

    if (coreMeshRef.current) {
      const corePulse = 1.0 + Math.sin(time * 4.0) * 0.05;
      coreMeshRef.current.scale.set(corePulse, corePulse, corePulse);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Central 3D Point Light */}
      <pointLight 
        ref={lightRef} 
        position={[0, 0, 0]} 
        color={isScanning ? "#ffd700" : "#00f0ff"} 
        distance={9} 
      />

      {/* Ethereal Miniature Sun Core */}
      <Sphere ref={coreMeshRef} args={[0.24, 32, 32]}>
        <meshBasicMaterial 
          color={isScanning ? "#ffe680" : "#00f0ff"} 
          transparent={true}
          opacity={isScanning ? 0.95 : 0.75}
        />
      </Sphere>

      {/* Gently Waving Solar Rays Corona */}
      <group ref={raysGroupRef}>
        {[0, 45, 90, 135].map((angle, idx) => (
          <mesh key={idx} rotation={[0, 0, (angle * Math.PI) / 180]}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial
              color={isScanning ? "#ffb700" : "#00e5ff"}
              transparent={true}
              opacity={isScanning ? 0.45 : 0.28}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Refractive Crystal Glass Orb with procedural surface noise normal map
const CosmicPlasmaOrb = ({ isScanning }: { isScanning: boolean }) => {
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const [orbTexture, setOrbTexture] = useState<THREE.Texture | null>(null);

  // Generate procedural noise-based normal map for subtle, realistic glass imperfections
  const glassNormalTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.createImageData(512, 512);
    const data = imgData.data;

    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const u = x / 512;
        const v = y / 512;

        // Layered organic surface waves for realistic hand-blown glass micro-imperfections
        const wave1 = Math.sin(u * Math.PI * 12 + Math.cos(v * Math.PI * 10) * 1.5);
        const wave2 = Math.cos(v * Math.PI * 14 + Math.sin(u * Math.PI * 8) * 1.5);
        const wave3 = Math.sin((u + v) * Math.PI * 24) * 0.4;

        const dx = (wave1 + wave3) * 0.08;
        const dy = (wave2 + wave3) * 0.08;

        const idx = (y * 512 + x) * 4;
        data[idx] = Math.floor(Math.min(255, Math.max(0, (dx * 0.5 + 0.5) * 255)));
        data[idx + 1] = Math.floor(Math.min(255, Math.max(0, (dy * 0.5 + 0.5) * 255)));
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.NoColorSpace; // Linear space for normal map
    return texture;
  }, []);

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
      {/* Subtle Inner Cosmic Swirl (Transparent, non-blocking) */}
      <mesh ref={innerRef} renderOrder={1}>
        <sphereGeometry args={[1.08, 64, 64]} />
        <meshStandardMaterial
          map={orbTexture}
          color="#1e2638"
          roughness={0.2}
          metalness={0.1}
          emissive="#091426"
          emissiveIntensity={0.6}
          transparent={true}
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Outer Refractive Crystal Glass Shell (Fast Path Refraction with Normal Map Imperfections) */}
      <mesh ref={outerRef} renderOrder={10}>
        <sphereGeometry args={[1.12, 96, 96]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={0.35}
          samples={8}
          resolution={1024}
          transmission={1.0}
          thickness={0.85}
          roughness={0.05}
          ior={1.54}
          chromaticAberration={0.045}
          anisotropy={0.12}
          distortion={0.22}
          distortionScale={0.42}
          temporalDistortion={0.04}
          color="#d8f2ff"
          attenuationColor="#2b7fc4"
          attenuationDistance={1.4}
          normalMap={glassNormalTexture || undefined}
          normalScale={new THREE.Vector2(0.12, 0.12)}
        />
      </mesh>
    </group>
  );
};

export const LookingGlass = React.memo(({ 
  isScanning, 
  activeSigil,
  onFadeComplete
}: { 
  isScanning: boolean; 
  activeSigil?: SigilId | null;
  onFadeComplete?: () => void;
}) => {
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
              {/* Zero-dependency procedural studio lighting rig */}
              <hemisphereLight intensity={1.2} color="#00e5ff" groundColor="#050a14" />
              <directionalLight position={[5, 5, 5]} intensity={2.5} color="#00ffff" />
              <directionalLight position={[-5, 3, -5]} intensity={2.0} color="#ffd700" />
              <directionalLight position={[0, -5, 3]} intensity={1.5} color="#a855f7" />
              
              <DynamicLights isScanning={isScanning} />
              <CoreLight isScanning={isScanning} />

              <Center>
                <Float speed={isScanning ? 2.5 : 1} rotationIntensity={0.5} floatIntensity={1.0}>
                  {/* Central Cosmic Plasma Crystal Orb */}
                  <CosmicPlasmaOrb isScanning={isScanning} />
                  
                  {/* Manifested Red-Hot Metal Sigil inside the Orb */}
                  <ManifestedSigil isScanning={isScanning} activeSigil={activeSigil || null} onFadeComplete={onFadeComplete} />
                  
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
