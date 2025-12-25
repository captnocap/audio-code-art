import * as THREE from 'three'
import { Visualization3DMode } from './base.js'

// Wormhole Mode - Topography wrapped into a tunnel
// You're inside a cylinder where the walls ARE the audio terrain
// Frequency bins wrap around the circumference, peaks point inward
export class WormholeMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'wormhole3d'
    this.description = 'Audio terrain wrapped into a tunnel - fly through sound'

    // Tunnel dimensions
    this.segments = 64         // Frequency bins around circumference
    this.rings = 150           // Time history (depth)
    this.ringSpacing = 1.5     // Distance between rings
    this.baseRadius = 15       // Base tunnel radius
    this.maxDisplacement = 12  // How far peaks can extend inward (most of the radius!)

    // Geometry
    this.geometry = null
    this.mesh = null
    this.wireframe = null

    // Height map - 2D array [ring][segment] storing displacement
    this.heightMap = null

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Camera and scroll
    this.scrollOffset = 0
    this.cameraRotation = 0
    this.tunnelRotation = 0  // Spin the whole tunnel

    // Dynamic range tracking for normalization
    this.recentMax = 0.3
    this.recentMin = 0

    // === SCRAMBLED FREQUENCY MAPPING ===
    // Logical frequency bins map to random visual positions around the cylinder
    // This breaks up the repeating patterns!
    this.frequencyMapping = null  // logicalBin -> visualSegment
    this.reverseMapping = null    // visualSegment -> logicalBin
    this.mappingMorphSpeed = 0.1  // How fast positions drift
    this.mappingMorphTargets = null  // Target positions for smooth morphing

    // Particle system
    this.particles = []
    this.particleGeometry = null
    this.particleMaterial = null
    this.particleMesh = null
    this.maxParticles = 500
    this.trailLength = 8  // Points per trail

    // Color paint layer - particles leave color on collision
    this.paintLayer = null  // [ring][segment] = {r, g, b, intensity}

    // Player / Surfer
    this.player = null
    this.playerAngle = Math.PI / 2  // Start at bottom of tube
    this.playerZ = 2  // Fixed Z position near camera
    this.keys = { left: false, right: false }
    this.playerTrailIntensity = 0

    // Black Hole Drop effect
    this.isDropping = false
    this.dropTimer = 0
    this.frozenParticleVelocities = null
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Initialize height map
    this.heightMap = []
    for (let r = 0; r < this.rings; r++) {
      this.heightMap.push(new Float32Array(this.segments))
    }

    // Initialize paint layer - stores particle colors that splashed on terrain
    this.paintLayer = []
    for (let r = 0; r < this.rings; r++) {
      this.paintLayer.push([])
      for (let s = 0; s < this.segments; s++) {
        this.paintLayer[r].push({ r: 0, g: 0, b: 0, intensity: 0 })
      }
    }

    // === INITIALIZE SCRAMBLED FREQUENCY MAPPING ===
    // Create a shuffled mapping from logical frequency bins to visual positions
    this.initFrequencyMapping()

    // Build custom tube geometry for full control
    // Each ring has 'segments' vertices around the circumference
    const vertexCount = this.rings * this.segments
    const positions = new Float32Array(vertexCount * 3)
    const colors = new Float32Array(vertexCount * 3)
    const indices = []

    // Initialize vertex positions
    for (let r = 0; r < this.rings; r++) {
      for (let s = 0; s < this.segments; s++) {
        const idx = (r * this.segments + s) * 3
        const angle = (s / this.segments) * Math.PI * 2

        positions[idx] = Math.cos(angle) * this.baseRadius      // X
        positions[idx + 1] = Math.sin(angle) * this.baseRadius  // Y
        positions[idx + 2] = -r * this.ringSpacing              // Z (negative = into screen)

        // Initial colors
        colors[idx] = 0.2
        colors[idx + 1] = 0.5
        colors[idx + 2] = 0.8
      }
    }

    // Build triangle indices (connect rings)
    for (let r = 0; r < this.rings - 1; r++) {
      for (let s = 0; s < this.segments; s++) {
        const current = r * this.segments + s
        const next = r * this.segments + ((s + 1) % this.segments)
        const currentNext = (r + 1) * this.segments + s
        const nextNext = (r + 1) * this.segments + ((s + 1) % this.segments)

        // Two triangles per quad
        indices.push(current, next, currentNext)
        indices.push(next, nextNext, currentNext)
      }
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setIndex(indices)
    this.geometry.computeVertexNormals()

    // Materials - render inside
    this.solidMaterial = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      flatShading: false,
      shininess: 80
    })

    this.wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    })

    this.mesh = new THREE.Mesh(this.geometry, this.solidMaterial)
    this.wireframe = new THREE.Mesh(this.geometry, this.wireMaterial)

    scene.add(this.mesh)
    scene.add(this.wireframe)

    // Lighting
    const light1 = new THREE.PointLight(0xffffff, 2, 150)
    light1.position.set(0, 0, 10)
    scene.add(light1)
    this.centerLight = light1

    const ambient = new THREE.AmbientLight(0x333355, 0.6)
    scene.add(ambient)

    // Fog for infinite depth feel
    scene.fog = new THREE.FogExp2(0x000008, 0.006)
    scene.background = new THREE.Color(0x000008)

    // Camera inside tunnel
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, -100)

    // Initialize particle system
    this.initParticles(scene)

    // Initialize the Surfer (player ship)
    this.initPlayer(scene)
  }

  initPlayer(scene) {
    // THE SURFER - A sleek pyramid that rides the tube
    const playerGeo = new THREE.ConeGeometry(0.5, 2, 4)
    playerGeo.rotateX(Math.PI / 2)  // Point forward into tunnel

    const playerMat = new THREE.MeshStandardMaterial({
      color: 0xff00cc,
      emissive: 0xaa0044,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    })

    this.player = new THREE.Mesh(playerGeo, playerMat)
    this.playerAngle = Math.PI / 2  // Start at bottom
    this.playerZ = 2
    scene.add(this.player)

    // Add a glow trail behind player
    const trailGeo = new THREE.ConeGeometry(0.3, 4, 4)
    trailGeo.rotateX(-Math.PI / 2)  // Point backward
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    })
    this.playerTrail = new THREE.Mesh(trailGeo, trailMat)
    this.playerTrail.position.z = 2  // Behind the cone
    this.player.add(this.playerTrail)

    // Keyboard input handlers
    this.handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true
    }
    this.handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false
    }

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  initFrequencyMapping() {
    // Create arrays for mapping logical frequency bins to visual positions
    // This scrambles where frequencies appear around the cylinder

    this.frequencyMapping = new Array(this.segments)
    this.reverseMapping = new Array(this.segments)
    this.mappingMorphTargets = new Array(this.segments)
    this.mappingCurrentPos = new Float32Array(this.segments)  // Smooth animated positions

    // Start with ordered indices
    const indices = []
    for (let i = 0; i < this.segments; i++) {
      indices.push(i)
    }

    // Fisher-Yates shuffle for truly random distribution
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }

    // Set up the mapping
    // frequencyMapping[logicalBin] = visualPosition
    for (let i = 0; i < this.segments; i++) {
      this.frequencyMapping[i] = indices[i]
      this.reverseMapping[indices[i]] = i
      this.mappingCurrentPos[i] = indices[i]  // Start at target
      this.mappingMorphTargets[i] = indices[i]
    }

    console.log('Frequency mapping initialized - patterns will be scrambled!')
  }

  reshuffleMapping() {
    // Generate new random target positions for morphing
    const newIndices = []
    for (let i = 0; i < this.segments; i++) {
      newIndices.push(i)
    }

    // Shuffle
    for (let i = newIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newIndices[i], newIndices[j]] = [newIndices[j], newIndices[i]]
    }

    // Set as new morph targets
    for (let i = 0; i < this.segments; i++) {
      this.mappingMorphTargets[i] = newIndices[i]
    }
  }

  updateFrequencyMapping(delta, beatIntensity) {
    // Slowly morph positions toward their targets
    const morphSpeed = this.mappingMorphSpeed * delta

    for (let i = 0; i < this.segments; i++) {
      const target = this.mappingMorphTargets[i]
      const current = this.mappingCurrentPos[i]

      // Handle wrap-around (shortest path around the circle)
      let diff = target - current
      if (Math.abs(diff) > this.segments / 2) {
        if (diff > 0) diff -= this.segments
        else diff += this.segments
      }

      // Move toward target
      this.mappingCurrentPos[i] += diff * morphSpeed

      // Wrap around
      if (this.mappingCurrentPos[i] < 0) this.mappingCurrentPos[i] += this.segments
      if (this.mappingCurrentPos[i] >= this.segments) this.mappingCurrentPos[i] -= this.segments

      // Update integer mapping for lookups
      this.frequencyMapping[i] = Math.round(this.mappingCurrentPos[i]) % this.segments
    }

    // Rebuild reverse mapping
    for (let i = 0; i < this.segments; i++) {
      this.reverseMapping[this.frequencyMapping[i]] = i
    }

    // On strong beats, trigger a reshuffle
    if (beatIntensity > 0.8 && Math.random() < 0.1) {
      this.reshuffleMapping()
    }
  }

  initParticles(scene) {
    // Each particle has a trail, so total points = particles * trailLength
    const totalPoints = this.maxParticles * this.trailLength
    const positions = new Float32Array(totalPoints * 3)
    const colors = new Float32Array(totalPoints * 3)
    const sizes = new Float32Array(totalPoints)

    // Initialize particles array
    for (let i = 0; i < this.maxParticles; i++) {
      const tunnelLength = this.rings * this.ringSpacing
      const angle = Math.random() * Math.PI * 2
      const radius = 3 + Math.random() * (this.baseRadius - 5)
      const z = -Math.random() * tunnelLength

      this.particles.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: z,
        vz: (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 40), // Bidirectional!
        angle: angle,
        radius: radius,
        hue: Math.random(),
        size: 0.5 + Math.random() * 1.5,
        trail: []  // Store previous positions
      })

      // Initialize trail positions
      for (let t = 0; t < this.trailLength; t++) {
        const idx = (i * this.trailLength + t) * 3
        positions[idx] = this.particles[i].x
        positions[idx + 1] = this.particles[i].y
        positions[idx + 2] = this.particles[i].z - t * 2

        // Trail fades out
        const alpha = 1 - (t / this.trailLength)
        colors[idx] = alpha
        colors[idx + 1] = alpha
        colors[idx + 2] = alpha

        sizes[i * this.trailLength + t] = this.particles[i].size * (1 - t / this.trailLength * 0.7)
      }
    }

    this.particleGeometry = new THREE.BufferGeometry()
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // Custom shader for soft glowing particles
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pointSize: { value: 3.0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float pointSize;

        void main() {
          vColor = color;
          vAlpha = color.r; // Use red channel as alpha
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pointSize * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Soft glow falloff - dimmer particles (0.3 instead of 0.8)
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha * 0.3;
          gl_FragColor = vec4(vColor * 0.6, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial)
    scene.add(this.particleMesh)
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    if (!audioFeatures) return

    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { frequencies, centroid } = audioFeatures
    const { bass, mid, high, amplitude } = weighted
    const { onBeat, beatIntensity } = beatInfo

    // Smooth audio
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Scroll the mesh forward (toward camera) for infinite tunnel effect
    // Freeze scroll during Black Hole Drop!
    if (!this.isDropping) {
      const scrollSpeed = 30 + this.smoothAmplitude * 40
      this.scrollOffset += scrollSpeed * delta
    }

    // When we've scrolled one ring's worth, shift the heightmap and reset offset
    if (this.scrollOffset >= this.ringSpacing) {
      this.scrollOffset -= this.ringSpacing

      // Shift height map AND paint layer forward (ring 0 gets discarded, new ring at back)
      for (let r = 0; r < this.rings - 1; r++) {
        this.heightMap[r] = this.heightMap[r + 1]
        this.paintLayer[r] = this.paintLayer[r + 1]  // FIX: Paint sticks to walls!
      }

      // Create new back ring from current audio
      this.heightMap[this.rings - 1] = new Float32Array(this.segments)

      // Create new paint ring (empty)
      this.paintLayer[this.rings - 1] = []
      for (let s = 0; s < this.segments; s++) {
        this.paintLayer[this.rings - 1].push({ r: 0, g: 0, b: 0, intensity: 0 })
      }
    }

    // Spin the tunnel slowly + faster with audio
    if (!this.isDropping) {
      this.tunnelRotation += delta * (0.3 + this.smoothAmplitude * 0.5)
    }

    // === UPDATE SCRAMBLED FREQUENCY MAPPING ===
    // Positions slowly morph, with reshuffles on strong beats
    if (this.frequencyMapping) {
      this.updateFrequencyMapping(delta, beatIntensity)
    }

    // === BLACK HOLE DROP EFFECT ===
    // Trigger on massive bass drops
    if (onBeat && beatIntensity > 0.85 && !this.isDropping && this.smoothBass > 0.7) {
      this.isDropping = true
      this.dropTimer = 0

      // Freeze all particle velocities
      this.frozenParticleVelocities = this.particles.map(p => p.vz)
      for (const p of this.particles) {
        p.vz = 0
      }

      // Switch to double-sided rendering (tunnel flickers)
      this.solidMaterial.side = THREE.DoubleSide
      this.wireMaterial.opacity = 0.8
    }

    // Update drop effect
    if (this.isDropping) {
      this.dropTimer += delta

      // Flicker the solid material
      this.solidMaterial.opacity = 0.3 + Math.random() * 0.4
      this.solidMaterial.transparent = true

      // Wireframe goes crazy
      this.wireMaterial.color.setHSL(Math.random(), 1, 0.8)

      // After 0.5 seconds, release!
      if (this.dropTimer > 0.5) {
        this.isDropping = false

        // Restore particle velocities with BOOST
        if (this.frozenParticleVelocities) {
          this.particles.forEach((p, i) => {
            p.vz = this.frozenParticleVelocities[i] * 2  // Double speed burst!
          })
          this.frozenParticleVelocities = null
        }

        // Restore materials
        this.solidMaterial.side = THREE.BackSide
        this.solidMaterial.opacity = 1
        this.solidMaterial.transparent = false
        this.wireMaterial.opacity = 0.2
      }
    }

    // === UPDATE PLAYER (SURFER) ===
    if (this.player) {
      // Handle input - rotate around tube
      const rotateSpeed = delta * 3.5
      if (this.keys.left) this.playerAngle -= rotateSpeed
      if (this.keys.right) this.playerAngle += rotateSpeed

      // Calculate terrain height under player
      const playerRingIdx = Math.floor(Math.abs(this.playerZ) / this.ringSpacing) + 2
      const normalizedAngle = ((this.playerAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      const segmentIdx = Math.floor((normalizedAngle / (Math.PI * 2)) * this.segments)

      // Get terrain displacement at player position
      const terrainHeight = (this.heightMap[playerRingIdx] && this.heightMap[playerRingIdx][segmentIdx]) || 0

      // Position player - hover above terrain
      const hoverDist = 1.5
      const playerRadius = this.baseRadius - terrainHeight - hoverDist

      this.player.position.x = Math.cos(this.playerAngle) * playerRadius
      this.player.position.y = Math.sin(this.playerAngle) * playerRadius
      this.player.position.z = this.playerZ

      // Orient player - look down tube, bank into turns
      this.player.rotation.z = this.playerAngle - (Math.PI / 2)

      // Bank effect when turning
      let bankAngle = 0
      if (this.keys.left) bankAngle = 0.4
      if (this.keys.right) bankAngle = -0.4
      this.player.rotation.x = bankAngle

      // Trail intensity based on speed/audio
      this.playerTrailIntensity = 0.3 + this.smoothAmplitude * 0.5
      if (this.playerTrail) {
        this.playerTrail.material.opacity = this.playerTrailIntensity
        this.playerTrail.scale.z = 1 + this.smoothBass * 2  // Trail stretches with bass
      }

      // Player emissive pulses with audio
      if (this.player.material.emissive) {
        const intensity = 0.5 + this.smoothAmplitude * 1.5
        this.player.material.emissiveIntensity = intensity
        this.player.material.emissive.setHSL(centroid * 0.5 + 0.8, 1, 0.5)
      }

      // PAINT THE TRACK - Player leaves neon trail on the walls
      if (this.paintLayer[playerRingIdx] && this.paintLayer[playerRingIdx][segmentIdx]) {
        const paint = this.paintLayer[playerRingIdx][segmentIdx]
        // Hot neon pink/magenta trail
        paint.r = 1
        paint.g = 0.2
        paint.b = 0.8
        paint.intensity = Math.min(2.0, paint.intensity + 0.5)  // Glowing hot!
      }
    }

    // Track dynamic range for normalization (adapt to the music)
    let frameMax = 0
    if (frequencies) {
      for (let i = 0; i < frequencies.length; i++) {
        frameMax = Math.max(frameMax, frequencies[i] / 255)
      }
    }
    // Slowly adapt the max (so quiet sections still show detail)
    this.recentMax = this.recentMax * 0.99 + frameMax * 0.01
    this.recentMax = Math.max(0.1, this.recentMax)  // Floor to avoid division issues

    // Always update the back ring with current audio
    // === USE SCRAMBLED MAPPING to break up repeating patterns! ===
    const backRing = this.rings - 1
    if (frequencies && frequencies.length > 0) {
      const binCount = Math.min(frequencies.length, 256)

      for (let s = 0; s < this.segments; s++) {
        // s = logical position (which frequency bin)
        // visualPos = where it appears around the cylinder (scrambled!)
        const visualPos = this.frequencyMapping ? this.frequencyMapping[s] : s

        const normalizedS = s / this.segments
        const binIndex = Math.floor(normalizedS * binCount)

        if (binIndex < frequencies.length) {
          // Raw magnitude - LINEAR, not squared!
          const rawMag = frequencies[binIndex] / 255

          // Normalize against recent max for consistent visual range
          const normalizedMag = Math.min(1, rawMag / this.recentMax)

          // Direct displacement - louder = bigger peaks!
          const displacement = normalizedMag * this.maxDisplacement * (0.8 + this.smoothBass * 0.4)

          // Write to VISUAL position (scrambled), not logical position
          // This distributes similar frequencies around the cylinder!
          const existing = this.heightMap[backRing][visualPos] || 0
          this.heightMap[backRing][visualPos] = existing * 0.2 + displacement * 0.8
        }
      }
    }

    // Update geometry vertices
    const positions = this.geometry.attributes.position.array
    const colors = this.geometry.attributes.color.array

    for (let r = 0; r < this.rings; r++) {
      for (let s = 0; s < this.segments; s++) {
        const idx = (r * this.segments + s) * 3

        // Add tunnel rotation - peaks spin around!
        const angle = (s / this.segments) * Math.PI * 2 + this.tunnelRotation

        // Get displacement
        const displacement = this.heightMap[r] ? this.heightMap[r][s] : 0

        // Radius shrinks inward with displacement (peaks point at you!)
        const radius = this.baseRadius - displacement

        // Update X and Y (radial position with rotation)
        positions[idx] = Math.cos(angle) * radius
        positions[idx + 1] = Math.sin(angle) * radius
        // Z stays fixed per ring, mesh movement handles scrolling
        positions[idx + 2] = -r * this.ringSpacing

        // === VIBRANT COLORS FOR PEAKS ===
        const normalizedDisp = displacement / this.maxDisplacement
        const depthFade = 1 - (r / this.rings) * 0.4

        // Color scheme: dark blue (flat) -> cyan -> yellow -> white/pink (peaks)
        let hue, saturation, lightness

        if (normalizedDisp < 0.3) {
          // Low: deep blue/purple
          hue = 0.7 - normalizedDisp * 0.3
          saturation = 0.8
          lightness = 0.1 + normalizedDisp * 0.3
        } else if (normalizedDisp < 0.6) {
          // Mid: cyan to green
          hue = 0.5 - (normalizedDisp - 0.3) * 0.5
          saturation = 0.9
          lightness = 0.3 + normalizedDisp * 0.3
        } else {
          // High peaks: yellow to white/pink - HOT!
          hue = 0.15 - (normalizedDisp - 0.6) * 0.3
          saturation = 1 - (normalizedDisp - 0.6) * 0.5
          lightness = 0.5 + normalizedDisp * 0.4
        }

        const color = new THREE.Color()
        color.setHSL(hue, saturation, lightness * depthFade)

        // Extra glow on high peaks
        if (normalizedDisp > 0.7) {
          color.r = Math.min(1, color.r * 1.3)
          color.g = Math.min(1, color.g * 1.2)
          color.b = Math.min(1, color.b * 1.1)
        }

        // === BLEND IN PAINT LAYER FROM PARTICLE COLLISIONS ===
        if (this.paintLayer[r] && this.paintLayer[r][s]) {
          const paint = this.paintLayer[r][s]
          if (paint.intensity > 0.01) {
            // Mix paint color into base terrain color
            const blend = paint.intensity * 0.8
            color.r = color.r * (1 - blend) + paint.r * blend
            color.g = color.g * (1 - blend) + paint.g * blend
            color.b = color.b * (1 - blend) + paint.b * blend
          }
        }

        colors[idx] = color.r
        colors[idx + 1] = color.g
        colors[idx + 2] = color.b
      }
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.computeVertexNormals()

    // Move mesh forward to create infinite scroll
    this.mesh.position.z = this.scrollOffset
    this.wireframe.position.z = this.scrollOffset

    // Camera wobble with audio
    const wobbleX = Math.sin(elapsed * 2) * this.smoothMid * 4
    const wobbleY = Math.cos(elapsed * 1.7) * this.smoothMid * 4

    this.camera.position.set(wobbleX, wobbleY, 8)

    // Rotation with audio
    this.cameraRotation += this.smoothHigh * delta * 0.2
    this.camera.rotation.z = Math.sin(this.cameraRotation) * 0.1

    this.camera.lookAt(wobbleX * 0.2, wobbleY * 0.2, -30)

    // Center light pulses with audio
    if (this.centerLight) {
      this.centerLight.color.setHSL(centroid * 0.5 + 0.4, 0.9, 0.7)
      this.centerLight.intensity = 2 + this.smoothAmplitude * 4
      this.centerLight.position.set(0, 0, 15)
    }

    // Beat flash
    if (onBeat && beatIntensity > 0.5) {
      this.wireMaterial.opacity = 0.5 + beatIntensity * 0.4
      this.wireMaterial.color.setHSL(centroid, 1, 0.8)
    } else {
      this.wireMaterial.opacity = Math.max(0.1, this.wireMaterial.opacity - delta * 3)
    }

    // Update particles
    this.updateParticles(delta, elapsed, centroid, onBeat, beatIntensity)
  }

  updateParticles(delta, elapsed, centroid, onBeat, beatIntensity) {
    if (!this.particleGeometry) return

    const positions = this.particleGeometry.attributes.position.array
    const colors = this.particleGeometry.attributes.color.array
    const tunnelLength = this.rings * this.ringSpacing

    // Speed boost with audio
    const speedMult = 1 + this.smoothAmplitude * 2

    // Decay paint layer slowly
    for (let r = 0; r < this.rings; r++) {
      for (let s = 0; s < this.segments; s++) {
        if (this.paintLayer[r] && this.paintLayer[r][s]) {
          this.paintLayer[r][s].intensity *= 0.995  // Slow fade
        }
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]

      // Store current position in trail
      p.trail.unshift({ x: p.x, y: p.y, z: p.z })
      if (p.trail.length > this.trailLength) {
        p.trail.pop()
      }

      // Move particle
      p.z += p.vz * delta * speedMult

      // Slight spiral motion
      p.angle += delta * 0.5 * (p.vz > 0 ? 1 : -1)
      p.x = Math.cos(p.angle + this.tunnelRotation) * p.radius
      p.y = Math.sin(p.angle + this.tunnelRotation) * p.radius

      // === COLLISION DETECTION ===
      // Figure out which ring we're in based on Z position
      // Account for mesh scroll offset
      const localZ = p.z - this.scrollOffset
      const ringIndex = Math.floor(-localZ / this.ringSpacing)

      if (ringIndex >= 0 && ringIndex < this.rings && this.heightMap[ringIndex]) {
        // Get particle's angular position (accounting for tunnel rotation)
        const particleAngle = Math.atan2(p.y, p.x)
        // Convert to segment index
        let segmentIndex = Math.floor(((particleAngle + Math.PI) / (Math.PI * 2)) * this.segments)
        segmentIndex = ((segmentIndex % this.segments) + this.segments) % this.segments

        // Get terrain displacement at this point
        const displacement = this.heightMap[ringIndex][segmentIndex] || 0
        const wallRadius = this.baseRadius - displacement

        // Check if particle is hitting the wall
        if (p.radius >= wallRadius - 0.5) {
          // COLLISION! Paint the terrain with particle color
          const directionHue = p.vz > 0 ? 0.1 : 0.6
          const finalHue = (directionHue + p.hue + centroid * 0.3) % 1
          const splashColor = new THREE.Color()
          splashColor.setHSL(finalHue, 0.9, 0.6)

          // Splash affects nearby segments too (3x3 area)
          for (let dr = -1; dr <= 1; dr++) {
            for (let ds = -2; ds <= 2; ds++) {
              const rr = ringIndex + dr
              const ss = ((segmentIndex + ds) % this.segments + this.segments) % this.segments

              if (rr >= 0 && rr < this.rings && this.paintLayer[rr] && this.paintLayer[rr][ss]) {
                const falloff = 1 / (1 + Math.abs(dr) + Math.abs(ds) * 0.5)
                const paint = this.paintLayer[rr][ss]

                // Blend color into paint layer
                paint.r = paint.r * 0.7 + splashColor.r * 0.3 * falloff
                paint.g = paint.g * 0.7 + splashColor.g * 0.3 * falloff
                paint.b = paint.b * 0.7 + splashColor.b * 0.3 * falloff
                paint.intensity = Math.min(1, paint.intensity + 0.4 * falloff)
              }
            }
          }

          // Bounce particle inward and give it a new trajectory
          p.radius = Math.max(3, wallRadius - 2 - Math.random() * 3)
          p.angle += (Math.random() - 0.5) * 0.5
          p.hue = Math.random()  // New color on bounce
        }
      }

      // Wrap around tunnel
      if (p.z > 20) {
        p.z = -tunnelLength
        p.hue = Math.random()
        p.radius = 3 + Math.random() * (this.baseRadius - 6)
      } else if (p.z < -tunnelLength) {
        p.z = 15
        p.hue = Math.random()
        p.radius = 3 + Math.random() * (this.baseRadius - 6)
      }

      // Beat boost - spawn burst of speed
      if (onBeat && beatIntensity > 0.6 && Math.random() < 0.3) {
        p.vz *= 1.5
      }
      // Decay speed back to normal
      const baseSpeed = (p.vz > 0 ? 1 : -1) * 30
      p.vz = p.vz * 0.98 + baseSpeed * 0.02

      // Slowly drift radius outward (toward walls) for more collisions
      p.radius += delta * 0.5

      // Update trail positions and colors
      for (let t = 0; t < this.trailLength; t++) {
        const idx = (i * this.trailLength + t) * 3

        if (t < p.trail.length) {
          positions[idx] = p.trail[t].x
          positions[idx + 1] = p.trail[t].y
          positions[idx + 2] = p.trail[t].z
        } else {
          positions[idx] = p.x
          positions[idx + 1] = p.y
          positions[idx + 2] = p.z
        }

        // Trail color - fades and shifts hue along trail
        const trailFade = 1 - (t / this.trailLength)
        const hueShift = p.hue + t * 0.05

        // Direction affects color - forward = warm, backward = cool
        const directionHue = p.vz > 0 ? 0.1 : 0.6
        const finalHue = (directionHue + hueShift + centroid * 0.3) % 1

        const color = new THREE.Color()
        color.setHSL(finalHue, 0.9, 0.5 + trailFade * 0.3)

        colors[idx] = color.r * trailFade
        colors[idx + 1] = color.g * trailFade
        colors[idx + 2] = color.b * trailFade
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true
    this.particleGeometry.attributes.color.needsUpdate = true

    // Sync particle mesh with tunnel scroll
    this.particleMesh.position.z = this.scrollOffset
  }

  handleKeyPress(key) {
    // R = Reshuffle the frequency mapping
    if (key === 'r' || key === 'R') {
      this.reshuffleMapping()
      console.log('Frequency mapping reshuffled!')
    }
  }

  resize(width, height) {
    // Handled by Renderer3D
  }

  dispose() {
    if (this.geometry) this.geometry.dispose()
    if (this.solidMaterial) this.solidMaterial.dispose()
    if (this.wireMaterial) this.wireMaterial.dispose()
    if (this.mesh) this.scene.remove(this.mesh)
    if (this.wireframe) this.scene.remove(this.wireframe)

    // Clean up particles
    if (this.particleGeometry) this.particleGeometry.dispose()
    if (this.particleMaterial) this.particleMaterial.dispose()
    if (this.particleMesh) this.scene.remove(this.particleMesh)

    // Clean up player
    if (this.player) {
      if (this.player.geometry) this.player.geometry.dispose()
      if (this.player.material) this.player.material.dispose()
      this.scene.remove(this.player)
    }
    if (this.playerTrail) {
      if (this.playerTrail.geometry) this.playerTrail.geometry.dispose()
      if (this.playerTrail.material) this.playerTrail.material.dispose()
    }

    // Remove event listeners
    if (this.handleKeyDown) window.removeEventListener('keydown', this.handleKeyDown)
    if (this.handleKeyUp) window.removeEventListener('keyup', this.handleKeyUp)
  }

  clear() {
    for (let r = 0; r < this.rings; r++) {
      if (this.heightMap[r]) {
        this.heightMap[r].fill(0)
      }
      // Reset paint layer
      if (this.paintLayer[r]) {
        for (let s = 0; s < this.segments; s++) {
          if (this.paintLayer[r][s]) {
            this.paintLayer[r][s] = { r: 0, g: 0, b: 0, intensity: 0 }
          }
        }
      }
    }
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
    this.scrollOffset = 0
    this.tunnelRotation = 0
    this.recentMax = 0.3

    // Reset particle trails and positions
    for (const p of this.particles) {
      p.trail = []
      p.radius = 3 + Math.random() * (this.baseRadius - 6)
    }

    // Reset player
    this.playerAngle = Math.PI / 2
    this.keys = { left: false, right: false }

    // Reset drop state
    this.isDropping = false
    this.dropTimer = 0
    this.frozenParticleVelocities = null

    // Reset materials to normal
    if (this.solidMaterial) {
      this.solidMaterial.side = THREE.BackSide
      this.solidMaterial.opacity = 1
      this.solidMaterial.transparent = false
    }
    if (this.wireMaterial) {
      this.wireMaterial.opacity = 0.2
    }

    // Reinitialize the scrambled frequency mapping
    this.initFrequencyMapping()
  }
}
