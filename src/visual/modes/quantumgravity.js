// Quantum Gravity Mode - The Unified Theory of Sound
// Sound IS gravity. Beats collapse wave functions. Silence spawns virtual particles.
// Bass warps spacetime. Treble is exotic negative mass. The impossible made visible.

import { VisualizationMode } from './base.js'

// Physical constants (tuned for visual appeal, not realism)
const G = 0.0001  // Gravitational constant
const C = 200     // Speed of "light" (pixels per update)
const PLANCK_TIME = 0.05  // Minimum lifetime for virtual particles
const GRID_SIZE = 40  // Spacetime grid resolution
const MAX_PARTICLES = 150
const MAX_FLUCTUATIONS = 30
const MAX_WAVES = 10

// Wave function point in probability cloud
class WavePoint {
  constructor(x, y, amplitude, phase) {
    this.x = x
    this.y = y
    this.amplitude = amplitude
    this.phase = phase
    this.vx = 0
    this.vy = 0
  }
}

// Quantum particle with wave function
class QuantumParticle {
  constructor(x, y, width, height) {
    this.centerX = x
    this.centerY = y
    this.collapsed = false
    this.collapsedX = x
    this.collapsedY = y
    this.spin = Math.random() < 0.5 ? 1 : -1
    this.entangledWith = null
    this.decoherenceTime = 0
    this.collapseFlash = 0
    this.age = 0
    this.life = 1
    this.hue = Math.random() * 360

    // Wave function as probability cloud points
    this.waveFunction = []
    const numPoints = 24
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const r = 20 + Math.random() * 30
      this.waveFunction.push(new WavePoint(
        x + Math.cos(angle) * r,
        y + Math.sin(angle) * r,
        0.5 + Math.random() * 0.5,
        Math.random() * Math.PI * 2
      ))
    }
  }

  // Spread wave function (quantum uncertainty)
  spread(uncertainty, dt) {
    if (this.collapsed) return

    const spreadRate = uncertainty * 0.5
    for (const point of this.waveFunction) {
      // Spread outward from center
      const dx = point.x - this.centerX
      const dy = point.y - this.centerY
      const dist = Math.sqrt(dx * dx + dy * dy) || 1

      point.x += (dx / dist) * spreadRate * dt
      point.y += (dy / dist) * spreadRate * dt

      // Phase evolution (quantum oscillation)
      point.phase += 0.1 * dt
      point.amplitude *= 0.998  // Slight decay
    }

    // Update center to mean of wave function
    let sumX = 0, sumY = 0, sumA = 0
    for (const p of this.waveFunction) {
      sumX += p.x * p.amplitude
      sumY += p.y * p.amplitude
      sumA += p.amplitude
    }
    if (sumA > 0) {
      this.centerX = sumX / sumA
      this.centerY = sumY / sumA
    }
  }

  // Apply geodesic motion (curved spacetime)
  applyGeodesic(gradX, gradY, timeDilation, dt) {
    const factor = timeDilation * dt

    if (this.collapsed) {
      // Collapsed particle moves as single point
      this.collapsedX -= gradX * factor * 50
      this.collapsedY -= gradY * factor * 50
    } else {
      // Wave function follows geodesics
      for (const point of this.waveFunction) {
        point.vx -= gradX * factor * 30
        point.vy -= gradY * factor * 30
        point.vx *= 0.98
        point.vy *= 0.98
        point.x += point.vx * dt
        point.y += point.vy * dt
      }
    }
  }

  // Collapse wave function (measurement)
  collapse() {
    if (this.collapsed) return

    // Weighted random selection based on amplitude squared
    let totalProb = 0
    for (const p of this.waveFunction) {
      totalProb += p.amplitude * p.amplitude
    }

    let r = Math.random() * totalProb
    let chosen = this.waveFunction[0]
    for (const p of this.waveFunction) {
      r -= p.amplitude * p.amplitude
      if (r <= 0) {
        chosen = p
        break
      }
    }

    this.collapsed = true
    this.collapsedX = chosen.x
    this.collapsedY = chosen.y
    this.collapseFlash = 1
    this.decoherenceTime = 60 + Math.random() * 120  // Frames until re-spread

    // Entanglement: collapse partner with opposite spin
    if (this.entangledWith && !this.entangledWith.collapsed) {
      this.entangledWith.spin = -this.spin
      this.entangledWith.collapse()
    }
  }

  // Decohere back to superposition
  decohere() {
    if (!this.collapsed) return

    this.collapsed = false
    // Rebuild wave function around collapsed position
    const numPoints = 24
    this.waveFunction = []
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const r = 10 + Math.random() * 20
      this.waveFunction.push(new WavePoint(
        this.collapsedX + Math.cos(angle) * r,
        this.collapsedY + Math.sin(angle) * r,
        0.5 + Math.random() * 0.5,
        Math.random() * Math.PI * 2
      ))
    }
    this.centerX = this.collapsedX
    this.centerY = this.collapsedY
  }

  update(dt) {
    this.age++
    this.life = Math.max(0, 1 - this.age / 600)
    this.collapseFlash *= 0.9

    if (this.collapsed) {
      this.decoherenceTime--
      if (this.decoherenceTime <= 0) {
        this.decohere()
      }
    }
  }
}

