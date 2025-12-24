import * as THREE from 'three'
import { Visualization3DMode } from './base.js'

// Nebula Mode - Particle cloud that breathes with audio
// Thousands of particles forming cosmic clouds
export class NebulaMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'nebula3d'
    this.description = 'Cosmic particle nebula that breathes with audio'

    this.particleSystems = []
    this.attractors = []
    this.coreGlow = null

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Velocity storage for particles
    this.velocities = []
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Create multiple particle layers
    this.createParticleCloud(scene, 50000, 0x8844ff, 8, 'main')
    this.createParticleCloud(scene, 20000, 0x00ffff, 5, 'inner')
    this.createParticleCloud(scene, 10000, 0xff4488, 3, 'core')

    // Create core glow
    this.createCoreGlow(scene)

    // Create attractors that particles will orbit
    this.createAttractors(scene)

    // Ambient light
    const ambient = new THREE.AmbientLight(0x111111)
    scene.add(ambient)

    // Position camera
    camera.position.set(0, 5, 15)
    camera.lookAt(0, 0, 0)
  }

  createParticleCloud(scene, count, color, spread, name) {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const velocities = new Float32Array(count * 3)

    const baseColor = new THREE.Color(color)

    for (let i = 0; i < count; i++) {
      // Gaussian distribution for natural cloud look
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = this.gaussianRandom() * spread

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Color variation
      const hueShift = (Math.random() - 0.5) * 0.2
      const colorVariant = baseColor.clone()
      colorVariant.offsetHSL(hueShift, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2)

      colors[i * 3] = colorVariant.r
      colors[i * 3 + 1] = colorVariant.g
      colors[i * 3 + 2] = colorVariant.b

      sizes[i] = Math.random() * 0.1 + 0.02

      // Initial velocities (orbital motion)
      const speed = 0.01 + Math.random() * 0.02
      velocities[i * 3] = (Math.random() - 0.5) * speed
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // Custom shader material for better particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        audioAmplitude: { value: 0 },
        pointSize: { value: 2.0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float audioAmplitude;
        uniform float pointSize;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pointSize * (300.0 / -mvPosition.z) * (1.0 + audioAmplitude * 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const particles = new THREE.Points(geometry, material)
    particles.name = name
    scene.add(particles)

    this.particleSystems.push({
      mesh: particles,
      velocities: velocities,
      spread: spread,
      originalPositions: positions.slice()
    })
  }

  gaussianRandom() {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  createCoreGlow(scene) {
    // Glowing core sphere
    const geometry = new THREE.SphereGeometry(0.5, 32, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    })
    this.coreGlow = new THREE.Mesh(geometry, material)
    scene.add(this.coreGlow)

    // Glow sprite
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.createGlowTexture(),
      color: 0x8844ff,
      transparent: true,
      blending: THREE.AdditiveBlending
    })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(4, 4, 1)
    this.coreGlow.add(sprite)
  }

  createGlowTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.2, 'rgba(255, 200, 255, 0.8)')
    gradient.addColorStop(0.5, 'rgba(128, 0, 255, 0.3)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)

    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }

  createAttractors(scene) {
    // Hidden attractor points that influence particle motion
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const attractor = new THREE.Vector3(
        Math.cos(angle) * 3,
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * 3
      )
      this.attractors.push({
        position: attractor,
        strength: 0.5 + Math.random() * 0.5,
        orbitSpeed: 0.2 + Math.random() * 0.3
      })
    }
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { bass, mid, high, amplitude, centroid } = weighted
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    // Smooth audio values
    const smoothing = 0.08
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Update attractors (orbit them)
    for (const attractor of this.attractors) {
      const angle = elapsed * attractor.orbitSpeed
      attractor.position.x = Math.cos(angle) * (3 + this.smoothBass * 2)
      attractor.position.z = Math.sin(angle) * (3 + this.smoothBass * 2)
      attractor.position.y = Math.sin(elapsed * 0.5) * 2 * this.smoothMid
    }

    // Update particle systems
    for (const system of this.particleSystems) {
      const positions = system.mesh.geometry.attributes.position.array
      const velocities = system.velocities

      // Update shader uniforms
      system.mesh.material.uniforms.time.value = elapsed
      system.mesh.material.uniforms.audioAmplitude.value = this.smoothAmplitude

      // Update particles
      for (let i = 0; i < positions.length; i += 3) {
        // Apply attractor forces
        for (const attractor of this.attractors) {
          const dx = attractor.position.x - positions[i]
          const dy = attractor.position.y - positions[i + 1]
          const dz = attractor.position.z - positions[i + 2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1

          const force = attractor.strength * this.smoothAmplitude / (dist * dist) * 0.01
          velocities[i] += dx / dist * force
          velocities[i + 1] += dy / dist * force
          velocities[i + 2] += dz / dist * force
        }

        // Orbital motion (cross product for perpendicular velocity)
        const x = positions[i]
        const y = positions[i + 1]
        const z = positions[i + 2]
        const dist = Math.sqrt(x * x + y * y + z * z) + 0.1

        velocities[i] += -z / dist * 0.0005 * (1 + this.smoothMid)
        velocities[i + 2] += x / dist * 0.0005 * (1 + this.smoothMid)

        // Damping
        velocities[i] *= 0.99
        velocities[i + 1] *= 0.99
        velocities[i + 2] *= 0.99

        // Apply velocity
        positions[i] += velocities[i]
        positions[i + 1] += velocities[i + 1]
        positions[i + 2] += velocities[i + 2]

        // Keep particles within bounds (soft boundary)
        const maxDist = system.spread * 1.5
        if (dist > maxDist) {
          const factor = maxDist / dist
          positions[i] *= factor
          positions[i + 1] *= factor
          positions[i + 2] *= factor
        }
      }

      system.mesh.geometry.attributes.position.needsUpdate = true

      // Rotation
      system.mesh.rotation.y += 0.001 * normalizedTempo
    }

    // Beat response - push particles outward
    if (onBeat && beatIntensity > 0.5) {
      for (const system of this.particleSystems) {
        const velocities = system.velocities
        const positions = system.mesh.geometry.attributes.position.array

        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i]
          const y = positions[i + 1]
          const z = positions[i + 2]
          const dist = Math.sqrt(x * x + y * y + z * z) + 0.1

          const pushForce = beatIntensity * 0.1
          velocities[i] += (x / dist) * pushForce
          velocities[i + 1] += (y / dist) * pushForce
          velocities[i + 2] += (z / dist) * pushForce
        }
      }
    }

    // Update core glow
    if (this.coreGlow) {
      const scale = 1 + this.smoothBass * 0.5
      this.coreGlow.scale.set(scale, scale, scale)

      // Color shift with pitch
      const hue = centroid
      const color = new THREE.Color()
      color.setHSL(hue * 0.8, 0.8, 0.5 + this.smoothAmplitude * 0.3)
      this.coreGlow.children[0].material.color = color
    }
  }

  dispose() {
    for (const system of this.particleSystems) {
      system.mesh.geometry.dispose()
      system.mesh.material.dispose()
    }
    if (this.coreGlow) {
      this.coreGlow.geometry.dispose()
      this.coreGlow.material.dispose()
    }
  }

  clear() {
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
  }
}
