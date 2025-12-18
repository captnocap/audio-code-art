import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Visualization3DMode } from './base.js'
import { tuner } from '../tuner.js'

// Soft Body Mosh Pit - Jelly blobs bouncing and squishing to audio
export class SoftBodyMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'softbody3d'
    this.description = 'Jelly blobs colliding. Bass squishes. Beats bounce.'

    this.world = null
    this.blobs = []
    this.maxBlobs = 8

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Colors
    this.blobColors = [
      0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7dc6f,
      0xbb8fce, 0x58d68d, 0xff9ff3, 0x54a0ff
    ]
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Initialize Cannon-ES physics world
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -15, 0)
    })

    // Increase solver iterations for stability
    this.world.solver.iterations = 10

    // Create ground
    this.createGround(scene)

    // Create containment walls
    this.createWalls()

    // Spawn initial blobs
    for (let i = 0; i < 4; i++) {
      const x = (Math.random() - 0.5) * 20
      const z = (Math.random() - 0.5) * 20
      this.spawnBlob(scene, x, 15 + i * 5, z)
    }

    // Lighting
    const ambient = new THREE.AmbientLight(0x404040, 0.8)
    scene.add(ambient)

    const key = new THREE.DirectionalLight(0xffffff, 1)
    key.position.set(10, 30, 10)
    key.castShadow = true
    scene.add(key)

    const rim = new THREE.DirectionalLight(0x8888ff, 0.5)
    rim.position.set(-10, 10, -10)
    scene.add(rim)

    // Camera position
    camera.position.set(0, 25, 50)
    camera.lookAt(0, 10, 0)
  }

  createGround(scene) {
    // Visual ground
    const groundGeometry = new THREE.BoxGeometry(80, 1, 80)
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      shininess: 30
    })
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
    groundMesh.position.y = -0.5
    groundMesh.receiveShadow = true
    scene.add(groundMesh)

    // Physics ground
    const groundShape = new CANNON.Box(new CANNON.Vec3(40, 0.5, 40))
    const groundBody = new CANNON.Body({
      mass: 0, // Static
      shape: groundShape,
      position: new CANNON.Vec3(0, -0.5, 0),
      material: new CANNON.Material({ friction: 0.5, restitution: 0.7 })
    })
    this.world.addBody(groundBody)
  }

  createWalls() {
    const wallPositions = [
      { pos: new CANNON.Vec3(-40, 20, 0), size: new CANNON.Vec3(1, 40, 40) },
      { pos: new CANNON.Vec3(40, 20, 0), size: new CANNON.Vec3(1, 40, 40) },
      { pos: new CANNON.Vec3(0, 20, -40), size: new CANNON.Vec3(40, 40, 1) },
      { pos: new CANNON.Vec3(0, 20, 40), size: new CANNON.Vec3(40, 40, 1) }
    ]

    for (const wall of wallPositions) {
      const shape = new CANNON.Box(wall.size)
      const body = new CANNON.Body({
        mass: 0,
        shape: shape,
        position: wall.pos,
        material: new CANNON.Material({ friction: 0.2, restitution: 0.9 })
      })
      this.world.addBody(body)
    }
  }

  spawnBlob(scene, x, y, z) {
    if (this.blobs.length >= this.maxBlobs) return

    const color = this.blobColors[this.blobs.length % this.blobColors.length]
    const baseRadius = 2 + Math.random()
    const numParticles = 20
    const springStiffness = 200
    const springDamping = 5

    const particles = []
    const springs = []
    const meshes = []

    // Create particle positions (roughly spherical)
    const positions = []

    // Center particle
    positions.push({ x: 0, y: 0, z: 0, isCore: true })

    // Outer particles
    for (let i = 0; i < numParticles - 1; i++) {
      const phi = Math.acos(-1 + (2 * i) / (numParticles - 1))
      const theta = Math.sqrt(numParticles * Math.PI) * phi

      positions.push({
        x: baseRadius * Math.cos(theta) * Math.sin(phi),
        y: baseRadius * Math.sin(theta) * Math.sin(phi),
        z: baseRadius * Math.cos(phi),
        isCore: false
      })
    }

    // Create physics particles
    const particleMaterial = new CANNON.Material({ friction: 0.3, restitution: 0.8 })

    for (const pos of positions) {
      const radius = pos.isCore ? baseRadius * 0.5 : baseRadius * 0.3
      const shape = new CANNON.Sphere(radius)
      const body = new CANNON.Body({
        mass: pos.isCore ? 2 : 0.5,
        shape: shape,
        position: new CANNON.Vec3(x + pos.x, y + pos.y, z + pos.z),
        material: particleMaterial,
        linearDamping: 0.3,
        angularDamping: 0.3
      })

      this.world.addBody(body)
      particles.push(body)

      // Visual mesh
      const geometry = new THREE.SphereGeometry(radius, 16, 16)
      const material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        shininess: 100
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      scene.add(mesh)
      meshes.push(mesh)
    }

    // Create springs between particles
    const coreBody = particles[0]

    for (let i = 1; i < particles.length; i++) {
      // Connect to core
      const spring = new CANNON.Spring(coreBody, particles[i], {
        restLength: baseRadius,
        stiffness: springStiffness,
        damping: springDamping
      })
      springs.push(spring)

      // Connect to neighbors
      for (let j = i + 1; j < particles.length; j++) {
        const dist = particles[i].position.distanceTo(particles[j].position)
        if (dist < baseRadius * 1.5) {
          const neighborSpring = new CANNON.Spring(particles[i], particles[j], {
            restLength: dist,
            stiffness: springStiffness * 0.5,
            damping: springDamping * 0.5
          })
          springs.push(neighborSpring)
        }
      }
    }

    // Create outer membrane mesh
    const membraneGeometry = new THREE.SphereGeometry(baseRadius * 1.2, 32, 32)
    const membraneMaterial = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      shininess: 150
    })
    const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial)
    scene.add(membrane)

    this.blobs.push({
      particles,
      springs,
      meshes,
      membrane,
      color,
      baseRadius,
      energy: 0,
      squish: 1
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

    // GRAVITY IS CHAOS - constantly shifting
    const gravityAngle = elapsed * 0.5
    this.world.gravity.x = Math.sin(gravityAngle) * 5 * params.chaos
    this.world.gravity.y = -10 - this.smoothBass * params.bassWeight * 20 + Math.sin(elapsed * 0.7) * 5
    this.world.gravity.z = Math.cos(gravityAngle * 1.3) * 5 * params.chaos

    // CONSTANT CHAOS - blobs never rest
    for (const blob of this.blobs) {
      for (const spring of blob.springs) {
        spring.applyForce()
      }

      // Calculate blob energy
      blob.energy = blob.energy * 0.95 + this.smoothAmplitude * 0.1

      // BASS SQUISHES AND LAUNCHES
      blob.squish = 1 - this.smoothBass * params.bassWeight * 0.4

      // CONSTANT MOVEMENT - never still
      const baseForce = 10 * (1 + params.chaos)
      for (const particle of blob.particles) {
        particle.applyForce(
          new CANNON.Vec3(
            (Math.random() - 0.5) * baseForce,
            (Math.random() - 0.5) * baseForce,
            (Math.random() - 0.5) * baseForce
          ),
          particle.position
        )
      }

      // BEATS EXPLODE BLOBS
      if (onBeat && beatIntensity > 0.2) {
        const bounceForce = beatIntensity * 80 * params.destruction

        for (const particle of blob.particles) {
          particle.applyImpulse(
            new CANNON.Vec3(
              (Math.random() - 0.5) * bounceForce,
              bounceForce * (0.5 + Math.random()),
              (Math.random() - 0.5) * bounceForce
            ),
            particle.position
          )
          // Spin
          particle.angularVelocity.set(
            (Math.random() - 0.5) * beatIntensity * 20,
            (Math.random() - 0.5) * beatIntensity * 20,
            (Math.random() - 0.5) * beatIntensity * 20
          )
        }
      }

      // HIGH FREQUENCIES = CONSTANT VIBRATION
      const vibrate = 15 + this.smoothHigh * params.highWeight * 30
      for (const particle of blob.particles) {
        particle.applyForce(
          new CANNON.Vec3(
            (Math.random() - 0.5) * vibrate,
            (Math.random() - 0.5) * vibrate,
            (Math.random() - 0.5) * vibrate
          ),
          particle.position
        )
      }

      // MID FREQUENCIES SPIN EVERYTHING
      const torque = 3 + this.smoothMid * params.midWeight * 10
      for (const particle of blob.particles) {
        particle.angularVelocity.x += (Math.random() - 0.5) * torque * 0.1
        particle.angularVelocity.y += (Math.random() - 0.5) * torque * 0.1
        particle.angularVelocity.z += (Math.random() - 0.5) * torque * 0.1
      }
    }

    // RANDOM EXPLOSIONS
    if (Math.random() < 0.03 * params.chaos) {
      const ex = (Math.random() - 0.5) * 40
      const ey = Math.random() * 30
      const ez = (Math.random() - 0.5) * 40
      const force = 30 + Math.random() * 50

      for (const blob of this.blobs) {
        for (const particle of blob.particles) {
          const dx = particle.position.x - ex
          const dy = particle.position.y - ey
          const dz = particle.position.z - ez
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 1

          particle.applyImpulse(
            new CANNON.Vec3(
              (dx / dist) * force,
              (dy / dist) * force + force * 0.5,
              (dz / dist) * force
            ),
            particle.position
          )
        }
      }
    }

    // Spawn blobs more frequently
    if (this.blobs.length < this.maxBlobs) {
      if ((onBeat && beatIntensity > 0.5) || Math.random() < 0.01) {
        this.spawnBlob(
          this.scene,
          (Math.random() - 0.5) * 30,
          25 + Math.random() * 10,
          (Math.random() - 0.5) * 30
        )
      }
    }

    // Step physics
    this.world.step(1 / 60)

    // Sync meshes with physics
    for (const blob of this.blobs) {
      let centerX = 0, centerY = 0, centerZ = 0

      for (let i = 0; i < blob.particles.length; i++) {
        const particle = blob.particles[i]
        const mesh = blob.meshes[i]

        mesh.position.set(
          particle.position.x,
          particle.position.y,
          particle.position.z
        )
        mesh.quaternion.set(
          particle.quaternion.x,
          particle.quaternion.y,
          particle.quaternion.z,
          particle.quaternion.w
        )

        // Apply squish to scale
        mesh.scale.set(1, blob.squish, 1)

        centerX += particle.position.x
        centerY += particle.position.y
        centerZ += particle.position.z

        // Update material based on velocity
        const speed = particle.velocity.length()
        const glow = Math.min(1, speed / 20)
        mesh.material.emissive.setHSL(centroid, 0.8, glow * 0.3)
      }

      // Update membrane position
      centerX /= blob.particles.length
      centerY /= blob.particles.length
      centerZ /= blob.particles.length

      blob.membrane.position.set(centerX, centerY, centerZ)
      blob.membrane.scale.set(1, blob.squish, 1)

      // Membrane pulsing
      const pulse = 1 + blob.energy * 0.3
      blob.membrane.scale.multiplyScalar(pulse)
    }
  }

  render(renderer, scene, camera) {
    renderer.render(scene, camera)
  }

  dispose() {
    if (this.world) {
      // Clear all bodies
      while (this.world.bodies.length > 0) {
        this.world.removeBody(this.world.bodies[0])
      }
      this.world = null
    }

    // Clean up Three.js objects
    for (const blob of this.blobs) {
      for (const mesh of blob.meshes) {
        mesh.geometry.dispose()
        mesh.material.dispose()
      }
      blob.membrane.geometry.dispose()
      blob.membrane.material.dispose()
    }
    this.blobs = []
  }

  clear() {
    // Remove existing blobs
    for (const blob of this.blobs) {
      for (const particle of blob.particles) {
        this.world.removeBody(particle)
      }
      for (const mesh of blob.meshes) {
        this.scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
      }
      this.scene.remove(blob.membrane)
      blob.membrane.geometry.dispose()
      blob.membrane.material.dispose()
    }
    this.blobs = []

    // Spawn new blobs
    for (let i = 0; i < 4; i++) {
      const x = (Math.random() - 0.5) * 20
      const z = (Math.random() - 0.5) * 20
      this.spawnBlob(this.scene, x, 15 + i * 5, z)
    }
  }
}
