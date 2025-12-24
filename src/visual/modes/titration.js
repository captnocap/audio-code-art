// Titration / pH Mode - Color-changing solution simulation
// Universal indicator colors shift based on audio "concentration"

import { VisualizationMode } from './base.js'

// pH color scale (universal indicator)
const PH_COLORS = [
  { ph: 0, color: [255, 0, 0] },      // Strong acid - red
  { ph: 1, color: [255, 50, 0] },
  { ph: 2, color: [255, 100, 0] },
  { ph: 3, color: [255, 150, 0] },    // Acid - orange
  { ph: 4, color: [255, 200, 0] },
  { ph: 5, color: [255, 255, 0] },    // Weak acid - yellow
  { ph: 6, color: [200, 255, 0] },
  { ph: 7, color: [0, 255, 0] },      // Neutral - green
  { ph: 8, color: [0, 200, 100] },
  { ph: 9, color: [0, 150, 200] },    // Weak base - cyan
  { ph: 10, color: [0, 100, 255] },
  { ph: 11, color: [50, 50, 255] },   // Base - blue
  { ph: 12, color: [100, 0, 255] },
  { ph: 13, color: [150, 0, 200] },   // Strong base - purple
  { ph: 14, color: [200, 0, 150] }
]

class DropParticle {
  constructor(x, y, ph, isAcid) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 2
    this.vy = Math.random() * 2 + 1
    this.ph = ph
    this.isAcid = isAcid
    this.size = 5 + Math.random() * 10
    this.life = 1
    this.dissolved = false
  }
}

