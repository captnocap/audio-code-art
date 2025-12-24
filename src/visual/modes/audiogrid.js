import { VisualizationMode } from './base.js'
import { tuner } from '../tuner.js'

/**
 * Audio Grid - GitHub commit graph meets chromatic note detection
 * Each cell represents a musical note, lights up with crazy effects when detected
 */
export class AudioGridMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)

    // Grid configuration - 12 notes x 52 columns (like GitHub's year view)
    this.rows = 12 // Chromatic scale: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
    this.cols = 52 // Time columns (scrolling)

    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

    // Grid state
    this.cells = []
    this.cellHistory = [] // Accumulated "commits" per cell
    this.currentColumn = 0
    this.columnTimer = 0
    this.columnInterval = 500 // ms per column advance

    // Note detection state
    this.noteEnergies = new Array(12).fill(0)
    this.peakNotes = new Array(12).fill(0)

    // Effects
    this.particles = []
    this.lightnings = []
    this.ripples = []
    this.glowCells = []

    // Visual params
    this.cellPadding = 4
    this.gridOffsetX = 60
    this.gridOffsetY = 80
  }

  init() {
    // Initialize grid cells
    this.cells = []
    this.cellHistory = []

    for (let row = 0; row < this.rows; row++) {
      this.cells[row] = []
      this.cellHistory[row] = []
      for (let col = 0; col < this.cols; col++) {
        this.cells[row][col] = {
          energy: 0,
          heat: 0, // Accumulated intensity
          lastHit: 0,
          hits: 0
        }
        this.cellHistory[row][col] = 0
      }
    }

    this.calculateCellSize()
  }

  calculateCellSize() {
    const availableWidth = this.width - this.gridOffsetX - 40
    const availableHeight = this.height - this.gridOffsetY - 60

    this.cellWidth = Math.floor((availableWidth - this.cellPadding * this.cols) / this.cols)
    this.cellHeight = Math.floor((availableHeight - this.cellPadding * this.rows) / this.rows)

    // Keep cells square-ish but allow some stretch
    const minSize = Math.min(this.cellWidth, this.cellHeight)
    this.cellWidth = Math.max(minSize, this.cellWidth * 0.8)
    this.cellHeight = Math.max(minSize, this.cellHeight * 0.8)
  }

  resize(width, height) {
    super.resize(width, height)
    this.calculateCellSize()
  }

  // Convert frequency to nearest note (0-11 for C-B)
  frequencyToNote(freq) {
    if (freq <= 0) return -1
    // A4 = 440Hz, MIDI note 69
    const midiNote = 12 * Math.log2(freq / 440) + 69
    return Math.round(midiNote) % 12
  }

  // Analyze FFT data to get energy per note
  analyzeNotes(frequencies, amplitude, bass, mid, high) {
    if (!frequencies || frequencies.length === 0) return

    // Use a common sample rate assumption - the actual bin mapping
    // matters less than relative energy distribution
    const binCount = frequencies.length

    // Reset note energies
    const newEnergies = new Array(12).fill(0)

    // Method 1: Direct FFT bin to note mapping
    // Focus on the musical range (roughly bins 2-200 for typical FFT)
    for (let i = 2; i < Math.min(binCount, 512); i++) {
      const magnitude = frequencies[i] / 255

      if (magnitude > 0.05) { // Lower threshold
        // Map bin index to approximate frequency (assuming ~43Hz per bin at 44100/2048)
        const approxFreq = i * 21.5 // Rough estimate

        if (approxFreq > 30 && approxFreq < 4000) {
          const note = this.frequencyToNote(approxFreq)
          if (note >= 0 && note < 12) {
            // Weight by magnitude squared and boost
            newEnergies[note] += magnitude * magnitude * 2
          }
        }
      }
    }

    // Method 2: Also use the band energies to boost certain note ranges
    // Bass boosts lower notes, high boosts upper notes
    newEnergies[0] += bass * 0.5  // C
    newEnergies[2] += bass * 0.4  // D
    newEnergies[4] += mid * 0.5   // E
    newEnergies[5] += mid * 0.5   // F
    newEnergies[7] += mid * 0.4   // G
    newEnergies[9] += high * 0.5  // A
    newEnergies[11] += high * 0.4 // B

    // Find max for normalization
    const maxEnergy = Math.max(...newEnergies, 0.001)

    // Normalize and smooth
    for (let i = 0; i < 12; i++) {
      // Normalize to 0-1 range
      const normalized = Math.min(1, newEnergies[i] / maxEnergy)

      // Faster response (less smoothing)
      this.noteEnergies[i] = this.noteEnergies[i] * 0.5 + normalized * 0.5

      // Track peaks
      if (this.noteEnergies[i] > this.peakNotes[i]) {
        this.peakNotes[i] = this.noteEnergies[i]
      } else {
        this.peakNotes[i] *= 0.99
      }
    }

    // Boost overall if there's significant amplitude
    if (amplitude > 0.1) {
      for (let i = 0; i < 12; i++) {
        this.noteEnergies[i] = Math.min(1, this.noteEnergies[i] * (1 + amplitude * 0.5))
      }
    }
  }

  update(audioFeatures, beatInfo) {
    if (!audioFeatures) return

    const { amplitude, bass, mid, high, frequencies } = audioFeatures
    const { onBeat, bpm } = beatInfo
    const now = Date.now()
    const params = tuner.getAll()

    // Analyze frequencies to detect notes
    this.analyzeNotes(frequencies, amplitude, bass, mid, high)

    // Advance column based on tempo or time
    this.columnTimer += 16 // ~60fps
    const interval = bpm > 0 ? (60000 / bpm) : this.columnInterval

    if (this.columnTimer >= interval * 2) {
      this.currentColumn = (this.currentColumn + 1) % this.cols
      this.columnTimer = 0

      // Save current note energies to history for this column
      for (let row = 0; row < this.rows; row++) {
        if (this.noteEnergies[row] > 0.1) {
          this.cellHistory[row][this.currentColumn] += this.noteEnergies[row]
          this.cellHistory[row][this.currentColumn] = Math.min(5, this.cellHistory[row][this.currentColumn])
        }
      }
    }

    // Update cells based on current note detection
    for (let row = 0; row < this.rows; row++) {
      const energy = this.noteEnergies[row]
      const cell = this.cells[row][this.currentColumn]

      // Update cell energy
      cell.energy = cell.energy * 0.8 + energy * 0.2

      // Detect note hit (lowered threshold for more reactivity)
      if (energy > 0.2 && now - cell.lastHit > 100) {
        cell.lastHit = now
        cell.hits++
        cell.heat = Math.min(1, cell.heat + energy * 0.3)

        // Spawn effects!
        this.spawnCellEffects(row, this.currentColumn, energy, params)
      }

      // Decay heat
      cell.heat *= 0.995
    }

    // Update particles
    this.updateParticles()

    // Update lightnings
    this.updateLightnings()

    // Update ripples
    this.updateRipples()

    // Update glow cells
    this.updateGlowCells()

    // On beat: trigger chord detection effects
    if (onBeat) {
      this.detectChord(params)
    }

    // Random lightning between active notes
    if (Math.random() < 0.02 * params.chaos * amplitude) {
      this.spawnRandomLightning()
    }
  }

  spawnCellEffects(row, col, intensity, params) {
    const pos = this.getCellCenter(row, col)
    const noteHue = (row / 12) * 360

    // 1. Particle burst
    const particleCount = Math.floor(5 + intensity * 15 * params.chaos)
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 4 * intensity
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        hue: noteHue,
        size: 2 + Math.random() * 4
      })
    }

    // 2. Ripple effect
    if (intensity > 0.3) {
      this.ripples.push({
        x: pos.x,
        y: pos.y,
        radius: 0,
        maxRadius: 50 + intensity * 100,
        speed: 2 + intensity * 3,
        life: 1,
        hue: noteHue
      })
    }

    // 3. Glow cell
    this.glowCells.push({
      row,
      col,
      intensity,
      life: 1,
      hue: noteHue
    })

    // 4. Lightning to neighbors
    if (intensity > 0.35 && Math.random() < 0.4 * params.chaos) {
      // Find nearby active notes
      for (let r = 0; r < this.rows; r++) {
        if (r !== row && this.noteEnergies[r] > 0.15) {
          this.lightnings.push({
            from: pos,
            to: this.getCellCenter(r, col),
            life: 1,
            hue: noteHue,
            segments: this.generateLightningPath(pos, this.getCellCenter(r, col))
          })
          break
        }
      }
    }
  }

  getCellCenter(row, col) {
    const x = this.gridOffsetX + col * (this.cellWidth + this.cellPadding) + this.cellWidth / 2
    const y = this.gridOffsetY + row * (this.cellHeight + this.cellPadding) + this.cellHeight / 2
    return { x, y }
  }

  generateLightningPath(from, to) {
    const segments = []
    const steps = 8
    const dx = (to.x - from.x) / steps
    const dy = (to.y - from.y) / steps

    let x = from.x
    let y = from.y

    for (let i = 0; i <= steps; i++) {
      segments.push({
        x: x + (i > 0 && i < steps ? (Math.random() - 0.5) * 20 : 0),
        y: y + (i > 0 && i < steps ? (Math.random() - 0.5) * 20 : 0)
      })
      x += dx
      y += dy
    }

    return segments
  }

  detectChord(params) {
    // Find active notes
    const activeNotes = []
    for (let i = 0; i < 12; i++) {
      if (this.noteEnergies[i] > 0.15) {
        activeNotes.push(i)
      }
    }

    // If multiple notes (chord), create connecting effects
    if (activeNotes.length >= 2) {
      for (let i = 0; i < activeNotes.length - 1; i++) {
        const from = this.getCellCenter(activeNotes[i], this.currentColumn)
        const to = this.getCellCenter(activeNotes[i + 1], this.currentColumn)

        this.lightnings.push({
          from,
          to,
          life: 1,
          hue: (activeNotes[i] / 12) * 360,
          segments: this.generateLightningPath(from, to)
        })
      }
    }
  }

  spawnRandomLightning() {
    // Find two random active cells
    const activeCells = []
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.cellHistory[row][col] > 0.5) {
          activeCells.push({ row, col })
        }
      }
    }

    if (activeCells.length >= 2) {
      const a = activeCells[Math.floor(Math.random() * activeCells.length)]
      const b = activeCells[Math.floor(Math.random() * activeCells.length)]

      if (a !== b) {
        const from = this.getCellCenter(a.row, a.col)
        const to = this.getCellCenter(b.row, b.col)

        this.lightnings.push({
          from,
          to,
          life: 1,
          hue: (a.row / 12) * 360,
          segments: this.generateLightningPath(from, to)
        })
      }
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05 // Gravity
      p.vx *= 0.99
      p.life -= p.decay

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }

    // Limit particles
    if (this.particles.length > 500) {
      this.particles.splice(0, this.particles.length - 500)
    }
  }

  updateLightnings() {
    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      const l = this.lightnings[i]
      l.life -= 0.05

      if (l.life <= 0) {
        this.lightnings.splice(i, 1)
      }
    }
  }

  updateRipples() {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]
      r.radius += r.speed
      r.life = 1 - (r.radius / r.maxRadius)

      if (r.life <= 0) {
        this.ripples.splice(i, 1)
      }
    }
  }

  updateGlowCells() {
    for (let i = this.glowCells.length - 1; i >= 0; i--) {
      const g = this.glowCells[i]
      g.life -= 0.03

      if (g.life <= 0) {
        this.glowCells.splice(i, 1)
      }
    }
  }

  draw() {
    const ctx = this.ctx

    // Draw title
    ctx.fillStyle = '#888'
    ctx.font = '14px monospace'
    ctx.fillText('AUDIO COMMIT GRID', this.gridOffsetX, 30)
    ctx.fillStyle = '#555'
    ctx.font = '11px monospace'
    ctx.fillText('Notes detected over time - each cell is a chromatic pitch', this.gridOffsetX, 50)

    // Draw note labels (row labels)
    ctx.fillStyle = '#666'
    ctx.font = '11px monospace'
    for (let row = 0; row < this.rows; row++) {
      const y = this.gridOffsetY + row * (this.cellHeight + this.cellPadding) + this.cellHeight / 2 + 4
      const noteName = this.noteNames[row]
      ctx.fillStyle = this.noteEnergies[row] > 0.3 ? `hsl(${(row / 12) * 360}, 80%, 60%)` : '#555'
      ctx.fillText(noteName.padStart(2), 10, y)
    }

    // Draw grid cells
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.drawCell(row, col)
      }
    }

    // Draw current column indicator
    const indicatorX = this.gridOffsetX + this.currentColumn * (this.cellWidth + this.cellPadding)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(indicatorX - 2, this.gridOffsetY - 10, this.cellWidth + 4, this.rows * (this.cellHeight + this.cellPadding) + 15)

    // Draw ripples (behind everything)
    this.drawRipples()

    // Draw glow effects
    this.drawGlowCells()

    // Draw lightnings
    this.drawLightnings()

    // Draw particles (on top)
    this.drawParticles()

    // Draw legend
    this.drawLegend()
  }

  drawCell(row, col) {
    const ctx = this.ctx
    const x = this.gridOffsetX + col * (this.cellWidth + this.cellPadding)
    const y = this.gridOffsetY + row * (this.cellHeight + this.cellPadding)

    const history = this.cellHistory[row][col]
    const currentEnergy = (col === this.currentColumn) ? this.noteEnergies[row] : 0
    const cell = this.cells[row][col]

    // Base cell color based on history (like GitHub green levels)
    const hue = (row / 12) * 360
    let lightness = 10 // Dark base
    let saturation = 20

    if (history > 0) {
      // More history = brighter cell
      const level = Math.min(4, Math.floor(history))
      lightness = 15 + level * 12
      saturation = 40 + level * 15
    }

    // Current activity makes it glow
    if (currentEnergy > 0.2) {
      lightness = Math.min(70, lightness + currentEnergy * 40)
      saturation = Math.min(100, saturation + currentEnergy * 30)
    }

    // Draw cell
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    ctx.fillRect(x, y, this.cellWidth, this.cellHeight)

    // Active cell border
    if (currentEnergy > 0.3) {
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${currentEnergy})`
      ctx.lineWidth = 2
      ctx.strokeRect(x - 1, y - 1, this.cellWidth + 2, this.cellHeight + 2)
    }

    // Heat glow
    if (cell.heat > 0.1) {
      const gradient = ctx.createRadialGradient(
        x + this.cellWidth / 2, y + this.cellHeight / 2, 0,
        x + this.cellWidth / 2, y + this.cellHeight / 2, this.cellWidth
      )
      gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${cell.heat * 0.5})`)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.fillRect(x - this.cellWidth / 2, y - this.cellHeight / 2, this.cellWidth * 2, this.cellHeight * 2)
    }
  }

  drawParticles() {
    const ctx = this.ctx

    for (const p of this.particles) {
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawLightnings() {
    const ctx = this.ctx

    for (const l of this.lightnings) {
      ctx.strokeStyle = `hsla(${l.hue}, 100%, 80%, ${l.life})`
      ctx.lineWidth = 2 * l.life
      ctx.beginPath()

      if (l.segments.length > 0) {
        ctx.moveTo(l.segments[0].x, l.segments[0].y)
        for (let i = 1; i < l.segments.length; i++) {
          ctx.lineTo(l.segments[i].x, l.segments[i].y)
        }
      }

      ctx.stroke()

      // Glow effect
      ctx.strokeStyle = `hsla(${l.hue}, 100%, 90%, ${l.life * 0.3})`
      ctx.lineWidth = 6 * l.life
      ctx.stroke()
    }
  }

  drawRipples() {
    const ctx = this.ctx

    for (const r of this.ripples) {
      ctx.strokeStyle = `hsla(${r.hue}, 80%, 60%, ${r.life * 0.5})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  drawGlowCells() {
    const ctx = this.ctx

    for (const g of this.glowCells) {
      const pos = this.getCellCenter(g.row, g.col)
      const size = this.cellWidth * (1 + g.life * 0.5)

      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size)
      gradient.addColorStop(0, `hsla(${g.hue}, 100%, 70%, ${g.life * g.intensity * 0.8})`)
      gradient.addColorStop(0.5, `hsla(${g.hue}, 100%, 50%, ${g.life * g.intensity * 0.4})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.fillRect(pos.x - size, pos.y - size, size * 2, size * 2)
    }
  }

  drawLegend() {
    const ctx = this.ctx
    const legendY = this.height - 40

    ctx.fillStyle = '#555'
    ctx.font = '10px monospace'
    ctx.fillText('Less', this.gridOffsetX, legendY)

    // Draw intensity squares
    for (let i = 0; i < 5; i++) {
      const x = this.gridOffsetX + 35 + i * 14
      const lightness = 15 + i * 12
      ctx.fillStyle = `hsl(120, ${40 + i * 15}%, ${lightness}%)`
      ctx.fillRect(x, legendY - 10, 10, 10)
    }

    ctx.fillStyle = '#555'
    ctx.fillText('More', this.gridOffsetX + 110, legendY)

    // Active notes indicator
    const activeCount = this.noteEnergies.filter(e => e > 0.15).length
    ctx.fillStyle = '#888'
    ctx.fillText(`Active notes: ${activeCount}`, this.gridOffsetX + 180, legendY)

    // Debug: show strongest note
    const maxNote = this.noteEnergies.indexOf(Math.max(...this.noteEnergies))
    const maxVal = Math.max(...this.noteEnergies).toFixed(2)
    ctx.fillText(`Peak: ${this.noteNames[maxNote]} (${maxVal})`, this.gridOffsetX + 300, legendY)
  }

  clear() {
    this.init()
  }
}
