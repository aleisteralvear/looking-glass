import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Sparkles, Center, Sphere, MeshTransmissionMaterial, Torus } from '@react-three/drei';
import * as THREE from 'three';

const RaytracedRing = ({ scale, isScanning, speed, axis = 'y', reverse = false, spinAxis = 'y', spinSpeed = 0, color, isEnvironment = false, tube = 0.05, opacity = 0.5 }: any) => {
  const group = useRef<THREE.Group>(null);
  const meshGroup = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (group.current && !isEnvironment) {
      const currentSpeed = (isScanning ? speed * 3 : speed) * (reverse ? -1 : 1);
      if (axis === 'y' || axis === 'all') group.current.rotation.y += delta * currentSpeed;
      if (axis === 'x' || axis === 'all') group.current.rotation.x += delta * currentSpeed;
      if (axis === 'z' || axis === 'all') group.current.rotation.z += delta * currentSpeed;
      
      if (axis === 'gimbal') {
        group.current.rotation.x += delta * currentSpeed * 0.5;
        group.current.rotation.y += delta * currentSpeed * 0.8;
        group.current.rotation.z += delta * currentSpeed * 0.3;
      }
    }
    
    if (meshGroup.current && spinSpeed > 0 && !isEnvironment) {
      const currentSpinSpeed = (isScanning ? spinSpeed * 3 : spinSpeed) * (reverse ? -1 : 1);
      if (spinAxis === 'x') meshGroup.current.rotation.x += delta * currentSpinSpeed;
      if (spinAxis === 'y') meshGroup.current.rotation.y += delta * currentSpinSpeed;
      if (spinAxis === 'z') meshGroup.current.rotation.z += delta * currentSpinSpeed;
    }
  });

  return (
    <group ref={group}>
      <group ref={meshGroup} scale={scale}>
        <Torus args={[1, tube, 32, 100]}>
          {isEnvironment ? (
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.1} metalness={0.8} />
          ) : (
            <meshPhysicalMaterial 
              color={color}
              transparent={opacity < 1}
              opacity={opacity}
              roughness={0.05}
              metalness={0.8}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={2}
              side={THREE.DoubleSide}
              depthWrite={opacity === 1}
            />
          )}
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
        <pointLight position={[-4, 3, 0]} intensity={isScanning ? 4 : 1.5} color="#0044ff" distance={12} />
      </group>
    </>
  );
};

const CoreLight = ({ isScanning }: { isScanning: boolean }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const time = clock.getElapsedTime();
      const baseIntensity = isScanning ? 8 : 3;
      const pulsing = isScanning ? Math.sin(time * 15) * 3 : Math.sin(time * 3) * 0.8;
      lightRef.current.intensity = baseIntensity + pulsing;
    }
  });
  return <pointLight ref={lightRef} position={[0, 0, 0]} color={isScanning ? "#ffffff" : "#00ffff"} distance={8} />;
};

const TranslucentSphere = ({ isScanning }: { isScanning: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1.4, 64, 64]} scale={isScanning ? 1.2 : 1}>
      <MeshTransmissionMaterial 
        backside
        backsideThickness={2}
        thickness={2}
        resolution={1024}
        chromaticAberration={0.03}
        anisotropy={0.1}
        distortion={0.2}
        distortionScale={0.3}
        temporalDistortion={0.1}
        transmission={1}
        roughness={0.05}
        ior={1.33}
        color="#c0fbff"
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </Sphere>
  );
};

export const LookingGlass = React.memo(({ isScanning }: { isScanning: boolean }) => {
  return (
    <div className="relative w-full max-w-2xl aspect-square mx-auto flex items-center justify-center my-8 rounded-full overflow-visible">
      {/* Dynamic ambient glow behind the 3D canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <div 
          className={`absolute w-3/4 h-3/4 rounded-full blur-3xl transition-all duration-1000 ${
            isScanning ? 'bg-cyan-400/50 scale-125 animate-pulse' : 'bg-cyan-900/20 scale-100'
          }`}
        />
        <div 
          className={`absolute w-1/2 h-1/2 rounded-full blur-2xl transition-all duration-1000 delay-100 ${
            isScanning ? 'bg-blue-500/40 scale-150 animate-pulse' : 'bg-transparent scale-100'
          }`}
        />
        <div 
          className={`absolute w-1/4 h-1/4 rounded-full blur-xl transition-all duration-700 ${
            isScanning ? 'bg-white/30 scale-150 animate-ping' : 'bg-transparent scale-100'
          }`}
        />
      </div>
      
      <div className="absolute inset-0 z-10 pointer-events-auto">
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 10.5], fov: 50 }} performance={{ min: 0.5 }}>
          <ambientLight intensity={1.2} />
          
          <Suspense fallback={null}>
            <Environment resolution={128}>
              {/* Static environment map containing the lights so they reflect on the orb (drawn once for performance) */}
              <ambientLight intensity={2} />
              <pointLight position={[5, 0, 0]} intensity={5} color="#00ffff" distance={15} />
              <pointLight position={[-4, 3, 0]} intensity={4} color="#0044ff" distance={15} />
            </Environment>
            
            <DynamicLights isScanning={isScanning} />
            <CoreLight isScanning={isScanning} />

            <Center>
              <Float speed={isScanning ? 2 : 1} rotationIntensity={0.5} floatIntensity={1}>
                {/* Inner Core Ball */}
                <TranslucentSphere isScanning={isScanning} />
                
                {/* Middle Gimbal Ring (Gold) */}
                <RaytracedRing 
                  scale={2.2} 
                  color="#ffd700"
                  tube={0.06}
                  speed={0.8} 
                  axis="gimbal" 
                  spinAxis="y"
                  spinSpeed={2.0}
                  isScanning={isScanning}
                />
                
                {/* Outer Gimbal Ring (Blue) */}
                <RaytracedRing 
                  scale={2.8} 
                  color="#0088ff"
                  tube={0.04}
                  speed={0.4} 
                  axis="gimbal" 
                  spinAxis="y"
                  spinSpeed={1.5}
                  reverse={true} 
                  isScanning={isScanning}
                  opacity={1}
                />
              </Float>
            </Center>
            
            {/* Quantum Particles */}
            <Sparkles 
              count={isScanning ? 100 : 50} 
              scale={6} 
              size={isScanning ? 4 : 2} 
              speed={isScanning ? 0.8 : 0.2} 
              color="#00ffff" 
              opacity={0.6}
            />
            <Sparkles 
              count={25} 
              scale={4} 
              size={isScanning ? 6 : 3} 
              speed={isScanning ? 1.5 : 0.5} 
              color="#ffffff" 
              opacity={0.4}
            />
          </Suspense>
          
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            autoRotate={true}
            autoRotateSpeed={isScanning ? 4 : 1}
          />
        </Canvas>
      </div>
      
      {/* Front UI overlays (e.g. scanning text) */}
      {isScanning && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-cyan-400/50 rounded-full animate-ping opacity-20" />
          <div className="absolute w-64 h-64 border border-cyan-300/20 rounded-full animate-[spin_4s_linear_infinite] border-t-cyan-400" />
          <div className="absolute w-72 h-72 border border-blue-400/20 rounded-full animate-[spin_6s_linear_infinite_reverse] border-b-blue-400" />
        </div>
      )}
    </div>
  );
});

LookingGlass.displayName = 'LookingGlass';
