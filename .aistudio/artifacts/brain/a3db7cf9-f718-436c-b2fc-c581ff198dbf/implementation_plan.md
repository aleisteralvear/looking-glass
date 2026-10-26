# Implementation Plan: Looking Glass Orb Optical Refraction Pass

This plan isolates the orb's optical refraction treatment so the central glass sphere exhibits realistic 3D light bending and depth, cleanly decoupled from the ring kinematics, mist effects, and sigil manifestation.

---

## 1. System Components & Architecture Identification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            R3F Canvas & Scene                               │
│  [ Camera: FOV 50, Pos: (0, 0, 10.5) ]                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────┐         ┌─────────────────────────────────────┐  │
│  │   3 Gimbal Rings      │         │     CosmicPlasmaOrb (Glass Core)    │  │
│  │   (RaytracedRing)     │         │   - Outer Mesh: Sphere 1.38         │  │
│  │   - Outer Gold        │────────>│   - Material: meshPhysicalMaterial  │  │
│  │   - Middle Teal       │ (Passes │     (transmission: 0.95, IOR: 1.52) │  │
│  │   - Inner Cyan        │  Behind)│   - Inner Swirl: Sphere 1.33        │  │
│  └───────────────────────┘         └─────────────────────────────────────┘  │
│                                                       ▲                     │
│  ┌───────────────────────┐                            │ (Renders Inside)    │
│  │   ManifestedSigil     │────────────────────────────┘                     │
│  │   (RedHotMetalShader) │                                                  │
│  └───────────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Identified Codebase Objects

1. **Orb Mesh & Outer Shell**:
   - Location: `CosmicPlasmaOrb` component in `src/components/LookingGlass.tsx`.
   - Mesh: `<Sphere ref={outerRef} args={[1.38, 64, 64]} renderOrder={2}>`.
   - Material: `meshPhysicalMaterial` (Transmission PBR shader).

2. **Ring Objects**:
   - Location: `RaytracedRing` components in `src/components/LookingGlass.tsx`.
   - Geometry: `<Torus args={[1, tube, 32, 100]}>`.
   - Rings: Ring I (Outer Gold, scale 2.75), Ring II (Middle Teal, scale 2.15), Ring III (Inner Cyan, scale 1.65).

3. **Renderer & Render Loop**:
   - Renderer: React Three Fiber `<Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 10.5], fov: 50 }}>`.
   - Loop: R3F `useFrame` delta animation loops in `CosmicPlasmaOrb`, `RaytracedRing`, and `CoreLight`.

---

## 2. Targeted Optical Refraction Pass Strategy

To upgrade the orb's optics without creating a complex inter-dependency chain:

1. **Physical Transmission Tuning (`meshPhysicalMaterial`)**:
   - Set `transmission = 0.96` to enable physical background buffer sampling.
   - Set `ior = 1.52` (Crown Glass refractive index) to achieve realistic perimeter light bending.
   - Set `thickness = 1.45` to define internal optical depth.
   - Set `roughness = 0.04` and `clearcoat = 1.0` for razor-sharp specular highlights.
   - Set `depthWrite = false` so background ring geometries are drawn into the transmission buffer before the glass shell is composited.

2. **Decoupled Layer Architecture**:
   - **Layer 1 (Rings)**: Rendered independently with high metallic sheen (`metalness: 0.88-0.95`).
   - **Layer 2 (Glass Orb Refraction)**: Refracts ring background light in real time without modifying ring code.
   - **Layer 3 (Mist & Sigil)**: Operates independently inside/behind the glass without breaking optical properties.

---

## 3. Minimal Targeted File Modifications

- `src/components/LookingGlass.tsx`: Refine `CosmicPlasmaOrb` material properties and transmission parameters.

---

## 4. Verification Plan

1. **Refraction Check**: Verify that as the 3 gimbal rings swing behind the orb, their light bends and refracts smoothly through the crystal sphere.
2. **Ring Brightness & Depth**: Confirm that ring colors (Gold, Teal, Cyan) remain vivid and distinct.
3. **Decoupled Verification**: Confirm that sigil manifestation and mist particles render cleanly without interfering with orb optics.
