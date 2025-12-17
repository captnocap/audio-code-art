import * as THREE from 'three'
import { Visualization3DMode } from './base.js'

// Pulsing Geometry Mode
// Platonic solids that morph, pulse, and explode with audio
export class GeometryMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'geometry3d'
    this.description = 'Pulsing 3D geometry that morphs with audio'

    this.mainMesh = null
    this.wireframeMesh = null
    this.particles = null
    this.rings = []

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Original geometry for morphing
    this.originalPositions = null
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Create main icosahedron
    const geometry = new THREE.IcosahedronGeometry(2, 4)
    this.originalPositions = geometry.attributes.position.array.slice()

    // Main material - iridescent look
    const material = new THREE.MeshStandardMaterial({
      color: 0x8844ff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x220044,
      emissiveIntensity: 0.5,
      flatShading: true
    })

    this.mainMesh = new THREE.Mesh(geometry, material)
    scene.add(this.mainMesh)

    // Wireframe overlay
    const wireGeometry = new THREE.IcosahedronGeometry(2.02, 2)
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    })
    this.wireframeMesh = new THREE.Mesh(wireGeometry, wireMaterial)
    scene.add(this.wireframeMesh)

    // Orbiting particles
    this.createParticles(scene)

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xff00ff, 1, 100)
    pointLight.position.set(5, 5, 5)
    scene.add(pointLight)

    const pointLight2 = new THREE.PointLight(0x00ffff, 1, 100)
    pointLight2.position.set(-5, -5, 5)
    scene.add(pointLight2)

    // Create initial rings
    for (let i = 0; i < 3; i++) {
      this.createRing(scene, 2.5 + i * 0.5)
    }

    // Position camera
    camera.position.set(0, 0, 8)
  }

  createParticles(scene) {
    const particleCount = 2000
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      // Distribute on sphere surface
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 3 + Math.random() * 2

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Random colors in purple/cyan range
      colors[i * 3] = 0.5 + Math.random() * 0.5
      colors[i * 3 + 1] = Math.random() * 0.5
      colors[i * 3 + 2] = 0.5 + Math.random() * 0.5

      sizes[i] = Math.random() * 3 + 1
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })

    this.particles = new THREE.Points(geometry, material)
    scene.add(this.particles)
  }

  createRing(scene, radius) {
    const geometry = new THREE.TorusGeometry(radius, 0.02, 8, 64)
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5
    })
    const ring = new THREE.Mesh(geometry, material)

    // Random orientation
    ring.rotation.x = Math.random() * Math.PI
    ring.rotation.y = Math.random() * Math.PI

    scene.add(ring)
    this.rings.push(ring)
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    // Smooth audio values
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Update main geometry
    if (this.mainMesh) {
      // Rotation based on tempo
      this.mainMesh.rotation.x += 0.005 + normalizedTempo * 0.02
      this.mainMesh.rotation.y += 0.01 + this.smoothMid * 0.05

      // Scale pulse with bass
      const scale = 1 + this.smoothBass * 0.5
      this.mainMesh.scale.set(scale, scale, scale)

      // Morph geometry with audio
      const positions = this.mainMesh.geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 3) {
        const ox = this.originalPositions[i]
        const oy = this.originalPositions[i + 1]
        const oz = this.originalPositions[i + 2]

        // Displacement based on audio
        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz)
        const noiseScale = 0.3 + this.smoothHigh * 0.5
        const displacement = Math.sin(elapsed * 2 + dist * 5) * noiseScale * this.smoothAmplitude

        const factor = 1 + displacement / dist
        positions[i] = ox * factor
        positions[i + 1] = oy * factor
        positions[i + 2] = oz * factor
      }
      this.mainMesh.geometry.attributes.position.needsUpdate = true

      // Color shift with pitch
      const hue = centroid * 0.8
      this.mainMesh.material.color.setHSL(hue, 0.8, 0.5)
      this.mainMesh.material.emissive.setHSL(hue, 0.8, 0.2)
      this.mainMesh.material.emissiveIntensity = 0.3 + this.smoothAmplitude * 0.7
    }

    // Update wireframe
    if (this.wireframeMesh) {
      this.wireframeMesh.rotation.copy(this.mainMesh.rotation)
      this.wireframeMesh.scale.copy(this.mainMesh.scale)
      this.wireframeMesh.scale.multiplyScalar(1.02)
      this.wireframeMesh.material.opacity = 0.2 + this.smoothHigh * 0.5
    }

    // Update particles
    if (this.particles) {
      this.particles.rotation.y += 0.002
      this.particles.rotation.x += 0.001

      const positions = this.particles.geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 3) {
        // Subtle pulsing
        const dist = Math.sqrt(
          positions[i] ** 2 +
          positions[i + 1] ** 2 +
          positions[i + 2] ** 2
        )
        const targetDist = 3 + this.smoothBass * 2 + Math.sin(elapsed + i * 0.01) * 0.5

        const factor = targetDist / dist
        positions[i] *= 0.99 + factor * 0.01
        positions[i + 1] *= 0.99 + factor * 0.01
        positions[i + 2] *= 0.99 + factor * 0.01
      }
      this.particles.geometry.attributes.position.needsUpdate = true

      // Beat explosion
      if (onBeat && beatIntensity > 0.5) {
        for (let i = 0; i < positions.length; i += 3) {
          const dist = Math.sqrt(
            positions[i] ** 2 +
            positions[i + 1] ** 2 +
            positions[i + 2] ** 2
          )
          const factor = 1 + beatIntensity * 0.3
          positions[i] *= factor
          positions[i + 1] *= factor
          positions[i + 2] *= factor
        }
        this.particles.geometry.attributes.position.needsUpdate = true
      }
    }

    // Update rings
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i]
      ring.rotation.x += 0.01 * (i + 1)
      ring.rotation.z += 0.005 * (i + 1)

      // Scale with different frequency bands
      const band = i % 3 === 0 ? this.smoothBass : (i % 3 === 1 ? this.smoothMid : this.smoothHigh)
      const scale = 1 + band * 0.3
      ring.scale.set(scale, scale, scale)

      // Opacity pulse
      ring.material.opacity = 0.3 + band * 0.5
    }
  }

  dispose() {
    // Clean up
    if (this.mainMesh) {
      this.mainMesh.geometry.dispose()
      this.mainMesh.material.dispose()
    }
    if (this.wireframeMesh) {
      this.wireframeMesh.geometry.dispose()
      this.wireframeMesh.material.dispose()
    }
    if (this.particles) {
      this.particles.geometry.dispose()
      this.particles.material.dispose()
    }
    for (const ring of this.rings) {
      ring.geometry.dispose()
      ring.material.dispose()
    }
  }

  clear() {
    // Reset to initial state
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
  }
}
