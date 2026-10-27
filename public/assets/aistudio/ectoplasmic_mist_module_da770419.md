Ectoplasmic Mist — Integrable Module

Below is a self-contained ES module that plugs into an existing Three.js app. It exposes a THREE.Group you add to your scene, an update(dt) you call each frame, optional pointer binding, and a post-processing shader for cases where you need correct alpha over a transparent canvas.

```js
/* =====================================================================
   ectoplasmic-mist.js
   A semi-transparent, swirling ectoplasmic mist that:
     - stays cohesive (soft spring toward a "home" shape)
     - churns with a curl-like noise field
     - responds to pointer drags like a fan blade through thick smoke
     - glows additively with no visible light source

   Usage:
     import { EctoplasmicMist, AlphaFromGlowShader } from './ectoplasmic-mist.js';

     const mist = new EctoplasmicMist({ renderer, camera });
     scene.add(mist.object3D);
     mist.attachPointer(renderer.domElement);

     // in your loop
     mist.update(clock.getDelta());

     // on resize
     mist.setViewportSize(innerWidth, innerHeight);
   ===================================================================== */

import * as THREE from 'three';

/* ---------------------------------------------------------------------
   Fullscreen quad vertex shader (all simulation passes)
   --------------------------------------------------------------------- */
const QUAD_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* ---------------------------------------------------------------------
   Simplex 3D noise  (Ashima Arts / Stefan Gustavson, MIT)
   --------------------------------------------------------------------- */
const NOISE_GLSL = /* glsl */`
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
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
  vec3  ns = n_ * D.wyz - D.xzx;

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

/* ---------------------------------------------------------------------
   Post-process shader: reconstructs alpha from additive glow luminance.
   Only needed if you composite the mist over a transparent canvas.
   Add it as the LAST pass in an EffectComposer.
   --------------------------------------------------------------------- */
