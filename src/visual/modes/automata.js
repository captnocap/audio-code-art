// Cellular Automata Mode - Game of Life variants with audio-modulated rules
// Different songs create different "ecosystems" through dynamic birth/survival rules

import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

export class AutomataMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'automata'
    this.description = 'Cellular automata with audio-modulated evolution rules'

    // Grid settings
    this.cellSize = 4
    this.cols = 0
    this.rows = 0
    this.grid = null
    this.nextGrid = null

    // Rule parameters (will be modulated by audio)
    this.birthMin = 3
    this.birthMax = 3
    this.surviveMin = 2
    this.surviveMax = 3

    // Color state per cell
    this.colors = null

    // Frame timing
    this.frameCount = 0
    this.updateInterval = 3 // Update every N frames

    // Smoothed audio values
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
  }

  init() {
    this.cols = Math.floor(this.width / this.cellSize)
    this.rows = Math.floor(this.height / this.cellSize)

    // Initialize grids
    this.grid = new Uint8Array(this.cols * this.rows)
    this.nextGrid = new Uint8Array(this.cols * this.rows)
    this.colors = new Float32Array(this.cols * this.rows * 3) // RGB per cell

    // Random initial state
    this.seedRandom(0.15)
  }

  seedRandom(density) {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = Math.random() < density ? 1 : 0
      if (this.grid[i]) {
        // Random initial color
        const hue = Math.random()
        this.colors[i * 3] = hue
        this.colors[i * 3 + 1] = 0.5
        this.colors[i * 3 + 2] = 0.7
      }
    }
  }

  // Seed specific patterns on beat
  seedPattern(x, y, pattern, audioFeatures, beatInfo) {
    const { centroid } = audioFeatures
    const { normalizedTempo } = beatInfo

    const patterns = {
      glider: [[0,1,0], [0,0,1], [1,1,1]],
      blinker: [[1,1,1]],
      block: [[1,1], [1,1]],
      beacon: [[1,1,0,0], [1,0,0,0], [0,0,0,1], [0,0,1,1]],
      pulsar: [
        [0,0,1,1,1,0,0,0,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [0,0,1,1,1,0,0,0,1,1,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,1,0,0,0,1,1,1,0,0],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [1,0,0,0,0,1,0,1,0,0,0,0,1],
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,1,0,0,0,1,1,1,0,0]
      ]
    }

    // Select pattern based on beat intensity
    const patternNames = Object.keys(patterns)
    const patternData = patterns[pattern] || patterns[patternNames[Math.floor(Math.random() * patternNames.length)]]

    const rgb = pitchTempoToRGB(centroid, normalizedTempo, 1)

    for (let dy = 0; dy < patternData.length; dy++) {
      for (let dx = 0; dx < patternData[dy].length; dx++) {
        const col = (x + dx) % this.cols
        const row = (y + dy) % this.rows
        const idx = row * this.cols + col

        if (patternData[dy][dx]) {
          this.grid[idx] = 1
          this.colors[idx * 3] = rgb.r / 255
          this.colors[idx * 3 + 1] = rgb.g / 255
          this.colors[idx * 3 + 2] = rgb.b / 255
        }
      }
    }
  }

  resize(width, height) {
    super.resize(width, height)
    this.init()
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    // Modulate rules based on audio
    // Bass affects birth threshold (more bass = easier birth = more growth)
    this.birthMin = Math.floor(2 + (1 - this.smoothBass) * 1.5)
    this.birthMax = Math.floor(3 + this.smoothBass * 1)

    // Mid affects survival (higher mid = more stable patterns)
    this.surviveMin = Math.floor(1 + this.smoothMid * 1.5)
    this.surviveMax = Math.floor(3 + this.smoothMid * 1)

    // High frequency adds chaos/mutation
    const mutationRate = this.smoothHigh * 0.002

    // Update speed based on tempo
    this.updateInterval = Math.max(1, Math.floor(4 - normalizedTempo * 3))

    // Seed new patterns on beat
    if (onBeat) {
      const numSeeds = Math.ceil(beatIntensity * 3)
      for (let i = 0; i < numSeeds; i++) {
        const x = Math.floor(Math.random() * this.cols)
        const y = Math.floor(Math.random() * this.rows)

        // Choose pattern based on intensity
        if (beatIntensity > 0.7) {
          this.seedPattern(x, y, 'pulsar', audioFeatures, beatInfo)
        } else if (beatIntensity > 0.4) {
          this.seedPattern(x, y, 'glider', audioFeatures, beatInfo)
        } else {
          this.seedPattern(x, y, 'blinker', audioFeatures, beatInfo)
        }
      }
    }

    // During saturation, continuous spawning
    if (isSaturated && Math.random() < 0.3) {
      const x = Math.floor(Math.random() * this.cols)
      const y = Math.floor(Math.random() * this.rows)
      this.seedPattern(x, y, 'glider', audioFeatures, beatInfo)
    }

    this.frameCount++

    // Run cellular automata update
    if (this.frameCount % this.updateInterval === 0) {
      this.stepSimulation(mutationRate, audioFeatures, beatInfo)
    }
  }

  stepSimulation(mutationRate, audioFeatures, beatInfo) {
    const { centroid } = audioFeatures
    const { normalizedTempo } = beatInfo

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const idx = y * this.cols + x
        const neighbors = this.countNeighbors(x, y)
        const alive = this.grid[idx]

        let nextState = 0

        if (alive) {
          // Survival rules
          if (neighbors >= this.surviveMin && neighbors <= this.surviveMax) {
            nextState = 1
          }
        } else {
          // Birth rules
          if (neighbors >= this.birthMin && neighbors <= this.birthMax) {
            nextState = 1
            // New cell gets color based on neighbors
            const avgColor = this.getNeighborAverageColor(x, y)
            const rgb = pitchTempoToRGB(centroid, normalizedTempo, 1)
            // Blend neighbor color with audio color
            this.colors[idx * 3] = (avgColor.r + rgb.r / 255) / 2
            this.colors[idx * 3 + 1] = (avgColor.g + rgb.g / 255) / 2
            this.colors[idx * 3 + 2] = (avgColor.b + rgb.b / 255) / 2
          }
        }

        // Random mutation
        if (Math.random() < mutationRate) {
          nextState = nextState ? 0 : 1
          if (nextState) {
            const rgb = pitchTempoToRGB(Math.random(), normalizedTempo, 1)
            this.colors[idx * 3] = rgb.r / 255
            this.colors[idx * 3 + 1] = rgb.g / 255
            this.colors[idx * 3 + 2] = rgb.b / 255
          }
        }

        this.nextGrid[idx] = nextState
      }
    }

    // Swap grids
    const temp = this.grid
    this.grid = this.nextGrid
    this.nextGrid = temp
  }

  countNeighbors(x, y) {
    let count = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue

        const nx = (x + dx + this.cols) % this.cols
        const ny = (y + dy + this.rows) % this.rows
        count += this.grid[ny * this.cols + nx]
      }
    }
    return count
  }

  getNeighborAverageColor(x, y) {
    let r = 0, g = 0, b = 0, count = 0

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue

        const nx = (x + dx + this.cols) % this.cols
        const ny = (y + dy + this.rows) % this.rows
        const idx = ny * this.cols + nx

        if (this.grid[idx]) {
          r += this.colors[idx * 3]
          g += this.colors[idx * 3 + 1]
          b += this.colors[idx * 3 + 2]
          count++
        }
      }
    }

    if (count === 0) return { r: 0.5, g: 0.5, b: 0.5 }
    return { r: r / count, g: g / count, b: b / count }
  }

  draw() {
    const ctx = this.ctx

    // Dark background
    ctx.fillStyle = 'rgb(10, 10, 10)'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw cells
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const idx = y * this.cols + x

        if (this.grid[idx]) {
          const r = Math.floor(this.colors[idx * 3] * 255)
          const g = Math.floor(this.colors[idx * 3 + 1] * 255)
          const b = Math.floor(this.colors[idx * 3 + 2] * 255)

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
          ctx.fillRect(
            x * this.cellSize,
            y * this.cellSize,
            this.cellSize - 1,
            this.cellSize - 1
          )
        }
      }
    }
  }

  clear() {
    this.frameCount = 0
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    if (this.grid) {
      this.grid.fill(0)
      this.colors.fill(0)
      this.seedRandom(0.15)
    }

    this.ctx.fillStyle = 'rgb(10, 10, 10)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
