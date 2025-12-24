import * as THREE from 'three'
import { Visualization3DMode } from './base.js'

export class GravityMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'gravity3d'
    this.description = 'Audio Mass: Bass sucks, Treble blows'
    this.particleCount = 15000
    this.particles = null
    this.velocities = null // Float32Array
    this.colors = null
    this.geometry = null
    this.material = null
    this.star = null // Central object
    this.starLight = null
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Camera setup
    this.camera.position.set(0, 20, 40)
    this.camera.lookAt(0, 0, 0)

    // Create Central Star (The Source)
    const starGeo = new THREE.IcosahedronGeometry(2, 2)
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    })
    this.star = new THREE.Mesh(starGeo, starMat)
    this.scene.add(this.star)

    // Add a point light at the center
    this.starLight = new THREE.PointLight(0xffffff, 1, 100)
    this.scene.add(this.starLight)

    // Create Particles
    this.geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(this.particleCount * 3)
    this.velocities = new Float32Array(this.particleCount * 3)
    const colors = new Float32Array(this.particleCount * 3)

    const color1 = new THREE.Color(0x00ffff) // Cyan
    const color2 = new THREE.Color(0xff00ff) // Magenta

    for (let i = 0; i < this.particleCount; i++) {
      // Random sphere distribution
      const r = 10 + Math.random() * 30
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      // Initial orbital velocity (tangential)
      const speed = 0.05
      // Cross product of position and up vector to get tangent
      const posVec = new THREE.Vector3(x, y, z).normalize()
      const upVec = new THREE.Vector3(0, 1, 0)
      const tanVec = new THREE.Vector3().crossVectors(posVec, upVec).normalize()

      // Add some randomness to velocity
      this.velocities[i * 3] = tanVec.x * speed + (Math.random() - 0.5) * 0.01
      this.velocities[i * 3 + 1] = tanVec.y * speed + (Math.random() - 0.5) * 0.01
      this.velocities[i * 3 + 2] = tanVec.z * speed + (Math.random() - 0.5) * 0.01

      // Mix colors based on radius
      const mixedColor = color1.clone().lerp(color2, Math.random())
      colors[i * 3] = mixedColor.r
      colors[i * 3 + 1] = mixedColor.g
      colors[i * 3 + 2] = mixedColor.b
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    this.material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.8
    })

    this.particles = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.particles)
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    if (!audioFeatures) return

    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)

    const positions = this.geometry.attributes.position.array
    const count = this.particleCount

    // Audio Physics Constants
    // Bass (Attraction) - The Black Hole Effect
    // High Bass values create strong negative force (inward)
    const gravityStrength = weighted.bass * 2.0

    // Treble (Repulsion) - The Supernova Effect
    // High Treble values create positive force (outward)
    const repulsionStrength = weighted.high * 4.0

    // Mid (Turbulence/Color)
    const turbulence = audioFeatures.mid * 0.5

    // Update Star
    const scale = 1 + audioFeatures.bass * 2
    this.star.scale.set(scale, scale, scale)
    this.star.rotation.y += delta * (0.5 + audioFeatures.mid)
    this.star.rotation.z += delta * (0.2 + audioFeatures.high)
    
    // Pulse light
    this.starLight.intensity = 1 + audioFeatures.bass * 5
    this.starLight.color.setHSL(elapsed * 0.1, 1, 0.5)

    // Update Particles
    for (let i = 0; i < count; i++) {
      const idx = i * 3
      const x = positions[idx]
      const y = positions[idx + 1]
      const z = positions[idx + 2]

      // Distance from center
      const distSq = x*x + y*y + z*z
      const dist = Math.sqrt(distSq)
      
      // Normalized direction vector
      const nx = x / dist
      const ny = y / dist
      const nz = z / dist

      // Calculate Force
      // F = G * (M1 * M2) / r^2
      // We'll simplify. 
      // Base gravity to keep them in orbit
      const baseGravity = 5.0 / distSq 
      
      // Audio Gravity: 
      // If Bass is high, add strong inward force.
      // If Treble is high, add strong outward force.
      // Net Force = (Repulsion - Attraction)
      // We want gravity to be dominant usually, but treble to override it.
      
      let force = -baseGravity // Always pulling in slightly
      
      // Add Audio Forces
      force -= gravityStrength * (50.0 / (distSq + 0.1)) // Bass sucks in hard, especially close up
      force += repulsionStrength * (20.0 / (dist + 0.1)) // Treble pushes out
      
      // Apply Force to Velocity
      this.velocities[idx] += nx * force * delta
      this.velocities[idx+1] += ny * force * delta
      this.velocities[idx+2] += nz * force * delta

      // Apply Turbulence (Mid frequencies scramble velocity direction slightly)
      if (turbulence > 0.1) {
        this.velocities[idx] += (Math.random() - 0.5) * turbulence * delta
        this.velocities[idx+1] += (Math.random() - 0.5) * turbulence * delta
        this.velocities[idx+2] += (Math.random() - 0.5) * turbulence * delta
      }

      // Drag/Damping to prevent explosion
      const damping = 0.98
      this.velocities[idx] *= damping
      this.velocities[idx+1] *= damping
      this.velocities[idx+2] *= damping

      // Update Position
      positions[idx] += this.velocities[idx]
      positions[idx+1] += this.velocities[idx+1]
      positions[idx+2] += this.velocities[idx+2]

      // Boundary Check - Don't let them fly off forever
      // If too far, reset to random position on outer rim
      // If too close (sucked into black hole), reset to outer rim
      const maxDist = 100
      const minDist = 1
      
      if (dist > maxDist || dist < minDist) {
        // Respawn
        const r = 20 + Math.random() * 20
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        
        positions[idx] = r * Math.sin(phi) * Math.cos(theta)
        positions[idx+1] = r * Math.sin(phi) * Math.sin(theta)
        positions[idx+2] = r * Math.cos(phi)
        
        // Reset velocity
        this.velocities[idx] = 0
        this.velocities[idx+1] = 0
        this.velocities[idx+2] = 0
      }
    }

    this.geometry.attributes.position.needsUpdate = true
    
    // Rotate the whole system slowly
    this.particles.rotation.y += delta * 0.05
  }

  dispose() {
    if (this.geometry) this.geometry.dispose()
    if (this.material) this.material.dispose()
    if (this.star) {
      this.scene.remove(this.star)
      this.star.geometry.dispose()
      this.star.material.dispose()
    }
    if (this.starLight) this.scene.remove(this.starLight)
    if (this.particles) this.scene.remove(this.particles)
  }
}
