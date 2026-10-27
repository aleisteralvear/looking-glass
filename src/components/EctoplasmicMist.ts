import * as THREE from 'three';

/* ---------------------------------------------------------------------
   Fullscreen quad vertex shader (simulation passes)
   --------------------------------------------------------------------- */
const QUAD_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* ---------------------------------------------------------------------
   Simplex 3D noise (Ashima Arts / Stefan Gustavson, MIT)
   --------------------------------------------------------------------- */
const NOISE_GLSL = /* glsl */`
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
`;

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
}

export class EctoplasmicMist {
  renderer: THREE.WebGLRenderer;
  camera: THREE.Camera | null;
  texSize: number;
  count: number;
  object3D: THREE.Group;
  points!: THREE.Points;
  pointsMat!: THREE.ShaderMaterial;

  private _simTime = 0;
  private homeTex!: THREE.DataTexture;
  private posA!: THREE.WebGLRenderTarget;
  private posB!: THREE.WebGLRenderTarget;
  private velA!: THREE.WebGLRenderTarget;
  private velB!: THREE.WebGLRenderTarget;

  private simScene!: THREE.Scene;
  private simCam!: THREE.OrthographicCamera;
  private simQuad!: THREE.Mesh;
  private _initMat!: THREE.ShaderMaterial;
  private _zeroMat!: THREE.ShaderMaterial;
  private velocityMat!: THREE.ShaderMaterial;
  private positionMat!: THREE.ShaderMaterial;

  private _pointerTarget = new THREE.Vector3(999, 999, 999);
  private _pointerPrev = new THREE.Vector3(999, 999, 999);
  private _pointerVel = new THREE.Vector3();
  private _pointerActive = false;
  private _pointerStrength = 0;
  private _pointerBinding: { detach: () => void } | null = null;
  public onInteract?: () => void;

  constructor(opts: EctoplasmicMistOptions) {
    if (!opts.renderer) throw new Error('EctoplasmicMist: `renderer` is required.');

    const {
      renderer,
      camera = null,
      texSize = 192, // 36,864 particles for silky volumetric ribbon density
      pointSize = 0.055,
      opacity = 0.16,
      spring = 2.4,
      damping = 1.35,
      swirl = 1.45,
      noiseScale = 0.75,
      noiseSpeed = 0.16,
      maxSpeed = 14.0,
      radiusLimit = 0.98 // Strictly contained inside 1.12-radius glass sphere
    } = opts;

    this.renderer = renderer;
    this.camera = camera;
    this.texSize = texSize;
    this.count = texSize * texSize;

    this._buildHome(radiusLimit);
    this._createTargets();
    this._buildSimScene();
    this._buildSimMaterials({ spring, damping, swirl, noiseScale, noiseSpeed, maxSpeed, radiusLimit });
    this._buildRenderMaterial({ pointSize, opacity });
    this._buildPoints();

    this.object3D = new THREE.Group();
    this.object3D.add(this.points);

    this._initTargets();
  }

  update(dt: number) {
    if (!(dt > 0)) dt = 0.016;
    const d = Math.min(Math.max(dt, 0.0005), 1 / 30);
    this._simTime += d;

    /* ---------- pointer velocity ---------- */
    if (this._pointerPrev.lengthSq() > 1e6) {
      this._pointerPrev.copy(this._pointerTarget);
      this._pointerVel.set(0, 0, 0);
    }

    if (this._pointerActive) {
      const v = new THREE.Vector3().copy(this._pointerTarget).sub(this._pointerPrev).divideScalar(d);
      const len = v.length();
      if (len > 45) v.multiplyScalar(45 / len);
      const blend = 1 - Math.pow(0.62, d * 60);
      this._pointerVel.lerp(v, blend);
    } else {
      this._pointerVel.multiplyScalar(Math.exp(-9.0 * d));
    }
    this._pointerPrev.copy(this._pointerTarget);

    const targetStrength = this._pointerActive ? 1.0 : 0.0;
    this._pointerStrength += (targetStrength - this._pointerStrength) * (1 - Math.exp(-11.0 * d));

    /* ---------- simulation (GPU ping-pong) ---------- */
    this._runSim(d);

    /* ---------- hand new positions to the render material ---------- */
    this.pointsMat.uniforms.uPos.value = this.posA.texture;
    this.pointsMat.uniforms.uTime.value = this._simTime;

    const pSpeed = this._pointerVel.length();
    this.pointsMat.uniforms.uGlow.value += (Math.min(pSpeed / 20, 1) - this.pointsMat.uniforms.uGlow.value) * 0.08;
  }

  setOpacity(opacity: number) {
    if (this.pointsMat && this.pointsMat.uniforms.uOpacity) {
      this.pointsMat.uniforms.uOpacity.value = opacity;
    }
  }

