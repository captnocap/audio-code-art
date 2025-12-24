import * as THREE from 'three'
import { Visualization3DMode } from './base.js'
import { tuner } from '../tuner.js'

// 3D Beach Tides - Sound waves as ocean waves with displacement
// Sand remembers. Shells deposit. Tide pools form. Water is "wrong".
export class Beach3DMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'beach3d'
    this.description = 'Sound as ocean tides in 3D. Sand remembers wave patterns.'

    // Beach dimensions
    this.beachWidth = 100
    this.beachDepth = 80
    this.resolution = 128

    // Meshes
    this.sandMesh = null
    this.waterMesh = null
    this.foamParticles = null

    // Height/displacement data
    this.sandHeights = null
    this.waterHeights = null
    this.waterVelocity = null
    this.sedimentMemory = null

    // Shells and debris
    this.shells = []
    this.maxShells = 100

    // Tide pools
    this.tidePools = []

    // Wave sources
    this.waveSources = []

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothLeft = 0
    this.smoothRight = 0
    this.smoothAmplitude = 0
    this.sustainedEnergy = 0

    // Time
    this.time = 0
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Initialize height arrays
    const res = this.resolution
    this.sandHeights = new Float32Array(res * res)
    this.waterHeights = new Float32Array(res * res)
    this.waterVelocity = new Float32Array(res * res)
    this.sedimentMemory = new Float32Array(res * res)

    // Generate base sand terrain
    this.generateSandTerrain()

    // Create sand mesh
    this.createSandMesh(scene)

    // Create water mesh
    this.createWaterMesh(scene)

    // Create foam particles
    this.createFoamParticles(scene)

    // Lighting
    const ambient = new THREE.AmbientLight(0x87ceeb, 0.5)
    scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xfffacd, 1.2)
    sun.position.set(50, 80, 30)
    sun.castShadow = true
    sun.shadow.mapSize.width = 2048
    sun.shadow.mapSize.height = 2048
    scene.add(sun)

    // Hemisphere light for sky color
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0xc9b477, 0.6)
    scene.add(hemi)

    // Camera position - looking down at beach from angle
    camera.position.set(0, 60, 70)
    camera.lookAt(0, 0, 0)

    // Sky background
    scene.background = new THREE.Color(0x87ceeb)

    // Spawn initial shells
    for (let i = 0; i < 30; i++) {
      this.spawnShell(scene)
    }
  }

  generateSandTerrain() {
    const res = this.resolution
    for (let z = 0; z < res; z++) {
      for (let x = 0; x < res; x++) {
        const idx = z * res + x

        // Beach slope - higher at back (z=0), lower at front (z=res)
        const slope = (res - z) / res * 8

        // Natural sand ripples
        const ripple = Math.sin(x * 0.3) * 0.3 +
                      Math.sin(z * 0.2 + x * 0.1) * 0.2 +
                      Math.sin(x * 0.5 + z * 0.3) * 0.15

        this.sandHeights[idx] = slope + ripple

        // Initialize water at sea level (front of beach)
        this.waterHeights[idx] = z > res * 0.6 ? 0 : -1 // Below sand at back
      }
    }
  }

  createSandMesh(scene) {
    const res = this.resolution
    const geometry = new THREE.PlaneGeometry(
      this.beachWidth, this.beachDepth,
      res - 1, res - 1
    )
    geometry.rotateX(-Math.PI / 2)

    // Apply heights to vertices
    const positions = geometry.attributes.position.array
    for (let i = 0; i < res * res; i++) {
      positions[i * 3 + 1] = this.sandHeights[i]
    }
    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()

    // Sand material with custom shader for wet sand effect
    const material = new THREE.MeshStandardMaterial({
      color: 0xe8d5a3,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    })

    this.sandMesh = new THREE.Mesh(geometry, material)
    this.sandMesh.receiveShadow = true
    scene.add(this.sandMesh)

    // Create sediment layer meshes
    this.sedimentLayers = []
    for (let i = 0; i < 5; i++) {
      const sedimentGeom = new THREE.PlaneGeometry(
        this.beachWidth, this.beachDepth,
        res - 1, res - 1
      )
      sedimentGeom.rotateX(-Math.PI / 2)

      const sedimentMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.1, 0.3, 0.5 + i * 0.05),
        transparent: true,
        opacity: 0.15,
        roughness: 1
      })

      const sedimentMesh = new THREE.Mesh(sedimentGeom, sedimentMat)
      sedimentMesh.position.y = 0.05 + i * 0.02
      scene.add(sedimentMesh)
      this.sedimentLayers.push(sedimentMesh)
    }
  }

  createWaterMesh(scene) {
    const res = this.resolution
    const geometry = new THREE.PlaneGeometry(
      this.beachWidth, this.beachDepth * 0.7, // Water only covers front portion
      res - 1, Math.floor(res * 0.7) - 1
    )
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(0, 0, this.beachDepth * 0.15) // Offset toward front

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x1a5f7a,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.3,
      thickness: 0.5
    })

    this.waterMesh = new THREE.Mesh(geometry, material)
    this.waterMesh.position.y = 1
    scene.add(this.waterMesh)
  }

  createFoamParticles(scene) {
    const count = 5000
    const geometry = new THREE.BufferGeometry()

    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const opacities = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.beachWidth
      positions[i * 3 + 1] = -10 // Start hidden
      positions[i * 3 + 2] = Math.random() * this.beachDepth * 0.5

      sizes[i] = 0.3 + Math.random() * 0.5
      opacities[i] = 0
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true
    })

    this.foamParticles = new THREE.Points(geometry, material)
    scene.add(this.foamParticles)

    this.foamData = []
    for (let i = 0; i < count; i++) {
      this.foamData.push({
        active: false,
        life: 0,
        velocity: new THREE.Vector3()
      })
    }
  }

  spawnShell(scene) {
    if (this.shells.length >= this.maxShells) return

    const types = ['spiral', 'clam', 'starfish', 'pebble']
    const type = types[Math.floor(Math.random() * types.length)]

    let geometry
    const size = 0.3 + Math.random() * 0.7

    switch (type) {
      case 'spiral':
        geometry = new THREE.TorusKnotGeometry(size * 0.3, size * 0.1, 32, 8)
        break
      case 'clam':
        geometry = new THREE.SphereGeometry(size * 0.5, 8, 4)
        geometry.scale(1, 0.3, 0.8)
        break
      case 'starfish':
        geometry = new THREE.ConeGeometry(size * 0.4, size * 0.1, 5)
        geometry.rotateX(Math.PI / 2)
        break
      default:
        geometry = new THREE.SphereGeometry(size * 0.3, 8, 6)
        geometry.scale(1, 0.6, 0.8)
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.08 + Math.random() * 0.05, 0.3, 0.6),
      roughness: 0.7
    })

    const shell = new THREE.Mesh(geometry, material)
    shell.position.set(
      (Math.random() - 0.5) * this.beachWidth * 0.8,
      0.2,
      (Math.random() - 0.3) * this.beachDepth * 0.5
    )
    shell.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI
    )
    shell.castShadow = true

    scene.add(shell)
    this.shells.push({
      mesh: shell,
      type: type,
      velocity: new THREE.Vector3(),
      grounded: true
    })
  }

  spawnWave(intensity, angle, x) {
    this.waveSources.push({
      x: x,
      z: this.beachDepth * 0.5, // Start from sea
      angle: angle,
      intensity: intensity,
      progress: 0,
      width: 20 + Math.random() * 20,
      speed: 0.5 + intensity * 0.5,
      active: true
    })
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    const params = tuner.getAll()
    const { bass, mid, high, amplitude, leftChannel, rightChannel, centroid } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    this.time = elapsed

    // Smooth audio
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Stereo (simulate if not available)
    const left = leftChannel !== undefined ? leftChannel : amplitude * (0.5 + Math.sin(elapsed) * 0.2)
    const right = rightChannel !== undefined ? rightChannel : amplitude * (0.5 - Math.sin(elapsed) * 0.2)
    this.smoothLeft += (left - this.smoothLeft) * smoothing
    this.smoothRight += (right - this.smoothRight) * smoothing

    this.sustainedEnergy = this.sustainedEnergy * 0.99 + amplitude * 0.01

    // BEATS SPAWN WAVES
    if (onBeat && beatIntensity > 0.2) {
      const stereoBalance = this.smoothLeft - this.smoothRight

      // Wave angle based on stereo - "wrong" water from multiple directions
      const angle = stereoBalance * Math.PI * 0.4

      // Wave position based on stereo
      const waveX = stereoBalance * this.beachWidth * 0.3

      this.spawnWave(beatIntensity, angle, waveX)

      // Strong beats spawn shells
      if (beatIntensity > 0.6 && Math.random() < 0.5) {
        this.spawnShell(this.scene)
      }
    }

    // Update waves and water
    this.updateWater(delta)

    // Update foam
    this.updateFoam(delta)

    // Update shells
    this.updateShells(delta)

    // Update sediment memory
    this.updateSediment()
  }

  updateWater(delta) {
    const res = this.resolution
    const waterPos = this.waterMesh.geometry.attributes.position.array

    // Reset velocity damping
    for (let i = 0; i < this.waterVelocity.length; i++) {
      this.waterVelocity[i] *= 0.97
    }

    // Process wave sources
    for (const wave of this.waveSources) {
      if (!wave.active) continue

      wave.progress += wave.speed * delta * 2

      // Wave reaches further based on intensity
      const maxReach = this.beachDepth * 0.3 * wave.intensity

      for (let z = 0; z < res; z++) {
        for (let x = 0; x < res; x++) {
          const idx = z * res + x

          // World position
          const wx = (x / res - 0.5) * this.beachWidth
          const wz = (z / res - 0.5) * this.beachDepth

          // Distance from wave source (accounting for angle)
          const dx = wx - wave.x
          const dz = wz - this.beachDepth * 0.4 // Wave origin

          // Rotated by wave angle
          const rotatedDz = dz * Math.cos(wave.angle) - dx * Math.sin(wave.angle)

          // Wave influence
          const distFromWave = Math.abs(rotatedDz - wave.progress * maxReach)
          const lateralDist = Math.abs(dx * Math.cos(wave.angle) + dz * Math.sin(wave.angle))

          if (distFromWave < 5 && lateralDist < wave.width) {
            const waveHeight = Math.sin((1 - distFromWave / 5) * Math.PI) *
                              wave.intensity * 2 *
                              Math.exp(-lateralDist * lateralDist / (wave.width * wave.width))

            this.waterVelocity[idx] += waveHeight * 0.1

            // Spawn foam at wave crest
            if (waveHeight > 0.5 && Math.random() < 0.1) {
              this.activateFoam(wx, waveHeight + 1, wz)
            }
          }
        }
      }

      // Deactivate old waves
      if (wave.progress > 1.5) {
        wave.active = false
      }
    }

    // Clean up inactive waves
    this.waveSources = this.waveSources.filter(w => w.active)

    // Apply velocity to water heights and update mesh
    const waterRes = Math.floor(res * 0.7)
    for (let z = 0; z < waterRes; z++) {
      for (let x = 0; x < res; x++) {
        const waterIdx = z * res + x
        const meshIdx = z * res + x

        // Apply velocity
        this.waterHeights[waterIdx] += this.waterVelocity[waterIdx]

        // Gravity pulls water back
        this.waterVelocity[waterIdx] -= this.waterHeights[waterIdx] * 0.02

        // Add wave detail
        const detailWave = Math.sin(x * 0.3 + this.time * 2) * 0.1 +
                          Math.sin(z * 0.2 + this.time * 1.5) * 0.15 +
                          Math.sin(x * 0.5 + z * 0.3 + this.time * 3) * 0.05

        // Update mesh
        if (meshIdx * 3 + 1 < waterPos.length) {
          const baseHeight = 1 + this.smoothAmplitude * 0.5
          waterPos[meshIdx * 3 + 1] = baseHeight + this.waterHeights[waterIdx] + detailWave
        }
      }
    }

    this.waterMesh.geometry.attributes.position.needsUpdate = true
    this.waterMesh.geometry.computeVertexNormals()

    // Update water color based on depth
    const waterDepth = 0.3 + this.smoothBass * 0.3
    this.waterMesh.material.color.setHSL(0.55, 0.6, 0.3 + waterDepth * 0.2)
  }

  activateFoam(x, y, z) {
    const positions = this.foamParticles.geometry.attributes.position.array

    for (let i = 0; i < this.foamData.length; i++) {
      if (!this.foamData[i].active) {
        this.foamData[i].active = true
        this.foamData[i].life = 1
        this.foamData[i].velocity.set(
          (Math.random() - 0.5) * 2,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 2
        )

        positions[i * 3] = x + (Math.random() - 0.5) * 2
        positions[i * 3 + 1] = y
        positions[i * 3 + 2] = z + (Math.random() - 0.5) * 2
        break
      }
    }
  }

  updateFoam(delta) {
    const positions = this.foamParticles.geometry.attributes.position.array

    for (let i = 0; i < this.foamData.length; i++) {
      if (this.foamData[i].active) {
        this.foamData[i].life -= delta * 0.5

        // Move foam
        positions[i * 3] += this.foamData[i].velocity.x * delta * 10
        positions[i * 3 + 1] += this.foamData[i].velocity.y * delta * 10
        positions[i * 3 + 2] += this.foamData[i].velocity.z * delta * 10

        // Gravity
        this.foamData[i].velocity.y -= delta * 2

        // Fade out and settle
        if (positions[i * 3 + 1] < 0.5) {
          positions[i * 3 + 1] = 0.5
          this.foamData[i].velocity.multiplyScalar(0.9)
        }

        if (this.foamData[i].life <= 0) {
          this.foamData[i].active = false
          positions[i * 3 + 1] = -10 // Hide
        }
      }
    }

    this.foamParticles.geometry.attributes.position.needsUpdate = true
  }

  updateShells(delta) {
    for (const shell of this.shells) {
      // Check if shell is in water
      const x = (shell.mesh.position.x / this.beachWidth + 0.5) * this.resolution
      const z = (shell.mesh.position.z / this.beachDepth + 0.5) * this.resolution
      const idx = Math.floor(z) * this.resolution + Math.floor(x)

      if (idx >= 0 && idx < this.waterHeights.length) {
        const waterHeight = 1 + this.waterHeights[idx]

        if (shell.mesh.position.y < waterHeight + 0.5) {
          // Shell in water - drift
          shell.grounded = false
          shell.velocity.x += (Math.random() - 0.5) * 0.1
          shell.velocity.z += this.waterVelocity[idx] * 0.5

          shell.mesh.position.x += shell.velocity.x * delta * 5
          shell.mesh.position.z += shell.velocity.z * delta * 5
          shell.mesh.rotation.y += delta * 2

          // Float
          shell.mesh.position.y = waterHeight + 0.1
        } else {
          // Shell on sand
          shell.grounded = true
          shell.velocity.multiplyScalar(0.95)

          // Settle into sand
          shell.mesh.position.y = Math.max(0.1, shell.mesh.position.y - delta * 0.5)
        }
      }

      // Keep on beach
      shell.mesh.position.x = Math.max(-this.beachWidth/2, Math.min(this.beachWidth/2, shell.mesh.position.x))
      shell.mesh.position.z = Math.max(-this.beachDepth/2, Math.min(this.beachDepth/2, shell.mesh.position.z))
    }
  }

  updateSediment() {
    const res = this.resolution

    // Where water reaches leaves sediment marks
    for (let z = 0; z < res; z++) {
      for (let x = 0; x < res; x++) {
        const idx = z * res + x
        if (this.waterHeights[idx] > 0.1) {
          this.sedimentMemory[idx] += this.waterHeights[idx] * 0.01
          this.sedimentMemory[idx] = Math.min(1, this.sedimentMemory[idx])
        }
      }
    }

    // Update sediment layer visuals
    for (let l = 0; l < this.sedimentLayers.length; l++) {
      const layer = this.sedimentLayers[l]
      const positions = layer.geometry.attributes.position.array

      for (let i = 0; i < res * res; i++) {
        // Each layer shows different sediment levels
        const threshold = l * 0.2
        const height = this.sedimentMemory[i] > threshold
          ? this.sandHeights[i] + 0.1 + l * 0.03
          : -10 // Hide

        positions[i * 3 + 1] = height
      }

      layer.geometry.attributes.position.needsUpdate = true
    }
  }

  render(renderer, scene, camera) {
    renderer.render(scene, camera)
  }

  dispose() {
    // Clean up geometries and materials
    if (this.sandMesh) {
      this.sandMesh.geometry.dispose()
      this.sandMesh.material.dispose()
    }
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose()
      this.waterMesh.material.dispose()
    }
    if (this.foamParticles) {
      this.foamParticles.geometry.dispose()
      this.foamParticles.material.dispose()
    }
    for (const layer of this.sedimentLayers || []) {
      layer.geometry.dispose()
      layer.material.dispose()
    }
    for (const shell of this.shells) {
      shell.mesh.geometry.dispose()
      shell.mesh.material.dispose()
    }
  }

  clear() {
    // Reset water
    for (let i = 0; i < this.waterHeights.length; i++) {
      this.waterHeights[i] = 0
      this.waterVelocity[i] = 0
    }

    // Clear waves
    this.waveSources = []

    // Reset sediment
    for (let i = 0; i < this.sedimentMemory.length; i++) {
      this.sedimentMemory[i] = 0
    }

    // Remove excess shells
    while (this.shells.length > 30) {
      const shell = this.shells.pop()
      this.scene.remove(shell.mesh)
      shell.mesh.geometry.dispose()
      shell.mesh.material.dispose()
    }
  }
}
