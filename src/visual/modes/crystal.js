// Crystal Growth Mode - Dendritic crystallization patterns
// Simulates crystal nucleation and growth driven by audio

import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

class CrystalBranch {
  constructor(x, y, angle, generation, color) {
    this.x = x
    this.y = y
    this.angle = angle
    this.generation = generation
    this.color = color
    this.length = 0
    this.targetLength = 0
    this.thickness = Math.max(1, 8 - generation)
    this.children = []
    this.growing = true
    this.growthSpeed = 0
  }
}

class Crystal {
  constructor(x, y, type, color) {
    this.x = x
    this.y = y
    this.type = type // 'hexagonal', 'cubic', 'dendritic'
    this.color = color
    this.branches = []
    this.age = 0
    this.symmetry = type === 'hexagonal' ? 6 : (type === 'cubic' ? 4 : 6)

    // Create initial branches based on symmetry
    for (let i = 0; i < this.symmetry; i++) {
      const angle = (i / this.symmetry) * Math.PI * 2 - Math.PI / 2
      this.branches.push(new CrystalBranch(x, y, angle, 0, color))
    }
  }
}

export class CrystalMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'crystal'
    this.description = 'Dendritic crystal growth patterns'

    this.crystals = []
    this.maxCrystals = 15

    // Supersaturation (growth rate)
    this.supersaturation = 0.5

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    // Background particles (dissolved solute)
    this.particles = []
    this.maxParticles = 500
  }

  init() {
    this.clear()
    // Seed initial crystal
    this.nucleateCrystal(this.width / 2, this.height / 2, 0.5, 0.5)

    // Create background particles
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 1 + Math.random() * 2
      })
    }
  }

  nucleateCrystal(x, y, centroid, normalizedTempo) {
    if (this.crystals.length >= this.maxCrystals) return

    // Crystal type based on audio
    let type
    if (centroid < 0.33) {
      type = 'cubic' // Bass = blocky cubic crystals
    } else if (centroid < 0.66) {
      type = 'hexagonal' // Mid = snowflake-like
    } else {
      type = 'dendritic' // High = branching dendrites
    }

    const color = pitchTempoToRGB(centroid, normalizedTempo, 0.8)
    this.crystals.push(new Crystal(x, y, type, color))
  }

  resize(width, height) {
    super.resize(width, height)
  }

  growBranch(branch, crystal, growthRate, branchProb) {
    if (!branch.growing) return

    // Grow toward target
    const growth = growthRate * (1 + Math.random() * 0.5)
    branch.targetLength += growth
    branch.length += (branch.targetLength - branch.length) * 0.1

    // Calculate tip position
    const tipX = branch.x + Math.cos(branch.angle) * branch.length
    const tipY = branch.y + Math.sin(branch.angle) * branch.length

    // Stop if off screen
    const margin = 20
    if (tipX < margin || tipX > this.width - margin ||
        tipY < margin || tipY > this.height - margin) {
      branch.growing = false
      return
    }

    // Branching
    if (branch.generation < 5 && branch.length > 20 && Math.random() < branchProb) {
      const branchAngleOffset = Math.PI / 3 // 60 degrees for hexagonal

      // Create symmetric branches
      const leftAngle = branch.angle - branchAngleOffset
      const rightAngle = branch.angle + branchAngleOffset

      if (branch.children.length < 4) {
        branch.children.push(new CrystalBranch(
          tipX, tipY, leftAngle, branch.generation + 1, branch.color
        ))
        branch.children.push(new CrystalBranch(
          tipX, tipY, rightAngle, branch.generation + 1, branch.color
        ))
      }
    }

    // Recursively grow children
    for (const child of branch.children) {
      this.growBranch(child, crystal, growthRate * 0.8, branchProb * 0.7)
    }
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { bass, mid, high, amplitude, centroid } = weighted
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    // Supersaturation from amplitude (more energy = faster growth)
    this.supersaturation = 0.2 + amplitude * 1.5

    // Growth rate and branching probability
    const growthRate = this.supersaturation * (0.5 + this.smoothBass * 2)
    const branchProb = 0.01 + this.smoothHigh * 0.05

    // Grow existing crystals
    for (const crystal of this.crystals) {
      crystal.age++

      for (const branch of crystal.branches) {
        this.growBranch(branch, crystal, growthRate, branchProb)
      }
    }

    // Nucleate new crystals on beat
    if (onBeat && beatIntensity > 0.5) {
      // Find position away from existing crystals
      let bestX = Math.random() * this.width
      let bestY = Math.random() * this.height
      let bestDist = 0

      for (let i = 0; i < 10; i++) {
        const x = Math.random() * this.width
        const y = Math.random() * this.height

        let minDist = Infinity
        for (const crystal of this.crystals) {
          const dx = x - crystal.x
          const dy = y - crystal.y
          minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy))
        }

        if (minDist > bestDist) {
          bestDist = minDist
          bestX = x
          bestY = y
        }
      }

      if (bestDist > 100) {
        this.nucleateCrystal(bestX, bestY, centroid, normalizedTempo)
      }
    }

    // Update background particles
    for (const p of this.particles) {
      // Brownian motion
      p.vx += (Math.random() - 0.5) * 0.1 * this.supersaturation
      p.vy += (Math.random() - 0.5) * 0.1 * this.supersaturation

      // Damping
      p.vx *= 0.95
      p.vy *= 0.95

      // Attraction to crystals (represents diffusion)
      for (const crystal of this.crystals) {
        const dx = crystal.x - p.x
        const dy = crystal.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 200 && dist > 20) {
          p.vx += dx / dist * 0.02
          p.vy += dy / dist * 0.02
        }
      }

      p.x += p.vx
      p.y += p.vy

      // Wrap around
      if (p.x < 0) p.x = this.width
      if (p.x > this.width) p.x = 0
      if (p.y < 0) p.y = this.height
      if (p.y > this.height) p.y = 0
    }
  }

  drawBranch(ctx, branch, depth = 0) {
    const tipX = branch.x + Math.cos(branch.angle) * branch.length
    const tipY = branch.y + Math.sin(branch.angle) * branch.length

    if (branch.length < 1) return

    // Branch color with generation-based fade
    const alpha = Math.max(0.3, 1 - branch.generation * 0.15)
    const { r, g, b } = branch.color

    // Main branch line
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.lineWidth = branch.thickness
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(branch.x, branch.y)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()

    // Glow effect
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`
    ctx.lineWidth = branch.thickness + 4
    ctx.stroke()

    // Draw children
    for (const child of branch.children) {
      this.drawBranch(ctx, child, depth + 1)
    }
  }

  draw() {
    const ctx = this.ctx

    // Dark blue-ish background (like looking at crystals in solution)
    ctx.fillStyle = 'rgb(5, 8, 20)'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw background particles (dissolved solute)
    ctx.fillStyle = 'rgba(100, 150, 200, 0.3)'
    for (const p of this.particles) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw crystals
    for (const crystal of this.crystals) {
      // Draw all branches
      for (const branch of crystal.branches) {
        this.drawBranch(ctx, branch)
      }

      // Draw nucleation center
      const gradient = ctx.createRadialGradient(
        crystal.x, crystal.y, 0,
        crystal.x, crystal.y, 15
      )
      gradient.addColorStop(0, `rgba(${crystal.color.r}, ${crystal.color.g}, ${crystal.color.b}, 1)`)
      gradient.addColorStop(0.5, `rgba(${crystal.color.r}, ${crystal.color.g}, ${crystal.color.b}, 0.5)`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(crystal.x, crystal.y, 15, 0, Math.PI * 2)
      ctx.fill()
    }

    // Info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '12px monospace'
    ctx.fillText(`Crystals: ${this.crystals.length}  Supersaturation: ${this.supersaturation.toFixed(2)}`, 10, 20)
  }

  clear() {
    this.crystals = []
    this.particles = []
    this.supersaturation = 0.5
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    // Re-init particles
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 1 + Math.random() * 2
      })
    }

    this.ctx.fillStyle = 'rgb(5, 8, 20)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