export class TitrationMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'titration'
    this.description = 'pH indicator color changes from audio'

    // Solution state
    this.solutionPH = 7 // Start neutral
    this.targetPH = 7

    // pH grid for local variations
    this.gridSize = 20
    this.gridCols = 0
    this.gridRows = 0
    this.phGrid = null

    // Drops (acid/base being added)
    this.drops = []
    this.maxDrops = 200

    // Mixing particles
    this.mixParticles = []
    this.maxMixParticles = 500

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    // Animation
    this.time = 0
  }

  init() {
    this.gridCols = Math.ceil(this.width / this.gridSize)
    this.gridRows = Math.ceil(this.height / this.gridSize)
    this.phGrid = new Float32Array(this.gridCols * this.gridRows)

    // Initialize to neutral pH
    this.phGrid.fill(7)

    this.clear()

    // Create initial mix particles
    for (let i = 0; i < this.maxMixParticles; i++) {
      this.mixParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      })
    }
  }

  getPhColor(ph) {
    // Interpolate between pH color stops
    const clampedPh = Math.max(0, Math.min(14, ph))
    const lowerIdx = Math.floor(clampedPh)
    const upperIdx = Math.min(14, lowerIdx + 1)
    const t = clampedPh - lowerIdx

    const lower = PH_COLORS[lowerIdx].color
    const upper = PH_COLORS[upperIdx].color

    return {
      r: Math.floor(lower[0] + (upper[0] - lower[0]) * t),
      g: Math.floor(lower[1] + (upper[1] - lower[1]) * t),
      b: Math.floor(lower[2] + (upper[2] - lower[2]) * t)
    }
  }

  addDrop(x, y, isAcid, intensity) {
    if (this.drops.length >= this.maxDrops) return

    // pH of the drop
    const ph = isAcid ? (1 + Math.random() * 2) : (12 + Math.random() * 2)

    const drop = new DropParticle(x, y, ph, isAcid)
    drop.size = 5 + intensity * 15
    this.drops.push(drop)
  }

  resize(width, height) {
    super.resize(width, height)
    this.init()
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

    this.time += 0.02

    // Bass adds acid (warm colors)
    // High adds base (cool colors)
    const acidRate = this.smoothBass * 0.3
    const baseRate = this.smoothHigh * 0.3

    // Add drops based on audio
    if (acidRate > 0.1 && Math.random() < acidRate) {
      this.addDrop(
        Math.random() * this.width,
        -10,
        true,
        this.smoothBass
      )
    }

    if (baseRate > 0.1 && Math.random() < baseRate) {
      this.addDrop(
        Math.random() * this.width,
        -10,
        false,
        this.smoothHigh
      )
    }

    // Beat causes burst of drops
    if (onBeat && beatIntensity > 0.4) {
      const numDrops = Math.ceil(beatIntensity * 5)
      const isAcid = centroid < 0.5 // Low pitch = acid, high pitch = base

      for (let i = 0; i < numDrops; i++) {
        this.addDrop(
          this.width * 0.3 + Math.random() * this.width * 0.4,
          -10 - Math.random() * 50,
          isAcid,
          beatIntensity
        )
      }
    }

    // Update drops
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i]

      // Gravity and fluid resistance
      drop.vy += 0.1
      drop.vy *= 0.98
      drop.vx *= 0.98

      drop.x += drop.vx
      drop.y += drop.vy

      // Check if entered solution
      if (drop.y > 50 && !drop.dissolved) {
        drop.dissolved = true
        drop.vy *= 0.3

        // Affect local pH
        const gridX = Math.floor(drop.x / this.gridSize)
        const gridY = Math.floor(drop.y / this.gridSize)

        if (gridX >= 0 && gridX < this.gridCols && gridY >= 0 && gridY < this.gridRows) {
          const idx = gridY * this.gridCols + gridX

          // pH change with buffering
          const phChange = drop.isAcid ? -1 : 1
          this.phGrid[idx] += phChange * (drop.size / 10)
          this.phGrid[idx] = Math.max(0, Math.min(14, this.phGrid[idx]))
        }
      }

      // Dissolve over time
      if (drop.dissolved) {
        drop.life -= 0.02
        drop.size *= 0.98
      }

      // Remove dead drops
      if (drop.life <= 0 || drop.y > this.height + 50) {
        this.drops.splice(i, 1)
      }
    }

    // Diffusion of pH - cells average with neighbors
    const diffusionRate = 0.05 + this.smoothMid * 0.1
    const newGrid = new Float32Array(this.phGrid.length)

    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        const idx = y * this.gridCols + x
        let sum = this.phGrid[idx]
        let count = 1

        // Average with neighbors
        if (x > 0) { sum += this.phGrid[idx - 1]; count++ }
        if (x < this.gridCols - 1) { sum += this.phGrid[idx + 1]; count++ }
        if (y > 0) { sum += this.phGrid[idx - this.gridCols]; count++ }
        if (y < this.gridRows - 1) { sum += this.phGrid[idx + this.gridCols]; count++ }

        newGrid[idx] = this.phGrid[idx] + (sum / count - this.phGrid[idx]) * diffusionRate
      }
    }

    this.phGrid = newGrid

    // Calculate average pH
    let totalPh = 0
    for (let i = 0; i < this.phGrid.length; i++) {
      totalPh += this.phGrid[i]
    }
    this.solutionPH = totalPh / this.phGrid.length

    // Update mix particles
    for (const p of this.mixParticles) {
      // Brownian motion
      p.vx += (Math.random() - 0.5) * 0.5
      p.vy += (Math.random() - 0.5) * 0.5

      // Damping
      p.vx *= 0.95
      p.vy *= 0.95

      p.x += p.vx + Math.sin(this.time + p.x * 0.01) * this.smoothMid
      p.y += p.vy + Math.cos(this.time + p.y * 0.01) * this.smoothMid

      // Wrap
      if (p.x < 0) p.x = this.width
      if (p.x > this.width) p.x = 0
      if (p.y < 50) p.y = this.height
      if (p.y > this.height) p.y = 50
    }
  }

  draw() {
    const ctx = this.ctx

    // Draw solution as grid cells
    for (let y = 0; y < this.gridRows; y++) {
      for (let x = 0; x < this.gridCols; x++) {
        const idx = y * this.gridCols + x
        const ph = this.phGrid[idx]
        const color = this.getPhColor(ph)

        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
        ctx.fillRect(
          x * this.gridSize,
          y * this.gridSize,
          this.gridSize,
          this.gridSize
        )
      }
    }

    // Draw mixing particles for texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    for (const p of this.mixParticles) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw drops
    for (const drop of this.drops) {
      const color = this.getPhColor(drop.ph)
      const alpha = drop.life

      // Drop with glow
      const gradient = ctx.createRadialGradient(
        drop.x, drop.y, 0,
        drop.x, drop.y, drop.size * 2
      )
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`)
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.5})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(drop.x, drop.y, drop.size * 2, 0, Math.PI * 2)
      ctx.fill()

      // Inner core
      ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`
      ctx.beginPath()
      ctx.arc(drop.x, drop.y, drop.size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw top area (air/dropper region)
    const airGradient = ctx.createLinearGradient(0, 0, 0, 60)
    airGradient.addColorStop(0, 'rgb(20, 20, 30)')
    airGradient.addColorStop(1, 'transparent')
    ctx.fillStyle = airGradient
    ctx.fillRect(0, 0, this.width, 60)

    // pH indicator scale
    this.drawPhScale(ctx)

    // Current pH display
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`pH ${this.solutionPH.toFixed(2)}`, this.width / 2, 35)

    // pH label
    let phLabel = ''
    if (this.solutionPH < 3) phLabel = 'STRONG ACID'
    else if (this.solutionPH < 6) phLabel = 'WEAK ACID'
    else if (this.solutionPH < 8) phLabel = 'NEUTRAL'
    else if (this.solutionPH < 11) phLabel = 'WEAK BASE'
    else phLabel = 'STRONG BASE'

    ctx.font = '14px monospace'
    ctx.fillText(phLabel, this.width / 2, 55)
  }

  drawPhScale(ctx) {
    const scaleWidth = 200
    const scaleHeight = 15
    const x = this.width - scaleWidth - 20
    const y = 15

    // Draw color scale
    for (let i = 0; i <= 14; i++) {
      const color = this.getPhColor(i)
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
      ctx.fillRect(
        x + (i / 14) * scaleWidth,
        y,
        scaleWidth / 14 + 1,
        scaleHeight
      )
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, scaleWidth, scaleHeight)

    // Marker for current pH
    const markerX = x + (this.solutionPH / 14) * scaleWidth
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.moveTo(markerX, y + scaleHeight)
    ctx.lineTo(markerX - 5, y + scaleHeight + 8)
    ctx.lineTo(markerX + 5, y + scaleHeight + 8)
    ctx.closePath()
    ctx.fill()

    // Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('0', x, y + scaleHeight + 18)
    ctx.fillText('7', x + scaleWidth / 2, y + scaleHeight + 18)
    ctx.fillText('14', x + scaleWidth, y + scaleHeight + 18)
  }

  clear() {
    this.drops = []
    this.solutionPH = 7
    this.targetPH = 7
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    if (this.phGrid) {
      this.phGrid.fill(7)
    }

    this.ctx.fillStyle = 'rgb(0, 255, 0)' // Neutral green
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