  setSwirl(swirl: number, noiseSpeed?: number) {
    if (this.velocityMat && this.velocityMat.uniforms.uSwirl) {
      this.velocityMat.uniforms.uSwirl.value = swirl;
      if (noiseSpeed !== undefined) {
        this.velocityMat.uniforms.uNoiseSpeed.value = noiseSpeed;
      }
    }
  }

  setPointer(localPos: THREE.Vector3) {
    this._pointerTarget.copy(localPos);
  }

  setPointerActive(active: boolean) {
    this._pointerActive = active;
    if (active && this._pointerPrev.lengthSq() > 1e6) {
      this._pointerPrev.copy(this._pointerTarget);
      this._pointerVel.set(0, 0, 0);
    }
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

  setViewportSize(width: number, height: number) {
    const fov = (this.camera as THREE.PerspectiveCamera)?.fov || 50;
    const pixelRatio = this.renderer.getPixelRatio ? this.renderer.getPixelRatio() : 1;
    const pxHeight = height * pixelRatio;
    this.pointsMat.uniforms.uScale.value = (pxHeight * 0.5) / Math.tan(fov * 0.5 * Math.PI / 180);
  }

  dispose() {
    this.detachPointer();

    if (this._initMat) this._initMat.dispose();
    if (this._zeroMat) this._zeroMat.dispose();
    if (this.velocityMat) this.velocityMat.dispose();
    if (this.positionMat) this.positionMat.dispose();
    if (this.pointsMat) this.pointsMat.dispose();

    if (this.homeTex) this.homeTex.dispose();
    if (this.posA) this.posA.dispose();
    if (this.posB) this.posB.dispose();
    if (this.velA) this.velA.dispose();
    if (this.velB) this.velB.dispose();

    if (this.points && this.points.geometry) this.points.geometry.dispose();
    if (this.simQuad && this.simQuad.geometry) this.simQuad.geometry.dispose();

    if (this.object3D.parent) this.object3D.parent.remove(this.object3D);
  }

  /* ===================================================================
     INTERNALS
     =================================================================== */

  private _buildHome(maxRadius: number) {
    const { texSize, count } = this;
    const data = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      const o = i * 4;

      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      // Radial distribution concentrated into organic volumetric folds within the orb
      const r = Math.pow(Math.random(), 0.65) * (maxRadius * 0.88);
      const s = Math.sqrt(Math.max(0, 1 - u * u));

      let x = s * Math.cos(th) * r;
      let y = u * r;
      let z = s * Math.sin(th) * r;

      // Subtle initial curl perturbation for natural smoke eddies
      const n = 1.0 + 0.15 * Math.sin(x * 3.5 + y * 2.8 + z * 2.2);
      x *= n;
      y *= n;
      z *= n;

      data[o]     = x;
      data[o + 1] = y;
      data[o + 2] = z;
      data[o + 3] = Math.random(); // Unique particle phase seed
    }

    this.homeTex = new THREE.DataTexture(
      data,
      texSize,
      texSize,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.homeTex.minFilter = THREE.NearestFilter;
    this.homeTex.magFilter = THREE.NearestFilter;
    this.homeTex.needsUpdate = true;
  }

  private _createTargets() {
    const make = () => {
      const rt = new THREE.WebGLRenderTarget(this.texSize, this.texSize, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        depthBuffer: false,
        stencilBuffer: false,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping
      });
      rt.texture.generateMipmaps = false;
      return rt;
    };
    this.posA = make();
    this.posB = make();
    this.velA = make();
    this.velB = make();
  }

