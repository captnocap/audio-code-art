import * as THREE from 'three'
import * as OIMO from 'oimo'
import { Visualization3DMode } from './base.js'
import { tuner } from '../tuner.js'

// Audio Demolition Mode - Physics structures that audio destroys
// Bass shakes. Beats explode. Silence rebuilds.
export class DemolitionMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'demolition3d'
    this.description = 'Physics structures destroyed by audio. Bass shakes. Beats explode.'

    // Physics world
    this.world = null

    // Physics bodies and their Three.js meshes
    this.bodies = []
    this.groundBody = null

    // Structure state
    this.structureType = 'tower' // tower, wall, pyramid, random
    this.isRebuilding = false
    this.rebuildProgress = 0
    this.lastBeatTime = 0

    // Explosion tracking
    this.explosions = []

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Debris tracking
    this.debris = []
    this.maxDebris = 500

    // Containment bounds
    this.boundsSize = 40 // Half-width of containment cube
    this.boundsHeight = 60
    this.wallBodies = []

    // Colors for blocks
    this.blockColors = [
      0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7dc6f,
      0xbb8fce, 0x58d68d, 0xf0b27a, 0x85c1e9
    ]
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Initialize Oimo physics world
    this.world = new OIMO.World({
      timestep: 1/60,
      iterations: 8,
      broadphase: 2, // 1: brute, 2: sweep and prune, 3: volume tree
      worldscale: 1,
      random: true,
      info: false,
      gravity: [0, -9.8, 0]
    })

    // Create ground
    this.createGround(scene)

    // Create invisible containment walls
    this.createContainmentWalls()

    // Build initial structure
    this.buildStructure(scene, 'tower')

    // Lighting
    const ambient = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambient)

    const key = new THREE.DirectionalLight(0xffffff, 1)
    key.position.set(10, 20, 10)
    key.castShadow = true
    scene.add(key)

    const fill = new THREE.DirectionalLight(0x8888ff, 0.3)
    fill.position.set(-10, 5, -10)
    scene.add(fill)

    // Position camera
    camera.position.set(0, 15, 40)
    camera.lookAt(0, 10, 0)
  }

  createGround(scene) {
    // Visual ground
    const groundGeometry = new THREE.BoxGeometry(100, 1, 100)
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      shininess: 10
    })
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
    groundMesh.position.y = -0.5
    groundMesh.receiveShadow = true
    scene.add(groundMesh)

    // Physics ground (static)
    this.groundBody = this.world.add({
      type: 'box',
      size: [100, 1, 100],
      pos: [0, -0.5, 0],
      move: false, // Static body
      friction: 0.8,
      restitution: 0.2
    })
  }

  createContainmentWalls() {
    // Create invisible physics walls to keep blocks contained
    const wallThickness = 2
    const bs = this.boundsSize
    const bh = this.boundsHeight

    // Wall configurations: [sizeX, sizeY, sizeZ, posX, posY, posZ]
    const walls = [
      // Left wall
      [wallThickness, bh, bs * 2, -bs - wallThickness/2, bh/2, 0],
      // Right wall
      [wallThickness, bh, bs * 2, bs + wallThickness/2, bh/2, 0],
      // Front wall
      [bs * 2, bh, wallThickness, 0, bh/2, -bs - wallThickness/2],
      // Back wall
      [bs * 2, bh, wallThickness, 0, bh/2, bs + wallThickness/2],
      // Ceiling
      [bs * 2, wallThickness, bs * 2, 0, bh + wallThickness/2, 0]
    ]

    for (const [sx, sy, sz, px, py, pz] of walls) {
      const wall = this.world.add({
        type: 'box',
        size: [sx, sy, sz],
        pos: [px, py, pz],
        move: false,
        friction: 0.3,
        restitution: 0.8 // Bouncy walls!
      })
      this.wallBodies.push(wall)
    }
  }

  buildStructure(scene, type) {
    this.structureType = type
    this.clearBodies(scene)

    switch(type) {
      case 'tower':
        this.buildTower(scene)
        break
      case 'wall':
        this.buildWall(scene)
        break
      case 'pyramid':
        this.buildPyramid(scene)
        break
      case 'random':
        this.buildRandomStructure(scene)
        break
    }
  }

  buildTower(scene) {
    const floors = 15
    const blocksPerFloor = 6
    const blockSize = { x: 2, y: 1, z: 2 }
    const radius = 4

    for (let floor = 0; floor < floors; floor++) {
      const rotation = (floor % 2) * (Math.PI / blocksPerFloor)

      for (let i = 0; i < blocksPerFloor; i++) {
        const angle = (i / blocksPerFloor) * Math.PI * 2 + rotation
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const y = floor * blockSize.y + blockSize.y / 2

        this.createBlock(scene, x, y, z, blockSize, floor)
      }
    }
  }

  buildWall(scene) {
    const rows = 10
    const cols = 15
    const blockSize = { x: 2, y: 1, z: 1 }

    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (blockSize.x / 2)
      for (let col = 0; col < cols; col++) {
        const x = (col - cols / 2) * blockSize.x + offset
        const y = row * blockSize.y + blockSize.y / 2
        const z = 0

        this.createBlock(scene, x, y, z, blockSize, row)
      }
    }
  }

  buildPyramid(scene) {
    const baseSize = 8
    const blockSize = { x: 2, y: 1, z: 2 }

    for (let level = 0; level < baseSize; level++) {
      const layerSize = baseSize - level
      const offset = level * (blockSize.x / 2)

      for (let x = 0; x < layerSize; x++) {
        for (let z = 0; z < layerSize; z++) {
          const px = (x - layerSize / 2) * blockSize.x + blockSize.x / 2 + offset
          const pz = (z - layerSize / 2) * blockSize.z + blockSize.z / 2 + offset
          const py = level * blockSize.y + blockSize.y / 2

          this.createBlock(scene, px, py, pz, blockSize, level)
        }
      }
    }
  }

  buildRandomStructure(scene) {
    const count = 100
    const blockSize = { x: 2, y: 1, z: 2 }
    const spread = 15

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * spread
      const y = Math.random() * 20 + 1
      const z = (Math.random() - 0.5) * spread
      const size = {
        x: blockSize.x * (0.5 + Math.random()),
        y: blockSize.y * (0.5 + Math.random()),
        z: blockSize.z * (0.5 + Math.random())
      }

      this.createBlock(scene, x, y, z, size, i)
    }
  }

  createBlock(scene, x, y, z, size, colorIndex) {
    // Visual mesh
    const geometry = new THREE.BoxGeometry(size.x * 0.95, size.y * 0.95, size.z * 0.95)
    const color = this.blockColors[colorIndex % this.blockColors.length]
    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 30
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)

    // Physics body
    const body = this.world.add({
      type: 'box',
      size: [size.x, size.y, size.z],
      pos: [x, y, z],
      move: true,
      density: 1,
      friction: 0.5,
      restitution: 0.2
    })

    this.bodies.push({
      body: body,
      mesh: mesh,
      originalPos: new THREE.Vector3(x, y, z),
      size: size,
      colorIndex: colorIndex,
      fallen: false
    })
  }

  clearBodies(scene) {
    for (const obj of this.bodies) {
      scene.remove(obj.mesh)
      obj.mesh.geometry.dispose()
      obj.mesh.material.dispose()
      this.world.removeRigidBody(obj.body)
    }
    this.bodies = []

    // Clear debris too
    for (const d of this.debris) {
      scene.remove(d.mesh)
      d.mesh.geometry.dispose()
      d.mesh.material.dispose()
    }
    this.debris = []
  }

  applyExplosion(x, y, z, force) {
    // Cap max force to prevent blocks going nuclear
    const maxForce = 30
    const cappedForce = Math.min(force, maxForce)

    // Apply radial force to all bodies
    for (const obj of this.bodies) {
      const pos = obj.body.getPosition()
      const dx = pos.x - x
      const dy = pos.y - y
      const dz = pos.z - z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1

      // Force falls off with distance squared, capped per-block
      const rawStrength = cappedForce / (dist * dist) * 50
      const strength = Math.min(rawStrength, 100) // Cap individual impulse

      // Direction away from explosion
      const fx = (dx / dist) * strength
      const fy = (dy / dist) * strength + strength * 0.5 // Add upward component
      const fz = (dz / dist) * strength

      obj.body.applyImpulse(pos, { x: fx, y: fy, z: fz })

      // Add angular impulse for spinning
      obj.body.angularVelocity.x += (Math.random() - 0.5) * strength * 0.5
      obj.body.angularVelocity.y += (Math.random() - 0.5) * strength * 0.5
      obj.body.angularVelocity.z += (Math.random() - 0.5) * strength * 0.5
    }

    // Create visual explosion
    this.explosions.push({
      x, y, z,
      radius: 0,
      maxRadius: force * 3,
      life: 30
    })
  }

  shakeGround(intensity) {
    // Cap shake intensity to prevent insane vibration
    const cappedIntensity = Math.min(intensity, 1.5)

    // Apply random impulses to simulate ground shake
    for (const obj of this.bodies) {
      const shakeForce = cappedIntensity * 15 // Reduced from 20

      obj.body.applyImpulse(obj.body.getPosition(), {
        x: (Math.random() - 0.5) * shakeForce,
        y: Math.random() * shakeForce * 0.3, // Less upward force
        z: (Math.random() - 0.5) * shakeForce
      })
    }
  }

  spawnDebris(pos, color, scene) {
    if (this.debris.length >= this.maxDebris) {
      const old = this.debris.shift()
      scene.remove(old.mesh)
      old.mesh.geometry.dispose()
      old.mesh.material.dispose()
    }

    const size = 0.1 + Math.random() * 0.2
    const geometry = new THREE.BoxGeometry(size, size, size)
    const material = new THREE.MeshPhongMaterial({ color: color })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(pos)
    scene.add(mesh)

    this.debris.push({
      mesh: mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 10,
        (Math.random() - 0.5) * 5
      ),
      life: 120
    })
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    if (!this.world) return

    const params = tuner.getAll()
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    // Smooth audio
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Adjust gravity based on bass
    const gravityStrength = 9.8 + this.smoothBass * params.bassWeight * 20
    this.world.gravity.y = -gravityStrength

    // BASS SHAKES THE GROUND
    if (this.smoothBass > 0.4 * (1 - params.sensitivity)) {
      this.shakeGround(this.smoothBass * params.destruction)
    }

    // BEATS CAUSE EXPLOSIONS
    if (onBeat && beatIntensity > 0.3) {
      const now = Date.now()
      if (now - this.lastBeatTime > 100) { // Debounce
        // Random explosion location near the structure
        const explosionPos = {
          x: (Math.random() - 0.5) * 10,
          y: Math.random() * 15,
          z: (Math.random() - 0.5) * 10
        }

        this.applyExplosion(
          explosionPos.x,
          explosionPos.y,
          explosionPos.z,
          beatIntensity * 10 * params.destruction
        )

        this.lastBeatTime = now
      }
    }

    // HIGH FREQUENCIES CREATE UPWARD TURBULENCE
    if (this.smoothHigh > 0.3) {
      for (const obj of this.bodies) {
        const pos = obj.body.getPosition()
        obj.body.applyImpulse(pos, {
          x: (Math.random() - 0.5) * this.smoothHigh * params.highWeight * 5,
          y: this.smoothHigh * params.highWeight * 3,
          z: (Math.random() - 0.5) * this.smoothHigh * params.highWeight * 5
        })
      }
    }

    // Step physics simulation
    const timeStep = delta * (0.5 + normalizedTempo)
    this.world.step()

    // Sync Three.js meshes with physics bodies
    const maxVelocity = 50 // Clamp max velocity to prevent extreme speeds
    for (const obj of this.bodies) {
      const pos = obj.body.getPosition()
      const rot = obj.body.getQuaternion()

      obj.mesh.position.set(pos.x, pos.y, pos.z)
      obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)

      // Clamp velocity to prevent blocks flying at insane speeds
      const vel = obj.body.linearVelocity
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
      if (speed > maxVelocity) {
        const scale = maxVelocity / speed
        obj.body.linearVelocity.x *= scale
        obj.body.linearVelocity.y *= scale
        obj.body.linearVelocity.z *= scale
      }

      // Check if block has fallen below ground (cleanup)
      if (pos.y < -10) {
        obj.fallen = true
      }

      // Color shift based on velocity
      const intensity = Math.min(1, speed / 20)

      // Emissive glow when moving fast
      obj.mesh.material.emissive.setHSL(
        centroid,
        0.8,
        intensity * 0.3
      )
    }

    // Update explosions
    this.explosions = this.explosions.filter(e => {
      e.radius += (e.maxRadius - e.radius) * 0.2
      e.life--
      return e.life > 0
    })

    // Update debris
    this.debris = this.debris.filter(d => {
      d.velocity.y -= 0.3 // Gravity
      d.mesh.position.add(d.velocity.clone().multiplyScalar(delta))
      d.mesh.rotation.x += 0.1
      d.mesh.rotation.y += 0.1
      d.life--

      // Bounce off ground
      if (d.mesh.position.y < 0.1) {
        d.mesh.position.y = 0.1
        d.velocity.y *= -0.5
        d.velocity.x *= 0.8
        d.velocity.z *= 0.8
      }

      return d.life > 0 && d.mesh.position.y > -5
    })

    // SILENCE REBUILDS (very slowly)
    if (this.smoothAmplitude < 0.1 && this.bodies.some(b => b.fallen)) {
      this.rebuildProgress += 0.01 * (1 - params.decay)
      if (this.rebuildProgress > 1) {
        this.rebuildProgress = 0
        this.buildStructure(this.scene, this.structureType)
      }
    } else {
      this.rebuildProgress = Math.max(0, this.rebuildProgress - 0.005)
    }

    // Change structure type occasionally on strong beats
    if (onBeat && beatIntensity > 0.9 && Math.random() < 0.1) {
      const types = ['tower', 'wall', 'pyramid', 'random']
      this.structureType = types[Math.floor(Math.random() * types.length)]
    }

    // Spawn debris from fast-moving blocks
    for (const obj of this.bodies) {
      const vel = obj.body.linearVelocity
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
      if (speed > 10 && Math.random() < 0.1) {
        const pos = obj.body.getPosition()
        this.spawnDebris(
          new THREE.Vector3(pos.x, pos.y, pos.z),
          obj.mesh.material.color.getHex(),
          this.scene
        )
      }
    }
  }

  render(renderer, scene, camera) {
    // Draw explosion effects
    // (In a full implementation, you'd use particle systems or post-processing)

    // Call parent render
    renderer.render(scene, camera)
  }

  dispose() {
    // Clean up physics world
    if (this.world) {
      this.world.clear()
      this.world = null
    }

    // Clean up Three.js objects
    for (const obj of this.bodies) {
      obj.mesh.geometry.dispose()
      obj.mesh.material.dispose()
    }
    this.bodies = []

    for (const d of this.debris) {
      d.mesh.geometry.dispose()
      d.mesh.material.dispose()
    }
    this.debris = []
    this.wallBodies = []
  }

  clear() {
    if (this.scene) {
      this.buildStructure(this.scene, this.structureType)
    }
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
  }
}
