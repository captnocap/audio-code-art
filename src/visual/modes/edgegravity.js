import { VisualizationMode } from './base.js'
import { tuner } from '../tuner.js'

/**
 * Edge Gravity - Particles pulled to edges, audio pushes them back to center
 * Creates light trails with varying thickness, duration, speed, intensity, colors
 */
export class EdgeGravityMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'edgegravity'
    this.description = 'Edges pull. Sound pushes back. Light trails in the void.'

    this.particles = []
    this.maxParticles = 800
    this.trails = [] // Persistent trail segments

    // Smoothed audio values
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Center point
    this.centerX = width / 2
    this.centerY = height / 2
  }

  init() {
    this.particles = []
    this.trails = []
    this.centerX = this.width / 2
    this.centerY = this.height / 2

    // Spawn initial particles
    for (let i = 0; i < this.maxParticles; i++) {
      this.spawnParticle()
    }
  }

  resize(width, height) {
    super.resize(width, height)
    this.centerX = width / 2
    this.centerY = height / 2
  }

  spawnParticle() {
    // Each particle has a HOME position spread across canvas
    // They wander from home when audio plays, return when quiet

    // Home positions spread across canvas (not just center)
    const homeX = this.width * 0.15 + Math.random() * this.width * 0.7
    const homeY = this.height * 0.15 + Math.random() * this.height * 0.7

    // Start at home
    const x = homeX + (Math.random() - 0.5) * 50
    const y = homeY + (Math.random() - 0.5) * 50

    // Random properties
    const baseHue = Math.random() * 360
    const thickness = 1 + Math.random() * 5
    const trailDuration = 0.4 + Math.random() * 0.6
    const speedMult = 0.8 + Math.random() * 1.5
    const wanderAngle = Math.random() * Math.PI * 2 // Personal wander direction

    this.particles.push({
      x,
      y,
      homeX,
      homeY,
      vx: 0,
      vy: 0,
      hue: baseHue,
      thickness,
      trailDuration,
      speedMult,
      wanderAngle,
      intensity: 0.5 + Math.random() * 0.5,
      prevX: x,
      prevY: y,
      age: 0
    })
  }

  getForces(p) {
    const params = tuner.getAll()

    // === 1. SPRING TO HOME (always active, gentle) ===
    const homeX = p.homeX
    const homeY = p.homeY
    const toDx = homeX - p.x
    const toDy = homeY - p.y
    const homeDist = Math.sqrt(toDx * toDx + toDy * toDy) || 1

    // Spring force - stronger when further from home
    const springStrength = 0.02
    const springX = (toDx / homeDist) * Math.min(homeDist * springStrength, 2)
    const springY = (toDy / homeDist) * Math.min(homeDist * springStrength, 2)

    // === 2. AUDIO WANDER (fights against spring) ===
    // More audio = more energy to wander away from home
    const audioEnergy = this.smoothAmplitude * 2

    // Wander direction influenced by audio features
    // Bass shifts angle one way, highs shift another
    const angleShift = this.smoothBass * 0.5 - this.smoothHigh * 0.3
    p.wanderAngle += angleShift * 0.1 + (Math.random() - 0.5) * 0.2

    // Wander force in personal direction
    const wanderStrength = audioEnergy * 3 * p.speedMult
    const wanderX = Math.cos(p.wanderAngle) * wanderStrength
    const wanderY = Math.sin(p.wanderAngle) * wanderStrength

    // === 3. BASS = BURST AWAY FROM CENTER ===
    const cdx = p.x - this.centerX
    const cdy = p.y - this.centerY
    const cDist = Math.sqrt(cdx * cdx + cdy * cdy) || 1
    const burstStrength = this.smoothBass * params.bassWeight * 5
    const burstX = (cdx / cDist) * burstStrength
    const burstY = (cdy / cDist) * burstStrength

    // === 4. MIDS = SWIRL ===
    const swirlStrength = this.smoothMid * params.midWeight * 3
    const swirlX = (-cdy / cDist) * swirlStrength
    const swirlY = (cdx / cDist) * swirlStrength

    // === 5. HIGHS = JITTER ===
    const jitterStrength = this.smoothHigh * params.highWeight * 4
    const jitterX = (Math.random() - 0.5) * jitterStrength
    const jitterY = (Math.random() - 0.5) * jitterStrength

    // Combine: Spring always pulls home, audio forces fight it
    return {
      fx: springX + wanderX + burstX + swirlX + jitterX,
      fy: springY + wanderY + burstY + swirlY + jitterY
    }
  }

  update(audioFeatures, beatInfo) {
    if (!audioFeatures) return

    const { amplitude, bass, mid, high } = audioFeatures
    const { onBeat, bpm } = beatInfo
    const params = tuner.getAll()

    // Smooth audio values
    this.smoothBass = this.smoothBass * 0.8 + bass * 0.2
    this.smoothMid = this.smoothMid * 0.8 + mid * 0.2
    this.smoothHigh = this.smoothHigh * 0.85 + high * 0.15
    this.smoothAmplitude = this.smoothAmplitude * 0.9 + amplitude * 0.1

    // BPM determines how many particles are "awake" and reacting
    // Scale: 60 BPM = ~100 particles, 120 BPM = ~400, 180 BPM = ~700
    const detectedBPM = bpm > 0 ? bpm : 80 // Default if not detected
    const activeCount = Math.floor(Math.min(this.maxParticles, detectedBPM * 4))

    // Shuffle which particles are active (changes each frame for variety)
    // Using a seeded approach so it's not totally random
    const frameHash = (Date.now() * 0.01) % 1000

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      // Is this particle "active" based on BPM?
      // Use index + frame to create rotating activation
      const isActive = ((i + Math.floor(frameHash)) % this.maxParticles) < activeCount

      // Store previous position for trail
      p.prevX = p.x
      p.prevY = p.y

      let fx, fy

      if (isActive) {
        // Active particles get full audio forces
        const forces = this.getForces(p)
        fx = forces.fx
        fy = forces.fy
      } else {
        // Inactive particles just drift home gently
        const toDx = p.homeX - p.x
        const toDy = p.homeY - p.y
        const homeDist = Math.sqrt(toDx * toDx + toDy * toDy) || 1
        fx = (toDx / homeDist) * 0.1
        fy = (toDy / homeDist) * 0.1
      }

      // Apply forces
      p.vx += fx
      p.vy += fy

      // Damping - active particles retain more energy
      const dampingBase = isActive ? 0.94 : 0.88
      const dampingAudio = isActive ? 0.04 * this.smoothAmplitude : 0
      p.vx *= dampingBase + dampingAudio
      p.vy *= dampingBase + dampingAudio

      // Clamp velocity
      const maxVel = isActive ? 25 : 8
      const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
      if (vel > maxVel) {
        p.vx = (p.vx / vel) * maxVel
        p.vy = (p.vy / vel) * maxVel
      }

      // Update position
      p.x += p.vx
      p.y += p.vy

      // Mark active state for drawing
      p.isActive = isActive

      // Age particle
      p.age++

      // Update intensity based on speed and audio
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
      p.intensity = Math.min(1, 0.3 + speed * 0.2 + this.smoothAmplitude * 0.5)

      // Shift hue over time and with audio
      p.hue += this.smoothHigh * params.colorDrift * 2
      if (p.hue > 360) p.hue -= 360

      // Create trail segment
      if (speed > 0.5) {
        this.trails.push({
          x1: p.prevX,
          y1: p.prevY,
          x2: p.x,
          y2: p.y,
          hue: p.hue,
          thickness: p.thickness * (0.5 + speed * 0.3),
          intensity: p.intensity,
          life: p.trailDuration,
          decay: (1 - p.trailDuration) * 0.02 + 0.005
        })
      }

      // Hard bounce off edges - particles slam into edges and bounce back
      const bounceDamping = 0.7
      if (p.x < 5) {
        p.x = 5
        p.vx = Math.abs(p.vx) * bounceDamping
      }
      if (p.x > this.width - 5) {
        p.x = this.width - 5
        p.vx = -Math.abs(p.vx) * bounceDamping
      }
      if (p.y < 5) {
        p.y = 5
        p.vy = Math.abs(p.vy) * bounceDamping
      }
      if (p.y > this.height - 5) {
        p.y = this.height - 5
        p.vy = -Math.abs(p.vy) * bounceDamping
      }
    }

    // Update trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i]
      t.life -= t.decay

      if (t.life <= 0) {
        this.trails.splice(i, 1)
      }
    }

    // Limit trails
    if (this.trails.length > 5000) {
      this.trails.splice(0, this.trails.length - 5000)
    }

    // On beat: kick particles hard in their wander direction
    if (onBeat && this.smoothAmplitude > 0.15) {
      const beatStrength = 8 + this.smoothBass * 15
      for (const p of this.particles) {
        // Kick in wander direction + some randomness
        const kickAngle = p.wanderAngle + (Math.random() - 0.5) * 1
        p.vx += Math.cos(kickAngle) * beatStrength * p.speedMult
        p.vy += Math.sin(kickAngle) * beatStrength * p.speedMult

        // Also shift their wander angle for variety
        p.wanderAngle += (Math.random() - 0.5) * 0.5
      }
    }

    // Maintain particle count
    while (this.particles.length < this.maxParticles) {
      this.spawnParticle()
    }
  }

  draw() {
    const ctx = this.ctx
    const params = tuner.getAll()

    // Semi-transparent background for trail persistence
    const fadeAmount = 0.05 + (1 - params.decay) * 0.15
    if (this.transparentBackground) {
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`
    } else {
      ctx.fillStyle = `rgba(10, 10, 10, ${fadeAmount})`
    }
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw edge glow (the void pulling)
    this.drawEdgeGlow(ctx)

    // Draw trails
    this.drawTrails(ctx)

    // Draw particles
    this.drawParticles(ctx)

    // Draw center glow (audio sanctuary)
    this.drawCenterGlow(ctx)
  }

  drawEdgeGlow(ctx) {
    const edgeGlow = 50 + this.smoothAmplitude * 30

    // Create edge gradients
    const gradients = [
      // Left edge
      { x1: 0, y1: this.height / 2, x2: edgeGlow, y2: this.height / 2 },
      // Right edge
      { x1: this.width, y1: this.height / 2, x2: this.width - edgeGlow, y2: this.height / 2 },
      // Top edge
      { x1: this.width / 2, y1: 0, x2: this.width / 2, y2: edgeGlow },
      // Bottom edge
      { x1: this.width / 2, y1: this.height, x2: this.width / 2, y2: this.height - edgeGlow }
    ]

    ctx.save()
    ctx.globalCompositeOperation = 'screen'

    // Draw each edge
    const hue = (Date.now() * 0.02) % 360
    const intensity = 0.1 + this.smoothBass * 0.1

    // Left
    let grad = ctx.createLinearGradient(0, 0, edgeGlow, 0)
    grad.addColorStop(0, `hsla(${hue}, 80%, 30%, ${intensity})`)
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, edgeGlow, this.height)

    // Right
    grad = ctx.createLinearGradient(this.width, 0, this.width - edgeGlow, 0)
    grad.addColorStop(0, `hsla(${hue + 60}, 80%, 30%, ${intensity})`)
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fillRect(this.width - edgeGlow, 0, edgeGlow, this.height)

    // Top
    grad = ctx.createLinearGradient(0, 0, 0, edgeGlow)
    grad.addColorStop(0, `hsla(${hue + 120}, 80%, 30%, ${intensity})`)
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.width, edgeGlow)

    // Bottom
    grad = ctx.createLinearGradient(0, this.height, 0, this.height - edgeGlow)
    grad.addColorStop(0, `hsla(${hue + 180}, 80%, 30%, ${intensity})`)
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fillRect(0, this.height - edgeGlow, this.width, edgeGlow)

    ctx.restore()
  }

  drawCenterGlow(ctx) {
    const glowRadius = 100 + this.smoothAmplitude * 150

    ctx.save()
    ctx.globalCompositeOperation = 'screen'

    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, glowRadius
    )

    const hue = (Date.now() * 0.03 + 180) % 360
    const intensity = 0.1 + this.smoothAmplitude * 0.3

    gradient.addColorStop(0, `hsla(${hue}, 60%, 50%, ${intensity})`)
    gradient.addColorStop(0.5, `hsla(${hue + 30}, 70%, 40%, ${intensity * 0.5})`)
    gradient.addColorStop(1, 'transparent')

    ctx.fillStyle = gradient
    ctx.fillRect(
      this.centerX - glowRadius,
      this.centerY - glowRadius,
      glowRadius * 2,
      glowRadius * 2
    )

    ctx.restore()
  }

  drawTrails(ctx) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'

    for (const t of this.trails) {
      const alpha = t.life * t.intensity

      // Main trail
      ctx.strokeStyle = `hsla(${t.hue}, 80%, 60%, ${alpha})`
      ctx.lineWidth = t.thickness
      ctx.beginPath()
      ctx.moveTo(t.x1, t.y1)
      ctx.lineTo(t.x2, t.y2)
      ctx.stroke()

      // Glow layer
      ctx.strokeStyle = `hsla(${t.hue}, 100%, 70%, ${alpha * 0.3})`
      ctx.lineWidth = t.thickness * 3
      ctx.beginPath()
      ctx.moveTo(t.x1, t.y1)
      ctx.lineTo(t.x2, t.y2)
      ctx.stroke()
    }

    ctx.restore()
  }

  drawParticles(ctx) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    for (const p of this.particles) {
      // Active particles are bigger and brighter
      const activeMult = p.isActive ? 1.5 : 0.6
      const size = p.thickness * (1 + this.smoothAmplitude * 0.5) * activeMult
      const intensity = p.intensity * activeMult

      // Particle glow - bigger for active
      const glowSize = size * (p.isActive ? 5 : 2)
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize)
      gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${intensity})`)
      gradient.addColorStop(0.5, `hsla(${p.hue}, 80%, 50%, ${intensity * 0.5})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
      ctx.fill()

      // Particle core
      ctx.fillStyle = `hsla(${p.hue}, 60%, ${p.isActive ? 90 : 60}%, ${intensity})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  clear() {
    this.init()
  }
}
