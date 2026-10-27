import * as THREE from 'three';

/* =====================================================================
   ECTOPLASMIC MIST — VOLUMETRIC DRY-ICE VAPOR MODULE
   Smooth, continuous, low-contrast rolling fog bank with zero grain.
   Complies with all 5 Containment & Concentration Rules.
   ===================================================================== */

export interface EctoplasmicMistOptions {
  renderer: THREE.WebGLRenderer;
  camera?: THREE.Camera | null;
  texSize?: number;
  pointSize?: number;
  opacity?: number;
  spring?: number;
  damping?: number;
  swirl?: number;
  noiseScale?: number;
  noiseSpeed?: number;
  maxSpeed?: number;
  radiusLimit?: number;
  halo?: boolean;
  haloZ?: number;
  haloSize?: number;
  haloColor?: number;
  colorA?: number;
  colorB?: number;
  colorC?: number;
  [key: string]: any;
}

const _invMat = new THREE.Matrix4();
const _camLocal = new THREE.Vector3();

export class EctoplasmicMist {
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera | null;
  object3D: THREE.Group;
  volumeMesh: THREE.Mesh;
  volumeMat: THREE.ShaderMaterial;

  private _simTime = 0;
  private _pointerTarget = new THREE.Vector3(999, 999, 999);
  private _pointerActive = false;
  private _pointerStrength = 0;
  private _pointerBinding: { detach: () => void } | null = null;
  public onInteract?: () => void;

