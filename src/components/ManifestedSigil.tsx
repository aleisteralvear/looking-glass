import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { SIGIL_PUBLIC_URLS, SIGIL_DIMENSIONS, ManifestationSigilId } from './sigilAssets';

export type SigilId = ManifestationSigilId;

interface ManifestedSigilProps {
  isScanning: boolean;
  activeSigil: SigilId | null;
}

// Pre-load textures for instantaneous manifestation with zero latency
const textureLoader = new THREE.TextureLoader();
const loadedTextures: Partial<Record<SigilId, THREE.Texture>> = {};

function getSigilTexture(id: SigilId): THREE.Texture {
  if (!loadedTextures[id]) {
    const tex = textureLoader.load(SIGIL_PUBLIC_URLS[id]);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    loadedTextures[id] = tex;
  }
  return loadedTextures[id]!;
}

// Preload all 3 PNGs immediately on client startup
if (typeof window !== 'undefined') {
  (['astaroth', 'belial', 'lucifer'] as SigilId[]).forEach((id) => {
    getSigilTexture(id);
  });
}

// Red-hot incandescent metal shader
// Eliminates square image boundaries by strict alpha-discarding
// Glow is concentrated directly on the cast metal contours like a branding iron in a forge
const RedHotMetalShader = {
  vertexShader: `
    varying vec2 vUv;
    uniform float uScale;

    void main() {
      vUv = uv;
      vec3 pos = position * uScale;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uOpacity;
    uniform float uHeat;
    uniform float uTime;

    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(uTexture, vUv);

      // Hard discard of transparent PNG background - absolutely zero square bounding box
      if (tex.a < 0.08) {
        discard;
      }

      vec3 baseMetal = tex.rgb;
      float luma = dot(baseMetal, vec3(0.299, 0.587, 0.114));

      // Red-hot metal thermal incandescence palette
      // Deep cherry-red iron -> molten orange -> incandescent golden core
      vec3 cherryRed = vec3(0.96, 0.10, 0.02);
      vec3 moltenOrange = vec3(1.0, 0.36, 0.04);
      vec3 incandescentHot = vec3(1.0, 0.82, 0.32);

      // Thermal pulsing during active scanning
      float pulse = 1.0 + 0.12 * sin(uTime * 6.5);
      float heatLevel = clamp(uHeat * pulse, 0.0, 1.35);

      // Multi-zone thermal heat gradient mapped directly onto metal luma
      vec3 heatColor = mix(cherryRed, moltenOrange, smoothstep(0.18, 0.65, luma));
      heatColor = mix(heatColor, incandescentHot, smoothstep(0.70, 0.96, luma));

      // Composite: preserves realistic 3D cast-metal shading while infusing red-hot heat
      vec3 heatedMetal = mix(baseMetal * 1.05, baseMetal * 0.45 + heatColor * 1.35, heatLevel * 0.82);
      heatedMetal += heatColor * pow(luma, 1.7) * heatLevel * 0.75;

      gl_FragColor = vec4(heatedMetal, tex.a * uOpacity);
    }
  `
};

export const ManifestedSigil: React.FC<ManifestedSigilProps> = ({ isScanning, activeSigil }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Animation values
  const animRef = useRef({
    opacity: activeSigil ? 1.0 : 0.0,
    heat: isScanning ? 1.0 : 0.65,
    scale: 1.0
  });

  const uniforms = useMemo(() => ({
    uTexture: { value: null as THREE.Texture | null },
    uOpacity: { value: 0.0 },
    uHeat: { value: 0.65 },
    uScale: { value: 1.0 },
    uTime: { value: 0.0 }
  }), []);

  // Update texture when activeSigil changes
  useEffect(() => {
    if (activeSigil && materialRef.current) {
      const tex = getSigilTexture(activeSigil);
      materialRef.current.uniforms.uTexture.value = tex;
      materialRef.current.needsUpdate = true;
    }
  }, [activeSigil]);

  useFrame((state, delta) => {
    const anim = animRef.current;
    const time = state.clock.getElapsedTime();

    if (activeSigil) {
      if (isScanning) {
        // Red-hot metal heats up rapidly on scan activation
        anim.opacity = Math.min(1.0, anim.opacity + delta * 4.5);
        anim.heat = Math.min(1.1, anim.heat + delta * 2.0);
        anim.scale = 1.0 + Math.sin(time * 5.0) * 0.03;
      } else {
        // Settled resting state: warm cherry-red incandescence inside crystal orb
        anim.opacity = THREE.MathUtils.lerp(anim.opacity, 0.98, delta * 3.0);
        anim.heat = THREE.MathUtils.lerp(anim.heat, 0.62, delta * 2.0);
        anim.scale = THREE.MathUtils.lerp(anim.scale, 1.0, delta * 3.0);
      }
    } else {
      anim.opacity = Math.max(0.0, anim.opacity - delta * 2.5);
      anim.heat = Math.max(0.0, anim.heat - delta * 2.0);
    }

    // Single mesh visibility and uniform updates
    if (meshRef.current && materialRef.current) {
      meshRef.current.visible = anim.opacity > 0.01;
      materialRef.current.uniforms.uOpacity.value = anim.opacity;
      materialRef.current.uniforms.uHeat.value = anim.heat;
      materialRef.current.uniforms.uScale.value = anim.scale;
      materialRef.current.uniforms.uTime.value = time;
    }

    // Subtle thermal point light in front of the metal
    if (lightRef.current) {
      lightRef.current.intensity = anim.opacity * (isScanning ? 3.0 : 1.2);
    }
  });

  // Exact dimensions from transparent PNG aspect ratio
  const dimensions = activeSigil ? SIGIL_DIMENSIONS[activeSigil] : [1.60, 1.63];

  return (
    <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
      {/* Warm red-orange thermal cast light illuminating the metal contours */}
      <pointLight 
        ref={lightRef} 
        position={[0, 0, 1.37]} 
        color="#ff3700" 
        distance={2.5} 
        intensity={1.2} 
      />

      {/* Exactly ONE single sigil mesh on the cosmic plasma orb surface */}
      <mesh 
        ref={meshRef} 
        position={[0, 0, 1.35]} 
        renderOrder={3}
      >
        <planeGeometry args={[dimensions[0], dimensions[1]]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={RedHotMetalShader.vertexShader}
          fragmentShader={RedHotMetalShader.fragmentShader}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
};