// Virtual particle-antiparticle pair (vacuum fluctuation)
class VacuumFluctuation {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.particleX = x
    this.particleY = y
    this.antiparticleX = x
    this.antiparticleY = y
    this.lifetime = PLANCK_TIME + Math.random() * 0.3
    this.age = 0
    this.separationSpeed = 2 + Math.random() * 3
    this.angle = Math.random() * Math.PI * 2
    this.annihilating = false
    this.flash = 0
  }

  update(dt) {
    this.age += dt * 0.016
    const progress = this.age / this.lifetime

    if (progress < 0.5) {
      // Separating
      const sep = progress * 2 * this.separationSpeed * 30
      this.particleX = this.x + Math.cos(this.angle) * sep
      this.particleY = this.y + Math.sin(this.angle) * sep
      this.antiparticleX = this.x - Math.cos(this.angle) * sep
      this.antiparticleY = this.y - Math.sin(this.angle) * sep
    } else {
      // Coming back together
      const sep = (1 - (progress - 0.5) * 2) * this.separationSpeed * 30
      this.particleX = this.x + Math.cos(this.angle) * sep
      this.particleY = this.y + Math.sin(this.angle) * sep
      this.antiparticleX = this.x - Math.cos(this.angle) * sep
      this.antiparticleY = this.y - Math.sin(this.angle) * sep
    }

    if (this.age >= this.lifetime) {
      this.annihilating = true
      this.flash = 1
    }

    return !this.annihilating || this.flash > 0.1
  }
}

// Gravitational wave ripple
class GravitationalWave {
  constructor(x, y, intensity) {
    this.x = x
    this.y = y
    this.radius = 0
    this.intensity = intensity
    this.hPlus = intensity  // + polarization
    this.hCross = intensity * 0.7  // x polarization
  }

  update(dt) {
    this.radius += C * 0.3 * dt
    this.intensity *= 0.985
    this.hPlus *= 0.985
    this.hCross *= 0.985
    return this.intensity > 0.01
  }

  getStrainAt(x, y) {
    const dx = x - this.x
    const dy = y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const ringDist = Math.abs(dist - this.radius)

    if (ringDist > 50) return { hPlus: 0, hCross: 0 }

    const falloff = Math.exp(-ringDist * ringDist / 1000)
    return {
      hPlus: this.hPlus * falloff,
      hCross: this.hCross * falloff
    }
  }
}

// Gravitational mass (positive or negative)
class GravitationalMass {
  constructor(x, y, mass) {
    this.x = x
    this.y = y
    this.mass = mass  // Positive = attracts, Negative = repels
    this.targetMass = mass
    this.accumulated = Math.abs(mass)
    this.isBlackHole = false
    this.eventHorizonRadius = 0
    this.hawkingParticles = []
    this.pulsePhase = Math.random() * Math.PI * 2
  }