export const AlphaFromGlowShader = {
  name: 'EctoplasmicAlphaFromGlow',
  uniforms: {
    tDiffuse: { value: null },
    uGain:    { value: 1.5 },   // overall opacity of the glow
    uGamma:   { value: 0.8 }    // <1 = thicker core, >1 = more diaphanous
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uGain;
    uniform float uGamma;

    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float m = max(max(c.r, c.g), c.b);
      float a = clamp(m * uGain, 0.0, 1.0);
      a = pow(a, uGamma);
      gl_FragColor = vec4(c, a);
    }
  `
};

/* ---------------------------------------------------------------------
   Temporary scratch objects (module-level, update() is not reentrant)
   --------------------------------------------------------------------- */
const _v1 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();


export class EctoplasmicMist {
  /* Static convenience for post-processing chains */
  static AlphaFromGlowShader = AlphaFromGlowShader;

  /**
   * @param {Object}  opts
   * @param {THREE.WebGLRenderer} opts.renderer  required — used for GPU sim
   * @param {THREE.Camera}       [opts.camera]   used for pointer math & point scaling
   * @param {number}             [opts.texSize=256]  simulation grid resolution
   * @param {boolean}            [opts.halo=true]    include a soft background glow sprite
   * @param {number}             [opts.haloZ=-2]     halo plane depth in group space
   * @param {number}             [opts.haloSize=15]  halo plane size
   * @param {number}             [opts.haloColor=0x3fd0ff]
   * @param {number}             [opts.pointSize=0.048]
   * @param {number}             [opts.opacity=0.055]
   * @param {number}             [opts.colorA=0x2fa8ff]  cool core
   * @param {number}             [opts.colorB=0xb27bff]  violet fringe
   * @param {number}             [opts.colorC=0xa8fff2]  ecto-white
   * @param {number}             [opts.spring=3.0]       cohesion (higher = firmer)
   * @param {number}             [opts.damping=1.5]      smoke drag
   * @param {number}             [opts.swirl=1.35]       turbulence strength
   * @param {number}             [opts.noiseScale=0.62]
   * @param {number}             [opts.noiseSpeed=0.14]
   * @param {number}             [opts.maxSpeed=15.0]
   */
  constructor(opts = {}) {
    const {
      renderer,
      camera = null,
      texSize = 256,
      halo = true,
      haloZ = -2.0,
      haloSize = 15.0,
      haloColor = 0x3fd0ff,
      pointSize = 0.048,
      opacity = 0.055,
      colorA = 0x2fa8ff,
      colorB = 0xb27bff,
      colorC = 0xa8fff2,
      spring = 3.0,
      damping = 1.5,
      swirl = 1.35,
      noiseScale = 0.62,
      noiseSpeed = 0.14,
      maxSpeed = 15.0
    } = opts;

    if (!renderer) throw new Error('EctoplasmicMist: `renderer` is required.');

    this.renderer = renderer;
    this.camera = camera;
    this.texSize = texSize;
    this.count = texSize * texSize;

    this._simTime = 0;

    /* -- pointer state -- */
    this._pointerTarget = new THREE.Vector3(999, 999, 999);
    this._pointerPrev   = new THREE.Vector3(999, 999, 999);
    this._pointerVel    = new THREE.Vector3();
    this._pointerActive = false;
    this._pointerStrength = 0;
    this._pointerBinding = null;

    /* -- build everything -- */
    this._buildHome();
    this._createTargets();
    this._buildSimScene();
    this._buildSimMaterials({ spring, damping, swirl, noiseScale, noiseSpeed, maxSpeed });
    this._buildRenderMaterial({ pointSize, opacity, colorA, colorB, colorC });
    this._buildPoints();

    this.object3D = new THREE.Group();
    this.object3D.add(this.points);

    if (halo) {
      this._buildHalo(haloZ, haloSize, haloColor);
      this.object3D.add(this.halo);
    }

    this.setViewportSize(window.innerWidth, window.innerHeight);
    this._initTargets();
  }

  /* ===================================================================
     PUBLIC API
     =================================================================== */

  /**
   * Advance the simulation. Call once per frame BEFORE rendering your scene.
   * @param {number} dt  delta time in seconds
   */
  update(dt) {
    if (!(dt > 0)) dt = 0.016;
    const d = Math.min(Math.max(dt, 0.0005), 1 / 30);
    this._simTime += d;

    /* ---------- pointer velocity ---------- */
    if (this._pointerPrev.lengthSq() > 1e6) {
      // snap sentinel -> real on first frame of a drag
      this._pointerPrev.copy(this._pointerTarget);
      this._pointerVel.set(0, 0, 0);
    }

    if (this._pointerActive) {
      _v1.copy(this._pointerTarget).sub(this._pointerPrev).divideScalar(d);
      const len = _v1.length();
      if (len > 45) _v1.multiplyScalar(45 / len);
      const blend = 1 - Math.pow(0.62, d * 60);
      this._pointerVel.lerp(_v1, blend);
    } else {
      this._pointerVel.multiplyScalar(Math.exp(-9.0 * d));
    }
    this._pointerPrev.copy(this._pointerTarget);

    const targetStrength = this._pointerActive ? 1.0 : 0.0;
    this._pointerStrength += (targetStrength - this._pointerStrength)
                           * (1 - Math.exp(-11.0 * d));

    /* ---------- simulation (GPU ping-pong) ---------- */
    this._runSim(d);

    /* ---------- hand new positions to the render material ---------- */
    this.pointsMat.uniforms.uPos.value = this.posA.texture;

    const pSpeed = this._pointerVel.length();
    this.pointsMat.uniforms.uGlow.value +=
      (Math.min(pSpeed / 22, 1) - this.pointsMat.uniforms.uGlow.value) * 0.08;

    /* ---------- halo ---------- */
    if (this.halo) {
      this.haloMat.uniforms.uPulse.value =
        Math.sin(this._simTime * 0.9) * 0.35 + Math.min(pSpeed / 26, 1) * 0.9;
      this.halo.scale.setScalar(1.0 + Math.sin(this._simTime * 0.55) * 0.03);

      if (this.camera) {
        this.object3D.updateMatrixWorld();
        this.object3D.getWorldQuaternion(_q1).invert();
        _q2.copy(this.camera.quaternion);
        this.halo.quaternion.copy(_q2).premultiply(_q1);
      }
    }
  }

  /**
   * Set the pointer position in the mist's local space.
   * Called automatically by attachPointer().
   */
  setPointer(localPos) {
    this._pointerTarget.copy(localPos);
  }

  /** Begin / end an interaction. Called automatically by attachPointer(). */
  setPointerActive(active) {
    this._pointerActive = active;
    if (active && this._pointerPrev.lengthSq() > 1e6) {
      this._pointerPrev.copy(this._pointerTarget);
      this._pointerVel.set(0, 0, 0);
    }
  }

  /**
   * Convenience: bind pointerdown/move/up on a DOM element, projecting onto
   * the mist's local XY plane. Requires `camera` in the constructor.
   * @returns {EctoplasmicMist} this
   */
  attachPointer(element) {
    if (!this.camera) throw new Error('EctoplasmicMist.attachPointer requires a camera.');
    this.detachPointer();

    const raycaster = new THREE.Raycaster();
    const ndc       = new THREE.Vector2();
    const worldHit  = new THREE.Vector3();
    const plane     = new THREE.Plane();
    const normal    = new THREE.Vector3();
    const point     = new THREE.Vector3();
    const quat      = new THREE.Quaternion();
    const self      = this;

    let dragging   = false;
    let pointerId  = null;

    function project(clientX, clientY) {
      const rect = element.getBoundingClientRect();
      ndc.x =  ((clientX - rect.left) / rect.width)  * 2 - 1;
      ndc.y = -((clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, self.camera);

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
    }

    function onDown(e) {
      dragging  = true;
      pointerId = e.pointerId;
      try { element.setPointerCapture(e.pointerId); } catch (_) {}
      project(e.clientX, e.clientY);
      self.setPointerActive(true);
      if (self.onInteract) self.onInteract();
    }
    function onMove(e) {
      if (!dragging) return;
      project(e.clientX, e.clientY);
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      try { element.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
      self.setPointerActive(false);
    }

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

  /**
   * Update point-size scaling on canvas resize.
   * @param {number} width   CSS pixels
   * @param {number} height  CSS pixels
   */
  setViewportSize(width, height) {
    const fov = this.camera ? this.camera.fov : 50;
    const pixelRatio = this.renderer.getPixelRatio();
    const pxHeight = height * pixelRatio;
    this.pointsMat.uniforms.uScale.value =
      (pxHeight * 0.5) / Math.tan(fov * 0.5 * Math.PI / 180);
  }

  dispose() {
    this.detachPointer();

    this._initMat.dispose();
    this._zeroMat.dispose();
    this.velocityMat.dispose();
    this.positionMat.dispose();
    this.pointsMat.dispose();
    if (this.haloMat) this.haloMat.dispose();

    this.homeTex.dispose();
    this.posA.dispose(); this.posB.dispose();
    this.velA.dispose(); this.velB.dispose();

    this.points.geometry.dispose();
    this.simQuad.geometry.dispose();
    if (this.halo) this.halo.geometry.dispose();

    if (this.object3D.parent) this.object3D.parent.remove(this.object3D);
  }

  /* ===================================================================
     INTERNALS
     =================================================================== */

  _buildHome() {
    const { texSize, count } = this;
    const data = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      const o = i * 4;

      const u  = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r  = Math.cbrt(Math.random());
      const s  = Math.sqrt(Math.max(0, 1 - u * u));

      let x = s * Math.cos(th) * r;
      let y = u * r;
      let z = s * Math.sin(th) * r;

      x *= 2.25; y *= 1.65; z *= 2.05;

      const n = 1.0
        + 0.22 * Math.sin(x * 2.3 + y * 1.7 + 1.3) * Math.cos(z * 1.9 - y * 1.1 + 0.7)
        + 0.13 * Math.sin(z * 3.7 + x * 2.1 + 2.2);
      x *= n; y *= n; z *= n;

      data[o    ] = x;
      data[o + 1] = y;
      data[o + 2] = z;
      data[o + 3] = Math.random();
    }

    this._homeData = data;
    this.homeTex = new THREE.DataTexture(
      data, texSize, texSize, THREE.RGBAFormat, THREE.FloatType
    );
    this.homeTex.minFilter = THREE.NearestFilter;
    this.homeTex.magFilter = THREE.NearestFilter;
    this.homeTex.needsUpdate = true;
  }

  _createTargets() {
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
    this.posA = make(); this.posB = make();
    this.velA = make(); this.velB = make();
  }

  _buildSimScene() {
    this.simScene = new THREE.Scene();
    this.simCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.simQuad  = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
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

  _buildSimMaterials({ spring, damping, swirl, noiseScale, noiseSpeed, maxSpeed }) {
    this.velocityMat = new THREE.ShaderMaterial({
      uniforms: {
        uPos:             { value: null },
        uVel:             { value: null },
        uHome:            { value: this.homeTex },
        uTime:            { value: 0 },
        uDt:              { value: 0.016 },
        uSpring:          { value: spring },
        uDamping:         { value: damping },
        uSwirl:           { value: swirl },
        uNoiseScale:      { value: noiseScale },
        uNoiseSpeed:      { value: noiseSpeed },
        uMaxSpeed:        { value: maxSpeed },
        uPointer:         { value: new THREE.Vector3(999, 999, 999) },
        uPointerVel:      { value: new THREE.Vector3() },
        uPointerStrength: { value: 0.0 }
      },
      vertexShader: QUAD_VERT,
      fragmentShader: /* glsl */`
        precision highp float;
        varying vec2 vUv;

        uniform sampler2D uPos, uVel, uHome;
        uniform float uTime, uDt, uSpring, uDamping, uSwirl;
        uniform float uNoiseScale, uNoiseSpeed, uMaxSpeed, uPointerStrength;
        uniform vec3  uPointer, uPointerVel;

        ${NOISE_GLSL}

        void main() {
          vec3  pos  = texture2D(uPos,  vUv).xyz;
          vec3  vel  = texture2D(uVel,  vUv).xyz;
          vec4  hS   = texture2D(uHome, vUv);
          vec3  home = hS.xyz;
          float seed = hS.w;

          /* curl-like flow field */
          vec3 np = pos * uNoiseScale
                  + vec3(seed * 3.7, uTime * uNoiseSpeed, uTime * uNoiseSpeed * 0.63);
          vec3 n1 = vec3(
            snoise(np),
            snoise(np + vec3( 17.3,  5.1,  9.2)),
            snoise(np + vec3( -8.7, 21.4, -3.6))
          );
          vec3 np2 = np * 2.13 + vec3(0.0, uTime * 0.21, 0.0);
          vec3 n2 = vec3(
            snoise(np2),
            snoise(np2 + vec3( 31.7,  7.3, 12.9)),
            snoise(np2 + vec3( -5.2, 14.8, 27.1))
          );
          vec3 flow = n1 + n2 * 0.45;

          vec3 axis  = normalize(pos + vec3(0.0001));
          vec3 swirl = cross(flow, axis) * uSwirl;
          vec3 circulation = cross(vec3(0.0, 1.0, 0.0), pos) * 0.24;

          vel += (swirl + circulation) * uDt;

          /* cohesion toward the resting shape — keeps the mass together */
          vel += (home - pos) * uSpring * uDt;

          /* pointer / fan-blade interaction */
          float pSpeed = length(uPointerVel);
          float d      = length(pos - uPointer);
          float infl   = exp(-d * d * 0.20);
          vec3  radial = normalize(pos - uPointer + vec3(0.0001));

          vec3 localPush = uPointerVel + radial * pSpeed * 0.42;
          vel += localPush * infl * uPointerStrength * uDamping * 0.52 * uDt;

          /* whole-mass lurch with the drag */
          vel += uPointerVel * uPointerStrength * uDamping * 0.085 * uDt;

          /* drag + clamp */
          vel *= exp(-uDamping * uDt);
          float sp = length(vel);
          if (sp > uMaxSpeed) vel *= uMax