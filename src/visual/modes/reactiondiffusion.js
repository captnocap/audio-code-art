// Reaction-Diffusion Mode - Gray-Scott algorithm
// Creates organic, coral-like patterns that bloom and evolve with audio
// Uses Canvas 2D with optimizations (WebGL would be faster but adds complexity)

import { VisualizationMode } from './base.js'
import { pitchTempoToRGB } from '../palette.js'

export class ReactionDiffusionMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'reactiondiffusion'
    this.description = 'Organic Gray-Scott reaction-diffusion patterns'

    // Simulation grid (lower resolution for performance)
    this.scale = 3 // Each simulation cell = 3x3 pixels
    this.gridWidth = 0
    this.gridHeight = 0

    // Chemical concentrations
    this.gridA = null // Chemical A
    this.gridB = null // Chemical B
    this.nextA = null
    this.nextB = null

    // Gray-Scott parameters
    this.dA = 1.0    // Diffusion rate of A
    this.dB = 0.5    // Diffusion rate of B
    this.feed = 0.055 // Feed rate
    this.kill = 0.062 // Kill rate

    // Target parameters (modulated by audio)
    this.targetFeed = 0.055
    this.targetKill = 0.062

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    // Rendering
    this.imageData = null

    // Steps per frame (more = faster evolution)
    this.stepsPerFrame = 4
  }

  init() {
    this.gridWidth = Math.ceil(this.width / this.scale)
    this.gridHeight = Math.ceil(this.height / this.scale)

    const size = this.gridWidth * this.gridHeight

    // Initialize grids
    this.gridA = new Float32Array(size)
    this.gridB = new Float32Array(size)
    this.nextA = new Float32Array(size)
    this.nextB = new Float32Array(size)

    // Fill with chemical A
    this.gridA.fill(1)
    this.gridB.fill(0)

    // Seed some initial B in the center
    this.seedPattern(this.gridWidth / 2, this.gridHeight / 2, 20)

    // Create ImageData for rendering
    this.imageData = this.ctx.createImageData(this.width, this.height)
  }

  // Seed chemical B in a circular region
  seedPattern(cx, cy, radius) {
    for (let y = Math.max(0, cy - radius); y < Math.min(this.gridHeight, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x < Math.min(this.gridWidth, cx + radius); x++) {
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy < radius * radius) {
          const idx = y * this.gridWidth + x
          this.gridB[idx] = 1
        }
      }
    }
  }

  // Seed a random pattern
  seedRandom(x, y, size) {
    for (let i = 0; i < size * size; i++) {
      const rx = x + Math.floor(Math.random() * size) - size / 2
      const ry = y + Math.floor(Math.random() * size) - size / 2

      if (rx >= 0 && rx < this.gridWidth && ry >= 0 && ry < this.gridHeight) {
        const idx = ry * this.gridWidth + rx
        this.gridB[idx] = Math.random()
      }
    }
  }

  resize(width, height) {
    super.resize(width, height)
    this.init()
  }

  // Laplacian using 3x3 kernel
  laplacian(grid, x, y) {
    const w = this.gridWidth
    const h = this.gridHeight

    // Wrap coordinates
    const xm = (x - 1 + w) % w
    const xp = (x + 1) % w
    const ym = (y - 1 + h) % h
    const yp = (y + 1) % h

    const idx = y * w + x

    // Standard Laplacian weights
    // -1  -1  -1
    // -1   8  -1
    // -1  -1  -1  (then divide by 8 for average of neighbors minus center)

    // Simplified: 0.2 for neighbors, 0.05 for corners, -1 for center
    return (
      grid[ym * w + xm] * 0.05 +
      grid[ym * w + x] * 0.2 +
      grid[ym * w + xp] * 0.05 +
      grid[y * w + xm] * 0.2 +
      grid[idx] * -1 +
      grid[y * w + xp] * 0.2 +
      grid[yp * w + xm] * 0.05 +
      grid[yp * w + x] * 0.2 +
      grid[yp * w + xp] * 0.05
    )
  }

  // Run one step of the Gray-Scott simulation
  step() {
    const w = this.gridWidth
    const h = this.gridHeight

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x

        const a = this.gridA[idx]
        const b = this.gridB[idx]

        // Reaction-diffusion equations
        // dA/dt = dA * laplacian(A) - A*B*B + feed*(1-A)
        // dB/dt = dB * laplacian(B) + A*B*B - (kill+feed)*B

        const lapA = this.laplacian(this.gridA, x, y)
        const lapB = this.laplacian(this.gridB, x, y)

        const reaction = a * b * b

        this.nextA[idx] = a + (this.dA * lapA - reaction + this.feed * (1 - a))
        this.nextB[idx] = b + (this.dB * lapB + reaction - (this.kill + this.feed) * b)

        // Clamp values
        this.nextA[idx] = Math.max(0, Math.min(1, this.nextA[idx]))
        this.nextB[idx] = Math.max(0, Math.min(1, this.nextB[idx]))
      }
    }

    // Swap buffers
    let temp = this.gridA
    this.gridA = this.nextA
    this.nextA = temp

    temp = this.gridB
    this.gridB = this.nextB
    this.nextB = temp
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.08
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    // Modulate feed/kill rates based on audio
    // Different parameter combinations create different patterns:
    // Low feed, low kill = coral/worm-like
    // High feed, high kill = spots
    // Medium feed, medium kill = labyrinth

    // Bass influences feed rate (more bass = more growth)
    this.targetFeed = 0.035 + this.smoothBass * 0.04

    // Mid influences kill rate
    this.targetKill = 0.055 + this.smoothMid * 0.02

    // Smooth transition of parameters
    this.feed += (this.targetFeed - this.feed) * 0.05
    this.kill += (this.targetKill - this.kill) * 0.05

    // High frequency adds noise/disturbance
    if (this.smoothHigh > 0.3 && Math.random() < 0.05) {
      const x = Math.floor(Math.random() * this.gridWidth)
      const y = Math.floor(Math.random() * this.gridHeight)
      this.seedRandom(x, y, 5)
    }

    // Seed new patterns on beat
    if (onBeat && beatIntensity > 0.4) {
      const numSeeds = Math.ceil(beatIntensity * 3)
      for (let i = 0; i < numSeeds; i++) {
        const x = Math.floor(Math.random() * this.gridWidth)
        const y = Math.floor(Math.random() * this.gridHeight)
        const size = 5 + Math.floor(beatIntensity * 15)
        this.seedPattern(x, y, size)
      }
    }

    // More seeds during saturation
    if (isSaturated && Math.random() < 0.1) {
      const x = Math.floor(Math.random() * this.gridWidth)
      const y = Math.floor(Math.random() * this.gridHeight)
      this.seedPattern(x, y, 10)
    }

    // Adjust simulation speed based on tempo
    this.stepsPerFrame = Math.floor(2 + normalizedTempo * 6)

    // Run simulation steps
    for (let i = 0; i < this.stepsPerFrame; i++) {
      this.step()
    }
  }

  draw() {
    const ctx = this.ctx
    const data = this.imageData.data

    // Color based on chemical B concentration
    const color = pitchTempoToRGB(0.6, 0.5, 0.8)

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const gridIdx = y * this.gridWidth + x
        const b = this.gridB[gridIdx]

        // Map B concentration to color
        // Low B = dark, High B = colored
        const intensity = Math.pow(b, 0.5) // Gamma correction for better visibility

        const r = Math.floor(intensity * color.r)
        const g = Math.floor(intensity * color.g)
        const bl = Math.floor(intensity * color.b)

        // Fill the scaled pixel area
        for (let dy = 0; dy < this.scale; dy++) {
          for (let dx = 0; dx < this.scale; dx++) {
            const px = x * this.scale + dx
            const py = y * this.scale + dy

            if (px < this.width && py < this.height) {
              const pixelIdx = (py * this.width + px) * 4
              data[pixelIdx] = r
              data[pixelIdx + 1] = g
              data[pixelIdx + 2] = bl
              data[pixelIdx + 3] = 255
            }
          }
        }
      }
    }

    ctx.putImageData(this.imageData, 0, 0)

    // Draw parameter info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '12px monospace'
    ctx.fillText(`feed: ${this.feed.toFixed(4)} kill: ${this.kill.toFixed(4)}`, 10, 20)
  }

  clear() {
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    this.feed = 0.055
    this.kill = 0.062
    this.targetFeed = 0.055
    this.targetKill = 0.062

    if (this.gridA) {
      this.gridA.fill(1)
      this.gridB.fill(0)

      // Initial seed
      this.seedPattern(this.gridWidth / 2, this.gridHeight / 2, 20)
    }

    this.ctx.fillStyle = 'rgb(10, 10, 10)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
