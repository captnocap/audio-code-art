import Matter from 'matter-js'
import { VisualizationMode } from '../modes/base.js'

// Base class for Matter.js 2D physics visualization modes
export class PhysicsMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)

    // Matter.js modules
    this.Engine = Matter.Engine
    this.Render = Matter.Render
    this.World = Matter.World
    this.Bodies = Matter.Bodies
    this.Body = Matter.Body
    this.Composite = Matter.Composite
    this.Constraint = Matter.Constraint
    this.Mouse = Matter.Mouse
    this.Events = Matter.Events
    this.Vector = Matter.Vector
    this.Vertices = Matter.Vertices

    // Physics engine
    this.engine = null
    this.world = null

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Bounds
    this.bounds = {
      left: 0,
      right: width,
      top: 0,
      bottom: height
    }
  }

  init() {
    // Create physics engine
    this.engine = this.Engine.create({
      gravity: { x: 0, y: 1 }
    })
    this.world = this.engine.world

    // Create boundary walls
    this.createBoundaries()
  }

  createBoundaries() {
    const wallThickness = 50
    const w = this.width
    const h = this.height

    const walls = [
      // Bottom
      this.Bodies.rectangle(w/2, h + wallThickness/2, w + wallThickness*2, wallThickness, { isStatic: true }),
      // Top
      this.Bodies.rectangle(w/2, -wallThickness/2, w + wallThickness*2, wallThickness, { isStatic: true }),
      // Left
      this.Bodies.rectangle(-wallThickness/2, h/2, wallThickness, h + wallThickness*2, { isStatic: true }),
      // Right
      this.Bodies.rectangle(w + wallThickness/2, h/2, wallThickness, h + wallThickness*2, { isStatic: true })
    ]

    // Make walls bouncy
    walls.forEach(wall => {
      wall.restitution = 0.8
      wall.friction = 0.1
      wall.render = { visible: false }
    })

    this.Composite.add(this.world, walls)
    this.walls = walls
  }

  smoothAudio(audioFeatures) {
    const smoothing = 0.15
    const { bass, mid, high, amplitude } = audioFeatures

    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing
  }

  update(audioFeatures, beatInfo) {
    if (!this.engine) return

    this.smoothAudio(audioFeatures)

    // Step physics
    this.Engine.update(this.engine, 1000 / 60)
  }

  draw() {
    // Override in subclasses
  }

  resize(width, height) {
    super.resize(width, height)
    this.bounds = {
      left: 0,
      right: width,
      top: 0,
      bottom: height
    }
    // Reinitialize on resize
    this.clear()
    this.init()
  }

  clear() {
    if (this.world) {
      this.Composite.clear(this.world, false)
    }
    if (this.engine) {
      this.Engine.clear(this.engine)
    }
    this.engine = null
    this.world = null
  }

  // Helper: Draw a Matter.js body to canvas
  drawBody(body, color = '#ffffff', stroke = null) {
    const vertices = body.vertices

    this.ctx.beginPath()
    this.ctx.moveTo(vertices[0].x, vertices[0].y)

    for (let i = 1; i < vertices.length; i++) {
      this.ctx.lineTo(vertices[i].x, vertices[i].y)
    }

    this.ctx.closePath()
    this.ctx.fillStyle = color
    this.ctx.fill()

    if (stroke) {
      this.ctx.strokeStyle = stroke
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }

  // Helper: Draw a circle body
  drawCircle(body, color = '#ffffff', stroke = null) {
    const pos = body.position
    const radius = body.circleRadius || 10

    this.ctx.beginPath()
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = color
    this.ctx.fill()

    if (stroke) {
      this.ctx.strokeStyle = stroke
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }

  // Helper: Draw a constraint (line between two points)
  drawConstraint(constraint, color = '#ffffff', lineWidth = 2) {
    const bodyA = constraint.bodyA
    const bodyB = constraint.bodyB
    const pointA = constraint.pointA
    const pointB = constraint.pointB

    let startX, startY, endX, endY

    if (bodyA) {
      startX = bodyA.position.x + pointA.x
      startY = bodyA.position.y + pointA.y
    } else {
      startX = pointA.x
      startY = pointA.y
    }

    if (bodyB) {
      endX = bodyB.position.x + pointB.x
      endY = bodyB.position.y + pointB.y
    } else {
      endX = pointB.x
      endY = pointB.y
    }

    this.ctx.beginPath()
    this.ctx.moveTo(startX, startY)
    this.ctx.lineTo(endX, endY)
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.stroke()
  }

  // Helper: Apply explosion force to all bodies
  applyExplosion(x, y, force, bodies) {
    for (const body of bodies) {
      if (body.isStatic) continue

      const dx = body.position.x - x
      const dy = body.position.y - y
      const dist = Math.sqrt(dx * dx + dy * dy) + 1

      const strength = force / (dist * 0.1)
      const fx = (dx / dist) * strength
      const fy = (dy / dist) * strength

      this.Body.applyForce(body, body.position, { x: fx, y: fy })
    }
  }

  // Helper: HSL to hex color
  hslToHex(h, s, l) {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }

    const toHex = x => {
      const hex = Math.round(x * 255).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }
}