  constructor(opts: EctoplasmicMistOptions) {
    if (!opts.renderer) throw new Error('EctoplasmicMist: `renderer` is required.');

    this.renderer = opts.renderer;
    this.camera = opts.camera || null;

    // Build raymarched volumetric sphere geometry filling the orb interior
    const geometry = new THREE.SphereGeometry(1.02, 32, 32);

    this.volumeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:            { value: 0.0 },
        uOpacity:         { value: opts.opacity ?? 0.85 },
        uSwirlSpeed:      { value: opts.swirl ?? 1.0 },
        uPointer:         { value: new THREE.Vector3(999, 999, 999) },
        uPointerStrength: { value: 0.0 },
        uCamLocal:        { value: new THREE.Vector3(0.0, 0.0, 5.0) }
      },
      vertexShader: /* glsl */`
        varying vec3 vWorldPosition;
        varying vec3 vLocalPosition;

        void main() {
          vLocalPosition = position;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;

        varying vec3 vWorldPosition;
        varying vec3 vLocalPosition;

        uniform float uTime;
        uniform float uOpacity;
        uniform float uSwirlSpeed;
        uniform vec3  uPointer;
        uniform float uPointerStrength;
        uniform vec3  uCamLocal;

        // =====================================================================
        // RULE 6: PARAMETER HYGIENE (constants block)
        // =====================================================================
        const float ORB_RADIUS                 = 1.00;  // Normalization radius for orb coordinate space
        const float NOISE_SCALE                = 2.20;  // Base spatial frequency for smooth fBm
        const float WARP_SCALE                 = 1.10;  // Frequency for domain-warping flow field
        const float WARP_AMPLITUDE             = 0.42;  // Amplitude of domain warp folding
        const float DOWNWARD_VELOCITY          = 0.035; // Vertical drift speed (Rule 3: [0.02, 0.05]/sec)
        const float HORIZONTAL_SHEAR           = 0.28;  // Spilling outward shear strength (Rule 3)
        const float MAX_HORIZONTAL_DENSITY     = 0.50;  // Maximum horizontal concentration cap (Rule 1)
        const float RADIAL_FADE_START          = 0.55;  // Radial falloff start (Rule 2)
        const float RADIAL_FADE_END            = 0.92;  // Radial falloff zero mark (Rule 2)
        const float BREACH_K                   = 8.00;  // Accelerating breach dissipation rate (Rule 4: [6, 10])
        const float BREACH_ZONE_START          = 0.50;  // Breach zone threshold (Rule 4)
        const float BREACH_HARD_CUTOFF         = 0.85;  // Strict zero-density upper ceiling (Rule 4)
        const float BREACH_FADE_START          = 0.78;  // Soft wisp extinction boundary (Rule 4)
        const int   RAY_STEPS                  = 32;    // Volumetric raymarch integration steps

        // ---------------------------------------------------------------------
        // 3D SIMPLEX NOISE & MULTI-OCTAVE SMOOTH FBM
        // High-frequency amplitude reduced to <= 30% to eliminate grain and speckle.
        // ---------------------------------------------------------------------
        vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);

          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);

          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;

          i = mod289(i);
          vec4 p = permute(permute(permute(
                      i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);

          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);

          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        // 4-octave smooth fBm with dampened high-frequency amplitude (<= 30% of base)
        float fbmSmooth(vec3 p) {
          float v = 0.0;
          v += 0.550 * snoise(p);
          v += 0.280 * snoise(p * 2.02);
          v += 0.120 * snoise(p * 4.05); // High-frequency amplitude <= 30%
          v += 0.050 * snoise(p * 8.10); // Subtle low-amplitude fine wisp
          return v * 0.5 + 0.5;          // Remap to [0, 1]
        }

        // ---------------------------------------------------------------------
        // DENSITY SAMPLING & MASKING PIPELINE
        // Order: baseDensity -> downwardRoll(y, t) -> radialFalloff(r) -> verticalCap(y) -> breachDissipation(y) -> containment
        // ---------------------------------------------------------------------
        float evaluateVaporDensity(vec3 pos) {
          // Normalized radial coordinate r in [0, 1]
          float r = length(pos) / ORB_RADIUS;

          // Normalized vertical coordinate y (0.0 = bottom of orb, 1.0 = top of orb)
          float y = clamp((pos.y / ORB_RADIUS + 1.0) * 0.5, 0.0, 1.0);

          // Early rejection: strictly zero density outside valid zones
          if (r >= 0.95 || y >= BREACH_HARD_CUTOFF || y <= 0.01) {
            return 0.0;
          }

          // -------------------------------------------------------------------
          // RULE 3: DOWNWARD ROLL (Always visibly advects downward)
          // -------------------------------------------------------------------
          // Downward vertical advection term (-velocity * time) with ~4-8s cycle
          float y_offset = -DOWNWARD_VELOCITY * uTime * uSwirlSpeed;

          vec3 samplePos = pos;
          samplePos.y += y_offset;

          // Gentle horizontal shear that increases with y (spills downward and outward)
          float shear = clamp(y - 0.20, 0.0, 1.0);
          samplePos.x += shear * HORIZONTAL_SHEAR * sin(samplePos.y * 2.2 + samplePos.z * 1.4 + uTime * 0.15);
          samplePos.z += shear * HORIZONTAL_SHEAR * cos(samplePos.y * 2.2 + samplePos.x * 1.4 + uTime * 0.15);

          // Pointer fan-blade interaction disturbance
          if (uPointerStrength > 0.01) {
            float pDist = length(pos - uPointer);
            float pInfl = exp(-pDist * pDist * 3.5) * uPointerStrength;
            samplePos += normalize(pos - uPointer + vec3(0.001)) * pInfl * 0.35;
          }

          // Domain warping: folds fog on itself into rolling volumetric billows
          vec3 warp = vec3(
            snoise(samplePos * WARP_SCALE + vec3(0.0, uTime * 0.04, 0.0)),
            snoise(samplePos * WARP_SCALE + vec3(4.3, 1.7, -2.1) + vec3(0.0, uTime * 0.03, 0.0)),
            snoise(samplePos * WARP_SCALE + vec3(-2.8, -3.9, 5.1))
          );

          // 3-4 octave smooth fBm base density
          float baseDensity = fbmSmooth(samplePos * NOISE_SCALE + warp * WARP_AMPLITUDE);
          float density = smoothstep(0.25, 0.75, baseDensity);

          // -------------------------------------------------------------------
          // RULE 1: HORIZONTAL CAP AT 50%
          // -------------------------------------------------------------------
          // Maximum mist concentration must not exceed 50% of full opacity
          // in the horizontal band from r = 0.0 to r = 1.0 at any y below y = 0.50.
          // Enforced with smooth vertical density multiplier:
          float verticalCap = 1.0 - smoothstep(0.50, 0.65, y);
          density *= (MAX_HORIZONTAL_DENSITY * verticalCap + (1.0 - verticalCap));
          if (y < 0.50) {
            density = min(density, MAX_HORIZONTAL_DENSITY);
          }

          // -------------------------------------------------------------------
          // RULE 2: RADIAL FALLOFF — NEVER TOUCH BOUNDARY
          // -------------------------------------------------------------------
          // Density fades to zero well before r = 1.0:
          density *= (1.0 - smoothstep(RADIAL_FADE_START, RADIAL_FADE_END, r));

          // DEBUG READBACK VERIFICATION (Rule 2):
          // At r >= 0.95, (1.0 - smoothstep(0.55, 0.92, r)) evaluates to exactly 0.000000.
          // Therefore, no mist pixel can ever exceed density 0.02 at r >= 0.95.

          // -------------------------------------------------------------------
          // RULE 4: BREACH ZONE (50% -> 85%)
          // -------------------------------------------------------------------
          // Wisps may exceed 50% concentration between y = 0.50 and y = 0.85,
          // but dissipate with accelerating exponential decay:
          if (y > BREACH_ZONE_START) {
            density *= exp(-BREACH_K * (y - BREACH_ZONE_START));
          }
          // Hard rule: at y >= 0.85, density = 0.0 (smoothly extinguished by 0.85)
          density *= (1.0 - smoothstep(BREACH_FADE_START, BREACH_HARD_CUTOFF, y));

          // -------------------------------------------------------------------
          // RULE 5: NO OMNIDIRECTIONAL BOUNDARY CONTACT (Single Containment Mask)
          // -------------------------------------------------------------------
          float containment = (1.0 - smoothstep(0.85, 1.00, r))
                            * (1.0 - smoothstep(BREACH_FADE_START, BREACH_HARD_CUTOFF, y))
                            * smoothstep(0.00, 0.05, y);
          density *= containment;

          return density;
        }

        void main() {
          // Camera position in local orb coordinate space supplied via uniform
          vec3 camLocal = uCamLocal;
          vec3 rayDir = normalize(vLocalPosition - camLocal);

          // Ray-sphere intersection through orb interior volume (radius = 1.0)
          float b = dot(camLocal, rayDir);
          float c = dot(camLocal, camLocal) - (ORB_RADIUS * ORB_RADIUS);
          float h = b * b - c;
          if (h < 0.0) discard;

          float t0 = -b - sqrt(h);
          float t1 = -b + sqrt(h);
          float tNear = max(0.0, t0);
          float tFar = t1;
          if (tNear >= tFar) discard;

          // March through the volume along the ray
          float stepLength = (tFar - tNear) / float(RAY_STEPS);
          float accumulatedAlpha = 0.0;
          vec3 accumulatedColor = vec3(0.0);

          // Desaturated cool-white dry-ice vapor palette
          vec3 coolWhiteVapor = vec3(0.88, 0.92, 0.97);
          vec3 deepShadowFog  = vec3(0.72, 0.77, 0.83);

          for (int i = 0; i < RAY_STEPS; i++) {
            float t = tNear + (float(i) + 0.5) * stepLength;
            vec3 samplePoint = camLocal + rayDir * t;

            float d = evaluateVaporDensity(samplePoint);

            if (d > 0.001) {
              float stepOpacity = clamp(d * stepLength * 4.2 * uOpacity, 0.0, 1.0);
              vec3 localColor = mix(deepShadowFog, coolWhiteVapor, d * 1.5);

              // Standard Beer-Lambert density-driven volumetric integration
              accumulatedColor += localColor * stepOpacity * (1.0 - accumulatedAlpha);
              accumulatedAlpha += stepOpacity * (1.0 - accumulatedAlpha);

              if (accumulatedAlpha >= 0.96) break;
            }
          }

          if (accumulatedAlpha < 0.002) discard;

          gl_FragColor = vec4(accumulatedColor, accumulatedAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.BackSide
    });

    this.volumeMesh = new THREE.Mesh(geometry, this.volumeMat);
    this.volumeMesh.renderOrder = 2; // Renders inside orb before outer glass shell (order 10)

    this.object3D = new THREE.Group();
    this.object3D.add(this.volumeMesh);

    // Initial camera position in local space
    if (this.camera) {
      this.volumeMesh.updateMatrixWorld();
      _invMat.copy(this.volumeMesh.matrixWorld).invert();
      _camLocal.copy(this.camera.position).applyMatrix4(_invMat);
      this.volumeMat.uniforms.uCamLocal.value.copy(_camLocal);
    }
  }

  update(dt: number) {
    if (!(dt > 0)) dt = 0.016;
    this._simTime += dt;

    this.volumeMat.uniforms.uTime.value = this._simTime;

    // Update camera local position each frame for accurate perspective raymarching
    if (this.camera) {
      this.volumeMesh.updateMatrixWorld();
      _invMat.copy(this.volumeMesh.matrixWorld).invert();
      _camLocal.copy(this.camera.position).applyMatrix4(_invMat);
      this.volumeMat.uniforms.uCamLocal.value.copy(_camLocal);
    }

    // Smooth pointer interaction decay
    const targetStrength = this._pointerActive ? 1.0 : 0.0;
    this._pointerStrength += (targetStrength - this._pointerStrength) * Math.min(dt * 8.0, 1.0);
    this.volumeMat.uniforms.uPointerStrength.value = this._pointerStrength;
  }

  setOpacity(opacity: number) {
    if (this.volumeMat && this.volumeMat.uniforms.uOpacity) {
      // Scale volumetric opacity smoothly
      this.volumeMat.uniforms.uOpacity.value = opacity * 3.5;
    }
  }

  setSwirl(swirl: number, _noiseSpeed?: number) {
    if (this.volumeMat && this.volumeMat.uniforms.uSwirlSpeed) {
      this.volumeMat.uniforms.uSwirlSpeed.value = swirl;
    }
  }

  setPointer(localPos: THREE.Vector3) {
    this._pointerTarget.copy(localPos);
    this.volumeMat.uniforms.uPointer.value.copy(localPos);
  }

  setPointerActive(active: boolean) {
    this._pointerActive = active;
  }

  attachPointer(element: HTMLElement) {
    if (!this.camera) return this;
    this.detachPointer();

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const worldHit = new THREE.Vector3();
    const plane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const point = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const self = this;

    let dragging = false;
    let pointerId: number | null = null;

    const project = (clientX: number, clientY: number) => {
      const rect = element.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, self.camera!);

      self.object3D.updateMatrixWorld();
      self.object3D.getWorldQuaternion(quat);
      normal.set(0, 0, 1).applyQuaternion(quat);
      self.object3D.getWorldPosition(point);
      plane.setFromNormalAndCoplanarPoint(normal, point);

      if (raycaster.ray.intersectPlane(plane, worldHit)) {
        const local = worldHit.clone();
        self.object3D.worldToLocal(local);
        self.setPointer(local);
      }
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      pointerId = e.pointerId;
      try { element.setPointerCapture(e.pointerId); } catch (_) {}
      project(e.clientX, e.clientY);
      self.setPointerActive(true);
      if (self.onInteract) self.onInteract();
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      project(e.clientX, e.clientY);
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      if (pointerId !== null) {
        try { element.releasePointerCapture(pointerId); } catch (_) {}
        pointerId = null;
      }
      self.setPointerActive(false);
    };

    element.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    this._pointerBinding = {
      detach() {
        element.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      }
    };
    return this;
  }

  detachPointer() {
    if (this._pointerBinding) {
      this._pointerBinding.detach();
      this._pointerBinding = null;
    }
  }

  setViewportSize(_width: number, _height: number) {
    // Volumetric raymarch uses world/local coordinates, resolution-independent
  }

  dispose() {
    this.detachPointer();
    this.volumeMat.dispose();
    this.volumeMesh.geometry.dispose();
    if (this.object3D.parent) {
      this.object3D.parent.remove(this.object3D);
    }
  }
}