  update(dt) {
    // Smooth mass changes
    this.mass += (this.targetMass - this.mass) * 0.1

    // Track accumulation for black hole formation
    if (this.mass > 0) {
      this.accumulated = this.accumulated * 0.99 + Math.abs(this.mass) * 0.01
    }

    // Black hole formation threshold
    const blackHoleThreshold = 800
    if (this.accumulated > blackHoleThreshold && this.mass > 0) {
      this.isBlackHole = true
      this.eventHorizonRadius = Math.sqrt(this.accumulated) * 0.3
    } else {
      this.isBlackHole = false
      this.eventHorizonRadius = 0
    }

    // Hawking radiation
    if (this.isBlackHole && Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2
      const r = this.eventHorizonRadius + 5
      this.hawkingParticles.push({
        x: this.x + Math.cos(angle) * r,
        y: this.y + Math.sin(angle) * r,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 1
      })
      this.accumulated -= 5  // Evaporation
    }

    // Update Hawking particles
    for (let i = this.hawkingParticles.length - 1; i >= 0; i--) {
      const p = this.hawkingParticles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= 0.02
      if (p.life <= 0) {
        this.hawkingParticles.splice(i, 1)
      }
    }

    this.pulsePhase += 0.05
  }
}

export class QuantumGravityMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'quantumgravity'
    this.description = 'Quantum gravity - sound warps spacetime, beats collapse wave functions'

    // Spacetime grid
    this.gridCols = GRID_SIZE
    this.gridRows = GRID_SIZE
    this.potential = []
    this.timeDilation = []
    this.gradientX = []
    this.gradientY = []

    // Physics entities
    this.masses = []
    this.particles = []
    this.fluctuations = []
    this.waves = []
    this.entanglementLines = []

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Background grid (for lensing visualization)
    this.backgroundGrid = []
  }

  init() {
    this.clear()
    this.initGrid()
    this.initBackgroundGrid()
    this.initMasses()

    // Spawn initial particles
    for (let i = 0; i < 30; i++) {
      this.spawnParticle()
    }
  }

  initGrid() {
    const cols = this.gridCols
    const rows = this.gridRows

    this.potential = Array(cols).fill(null).map(() => Array(rows).fill(0))
    this.timeDilation = Array(cols).fill(null).map(() => Array(rows).fill(1))
    this.gradientX = Array(cols).fill(null).map(() => Array(rows).fill(0))
    this.gradientY = Array(cols).fill(null).map(() => Array(rows).fill(0))
  }

  initBackgroundGrid() {
    this.backgroundGrid = []
    const spacing = 40
    const cols = Math.ceil(this.width / spacing) + 2
    const rows = Math.ceil(this.height / spacing) + 2

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        this.backgroundGrid.push({
          baseX: i * spacing - spacing,
          baseY: j * spacing - spacing,
          x: i * spacing - spacing,
          y: j * spacing - spacing
        })
      }
    }
  }

  initMasses() {
    this.masses = []

    // Central positive mass (bass attractor)
    this.masses.push(new GravitationalMass(
      this.width / 2,
      this.height / 2,
      500
    ))

    // Corner negative masses (treble repulsors)
    const margin = 100
    this.masses.push(new GravitationalMass(margin, margin, -200))
    this.masses.push(new GravitationalMass(this.width - margin, margin, -200))
    this.masses.push(new GravitationalMass(margin, this.height - margin, -200))
    this.masses.push(new GravitationalMass(this.width - margin, this.height - margin, -200))
  }

  spawnParticle() {
    if (this.particles.length >= MAX_PARTICLES) return

    // Spawn at random position
    const x = Math.random() * this.width
    const y = Math.random() * this.height

    const p = new QuantumParticle(x, y, this.width, this.height)
    this.particles.push(p)
  }

  spawnEntangledPair() {
    if (this.particles.length >= MAX_PARTICLES - 1) return

    // Spawn pair at same location
    const x = this.width * 0.3 + Math.random() * this.width * 0.4
    const y = this.height * 0.3 + Math.random() * this.height * 0.4

    const p1 = new QuantumParticle(x, y, this.width, this.height)
    const p2 = new QuantumParticle(x, y, this.width, this.height)

    p1.spin = 1
    p2.spin = -1
    p1.entangledWith = p2
    p2.entangledWith = p1
    p1.hue = 45  // Gold
    p2.hue = 45

    this.particles.push(p1)
    this.particles.push(p2)
  }

  spawnVacuumFluctuation() {
    if (this.fluctuations.length >= MAX_FLUCTUATIONS) return

    const x = Math.random() * this.width
    const y = Math.random() * this.height

    this.fluctuations.push(new VacuumFluctuation(x, y))
  }

  emitGravitationalWave(intensity) {
    if (this.waves.length >= MAX_WAVES) {
      this.waves.shift()
    }

    this.waves.push(new GravitationalWave(
      this.width / 2,
      this.height / 2,
      intensity
    ))
  }

  // Convert canvas position to grid cell
  posToGrid(x, y) {
    const cellW = this.width / this.gridCols
    const cellH = this.height / this.gridRows
    return {
      col: Math.floor(x / cellW),
      row: Math.floor(y / cellH)
    }
  }

  // Get potential at any point (interpolated)
  getPotentialAt(x, y) {
    const { col, row } = this.posToGrid(x, y)
    if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
      return 0
    }
    return this.potential[col][row]
  }

  // Get time dilation at any point
  getTimeDilationAt(x, y) {
    const { col, row } = this.posToGrid(x, y)
    if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
      return 1
    }
    return this.timeDilation[col][row]
  }

  // Get gradient at any point
  getGradientAt(x, y) {
    const { col, row } = this.posToGrid(x, y)
    if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
      return { x: 0, y: 0 }
    }
    return {
      x: this.gradientX[col][row],
      y: this.gradientY[col][row]
    }
  }

  // Compute gravitational potential field
  computePotentialField() {
    const cellW = this.width / this.gridCols
    const cellH = this.height / this.gridRows

    // Reset
    for (let i = 0; i < this.gridCols; i++) {
      for (let j = 0; j < this.gridRows; j++) {
        this.potential[i][j] = 0
      }
    }

    // Sum contributions from all masses
    for (const mass of this.masses) {
      for (let i = 0; i < this.gridCols; i++) {
        for (let j = 0; j < this.gridRows; j++) {
          const x = (i + 0.5) * cellW
          const y = (j + 0.5) * cellH
          const dx = x - mass.x
          const dy = y - mass.y
          const r = Math.sqrt(dx * dx + dy * dy) || 1

          // Gravitational potential: φ = -GM/r
          this.potential[i][j] += -G * mass.mass / Math.max(r, 10)
        }
      }
    }

    // Compute time dilation and gradients
    for (let i = 0; i < this.gridCols; i++) {
      for (let j = 0; j < this.gridRows; j++) {
        // Time dilation: √(1 - 2φ/c²)
        const phi = this.potential[i][j]
        const dilationArg = 1 - 2 * phi / (C * C)
        this.timeDilation[i][j] = Math.sqrt(Math.max(0.1, Math.min(2, dilationArg)))

        // Gradient (for geodesic motion)
        const left = i > 0 ? this.potential[i - 1][j] : this.potential[i][j]
        const right = i < this.gridCols - 1 ? this.potential[i + 1][j] : this.potential[i][j]
        const up = j > 0 ? this.potential[i][j - 1] : this.potential[i][j]
        const down = j < this.gridRows - 1 ? this.potential[i][j + 1] : this.potential[i][j]

        this.gradientX[i][j] = (right - left) / (2 * cellW)
        this.gradientY[i][j] = (down - up) / (2 * cellH)
      }
    }
  }

  // Apply gravitational lensing to background grid
  applyLensing() {
    for (const point of this.backgroundGrid) {
      let deflectionX = 0
      let deflectionY = 0

      for (const mass of this.masses) {
        const dx = point.baseX - mass.x
        const dy = point.baseY - mass.y
        const r = Math.sqrt(dx * dx + dy * dy) || 1

        // Einstein deflection: θ = 4GM/(c²b)
        const deflection = 4 * G * mass.mass / (C * C * Math.max(r, 30))

        deflectionX += (dx / r) * deflection * 1000
        deflectionY += (dy / r) * deflection * 1000
      }

      // Apply gravitational wave distortion
      for (const wave of this.waves) {
        const strain = wave.getStrainAt(point.baseX, point.baseY)
        deflectionX += strain.hPlus * 10
        deflectionY += strain.hCross * 10
      }

      point.x = point.baseX + deflectionX
      point.y = point.baseY + deflectionY
    }
  }

  resize(width, height) {
    super.resize(width, height)
    this.initBackgroundGrid()
    this.initMasses()
    this.initGrid()
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    const dt = 1

    // Update masses based on audio
    // Central mass grows with bass (positive curvature)
    if (this.masses[0]) {
      this.masses[0].targetMass = 200 + this.smoothBass * 1500
    }

    // Corner masses respond to treble (negative mass = repulsion)
    const trebleMass = -100 - this.smoothHigh * 600
    for (let i = 1; i < this.masses.length; i++) {
      this.masses[i].targetMass = trebleMass
    }

    // Update all masses
    for (const mass of this.masses) {
      mass.update(dt)
    }

    // Compute potential field
    this.computePotentialField()

    // Apply lensing to background grid
    this.applyLensing()

    // Spawn particles on amplitude
    if (this.smoothAmplitude > 0.3 && Math.random() < this.smoothAmplitude * 0.1) {
      this.spawnParticle()
    }

    // Spawn entangled pairs occasionally
    if (this.smoothAmplitude > 0.5 && Math.random() < 0.02) {
      this.spawnEntangledPair()
    }

    // Update quantum particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      // Wave function spreading based on mid frequency (uncertainty)
      p.spread(this.smoothMid * 3, dt)

      // Geodesic motion
      const grad = this.getGradientAt(p.centerX, p.centerY)
      const dilation = this.getTimeDilationAt(p.centerX, p.centerY)
      p.applyGeodesic(grad.x, grad.y, dilation, dt)

      p.update(dt)

      // Remove dead particles
      if (p.life <= 0 ||
          p.centerX < -100 || p.centerX > this.width + 100 ||
          p.centerY < -100 || p.centerY > this.height + 100) {
        // Clean up entanglement
        if (p.entangledWith) {
          p.entangledWith.entangledWith = null
        }
        this.particles.splice(i, 1)
      }
    }

    // BEAT = MEASUREMENT (wave function collapse)
    if (onBeat) {
      // Collapse all uncollapsed particles
      for (const p of this.particles) {
        if (!p.collapsed) {
          p.collapse()
        }
      }

      // Emit gravitational wave
      this.emitGravitationalWave(beatIntensity * 0.5)
    }

    // SILENCE = VACUUM FLUCTUATIONS
    if (this.smoothAmplitude < 0.15) {
      if (Math.random() < 0.1) {
        this.spawnVacuumFluctuation()
      }
    }

    // Update vacuum fluctuations
    for (let i = this.fluctuations.length - 1; i >= 0; i--) {
      if (!this.fluctuations[i].update(dt)) {
        this.fluctuations.splice(i, 1)
      }
    }

    // Update gravitational waves
    for (let i = this.waves.length - 1; i >= 0; i--) {
      if (!this.waves[i].update(dt)) {
        this.waves.splice(i, 1)
      }
    }

    // Build entanglement lines for drawing
    this.entanglementLines = []
    for (const p of this.particles) {
      if (p.entangledWith && p.collapsed && p.entangledWith.collapsed) {
        // Only draw if this particle has lower index to avoid duplicates
        const idx1 = this.particles.indexOf(p)
        const idx2 = this.particles.indexOf(p.entangledWith)
        if (idx1 < idx2) {
          this.entanglementLines.push({
            x1: p.collapsedX,
            y1: p.collapsedY,
            x2: p.entangledWith.collapsedX,
            y2: p.entangledWith.collapsedY,
            flash: Math.max(p.collapseFlash, p.entangledWith.collapseFlash)
          })
        }
      }
    }
  }

  draw() {
    const ctx = this.ctx

    // Deep black background
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw gravitational potential field
    this.drawPotentialField()

    // Draw curved background grid (gravitational lensing)
    this.drawBackgroundGrid()

    // Draw gravitational waves
    this.drawGravitationalWaves()

    // Draw gravitational masses
    this.drawMasses()

    // Draw vacuum fluctuations
    this.drawVacuumFluctuations()

    // Draw entanglement lines
    this.drawEntanglementLines()

    // Draw quantum particles
    this.drawParticles()

    // Draw time dilation indicator
    this.drawTimeDilationOverlay()
  }

  drawPotentialField() {
    const ctx = this.ctx
    const cellW = this.width / this.gridCols
    const cellH = this.height / this.gridRows

    for (let i = 0; i < this.gridCols; i++) {
      for (let j = 0; j < this.gridRows; j++) {
        const phi = this.potential[i][j]
        const x = i * cellW
        const y = j * cellH

        if (phi < -0.01) {
          // Positive mass (attractive) - purple gradient
          const intensity = Math.min(1, Math.abs(phi) * 5)
          ctx.fillStyle = `rgba(120, 40, 160, ${intensity * 0.2})`
          ctx.fillRect(x, y, cellW + 1, cellH + 1)
        } else if (phi > 0.01) {
          // Negative mass (repulsive) - cyan gradient
          const intensity = Math.min(1, Math.abs(phi) * 5)
          ctx.fillStyle = `rgba(40, 180, 200, ${intensity * 0.2})`
          ctx.fillRect(x, y, cellW + 1, cellH + 1)
        }
      }
    }
  }

  drawBackgroundGrid() {
    const ctx = this.ctx
    ctx.strokeStyle = 'rgba(100, 100, 150, 0.15)'
    ctx.lineWidth = 1

    // Draw horizontal-ish lines
    const cols = Math.ceil(this.width / 40) + 2
    const rows = Math.ceil(this.height / 40) + 2

    for (let j = 0; j < rows; j++) {
      ctx.beginPath()
      for (let i = 0; i < cols; i++) {
        const idx = i * rows + j
        if (idx < this.backgroundGrid.length) {
          const p = this.backgroundGrid[idx]
          if (i === 0) {
            ctx.moveTo(p.x, p.y)
          } else {
            ctx.lineTo(p.x, p.y)
          }
        }
      }
      ctx.stroke()
    }

    // Draw vertical-ish lines
    for (let i = 0; i < cols; i++) {
      ctx.beginPath()
      for (let j = 0; j < rows; j++) {
        const idx = i * rows + j
        if (idx < this.backgroundGrid.length) {
          const p = this.backgroundGrid[idx]
          if (j === 0) {
            ctx.moveTo(p.x, p.y)
          } else {
            ctx.lineTo(p.x, p.y)
          }
        }
      }
      ctx.stroke()
    }
  }

  drawGravitationalWaves() {
    const ctx = this.ctx

    for (const wave of this.waves) {
      // Draw expanding ring
      const gradient = ctx.createRadialGradient(
        wave.x, wave.y, Math.max(0, wave.radius - 20),
        wave.x, wave.y, wave.radius + 20
      )
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(0.4, `rgba(150, 100, 200, ${wave.intensity * 0.4})`)
      gradient.addColorStop(0.5, `rgba(200, 150, 255, ${wave.intensity * 0.6})`)
      gradient.addColorStop(0.6, `rgba(150, 100, 200, ${wave.intensity * 0.4})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, wave.radius + 20, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawMasses() {
    const ctx = this.ctx

    for (const mass of this.masses) {
      const absM = Math.abs(mass.mass)
      const size = Math.sqrt(absM) * 0.4

      if (mass.isBlackHole) {
        // Black hole - absolute void with accretion disk
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.arc(mass.x, mass.y, mass.eventHorizonRadius, 0, Math.PI * 2)
        ctx.fill()

        // Accretion disk glow
        const diskGradient = ctx.createRadialGradient(
          mass.x, mass.y, mass.eventHorizonRadius,
          mass.x, mass.y, mass.eventHorizonRadius + 30
        )
        diskGradient.addColorStop(0, 'rgba(255, 150, 50, 0.8)')
        diskGradient.addColorStop(0.5, 'rgba(255, 100, 30, 0.4)')
        diskGradient.addColorStop(1, 'transparent')

        ctx.fillStyle = diskGradient
        ctx.beginPath()
        ctx.arc(mass.x, mass.y, mass.eventHorizonRadius + 30, 0, Math.PI * 2)
        ctx.fill()

        // Hawking radiation particles
        for (const p of mass.hawkingParticles) {
          ctx.fillStyle = `rgba(255, 255, 200, ${p.life})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (mass.mass > 0) {
        // Positive mass - purple glow (attractor)
        const gradient = ctx.createRadialGradient(
          mass.x, mass.y, 0,
          mass.x, mass.y, size * 2
        )
        const pulse = 0.5 + 0.5 * Math.sin(mass.pulsePhase)
        gradient.addColorStop(0, `rgba(180, 80, 220, ${0.3 + pulse * 0.3})`)
        gradient.addColorStop(0.5, `rgba(120, 40, 160, ${0.2 + pulse * 0.1})`)
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(mass.x, mass.y, size * 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Negative mass - cyan glow (repulsor)
        const gradient = ctx.createRadialGradient(
          mass.x, mass.y, 0,
          mass.x, mass.y, size * 2
        )
        const pulse = 0.5 + 0.5 * Math.sin(mass.pulsePhase)
        gradient.addColorStop(0, `rgba(80, 200, 220, ${0.3 + pulse * 0.3})`)
        gradient.addColorStop(0.5, `rgba(40, 160, 180, ${0.2 + pulse * 0.1})`)
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(mass.x, mass.y, size * 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  drawVacuumFluctuations() {
    const ctx = this.ctx

    for (const f of this.fluctuations) {
      const progress = f.age / f.lifetime
      const alpha = progress < 0.5
        ? progress * 2
        : 2 - progress * 2

      // Particle (red)
      ctx.fillStyle = `rgba(255, 100, 100, ${alpha * 0.8})`
      ctx.beginPath()
      ctx.arc(f.particleX, f.particleY, 4, 0, Math.PI * 2)
      ctx.fill()

      // Antiparticle (blue)
      ctx.fillStyle = `rgba(100, 100, 255, ${alpha * 0.8})`
      ctx.beginPath()
      ctx.arc(f.antiparticleX, f.antiparticleY, 4, 0, Math.PI * 2)
      ctx.fill()

      // Connection line
      ctx.strokeStyle = `rgba(200, 150, 255, ${alpha * 0.3})`
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(f.particleX, f.particleY)
      ctx.lineTo(f.antiparticleX, f.antiparticleY)
      ctx.stroke()
      ctx.setLineDash([])

      // Annihilation flash
      if (f.annihilating) {
        const gradient = ctx.createRadialGradient(
          f.x, f.y, 0,
          f.x, f.y, 30 * f.flash
        )
        gradient.addColorStop(0, `rgba(255, 255, 255, ${f.flash})`)
        gradient.addColorStop(0.5, `rgba(200, 150, 255, ${f.flash * 0.5})`)
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(f.x, f.y, 30 * f.flash, 0, Math.PI * 2)
        ctx.fill()

        f.flash *= 0.8
      }
    }
  }

  drawEntanglementLines() {
    const ctx = this.ctx

    for (const line of this.entanglementLines) {
      const gradient = ctx.createLinearGradient(line.x1, line.y1, line.x2, line.y2)
      const alpha = 0.3 + line.flash * 0.7
      gradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`)
      gradient.addColorStop(0.5, `rgba(255, 220, 150, ${alpha})`)
      gradient.addColorStop(1, `rgba(255, 200, 100, ${alpha})`)

      ctx.strokeStyle = gradient
      ctx.lineWidth = 1 + line.flash * 2
      ctx.beginPath()
      ctx.moveTo(line.x1, line.y1)
      ctx.lineTo(line.x2, line.y2)
      ctx.stroke()

      // Glow effect on flash
      if (line.flash > 0.5) {
        ctx.strokeStyle = `rgba(255, 255, 200, ${line.flash * 0.5})`
        ctx.lineWidth = 4 + line.flash * 4
        ctx.stroke()
      }
    }
  }

  drawParticles() {
    const ctx = this.ctx

    for (const p of this.particles) {
      const hue = p.hue
      const alpha = p.life

      if (p.collapsed) {
        // Collapsed particle - definite position
        const size = 4 + p.collapseFlash * 8

        // Collapse flash
        if (p.collapseFlash > 0.1) {
          const flashGrad = ctx.createRadialGradient(
            p.collapsedX, p.collapsedY, 0,
            p.collapsedX, p.collapsedY, 40 * p.collapseFlash
          )
          flashGrad.addColorStop(0, `rgba(255, 255, 255, ${p.collapseFlash})`)
          flashGrad.addColorStop(0.5, `hsla(${hue}, 80%, 70%, ${p.collapseFlash * 0.5})`)
          flashGrad.addColorStop(1, 'transparent')

          ctx.fillStyle = flashGrad
          ctx.beginPath()
          ctx.arc(p.collapsedX, p.collapsedY, 40 * p.collapseFlash, 0, Math.PI * 2)
          ctx.fill()
        }

        // Core
        ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.collapsedX, p.collapsedY, size, 0, Math.PI * 2)
        ctx.fill()

        // Glow
        const gradient = ctx.createRadialGradient(
          p.collapsedX, p.collapsedY, 0,
          p.collapsedX, p.collapsedY, size * 3
        )
        gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${alpha * 0.6})`)
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.collapsedX, p.collapsedY, size * 3, 0, Math.PI * 2)
        ctx.fill()

        // Spin indicator
        const spinColor = p.spin > 0 ? '255, 100, 100' : '100, 100, 255'
        ctx.fillStyle = `rgba(${spinColor}, ${alpha * 0.5})`
        ctx.beginPath()
        ctx.arc(p.collapsedX, p.collapsedY - size - 3, 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Superposition - probability cloud
        ctx.fillStyle = `hsla(${hue}, 60%, 50%, ${alpha * 0.15})`

        for (const point of p.waveFunction) {
          const phase = Math.sin(point.phase)
          const size = 3 + point.amplitude * 5 + phase * 2

          ctx.beginPath()
          ctx.arc(point.x, point.y, Math.max(1, size), 0, Math.PI * 2)
          ctx.fill()
        }

        // Connect probability points with faint lines
        ctx.strokeStyle = `hsla(${hue}, 50%, 50%, ${alpha * 0.1})`
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < p.waveFunction.length; i++) {
          const pt = p.waveFunction[i]
          if (i === 0) {
            ctx.moveTo(pt.x, pt.y)
          } else {
            ctx.lineTo(pt.x, pt.y)
          }
        }
        ctx.closePath()
        ctx.stroke()
      }
    }
  }

  drawTimeDilationOverlay() {
    const ctx = this.ctx

    // Draw time dilation indicator near masses
    for (const mass of this.masses) {
      if (mass.mass > 100) {
        const dilation = this.getTimeDilationAt(mass.x, mass.y)
        const text = `t×${dilation.toFixed(2)}`

        ctx.font = '10px monospace'
        ctx.fillStyle = `rgba(200, 200, 255, 0.5)`
        ctx.fillText(text, mass.x - 15, mass.y + 30)
      }
    }

    // Label
    ctx.font = '12px monospace'
    ctx.fillStyle = 'rgba(150, 150, 200, 0.4)'
    ctx.fillText('ACOUSTIC QUANTUM GRAVITY', 10, 20)
    ctx.fillText('Bass = Gravity | Treble = Exotic Mass | Beat = Measurement', 10, 35)
  }

  clear() {
    this.particles = []
    this.fluctuations = []
    this.waves = []
    this.entanglementLines = []
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
