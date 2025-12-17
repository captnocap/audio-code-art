// Gravitational Orbits Mode - Particles orbit invisible attractors
// Audio modulates gravity, causing orbital chaos and slingshots

import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

class Particle {
  constructor(x, y, vx, vy, color, rgb) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.color = color
    this.rgb = rgb
    this.trail = []
    this.maxTrail = 30
    this.life = 1
    this.age = 0
  }

  update(attractors, dt) {
    // Store trail point
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > this.maxTrail) {
      this.trail.shift()
    }

    // Apply gravitational forces from all attractors
    let ax = 0
    let ay = 0

    for (const attractor of attractors) {
      const dx = attractor.x - this.x
      const dy = attractor.y - this.y
      const distSq = dx * dx + dy * dy
      const dist = Math.sqrt(distSq)

      // Softened gravity to prevent extreme acceleration
      const minDist = 50
      const force = attractor.mass / Math.max(distSq, minDist * minDist)

      // Repulsion if too close
      if (dist < minDist) {
        const repel = (minDist - dist) / minDist * 0.5
        ax -= (dx / dist) * repel
        ay -= (dy / dist) * repel
      } else {
        ax += (dx / dist) * force
        ay += (dy / dist) * force
      }
    }

    // Update velocity
    this.vx += ax * dt
    this.vy += ay * dt

    // Damping
    this.vx *= 0.999
    this.vy *= 0.999

    // Speed limit
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    const maxSpeed = 15
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed
      this.vy = (this.vy / speed) * maxSpeed
    }

    // Update position
    this.x += this.vx * dt
    this.y += this.vy * dt

    this.age++
    this.life = Math.max(0, 1 - this.age / 1000)
  }
}

class Attractor {
  constructor(x, y, mass) {
    this.x = x
    this.y = y
    this.mass = mass
    this.baseMass = mass
    this.targetX = x
    this.targetY = y
  }

  update(dt) {
    // Smoothly move toward target
    this.x += (this.targetX - this.x) * 0.02
    this.y += (this.targetY - this.y) * 0.02
  }
}

export class OrbitsMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'orbits'
    this.description = 'Particles in orbital mechanics around gravitational attractors'

    this.particles = []
    this.attractors = []
    this.maxParticles = 500

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
  }

  init() {
    this.clear()

    // Create initial attractors
    this.createAttractors()

    // Spawn initial particles
    for (let i = 0; i < 100; i++) {
      this.spawnParticle(0.5, 0.5, 1)
    }
  }

  createAttractors() {
    this.attractors = []

    // Central attractor
    this.attractors.push(new Attractor(
      this.width / 2,
      this.height / 2,
      500
    ))

    // Orbiting attractors
    const orbitRadius = Math.min(this.width, this.height) * 0.25
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2
      this.attractors.push(new Attractor(
        this.width / 2 + Math.cos(angle) * orbitRadius,
        this.height / 2 + Math.sin(angle) * orbitRadius,
        200
      ))
    }
  }

  spawnParticle(centroid, normalizedTempo, amplitude) {
    if (this.particles.length >= this.maxParticles) return

    // Spawn at edge of screen with tangential velocity
    const angle = Math.random() * Math.PI * 2
    const radius = Math.max(this.width, this.height) * 0.4

    const x = this.width / 2 + Math.cos(angle) * radius
    const y = this.height / 2 + Math.sin(angle) * radius

    // Tangential velocity for orbital motion
    const speed = 2 + amplitude * 3
    const vx = Math.cos(angle + Math.PI / 2) * speed
    const vy = Math.sin(angle + Math.PI / 2) * speed

    const color = pitchTempoToColor(centroid, normalizedTempo, amplitude)
    const rgb = pitchTempoToRGB(centroid, normalizedTempo, amplitude)

    this.particles.push(new Particle(x, y, vx, vy, color, rgb))
  }

  resize(width, height) {
    super.resize(width, height)
    this.createAttractors()
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    // Modulate central attractor mass with bass
    if (this.attractors[0]) {
      this.attractors[0].mass = 300 + this.smoothBass * 700
    }

    // Move orbital attractors based on mid frequencies
    const time = Date.now() * 0.001
    const orbitRadius = Math.min(this.width, this.height) * (0.2 + this.smoothMid * 0.2)

    for (let i = 1; i < this.attractors.length; i++) {
      const baseAngle = ((i - 1) / (this.attractors.length - 1)) * Math.PI * 2
      const angle = baseAngle + time * (0.2 + normalizedTempo * 0.3)

      this.attractors[i].targetX = this.width / 2 + Math.cos(angle) * orbitRadius
      this.attractors[i].targetY = this.height / 2 + Math.sin(angle) * orbitRadius
      this.attractors[i].mass = 100 + this.smoothHigh * 300
    }

    // Update attractors
    for (const attractor of this.attractors) {
      attractor.update(1)
    }

    // Spawn particles on beat
    if (onBeat) {
      const numSpawn = Math.ceil(beatIntensity * 10)
      for (let i = 0; i < numSpawn; i++) {
        this.spawnParticle(centroid, normalizedTempo, amplitude)
      }
    }

    // Continuous spawning during saturation
    if (isSaturated) {
      this.spawnParticle(centroid, normalizedTempo, amplitude)
    }

    // Update particles
    const dt = 1 + amplitude * 0.5
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.update(this.attractors, dt)

      // Remove dead or escaped particles
      const margin = 200
      if (p.life <= 0 ||
          p.x < -margin || p.x > this.width + margin ||
          p.y < -margin || p.y > this.height + margin) {
        this.particles.splice(i, 1)
      }
    }

    // High frequency adds jitter to all particles
    if (this.smoothHigh > 0.3) {
      const jitter = (this.smoothHigh - 0.3) * 2
      for (const p of this.particles) {
        p.vx += (Math.random() - 0.5) * jitter
        p.vy += (Math.random() - 0.5) * jitter
      }
    }
  }

  draw() {
    const ctx = this.ctx

    // Semi-transparent background for trails
    this.clearBackground(0.15)

    // Draw attractor glow
    for (const attractor of this.attractors) {
      const size = Math.sqrt(attractor.mass) * 0.5
      const gradient = ctx.createRadialGradient(
        attractor.x, attractor.y, 0,
        attractor.x, attractor.y, size * 2
      )
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
      gradient.addColorStop(0.5, 'rgba(100, 100, 150, 0.1)')
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(attractor.x, attractor.y, size * 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw particle trails
    for (const p of this.particles) {
      if (p.trail.length < 2) continue

      ctx.beginPath()
      ctx.moveTo(p.trail[0].x, p.trail[0].y)

      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y)
      }

      ctx.strokeStyle = `rgba(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b}, ${p.life * 0.5})`
      ctx.lineWidth = 1 + p.life
      ctx.stroke()
    }

    // Draw particles
    for (const p of this.particles) {
      const size = 2 + p.life * 3

      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fill()

      // Glow
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, size * 3
      )
      gradient.addColorStop(0, `rgba(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b}, ${p.life * 0.5})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  clear() {
    this.particles = []
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.ctx.fillStyle = 'rgb(10, 10, 10)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
