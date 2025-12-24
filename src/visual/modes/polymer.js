// Polymerization Mode - Chain reactions and polymer growth
// Monomers link together forming various polymer architectures

import { VisualizationMode } from './base.js'
import { pitchTempoToRGB } from '../palette.js'

class Monomer {
  constructor(x, y, type) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 3
    this.vy = (Math.random() - 0.5) * 3
    this.type = type // Different monomer types
    this.radius = 6
    this.bonded = false
    this.polymer = null
    this.bondedTo = [] // List of bonded monomers
    this.maxBonds = 2 // Linear polymer
    this.activated = false // Radical/active site
  }

  canBond() {
    return this.bondedTo.length < this.maxBonds
  }
}

class Polymer {
  constructor(initiator) {
    this.monomers = [initiator]
    this.id = Math.random()
    this.color = null
    this.age = 0
    this.growing = true
  }

  get length() {
    return this.monomers.length
  }

  get head() {
    return this.monomers[this.monomers.length - 1]
  }

  get tail() {
    return this.monomers[0]
  }

  addMonomer(monomer) {
    this.monomers.push(monomer)
    monomer.polymer = this
    monomer.bonded = true
  }
}

export class PolymerMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'polymer'
    this.description = 'Chain polymerization reactions'

    this.monomers = []
    this.polymers = []
    this.maxMonomers = 800

    // Reaction parameters
    this.initiationRate = 0.01 // Rate of starting new chains
    this.propagationRate = 0.1 // Rate of chain growth
    this.terminationRate = 0.001 // Rate of chain termination
    this.branchingRate = 0 // Rate of branching

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    // Monomer types
    this.monomerTypes = ['A', 'B', 'C']
  }

  init() {
    this.clear()
    // Spawn initial monomers
    this.spawnMonomers(200)
  }

  spawnMonomers(count) {
    for (let i = 0; i < count && this.monomers.length < this.maxMonomers; i++) {
      const type = this.monomerTypes[Math.floor(Math.random() * this.monomerTypes.length)]
      this.monomers.push(new Monomer(
        Math.random() * this.width,
        Math.random() * this.height,
        type
      ))
    }
  }

  spawnInitiator(x, y) {
    // Create an activated monomer that starts a chain
    const monomer = new Monomer(x, y, 'I') // Initiator type
    monomer.activated = true
    monomer.radius = 8
    this.monomers.push(monomer)

    // Start a new polymer
    const polymer = new Polymer(monomer)
    polymer.color = pitchTempoToRGB(Math.random(), 0.5, 0.8)
    monomer.polymer = polymer
    this.polymers.push(polymer)
  }

  resize(width, height) {
    super.resize(width, height)
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

    // Reaction parameters from audio
    this.propagationRate = 0.05 + this.smoothBass * 0.3 // Bass = faster growth
    this.terminationRate = 0.001 + this.smoothHigh * 0.01 // High = more termination
    this.branchingRate = this.smoothMid * 0.05 // Mid = more branching

    // Spawn new monomers based on amplitude
    if (amplitude > 0.3 && Math.random() < amplitude * 0.3) {
      this.spawnMonomers(Math.ceil(amplitude * 5))
    }

    // Initiation on beat
    if (onBeat && beatIntensity > 0.4) {
      const numInitiators = Math.ceil(beatIntensity * 3)
      for (let i = 0; i < numInitiators; i++) {
        this.spawnInitiator(
          Math.random() * this.width,
          Math.random() * this.height
        )
      }
    }

    // Physics update for free monomers
    for (const monomer of this.monomers) {
      if (monomer.bonded) continue

      // Brownian motion
      monomer.vx += (Math.random() - 0.5) * 0.5
      monomer.vy += (Math.random() - 0.5) * 0.5

      // Damping
      monomer.vx *= 0.95
      monomer.vy *= 0.95

      // Update position
      monomer.x += monomer.vx
      monomer.y += monomer.vy

      // Boundary wrapping
      if (monomer.x < 0) monomer.x = this.width
      if (monomer.x > this.width) monomer.x = 0
      if (monomer.y < 0) monomer.y = this.height
      if (monomer.y > this.height) monomer.y = 0
    }

    // Propagation - growing polymers capture nearby monomers
    for (const polymer of this.polymers) {
      if (!polymer.growing) continue

      polymer.age++

      // Check for nearby free monomers
      const head = polymer.head

      for (const monomer of this.monomers) {
        if (monomer.bonded || monomer === head) continue

        const dx = monomer.x - head.x
        const dy = monomer.y - head.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Capture radius
        const captureRadius = 30

        if (dist < captureRadius && Math.random() < this.propagationRate) {
          // Add to polymer
          polymer.addMonomer(monomer)

          // Position the new monomer
          const angle = Math.atan2(dy, dx)
          const bondLength = 15
          monomer.x = head.x + Math.cos(angle) * bondLength
          monomer.y = head.y + Math.sin(angle) * bondLength

          // Record bond
          head.bondedTo.push(monomer)
          monomer.bondedTo.push(head)

          break // One addition per frame
        }
      }

      // Termination
      if (Math.random() < this.terminationRate) {
        polymer.growing = false
      }

      // Branching
      if (polymer.length > 5 && Math.random() < this.branchingRate) {
        // Pick a random monomer in the chain to branch from
        const branchPoint = polymer.monomers[Math.floor(Math.random() * (polymer.length - 1))]
        if (branchPoint.bondedTo.length < 3) {
          branchPoint.maxBonds = 3

          // Start a new branch polymer
          const branchMonomer = new Monomer(
            branchPoint.x + (Math.random() - 0.5) * 20,
            branchPoint.y + (Math.random() - 0.5) * 20,
            branchPoint.type
          )
          branchMonomer.bonded = true
          branchMonomer.bondedTo.push(branchPoint)
          branchPoint.bondedTo.push(branchMonomer)

          this.monomers.push(branchMonomer)

          const branch = new Polymer(branchMonomer)
          branch.color = polymer.color
          branchMonomer.polymer = branch
          this.polymers.push(branch)
        }
      }
    }

    // Update bonded monomer positions (maintain bond lengths)
    this.relaxPolymerPositions()

    // Cleanup long-dead polymers
    this.polymers = this.polymers.filter(p => p.growing || p.age < 1000)
  }

  relaxPolymerPositions() {
    // Simple spring relaxation for polymer chains
    const bondLength = 15
    const springStrength = 0.1

    for (const polymer of this.polymers) {
      for (let i = 1; i < polymer.monomers.length; i++) {
        const m1 = polymer.monomers[i - 1]
        const m2 = polymer.monomers[i]

        const dx = m2.x - m1.x
        const dy = m2.y - m1.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        const stretch = dist - bondLength
        const fx = (dx / dist) * stretch * springStrength
        const fy = (dy / dist) * stretch * springStrength

        m2.x -= fx
        m2.y -= fy
        m1.x += fx * 0.5
        m1.y += fy * 0.5
      }
    }
  }

  draw() {
    const ctx = this.ctx

    // Dark background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.3)'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw free monomers
    for (const monomer of this.monomers) {
      if (monomer.bonded) continue

      ctx.fillStyle = monomer.activated ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 100, 100, 0.5)'
      ctx.beginPath()
      ctx.arc(monomer.x, monomer.y, monomer.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw polymers
    for (const polymer of this.polymers) {
      if (polymer.monomers.length < 2) continue

      const { r, g, b } = polymer.color
      const alpha = polymer.growing ? 1 : Math.max(0.3, 1 - polymer.age / 1000)

      // Draw backbone
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.moveTo(polymer.monomers[0].x, polymer.monomers[0].y)

      for (let i = 1; i < polymer.monomers.length; i++) {
        ctx.lineTo(polymer.monomers[i].x, polymer.monomers[i].y)
      }
      ctx.stroke()

      // Draw monomers
      for (let i = 0; i < polymer.monomers.length; i++) {
        const m = polymer.monomers[i]

        // Glow for active head
        if (polymer.growing && i === polymer.monomers.length - 1) {
          const gradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 15)
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`)
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(m.x, m.y, 15, 0, Math.PI * 2)
          ctx.fill()
        }

        // Monomer sphere
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2)
        ctx.fill()

        // Highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`
        ctx.beginPath()
        ctx.arc(m.x - 2, m.y - 2, m.radius * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw branches
      for (const m of polymer.monomers) {
        if (m.bondedTo.length > 2) {
          for (const bonded of m.bondedTo) {
            if (!polymer.monomers.includes(bonded)) {
              ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.moveTo(m.x, m.y)
              ctx.lineTo(bonded.x, bonded.y)
              ctx.stroke()
            }
          }
        }
      }
    }

    // Stats
    const totalPolymerized = this.monomers.filter(m => m.bonded).length
    const growing = this.polymers.filter(p => p.growing).length

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '12px monospace'
    ctx.fillText(`Monomers: ${this.monomers.length}  Polymerized: ${totalPolymerized}  Chains: ${this.polymers.length} (${growing} growing)`, 10, 20)
  }

  clear() {
    this.monomers = []
    this.polymers = []
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.ctx.fillStyle = 'rgb(10, 10, 20)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
