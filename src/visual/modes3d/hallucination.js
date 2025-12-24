import * as THREE from 'three'
import { Visualization3DMode } from './base.js'

/**
 * HALLUCINATION MODE
 *
 * Neural Cellular Automata + Feedback Loops + Audio-Reactive Madness
 *
 * The walls are ALIVE. They grow, heal, breathe, and dream.
 * Audio doesn't just affect visuals - it STIMULATES a living neural system.
 */
export class HallucinationMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'hallucination3d'
    this.description = 'Living geometry that dreams - neural cellular automata fever'

    // NCA Configuration
    this.ncaSize = 256  // Resolution of the NCA simulation
    this.ncaStates = 4  // RGBA channels = 4 state dimensions per cell

    // Render targets for ping-pong NCA simulation
    this.ncaTargetA = null
    this.ncaTargetB = null
    this.ncaQuad = null
    this.ncaScene = null
    this.ncaCamera = null
    this.currentTarget = 'A'

    // Feedback system
    this.feedbackTarget = null
    this.feedbackStrength = 0.15
    this.dreamIntensity = 0
    this.chaosLevel = 0

    // The tunnel geometry
    this.tunnelSegments = 48
    this.tunnelRings = 100
    this.tunnelRadius = 12
    this.tunnelLength = 150
    this.tunnel = null
    this.tunnelGeometry = null

    // Living tendrils that grow from walls
    this.tendrils = []
    this.maxTendrils = 50

    // Particle system - neurons firing
    this.neurons = []
    this.neuronGeometry = null
    this.neuronMaterial = null
    this.neuronMesh = null
    this.maxNeurons = 2000

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Time and animation
    this.time = 0
    this.scrollSpeed = 0
    this.tunnelRotation = 0

    // Stimulation points - where audio "touches" the NCA
    this.stimulationPoints = []
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Store renderer reference for render targets
    this.threeRenderer = renderer

    // Initialize Neural Cellular Automata
    this.initNCA()

    // Initialize feedback system
    this.initFeedback()

    // Build the living tunnel
    this.initTunnel(scene)

    // Initialize neural particles
    this.initNeurons(scene)

    // Initialize tendrils
    this.initTendrils(scene)

    // Lighting - eerie, pulsing
    const ambient = new THREE.AmbientLight(0x110011, 0.3)
    scene.add(ambient)

    this.coreLight = new THREE.PointLight(0xff00ff, 2, 100)
    this.coreLight.position.set(0, 0, 10)
    scene.add(this.coreLight)

    // Secondary lights for color variety
    this.light1 = new THREE.PointLight(0x00ffff, 1, 50)
    this.light1.position.set(10, 0, -20)
    scene.add(this.light1)

    this.light2 = new THREE.PointLight(0xff0066, 1, 50)
    this.light2.position.set(-10, 0, -40)
    scene.add(this.light2)

    // Fog for depth
    scene.fog = new THREE.FogExp2(0x000005, 0.008)
    scene.background = new THREE.Color(0x000005)

    // Camera setup
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, -50)
  }

  initNCA() {
    // Create render targets for ping-pong simulation
    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    }

    this.ncaTargetA = new THREE.WebGLRenderTarget(this.ncaSize, this.ncaSize, options)
    this.ncaTargetB = new THREE.WebGLRenderTarget(this.ncaSize, this.ncaSize, options)

    // NCA update shader - DISTILL-INSPIRED 12-CHANNEL BRAIN
    // 4 visible channels (RGBA) + simulated hidden state in the patterns
    this.ncaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uResolution: { value: new THREE.Vector2(this.ncaSize, this.ncaSize) },
        uTime: { value: 0 },
        uDelta: { value: 0.016 },
        uAudioBass: { value: 0 },
        uAudioMid: { value: 0 },
        uAudioHigh: { value: 0 },
        uAudioAmplitude: { value: 0 },
        // Multiple stimulation points for whole-surface activity
        uStimPoints: { value: [
          new THREE.Vector2(0.5, 0.5),
          new THREE.Vector2(0.2, 0.3),
          new THREE.Vector2(0.8, 0.7),
          new THREE.Vector2(0.3, 0.8),
          new THREE.Vector2(0.7, 0.2),
          new THREE.Vector2(0.1, 0.5),
          new THREE.Vector2(0.9, 0.5),
          new THREE.Vector2(0.5, 0.1)
        ]},
        uChaos: { value: 0 },
        uTextureMode: { value: 0 }  // 0=organic, 1=geometric, 2=flowing
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform sampler2D uState;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uDelta;
        uniform float uAudioBass;
        uniform float uAudioMid;
        uniform float uAudioHigh;
        uniform float uAudioAmplitude;
        uniform vec2 uStimPoints[8];
        uniform float uChaos;
        uniform float uTextureMode;

        varying vec2 vUv;

        // Hash function for pseudo-random
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // Smooth noise
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        // Fractal Brownian Motion
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        // Sobel + Laplacian perception (Distill-style)
        mat3 sobelX = mat3(
          -1.0, 0.0, 1.0,
          -2.0, 0.0, 2.0,
          -1.0, 0.0, 1.0
        );
        mat3 sobelY = mat3(
          -1.0, -2.0, -1.0,
           0.0,  0.0,  0.0,
           1.0,  2.0,  1.0
        );
        mat3 laplacian = mat3(
          0.25, 0.5, 0.25,
          0.5, -3.0, 0.5,
          0.25, 0.5, 0.25
        );

        vec4 convolve(sampler2D tex, vec2 uv, mat3 kernel) {
          vec2 texel = 1.0 / uResolution;
          vec4 sum = vec4(0.0);
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 offset = vec2(float(x), float(y)) * texel;
              sum += texture2D(tex, uv + offset) * kernel[y + 1][x + 1];
            }
          }
          return sum;
        }

        void main() {
          vec2 texel = 1.0 / uResolution;
          vec4 state = texture2D(uState, vUv);

          // === PERCEPTION (what each cell senses) ===
          vec4 lap = convolve(uState, vUv, laplacian);
          vec4 gradX = convolve(uState, vUv, sobelX);
          vec4 gradY = convolve(uState, vUv, sobelY);
          float gradMag = length(vec2(length(gradX), length(gradY)));

          // Neighbor average
          vec4 avg = vec4(0.0);
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              avg += texture2D(uState, vUv + vec2(float(x), float(y)) * texel);
            }
          }
          avg /= 9.0;

          // === GRAY-SCOTT REACTION-DIFFUSION (organic blobs) ===
          float A = state.r;  // Chemical A
          float B = state.g;  // Chemical B

          // Feed and kill rates modulated by audio
          float feed = 0.037 + uAudioBass * 0.02 + sin(vUv.y * 6.28 + uTime) * 0.005;
          float kill = 0.06 + uAudioHigh * 0.01 + cos(vUv.x * 6.28 + uTime * 0.7) * 0.005;

          // Diffusion rates
          float dA = 1.0;
          float dB = 0.5;

          // Reaction-diffusion update
          float reaction = A * B * B;
          float newA = A + (dA * lap.r - reaction + feed * (1.0 - A)) * uDelta * 2.0;
          float newB = B + (dB * lap.g + reaction - (kill + feed) * B) * uDelta * 2.0;

          // === FLOWING PATTERNS (audio-driven waves) ===
          float flowAngle = uTime * 0.5 + uAudioMid * 3.14159;
          vec2 flowDir = vec2(cos(flowAngle), sin(flowAngle));
          float flow = dot(normalize(gradX.rg + 0.001), flowDir);

          // Traveling waves across the surface
          float wave1 = sin(vUv.x * 20.0 + vUv.y * 10.0 + uTime * 3.0 + uAudioBass * 10.0) * 0.5 + 0.5;
          float wave2 = sin(vUv.x * 15.0 - vUv.y * 25.0 + uTime * 2.0 + uAudioMid * 8.0) * 0.5 + 0.5;
          float wave3 = sin(length(vUv - 0.5) * 30.0 - uTime * 4.0 + uAudioHigh * 12.0) * 0.5 + 0.5;

          // === TURING PATTERNS (spots and stripes) ===
          float turing = fbm(vUv * 8.0 + uTime * 0.2);
          turing = smoothstep(0.4, 0.6, turing + uAudioAmplitude * 0.3);

          // === MULTI-POINT STIMULATION (whole surface active!) ===
          float totalStim = 0.0;
          for (int i = 0; i < 8; i++) {
            // Points orbit based on audio and time
            vec2 stimPoint = uStimPoints[i];
            float orbitSpeed = float(i) * 0.3 + 1.0;
            float orbitRadius = 0.1 + uAudioAmplitude * 0.2;

            stimPoint.x += sin(uTime * orbitSpeed + float(i)) * orbitRadius;
            stimPoint.y += cos(uTime * orbitSpeed * 0.7 + float(i) * 2.0) * orbitRadius;

            // Wrap around
            stimPoint = fract(stimPoint);

            float dist = distance(vUv, stimPoint);
            float stim = exp(-dist * 8.0) * (0.3 + uAudioAmplitude * 0.7);

            // Different frequencies stimulate different points
            if (i < 3) stim *= uAudioBass;
            else if (i < 6) stim *= uAudioMid;
            else stim *= uAudioHigh;

            totalStim += stim;
          }

          // === COMBINE EVERYTHING ===
          vec4 newState = state;

          // R: Reaction-diffusion A + waves
          newState.r = mix(newA, wave1, 0.2);
          newState.r += totalStim * 0.3;
          newState.r += gradMag * uAudioMid * 0.2;

          // G: Reaction-diffusion B + flow
          newState.g = mix(newB, wave2, 0.15);
          newState.g += flow * uAudioHigh * 0.3;
          newState.g += turing * 0.1;

          // B: Activity/sparkle layer
          newState.b = mix(state.b, wave3 * totalStim * 2.0, 0.3);
          newState.b += abs(lap.b) * uAudioHigh * 2.0;
          newState.b *= 0.95;  // Decay

          // A: Life force / structure persistence
          newState.a = mix(state.a, avg.a, 0.1);
          newState.a += (newState.r + newState.g) * 0.05;
          newState.a = mix(newState.a, turing, uAudioBass * 0.2);
          newState.a *= 0.995;

          // === CHAOS MODE (bass drops = mutation) ===
          if (uChaos > 0.3) {
            float chaos = hash(vUv + uTime);
            if (chaos < uChaos * 0.15) {
              // Inject random life
              newState = vec4(
                chaos,
                hash(vUv * 2.0 + uTime),
                hash(vUv * 3.0 - uTime),
                1.0
              );
            }
          }

          // === GLOBAL PULSE (everything breathes together) ===
          float globalPulse = sin(uTime * 2.0) * 0.02 * uAudioAmplitude;
          newState.rgb += globalPulse;

          // === EDGE ENHANCEMENT (keep patterns sharp) ===
          newState.rgb += gradMag * 0.05;

          // Clamp and output
          newState = clamp(newState, 0.0, 1.0);

          gl_FragColor = newState;
        }
      `
    })

    // Quad for NCA rendering
    this.ncaScene = new THREE.Scene()
    this.ncaCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.ncaQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.ncaMaterial
    )
    this.ncaScene.add(this.ncaQuad)

    // Initialize with seed pattern
    this.seedNCA()
  }

  seedNCA() {
    // Create initial state texture with reaction-diffusion friendly seed
    const size = this.ncaSize
    const data = new Float32Array(size * size * 4)

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const u = x / size
        const v = y / size

        // Multiple seed points for faster pattern emergence
        let seed = 0

        // Random blobs scattered across surface
        for (let b = 0; b < 20; b++) {
          const bx = Math.sin(b * 7.3) * 0.4 + 0.5
          const by = Math.cos(b * 11.7) * 0.4 + 0.5
          const dist = Math.sqrt((u - bx) ** 2 + (v - by) ** 2)
          seed += Math.exp(-dist * 20) * 0.5
        }

        // Add flowing waves
        const wave1 = Math.sin(u * 15 + v * 10) * 0.3
        const wave2 = Math.cos(u * 20 - v * 15) * 0.2

        // Perlin-ish noise
        const noise = Math.sin(u * 50) * Math.sin(v * 50) * 0.2 +
                     Math.sin(u * 100 + v * 70) * 0.1

        // R: Chemical A for reaction-diffusion (mostly 1, with some holes)
        data[i + 0] = Math.min(1, 0.8 + noise + wave1)

        // G: Chemical B (seeded at blobs)
        data[i + 1] = Math.min(1, seed * 0.8 + noise * 0.3)

        // B: Activity (random sparkles)
        data[i + 2] = Math.random() * 0.3

        // A: Life force (everywhere, with variation)
        data[i + 3] = 0.5 + wave2 + noise
      }
    }

    const texture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    texture.needsUpdate = true

    // Copy to both targets
    const copyMaterial = new THREE.MeshBasicMaterial({ map: texture })
    const copyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial)
    const copyScene = new THREE.Scene()
    copyScene.add(copyQuad)

    this.threeRenderer.setRenderTarget(this.ncaTargetA)
    this.threeRenderer.render(copyScene, this.ncaCamera)
    this.threeRenderer.setRenderTarget(this.ncaTargetB)
    this.threeRenderer.render(copyScene, this.ncaCamera)
    this.threeRenderer.setRenderTarget(null)

    copyMaterial.dispose()
    copyQuad.geometry.dispose()
  }

  initFeedback() {
    // Feedback render target (full screen)
    this.feedbackTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      }
    )
  }

  initTunnel(scene) {
    // Build tunnel with vertex colors that will be driven by NCA
    const segments = this.tunnelSegments
    const rings = this.tunnelRings
    const radius = this.tunnelRadius

    const vertexCount = segments * rings
    const positions = new Float32Array(vertexCount * 3)
    const colors = new Float32Array(vertexCount * 3)
    const uvs = new Float32Array(vertexCount * 2)
    const indices = []

    // Vertex positions
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segments; s++) {
        const idx = r * segments + s
        const angle = (s / segments) * Math.PI * 2
        const z = -r * (this.tunnelLength / rings)

        positions[idx * 3] = Math.cos(angle) * radius
        positions[idx * 3 + 1] = Math.sin(angle) * radius
        positions[idx * 3 + 2] = z

        // UVs map to NCA texture
        uvs[idx * 2] = s / segments
        uvs[idx * 2 + 1] = r / rings

        // Initial colors
        colors[idx * 3] = 0.1
        colors[idx * 3 + 1] = 0.05
        colors[idx * 3 + 2] = 0.15
      }
    }

    // Indices
    for (let r = 0; r < rings - 1; r++) {
      for (let s = 0; s < segments; s++) {
        const current = r * segments + s
        const next = r * segments + (s + 1) % segments
        const below = (r + 1) * segments + s
        const belowNext = (r + 1) * segments + (s + 1) % segments

        indices.push(current, next, below)
        indices.push(next, belowNext, below)
      }
    }

    this.tunnelGeometry = new THREE.BufferGeometry()
    this.tunnelGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.tunnelGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.tunnelGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    this.tunnelGeometry.setIndex(indices)
    this.tunnelGeometry.computeVertexNormals()

    // Material with NCA texture
    this.tunnelMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uNCA: { value: this.ncaTargetA.texture },
        uTime: { value: 0 },
        uDreamIntensity: { value: 0 },
        uScrollOffset: { value: 0 },
        uAudioBass: { value: 0 },
        uAudioMid: { value: 0 },
        uAudioHigh: { value: 0 }
      },
      vertexShader: `
        attribute vec3 color;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;

        uniform sampler2D uNCA;
        uniform float uTime;
        uniform float uDreamIntensity;
        uniform float uScrollOffset;

        void main() {
          vUv = uv;
          vColor = color;
          vNormal = normal;

          // Sample NCA to displace vertices
          vec2 ncaUV = vec2(uv.x, fract(uv.y + uScrollOffset));
          vec4 nca = texture2D(uNCA, ncaUV);

          // Displacement based on NCA state
          float displacement = (nca.r * 2.0 + nca.a) * uDreamIntensity * 3.0;

          // Organic wobble
          displacement += sin(uTime * 3.0 + uv.x * 20.0) * nca.g * 0.5;
          displacement += cos(uTime * 2.0 + uv.y * 15.0) * nca.b * 0.3;

          vec3 pos = position;
          // Displace inward (toward center)
          vec3 dir = normalize(vec3(position.x, position.y, 0.0));
          pos -= dir * displacement;

          vPosition = pos;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uNCA;
        uniform float uTime;
        uniform float uDreamIntensity;
        uniform float uScrollOffset;
        uniform float uAudioBass;
        uniform float uAudioMid;
        uniform float uAudioHigh;

        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Sample NCA at multiple offsets for flowing effect
          vec2 ncaUV = vec2(vUv.x, fract(vUv.y + uScrollOffset));
          vec4 nca = texture2D(uNCA, ncaUV);

          // Secondary sample with slight offset for depth
          vec2 ncaUV2 = vec2(vUv.x + 0.01, fract(vUv.y + uScrollOffset + 0.02));
          vec4 nca2 = texture2D(uNCA, ncaUV2);

          // Base color from NCA state - MUCH MORE VIBRANT
          vec3 col = vec3(0.02, 0.0, 0.05);  // Dark base, not black

          // R channel = organic blobs (magenta/pink)
          vec3 blobColor = mix(vec3(0.9, 0.1, 0.4), vec3(1.0, 0.4, 0.7), nca.r);
          col += blobColor * nca.r * 1.5;

          // G channel = flowing energy (cyan to green)
          vec3 flowColor = mix(vec3(0.0, 0.6, 0.9), vec3(0.2, 1.0, 0.5), nca.g);
          col += flowColor * nca.g * 2.0;

          // B channel = sparkling activity (white/gold)
          vec3 sparkColor = mix(vec3(1.0, 0.8, 0.3), vec3(1.0, 1.0, 1.0), nca.b);
          col += sparkColor * nca.b * 2.5;

          // A channel = life force underlayer (deep purple)
          col += vec3(0.4, 0.0, 0.6) * nca.a * 0.8;

          // === FLOWING VEINS that pulse with audio ===
          float veinFreq = 30.0 + uAudioBass * 20.0;
          float vein1 = sin(vUv.x * veinFreq + uTime * 3.0) * sin(vUv.y * 20.0 - uTime * 2.0);
          float vein2 = cos(vUv.x * 25.0 - uTime * 2.5) * sin(vUv.y * veinFreq + uTime * 1.5);
          float veins = smoothstep(0.7, 1.0, max(vein1, vein2));
          col += vec3(1.0, 0.2, 0.6) * veins * (0.5 + uAudioMid);

          // === TRAVELING WAVES (ripple across surface) ===
          float wave = sin(vUv.y * 50.0 - uTime * 5.0 + sin(vUv.x * 10.0) * 2.0);
          wave = smoothstep(0.8, 1.0, wave);
          col += vec3(0.3, 0.8, 1.0) * wave * uAudioHigh * 0.8;

          // === DEPTH-BASED VARIATION (not just fade) ===
          float depthRatio = -vPosition.z / 150.0;

          // Close = more saturated, far = more ethereal
          float saturation = 1.0 - depthRatio * 0.3;
          col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, saturation);

          // Add fog glow at distance instead of just darkening
          vec3 fogColor = vec3(0.1, 0.0, 0.2) + vec3(0.2, 0.0, 0.3) * uDreamIntensity;
          col = mix(col, fogColor, depthRatio * 0.5);

          // Keep close areas bright!
          float closeBoost = smoothstep(0.3, 0.0, depthRatio);
          col *= 1.0 + closeBoost * 0.5;

          // === EDGE GLOW (rim lighting) ===
          float edge = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
          vec3 edgeColor = mix(vec3(0.5, 0.0, 1.0), vec3(0.0, 1.0, 0.8), uAudioHigh);
          col += edgeColor * pow(edge, 2.0) * (0.3 + uDreamIntensity * 0.5);

          // === BEAT FLASH ===
          col += vec3(0.1, 0.05, 0.15) * uAudioBass * (1.0 - depthRatio);

          // === CHROMATIC SHIMMER ===
          float shimmer = sin(vUv.x * 100.0 + vUv.y * 100.0 + uTime * 10.0) * 0.5 + 0.5;
          col.r += shimmer * nca.b * 0.1;
          col.b += (1.0 - shimmer) * nca.b * 0.1;

          // Ensure we don't blow out
          col = clamp(col, 0.0, 1.5);

          // Tone mapping for HDR feel
          col = col / (1.0 + col);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      transparent: false
    })

    this.tunnel = new THREE.Mesh(this.tunnelGeometry, this.tunnelMaterial)
    scene.add(this.tunnel)

    // Wireframe overlay
    this.wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    })
    this.wireframe = new THREE.Mesh(this.tunnelGeometry, this.wireframeMaterial)
    scene.add(this.wireframe)
  }

  initNeurons(scene) {
    // Particle system for "neurons firing"
    const positions = new Float32Array(this.maxNeurons * 3)
    const colors = new Float32Array(this.maxNeurons * 3)
    const sizes = new Float32Array(this.maxNeurons)

    for (let i = 0; i < this.maxNeurons; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 2 + Math.random() * (this.tunnelRadius - 3)
      const z = -Math.random() * this.tunnelLength

      this.neurons.push({
        angle,
        radius,
        z,
        vz: (Math.random() - 0.5) * 20,
        vAngle: (Math.random() - 0.5) * 2,
        life: Math.random(),
        maxLife: 0.5 + Math.random() * 2,
        size: 0.2 + Math.random() * 0.5,
        hue: Math.random()
      })

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle) * radius
      positions[i * 3 + 2] = z

      colors[i * 3] = 1
      colors[i * 3 + 1] = 0
      colors[i * 3 + 2] = 1

      sizes[i] = 1
    }

    this.neuronGeometry = new THREE.BufferGeometry()
    this.neuronGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.neuronGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.neuronGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    this.neuronMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;

        void main() {
          vColor = color;
          vAlpha = color.r;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 50.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 2.0);

          gl_FragColor = vec4(vColor * glow, glow * vAlpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.neuronMesh = new THREE.Points(this.neuronGeometry, this.neuronMaterial)
    scene.add(this.neuronMesh)
  }

  initTendrils(scene) {
    // Organic tendrils that grow from the walls
    this.tendrilGroup = new THREE.Group()
    scene.add(this.tendrilGroup)
  }

  spawnTendril(position, direction) {
    if (this.tendrils.length >= this.maxTendrils) {
      // Remove oldest
      const old = this.tendrils.shift()
      this.tendrilGroup.remove(old.mesh)
      old.geometry.dispose()
      old.material.dispose()
    }

    const segments = 20
    const points = []

    for (let i = 0; i < segments; i++) {
      points.push(new THREE.Vector3(0, 0, -i * 0.5))
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.8, 1, 0.5),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })

    const line = new THREE.Line(geometry, material)
    line.position.copy(position)
    line.lookAt(position.clone().add(direction))

    this.tendrilGroup.add(line)

    this.tendrils.push({
      mesh: line,
      geometry,
      material,
      points: points.map(p => p.clone()),
      life: 0,
      maxLife: 2 + Math.random() * 3,
      growthSpeed: 0.5 + Math.random(),
      wiggle: Math.random() * 2
    })
  }

  updateNCA(delta) {
    // Ping-pong between render targets
    const readTarget = this.currentTarget === 'A' ? this.ncaTargetA : this.ncaTargetB
    const writeTarget = this.currentTarget === 'A' ? this.ncaTargetB : this.ncaTargetA

    // Update uniforms
    this.ncaMaterial.uniforms.uState.value = readTarget.texture
    this.ncaMaterial.uniforms.uTime.value = this.time
    this.ncaMaterial.uniforms.uDelta.value = Math.min(delta, 0.05)  // Cap delta for stability
    this.ncaMaterial.uniforms.uAudioBass.value = this.smoothBass
    this.ncaMaterial.uniforms.uAudioMid.value = this.smoothMid
    this.ncaMaterial.uniforms.uAudioHigh.value = this.smoothHigh
    this.ncaMaterial.uniforms.uAudioAmplitude.value = this.smoothAmplitude
    this.ncaMaterial.uniforms.uChaos.value = this.chaosLevel

    // Update stimulation points - they orbit and move
    const stimPoints = this.ncaMaterial.uniforms.uStimPoints.value
    for (let i = 0; i < stimPoints.length; i++) {
      const speed = (i + 1) * 0.5
      const radius = 0.3 + this.smoothAmplitude * 0.2
      stimPoints[i].x = 0.5 + Math.sin(this.time * speed + i * 1.5) * radius
      stimPoints[i].y = 0.5 + Math.cos(this.time * speed * 0.7 + i * 2.1) * radius
    }

    // Run multiple NCA steps per frame for faster evolution
    const stepsPerFrame = 2 + Math.floor(this.smoothAmplitude * 3)
    for (let step = 0; step < stepsPerFrame; step++) {
      this.ncaMaterial.uniforms.uState.value = this.currentTarget === 'A' ? this.ncaTargetA.texture : this.ncaTargetB.texture
      const target = this.currentTarget === 'A' ? this.ncaTargetB : this.ncaTargetA

      this.threeRenderer.setRenderTarget(target)
      this.threeRenderer.render(this.ncaScene, this.ncaCamera)

      this.currentTarget = this.currentTarget === 'A' ? 'B' : 'A'
    }

    this.threeRenderer.setRenderTarget(null)

    // Update tunnel material with new NCA texture
    const finalTarget = this.currentTarget === 'A' ? this.ncaTargetA : this.ncaTargetB
    this.tunnelMaterial.uniforms.uNCA.value = finalTarget.texture
  }

  updateNeurons(delta) {
    const positions = this.neuronGeometry.attributes.position.array
    const colors = this.neuronGeometry.attributes.color.array
    const sizes = this.neuronGeometry.attributes.size.array

    for (let i = 0; i < this.neurons.length; i++) {
      const n = this.neurons[i]

      // Age
      n.life += delta

      // Reset if dead
      if (n.life > n.maxLife) {
        n.life = 0
        n.z = -Math.random() * this.tunnelLength * 0.5
        n.angle = Math.random() * Math.PI * 2
        n.hue = Math.random()
        n.vz = (Math.random() - 0.5) * 30 + this.smoothBass * 20
      }

      // Movement
      n.z += n.vz * delta
      n.angle += n.vAngle * delta * (1 + this.smoothHigh)

      // Wrap Z
      if (n.z > 10) n.z = -this.tunnelLength
      if (n.z < -this.tunnelLength) n.z = 10

      // Audio affects radius (push toward walls on bass)
      const targetRadius = 2 + this.smoothBass * (this.tunnelRadius - 4)
      n.radius += (targetRadius - n.radius) * delta * 2

      // Update position
      positions[i * 3] = Math.cos(n.angle + this.tunnelRotation) * n.radius
      positions[i * 3 + 1] = Math.sin(n.angle + this.tunnelRotation) * n.radius
      positions[i * 3 + 2] = n.z

      // Color based on life and audio
      const lifeRatio = n.life / n.maxLife
      const alpha = Math.sin(lifeRatio * Math.PI)  // Fade in and out

      const hue = (n.hue + this.smoothMid * 0.3 + this.time * 0.1) % 1
      const color = new THREE.Color().setHSL(hue, 1, 0.5 + this.smoothHigh * 0.3)

      colors[i * 3] = color.r * alpha
      colors[i * 3 + 1] = color.g * alpha
      colors[i * 3 + 2] = color.b * alpha

      // Size pulses with audio
      sizes[i] = n.size * (1 + this.smoothAmplitude) * alpha
    }

    this.neuronGeometry.attributes.position.needsUpdate = true
    this.neuronGeometry.attributes.color.needsUpdate = true
    this.neuronGeometry.attributes.size.needsUpdate = true
  }

  updateTendrils(delta) {
    for (let i = this.tendrils.length - 1; i >= 0; i--) {
      const t = this.tendrils[i]
      t.life += delta

      if (t.life > t.maxLife) {
        this.tendrilGroup.remove(t.mesh)
        t.geometry.dispose()
        t.material.dispose()
        this.tendrils.splice(i, 1)
        continue
      }

      // Animate points
      const positions = t.geometry.attributes.position.array
      for (let j = 0; j < t.points.length; j++) {
        const growthFactor = Math.min(1, t.life * t.growthSpeed)
        const wiggle = Math.sin(this.time * 5 + j * 0.5) * t.wiggle * 0.1

        positions[j * 3] = t.points[j].x + wiggle
        positions[j * 3 + 1] = t.points[j].y + wiggle * 0.5
        positions[j * 3 + 2] = t.points[j].z * growthFactor
      }
      t.geometry.attributes.position.needsUpdate = true

      // Fade out
      const fadeStart = t.maxLife * 0.7
      if (t.life > fadeStart) {
        t.material.opacity = 0.8 * (1 - (t.life - fadeStart) / (t.maxLife - fadeStart))
      }
    }

    // Spawn new tendrils on beats
    if (this.smoothBass > 0.6 && Math.random() < 0.1) {
      const angle = Math.random() * Math.PI * 2
      const z = -Math.random() * this.tunnelLength * 0.5
      const pos = new THREE.Vector3(
        Math.cos(angle) * this.tunnelRadius,
        Math.sin(angle) * this.tunnelRadius,
        z
      )
      const dir = new THREE.Vector3(-Math.cos(angle), -Math.sin(angle), -1).normalize()
      this.spawnTendril(pos, dir)
    }
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    if (!audioFeatures) return

    this.time = elapsed
    const { bass, mid, high, amplitude } = this.getWeightedAudio(audioFeatures)
    const { onBeat, beatIntensity } = beatInfo

    // Smooth audio
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Dream intensity rises with sustained audio
    this.dreamIntensity += (this.smoothAmplitude - this.dreamIntensity) * delta
    this.dreamIntensity = Math.min(1, this.dreamIntensity)

    // Chaos on massive beats
    if (onBeat && beatIntensity > 0.8) {
      this.chaosLevel = beatIntensity
    }
    this.chaosLevel *= 0.95

    // Update NCA simulation
    this.updateNCA(delta)

    // Scroll through tunnel
    this.scrollSpeed = 0.02 + this.smoothAmplitude * 0.05
    this.tunnelMaterial.uniforms.uScrollOffset.value += this.scrollSpeed * delta
    this.tunnelMaterial.uniforms.uTime.value = elapsed
    this.tunnelMaterial.uniforms.uDreamIntensity.value = this.dreamIntensity
    this.tunnelMaterial.uniforms.uAudioBass.value = this.smoothBass
    this.tunnelMaterial.uniforms.uAudioMid.value = this.smoothMid
    this.tunnelMaterial.uniforms.uAudioHigh.value = this.smoothHigh

    // Tunnel rotation
    this.tunnelRotation += delta * (0.2 + this.smoothHigh * 0.5)

    // Update systems
    this.updateNeurons(delta)
    this.updateTendrils(delta)

    // Camera
    const wobbleX = Math.sin(elapsed * 1.5) * this.smoothMid * 2
    const wobbleY = Math.cos(elapsed * 1.2) * this.smoothMid * 2
    this.camera.position.set(wobbleX, wobbleY, 5)
    this.camera.lookAt(wobbleX * 0.3, wobbleY * 0.3, -30)

    // Lights
    this.coreLight.intensity = 2 + this.smoothBass * 4
    this.coreLight.color.setHSL(0.8 + this.smoothMid * 0.2, 1, 0.5)

    this.light1.position.x = Math.sin(elapsed) * 15
    this.light1.intensity = 1 + this.smoothHigh * 2

    this.light2.position.x = Math.cos(elapsed * 0.7) * 15
    this.light2.intensity = 1 + this.smoothMid * 2

    // Wireframe pulses on beat
    if (onBeat) {
      this.wireframeMaterial.opacity = 0.3 + beatIntensity * 0.3
    } else {
      this.wireframeMaterial.opacity *= 0.95
      this.wireframeMaterial.opacity = Math.max(0.05, this.wireframeMaterial.opacity)
    }
  }

  handleKeyPress(key) {
    if (key === 'r' || key === 'R') {
      // Reseed NCA
      this.seedNCA()
    }
  }

  resize(width, height) {
    if (this.feedbackTarget) {
      this.feedbackTarget.setSize(width, height)
    }
  }

  dispose() {
    // NCA
    if (this.ncaTargetA) this.ncaTargetA.dispose()
    if (this.ncaTargetB) this.ncaTargetB.dispose()
    if (this.ncaMaterial) this.ncaMaterial.dispose()
    if (this.ncaQuad) this.ncaQuad.geometry.dispose()

    // Feedback
    if (this.feedbackTarget) this.feedbackTarget.dispose()

    // Tunnel
    if (this.tunnelGeometry) this.tunnelGeometry.dispose()
    if (this.tunnelMaterial) this.tunnelMaterial.dispose()
    if (this.wireframeMaterial) this.wireframeMaterial.dispose()
    if (this.tunnel) this.scene.remove(this.tunnel)
    if (this.wireframe) this.scene.remove(this.wireframe)

    // Neurons
    if (this.neuronGeometry) this.neuronGeometry.dispose()
    if (this.neuronMaterial) this.neuronMaterial.dispose()
    if (this.neuronMesh) this.scene.remove(this.neuronMesh)

    // Tendrils
    for (const t of this.tendrils) {
      t.geometry.dispose()
      t.material.dispose()
      this.tendrilGroup.remove(t.mesh)
    }
    if (this.tendrilGroup) this.scene.remove(this.tendrilGroup)
  }

  clear() {
    this.seedNCA()
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
    this.dreamIntensity = 0
    this.chaosLevel = 0
    this.tunnelRotation = 0
    this.tunnelMaterial.uniforms.uScrollOffset.value = 0
  }
}
