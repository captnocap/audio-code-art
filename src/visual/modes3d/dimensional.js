import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Matter from 'matter-js'
import { Visualization3DMode } from './base.js'
import { tuner } from '../tuner.js'

// Dimensional Bleed - 2D physics plane floating in 3D space
// Objects fall through portals between dimensions
export class DimensionalMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'dimensional3d'
    this.description = '2D bleeds into 3D. Portals tear open. Physics breaks.'

    // 2D Physics (Matter.js)
    this.engine2D = null
    this.world2D = null
    this.bodies2D = []
    this.canvas2D = null
    this.ctx2D = null

    // 3D Physics (Cannon-ES)
    this.world3D = null
    this.bodies3D = []

    // Portals - where dimensions bleed
    this.portals = []
    this.maxPortals = 5

    // The 2D plane mesh
    this.planeMesh = null
    this.planeTexture = null

    // Dimensions
    this.planeWidth = 800
    this.planeHeight = 600

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Create offscreen 2D canvas for Matter.js
    this.canvas2D = document.createElement('canvas')
    this.canvas2D.width = this.planeWidth
    this.canvas2D.height = this.planeHeight
    this.ctx2D = this.canvas2D.getContext('2d')

    // Create 2D physics world
    this.engine2D = Matter.Engine.create({
      gravity: { x: 0, y: 0.5 }
    })
    this.world2D = this.engine2D.world

    // Create 2D boundaries
    this.create2DBoundaries()

    // Create initial 2D objects
    this.spawn2DObjects(30)

    // Create 3D physics world
    this.world3D = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.8, 0)
    })
    this.world3D.solver.iterations = 10

    // Create 3D ground
    this.create3DGround(scene)

    // Create 3D containment
    this.create3DWalls()

    // Create the floating 2D plane in 3D space
    this.createFloatingPlane(scene)

    // Lighting
    const ambient = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambient)

    const key = new THREE.DirectionalLight(0xffffff, 1)
    key.position.set(10, 30, 20)
    key.castShadow = true
    scene.add(key)

    // Eerie light
    const portalLight = new THREE.PointLight(0xff00ff, 1, 50)
    portalLight.position.set(0, 15, 0)
    scene.add(portalLight)
    this.portalLight = portalLight

    // Camera position
    camera.position.set(30, 25, 40)
    camera.lookAt(0, 10, 0)
  }

  create2DBoundaries() {
    const Bodies = Matter.Bodies
    const Composite = Matter.Composite

    const walls = [
      Bodies.rectangle(this.planeWidth/2, -25, this.planeWidth, 50, { isStatic: true }),
      Bodies.rectangle(this.planeWidth/2, this.planeHeight + 25, this.planeWidth, 50, { isStatic: true }),
      Bodies.rectangle(-25, this.planeHeight/2, 50, this.planeHeight, { isStatic: true }),
      Bodies.rectangle(this.planeWidth + 25, this.planeHeight/2, 50, this.planeHeight, { isStatic: true })
    ]

    walls.forEach(w => {
      w.restitution = 0.8
      w.friction = 0.1
    })

    Composite.add(this.world2D, walls)
  }

  spawn2DObjects(count) {
    const Bodies = Matter.Bodies
    const Composite = Matter.Composite

    for (let i = 0; i < count; i++) {
      const x = 50 + Math.random() * (this.planeWidth - 100)
      const y = 50 + Math.random() * (this.planeHeight - 100)
      const type = Math.random()

      let body
      if (type < 0.33) {
        body = Bodies.circle(x, y, 10 + Math.random() * 15, {
          restitution: 0.8,
          friction: 0.1
        })
      } else if (type < 0.66) {
        body = Bodies.rectangle(x, y, 15 + Math.random() * 20, 15 + Math.random() * 20, {
          restitution: 0.6,
          friction: 0.2
        })
      } else {
        body = Bodies.polygon(x, y, 3 + Math.floor(Math.random() * 4), 15 + Math.random() * 10, {
          restitution: 0.7,
          friction: 0.15
        })
      }

      body.hue = Math.random() * 360
      body.render = { visible: true }

      Composite.add(this.world2D, body)
      this.bodies2D.push(body)
    }
  }

  create3DGround(scene) {
    // Visual ground
    const geometry = new THREE.BoxGeometry(100, 1, 100)
    const material = new THREE.MeshPhongMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.8
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = -0.5
    mesh.receiveShadow = true
    scene.add(mesh)

    // Grid lines on ground
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222)
    gridHelper.position.y = 0.01
    scene.add(gridHelper)

    // Physics ground
    const shape = new CANNON.Box(new CANNON.Vec3(50, 0.5, 50))
    const body = new CANNON.Body({
      mass: 0,
      shape: shape,
      position: new CANNON.Vec3(0, -0.5, 0)
    })
    this.world3D.addBody(body)
  }

  create3DWalls() {
    const walls = [
      { pos: new CANNON.Vec3(-50, 25, 0), size: new CANNON.Vec3(1, 50, 50) },
      { pos: new CANNON.Vec3(50, 25, 0), size: new CANNON.Vec3(1, 50, 50) },
      { pos: new CANNON.Vec3(0, 25, -50), size: new CANNON.Vec3(50, 50, 1) },
      { pos: new CANNON.Vec3(0, 25, 50), size: new CANNON.Vec3(50, 50, 1) }
    ]

    for (const w of walls) {
      const shape = new CANNON.Box(w.size)
      const body = new CANNON.Body({
        mass: 0,
        shape: shape,
        position: w.pos,
        material: new CANNON.Material({ restitution: 0.8 })
      })
      this.world3D.addBody(body)
    }
  }

  createFloatingPlane(scene) {
    // Create texture from 2D canvas
    this.planeTexture = new THREE.CanvasTexture(this.canvas2D)
    this.planeTexture.minFilter = THREE.LinearFilter
    this.planeTexture.magFilter = THREE.LinearFilter

    // Create plane mesh
    const geometry = new THREE.PlaneGeometry(40, 30)
    const material = new THREE.MeshPhongMaterial({
      map: this.planeTexture,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      emissive: 0x111111
    })

    this.planeMesh = new THREE.Mesh(geometry, material)
    this.planeMesh.position.set(0, 20, 0)
    this.planeMesh.rotation.x = -Math.PI * 0.1 // Slight tilt
    scene.add(this.planeMesh)

    // Glowing edge
    const edgeGeometry = new THREE.EdgesGeometry(geometry)
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff,
      linewidth: 2
    })
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial)
    this.planeMesh.add(edges)
    this.planeEdges = edges
  }

  createPortal(x2D, y2D, radius) {
    if (this.portals.length >= this.maxPortals) {
      // Remove oldest portal
      const old = this.portals.shift()
      this.scene.remove(old.mesh)
      old.mesh.geometry.dispose()
      old.mesh.material.dispose()
    }

    // Calculate 3D position from 2D plane coordinates
    const planePos = this.planeMesh.position
    const x3D = (x2D / this.planeWidth - 0.5) * 40
    const z3D = (y2D / this.planeHeight - 0.5) * -30

    // Create portal visualization
    const geometry = new THREE.RingGeometry(radius * 0.02, radius * 0.05, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(
      planePos.x + x3D,
      planePos.y,
      planePos.z + z3D
    )
    mesh.rotation.x = this.planeMesh.rotation.x
    this.scene.add(mesh)

    this.portals.push({
      x2D, y2D,
      x3D: planePos.x + x3D,
      y3D: planePos.y,
      z3D: planePos.z + z3D,
      radius,
      mesh,
      life: 300
    })
  }

  transfer2Dto3D(body2D, portal) {
    // Remove from 2D world
    Matter.Composite.remove(this.world2D, body2D)
    this.bodies2D = this.bodies2D.filter(b => b !== body2D)

    // Create 3D body
    const size = body2D.circleRadius || 10
    let shape

    if (body2D.circleRadius) {
      shape = new CANNON.Sphere(size * 0.05)
    } else {
      shape = new CANNON.Box(new CANNON.Vec3(size * 0.05, size * 0.05, size * 0.05))
    }

    const body3D = new CANNON.Body({
      mass: 1,
      shape: shape,
      position: new CANNON.Vec3(
        portal.x3D + (Math.random() - 0.5) * 2,
        portal.y3D - 1,
        portal.z3D + (Math.random() - 0.5) * 2
      ),
      material: new CANNON.Material({ restitution: 0.8 })
    })

    // Inherit some velocity
    const vel = body2D.velocity
    body3D.velocity.set(vel.x * 0.1, -5, -vel.y * 0.1)

    this.world3D.addBody(body3D)

    // Create mesh
    let geometry
    if (body2D.circleRadius) {
      geometry = new THREE.SphereGeometry(size * 0.05, 16, 16)
    } else {
      geometry = new THREE.BoxGeometry(size * 0.1, size * 0.1, size * 0.1)
    }

    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(`hsl(${body2D.hue}, 70%, 50%)`),
      shininess: 50
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    this.scene.add(mesh)

    this.bodies3D.push({ body: body3D, mesh, hue: body2D.hue })
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    if (!this.engine2D || !this.world3D) return

    const params = tuner.getAll()
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { onBeat, beatIntensity } = beatInfo

    // Smooth audio
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // BEATS CREATE PORTALS
    if (onBeat && beatIntensity > 0.5) {
      const x = 100 + Math.random() * (this.planeWidth - 200)
      const y = 100 + Math.random() * (this.planeHeight - 200)
      const radius = 30 + beatIntensity * 50

      this.createPortal(x, y, radius)
    }

    // Check for 2D bodies falling through portals
    for (const body of [...this.bodies2D]) {
      for (const portal of this.portals) {
        const dx = body.position.x - portal.x2D
        const dy = body.position.y - portal.y2D
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < portal.radius) {
          this.transfer2Dto3D(body, portal)
          break
        }
      }
    }

    // 2D physics - audio forces
    const Body = Matter.Body

    if (this.smoothBass > 0.3) {
      const shake = this.smoothBass * params.bassWeight * 0.5
      for (const body of this.bodies2D) {
        Body.applyForce(body, body.position, {
          x: (Math.random() - 0.5) * shake,
          y: (Math.random() - 0.5) * shake
        })
      }
    }

    if (this.smoothHigh > 0.3) {
      // Anti-gravity pulses
      for (const body of this.bodies2D) {
        Body.applyForce(body, body.position, {
          x: 0,
          y: -this.smoothHigh * params.highWeight * 0.2
        })
      }
    }

    // Spawn new 2D objects if running low
    if (this.bodies2D.length < 15 && Math.random() < 0.05) {
      this.spawn2DObjects(1)
    }

    // Step 2D physics
    Matter.Engine.update(this.engine2D, 1000 / 60)

    // 3D physics - audio forces
    if (this.smoothBass > 0.4) {
      for (const obj of this.bodies3D) {
        obj.body.applyImpulse(
          new CANNON.Vec3(
            (Math.random() - 0.5) * this.smoothBass * 5,
            this.smoothBass * 3,
            (Math.random() - 0.5) * this.smoothBass * 5
          ),
          obj.body.position
        )
      }
    }

    // Step 3D physics
    this.world3D.step(1 / 60)

    // Sync 3D meshes
    for (const obj of this.bodies3D) {
      obj.mesh.position.set(
        obj.body.position.x,
        obj.body.position.y,
        obj.body.position.z
      )
      obj.mesh.quaternion.set(
        obj.body.quaternion.x,
        obj.body.quaternion.y,
        obj.body.quaternion.z,
        obj.body.quaternion.w
      )

      // Glow based on speed
      const speed = obj.body.velocity.length()
      obj.mesh.material.emissive.setHSL(centroid, 0.8, Math.min(0.3, speed * 0.02))

      // Remove if fallen too far
      if (obj.body.position.y < -20) {
        this.world3D.removeBody(obj.body)
        this.scene.remove(obj.mesh)
        obj.mesh.geometry.dispose()
        obj.mesh.material.dispose()
        this.bodies3D = this.bodies3D.filter(b => b !== obj)
      }
    }

    // Update portals
    this.portals = this.portals.filter(portal => {
      portal.life--

      // Pulse effect
      const pulse = 1 + Math.sin(elapsed * 10) * 0.2
      portal.mesh.scale.set(pulse, pulse, 1)

      // Fade out
      portal.mesh.material.opacity = Math.min(0.8, portal.life / 100)

      if (portal.life <= 0) {
        this.scene.remove(portal.mesh)
        portal.mesh.geometry.dispose()
        portal.mesh.material.dispose()
        return false
      }
      return true
    })

    // Update floating plane wobble
    this.planeMesh.rotation.z = Math.sin(elapsed * 0.5) * 0.05 * (1 + this.smoothBass)
    this.planeMesh.position.y = 20 + Math.sin(elapsed * 0.3) * 2

    // Portal light follows average portal position
    if (this.portals.length > 0) {
      let avgX = 0, avgY = 0, avgZ = 0
      for (const p of this.portals) {
        avgX += p.x3D
        avgY += p.y3D
        avgZ += p.z3D
      }
      this.portalLight.position.set(
        avgX / this.portals.length,
        avgY / this.portals.length,
        avgZ / this.portals.length
      )
      this.portalLight.intensity = 1 + this.smoothAmplitude * 2
    }

    // Plane edge glow
    this.planeEdges.material.color.setHSL(centroid, 0.8, 0.5 + this.smoothAmplitude * 0.3)

    // Render 2D scene to canvas
    this.render2D()

    // Update texture
    this.planeTexture.needsUpdate = true
  }

  render2D() {
    const ctx = this.ctx2D

    // Clear with slight trail
    ctx.fillStyle = 'rgba(10, 5, 15, 0.3)'
    ctx.fillRect(0, 0, this.planeWidth, this.planeHeight)

    // Draw portals as holes
    ctx.globalCompositeOperation = 'destination-out'
    for (const portal of this.portals) {
      const gradient = ctx.createRadialGradient(
        portal.x2D, portal.y2D, 0,
        portal.x2D, portal.y2D, portal.radius
      )
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
      gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.8)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.beginPath()
      ctx.arc(portal.x2D, portal.y2D, portal.radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'

    // Draw portal edges
    for (const portal of this.portals) {
      ctx.beginPath()
      ctx.arc(portal.x2D, portal.y2D, portal.radius, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${300 + Math.sin(Date.now() * 0.01) * 30}, 100%, 60%, ${portal.life / 300})`
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Draw 2D bodies
    for (const body of this.bodies2D) {
      const vertices = body.vertices

      ctx.beginPath()
      ctx.moveTo(vertices[0].x, vertices[0].y)
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y)
      }
      ctx.closePath()

      ctx.fillStyle = `hsl(${body.hue}, 70%, 50%)`
      ctx.fill()
      ctx.strokeStyle = `hsl(${body.hue}, 70%, 70%)`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '14px monospace'
    ctx.fillText('2D DIMENSION', 10, 25)
    ctx.fillText(`Objects: ${this.bodies2D.length}`, 10, 45)
  }

  render(renderer, scene, camera) {
    renderer.render(scene, camera)
  }

  dispose() {
    // Clean up 2D
    if (this.world2D) {
      Matter.Composite.clear(this.world2D, false)
      Matter.Engine.clear(this.engine2D)
    }

    // Clean up 3D physics
    if (this.world3D) {
      while (this.world3D.bodies.length > 0) {
        this.world3D.removeBody(this.world3D.bodies[0])
      }
    }

    // Clean up meshes
    for (const obj of this.bodies3D) {
      obj.mesh.geometry.dispose()
      obj.mesh.material.dispose()
    }

    for (const portal of this.portals) {
      portal.mesh.geometry.dispose()
      portal.mesh.material.dispose()
    }

    if (this.planeMesh) {
      this.planeMesh.geometry.dispose()
      this.planeMesh.material.dispose()
    }

    this.bodies2D = []
    this.bodies3D = []
    this.portals = []
  }

  clear() {
    // Clear and respawn
    for (const body of [...this.bodies2D]) {
      Matter.Composite.remove(this.world2D, body)
    }
    this.bodies2D = []
    this.spawn2DObjects(30)

    for (const obj of this.bodies3D) {
      this.world3D.removeBody(obj.body)
      this.scene.remove(obj.mesh)
      obj.mesh.geometry.dispose()
      obj.mesh.material.dispose()
    }
    this.bodies3D = []

    for (const portal of this.portals) {
      this.scene.remove(portal.mesh)
      portal.mesh.geometry.dispose()
      portal.mesh.material.dispose()
    }
    this.portals = []
  }
}