  private _buildSimScene() {
    this.simScene = new THREE.Scene();
    this.simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.simQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.simQuad.frustumCulled = false;
    this.simScene.add(this.simQuad);

    this._initMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: this.homeTex } },
      vertexShader: QUAD_VERT,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTex;
        void main() { gl_FragColor = texture2D(uTex, vUv); }
      `
    });

    this._zeroMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: /* glsl */`
        precision highp float;
        void main() { gl_FragColor = vec4(0.0); }
      `
    });
  }

  private _buildSimMaterials({ spring, damping, swirl, noiseScale, noiseSpeed, maxSpeed, radiusLimit }: any) {
    this.velocityMat = new THREE.ShaderMaterial({
      uniforms: {
        uPos:             { value: null },
        uVel:             { value: null },
        uHome:            { value: this.homeTex },
        uTime:            { value: 0 },
        uDt:              { value: 0.016 },
        uSpring:          { value: spring },
        uDamping:         { value: damping },
        uSwirl:           { value: swirl },
        uNoiseScale:      { value: noiseScale },
        uNoiseSpeed:      { value: noiseSpeed },
        uMaxSpeed:        { value: maxSpeed },
        uRadiusLimit:     { value: radiusLimit },
        uPointer:         { value: new THREE.Vector3(999, 999, 999) },
        uPointerVel:      { value: new THREE.Vector3() },
        uPointerStrength: { value: 0.0 }
      },
      vertexShader: QUAD_VERT,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec2 vUv;

        uniform sampler2D uPos, uVel, uHome;
        uniform float uTime, uDt, uSpring, uDamping, uSwirl;
        uniform float uNoiseScale, uNoiseSpeed, uMaxSpeed, uRadiusLimit, uPointerStrength;
        uniform vec3  uPointer, uPointerVel;

        ${NOISE_GLSL}

        void main() {
          vec3  pos  = texture2D(uPos,  vUv).xyz;
          vec3  vel  = texture2D(uVel,  vUv).xyz;
          vec4  hS   = texture2D(uHome, vUv);
          vec3  home = hS.xyz;
          float seed = hS.w;

          /* High-fidelity multi-octave curl flow field */
          vec3 np = pos * uNoiseScale
                  + vec3(seed * 4.3, uTime * uNoiseSpeed, uTime * uNoiseSpeed * 0.72);
          vec3 n1 = vec3(
            snoise(np),
            snoise(np + vec3(17.3,  5.1,  9.2)),
            snoise(np + vec3(-8.7, 21.4, -3.6))
          );
          vec3 np2 = np * 2.2 + vec3(0.0, uTime * 0.22, 0.0);
          vec3 n2 = vec3(
            snoise(np2),
            snoise(np2 + vec3(31.7,  7.3, 12.9)),
            snoise(np2 + vec3(-5.2, 14.8, 27.1))
          );
          vec3 flow = n1 + n2 * 0.55;

          /* Organic curling smoke vortices */
          vec3 axis  = normalize(pos + vec3(0.0001));
          vec3 swirl = cross(flow, axis) * uSwirl;
          vec3 circulation = cross(vec3(0.0, 1.0, 0.0), pos) * 0.32;

          /* Subtle thermal convection buoyancy from the base */
          vec3 thermal = vec3(0.0, 0.28, 0.0) * (1.0 - smoothstep(-0.4, 0.7, pos.y));

          vel += (swirl + circulation + thermal) * uDt;

          /* Cohesion toward home anchor keeps the smoke mass cohesive */
          vel += (home - pos) * uSpring * uDt;

          /* Interactive pointer fan-blade drag */
          float pSpeed = length(uPointerVel);
          float d      = length(pos - uPointer);
          float infl   = exp(-d * d * 0.25);
          vec3  radial = normalize(pos - uPointer + vec3(0.0001));

          vec3 localPush = uPointerVel + radial * pSpeed * 0.45;
          vel += localPush * infl * uPointerStrength * uDamping * 0.55 * uDt;
          vel += uPointerVel * uPointerStrength * uDamping * 0.09 * uDt;

          /* Soft inward bounce from orb radius boundary */
          float r = length(pos);
          if (r > uRadiusLimit * 0.85) {
            vec3 outward = pos / r;
            float penetration = (r - uRadiusLimit * 0.85) / (uRadiusLimit * 0.15);
            vel -= outward * penetration * 4.5 * uDt;
          }

          /* Fluid drag + speed clamp */
          vel *= exp(-uDamping * uDt);
          float sp = length(vel);
          if (sp > uMaxSpeed) vel *= (uMaxSpeed / sp);

          gl_FragColor = vec4(vel, 0.0);
        }
      `
    });

    this.positionMat = new THREE.ShaderMaterial({
      uniforms: {
        uPos:         { value: null },
        uVel:         { value: null },
        uDt:          { value: 0.016 },
        uRadiusLimit: { value: radiusLimit }
      },
      vertexShader: QUAD_VERT,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uPos, uVel;
        uniform float uDt, uRadiusLimit;

        void main() {
          vec4 pData = texture2D(uPos, vUv);
          vec3 pos = pData.xyz;
          vec3 vel = texture2D(uVel, vUv).xyz;
          pos += vel * uDt;

          // Strict spherical boundary clamp: particles strictly bounce inward at the glass shell boundary
          float r = length(pos);
          if (r > uRadiusLimit) {
            pos = normalize(pos) * (uRadiusLimit - 0.015);
          }

          gl_FragColor = vec4(pos, pData.w);
        }
      `
    });
  }

  private _buildRenderMaterial({ pointSize, opacity }: any) {
    this.pointsMat = new THREE.ShaderMaterial({
      uniforms: {
        uPos:       { value: null },
        uScale:     { value: 500.0 },
        uPointSize: { value: pointSize },
        uOpacity:   { value: opacity },
        uGlow:      { value: 0.0 },
        uTime:      { value: 0.0 }
      },
      vertexShader: /* glsl */`
        precision highp float;
        uniform sampler2D uPos;
        uniform float uScale, uPointSize, uGlow, uTime;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec4 pData = texture2D(uPos, uv);
          vec3 pos = pData.xyz;
          float seed = pData.w;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Volumetric ribbon sizing with organic flutter
          float pSize = uPointSize * (1.0 + 0.35 * sin(seed * 6.28 + uTime * 2.2));
          gl_PointSize = clamp((pSize * uScale) / -mvPosition.z, 2.0, 72.0);

          /* ===================================================================
             ECTOPLASMIC SMOKE PALETTE (Exact match to reference photograph):
             - Base (y < -0.3): Glowing warm neon magenta / rose pink
             - Mid Body: Deep violet & royal purple
             - Swirling Crests: Electric cyan & neon turquoise
             - Core Highlights: Ethereal celestial white & sky blue
             =================================================================== */
          float h = clamp((pos.y + 0.85) / 1.7, 0.0, 1.0);
          
          vec3 pinkBase = vec3(1.0, 0.22, 0.62);    // Neon magenta / pink at bottom
          vec3 violetMid = vec3(0.62, 0.18, 0.98);  // Electric violet
          vec3 cyanCrest = vec3(0.0, 0.92, 1.0);    // Luminous turquoise / cyan
          vec3 whitePeak = vec3(0.92, 0.98, 1.0);   // Ethereal highlight

          // Vertical & curl gradient blending
          vec3 col = mix(pinkBase, violetMid, smoothstep(0.05, 0.42, h));
          col = mix(col, cyanCrest, smoothstep(0.38, 0.82, h));

          // Highlight filaments based on curl seed and time
          float ribbonShine = smoothstep(0.62, 0.98, sin(seed * 11.0 + pos.y * 3.5 + uTime * 0.8) * 0.5 + 0.5);
          col = mix(col, whitePeak, ribbonShine * 0.65);
          col += uGlow * 0.45;

          vColor = col;

          // Edge falloff near orb boundary
          float r = length(pos);
          float edgeFade = smoothstep(0.98, 0.82, r);
          vAlpha = edgeFade * (0.65 + 0.35 * sin(seed * 6.28));
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float d2 = dot(coord, coord);
          if (d2 > 0.25) discard;

          // Soft Gaussian exponential curve creates smooth, silky fluid smoke sheets
          float radial = exp(-d2 * 8.5);
          float a = radial * vAlpha * uOpacity;
          if (a < 0.001) discard;

          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private _buildPoints() {
    const { texSize, count } = this;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
      const x = (i % texSize) / texSize;
      const y = Math.floor(i / texSize) / texSize;
      uvs[i * 2]     = x + 0.5 / texSize;
      uvs[i * 2 + 1] = y + 0.5 / texSize;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    this.points = new THREE.Points(geometry, this.pointsMat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2; // Renders inside orb before outer glass shell (order 10)
  }

  private _initTargets() {
    const currentRenderTarget = this.renderer.getRenderTarget();

    this.simQuad.material = this._initMat;
    this.renderer.setRenderTarget(this.posA);
    this.renderer.render(this.simScene, this.simCam);
    this.renderer.setRenderTarget(this.posB);
    this.renderer.render(this.simScene, this.simCam);

    this.simQuad.material = this._zeroMat;
    this.renderer.setRenderTarget(this.velA);
    this.renderer.render(this.simScene, this.simCam);
    this.renderer.setRenderTarget(this.velB);
    this.renderer.render(this.simScene, this.simCam);

    this.renderer.setRenderTarget(currentRenderTarget);
  }

  private _runSim(d: number) {
    const currentRenderTarget = this.renderer.getRenderTarget();

    // 1. Velocity ping-pong pass
    this.velocityMat.uniforms.uPos.value = this.posA.texture;
    this.velocityMat.uniforms.uVel.value = this.velA.texture;
    this.velocityMat.uniforms.uDt.value = d;
    this.velocityMat.uniforms.uTime.value = this._simTime;

    this.simQuad.material = this.velocityMat;
    this.renderer.setRenderTarget(this.velB);
    this.renderer.render(this.simScene, this.simCam);

    const tmpV = this.velA;
    this.velA = this.velB;
    this.velB = tmpV;

    // 2. Position ping-pong pass
    this.positionMat.uniforms.uPos.value = this.posA.texture;
    this.positionMat.uniforms.uVel.value = this.velA.texture;
    this.positionMat.uniforms.uDt.value = d;

    this.simQuad.material = this.positionMat;
    this.renderer.setRenderTarget(this.posB);
    this.renderer.render(this.simScene, this.simCam);

    const tmpP = this.posA;
    this.posA = this.posB;
    this.posB = tmpP;

    this.renderer.setRenderTarget(currentRenderTarget);
  }
}
