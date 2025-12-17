// Mandelbrot Mode - Audio-reactive fractal exploration
// Zooms, pans, and morphs between Mandelbrot and Julia sets based on audio

import { VisualizationMode } from './base.js'

export class MandelbrotMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'mandelbrot'
    this.description = 'Audio-reactive fractal exploration'

    // Fractal parameters
    this.centerX = -0.5
    this.centerY = 0
    this.zoom = 1
    this.targetZoom = 1
    this.maxIterations = 100

    // Julia set parameters (c value)
    this.juliaMode = false
    this.juliaReal = -0.7
    this.juliaImag = 0.27015
    this.juliaMorph = 0 // 0 = Mandelbrot, 1 = Julia

    // Interesting points to zoom into
    this.interestingPoints = [
      { x: -0.5, y: 0 },                    // Main cardioid
      { x: -0.75, y: 0.1 },                 // Elephant valley
      { x: -0.1, y: 0.65 },                 // Seahorse valley
      { x: -1.25, y: 0.02 },                // Antenna
      { x: -0.745, y: 0.113 },              // Mini Mandelbrot
      { x: -0.235125, y: 0.827215 },        // Spiral
      { x: -0.748, y: 0.1 },                // Double spiral
      { x: -1.749, y: 0 },                  // Tail
      { x: 0.285, y: 0.01 },                // Another interesting spot
      { x: -0.8, y: 0.156 }                 // Fractal lightning
    ]
    this.currentPointIdx = 0
    this.targetX = this.centerX
    this.targetY = this.centerY

    // Color parameters
    this.hueOffset = 0
    this.saturation = 80
    this.colorCycles = 3

    // Animation
    this.time = 0
    this.autoZoom = true
    this.zoomDirection = 1

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Rendering
    this.imageData = null
    this.pixelSize = 2 // Render at half res for performance
  }

  init() {
    this.clear()
    this.imageData = this.ctx.createImageData(this.width, this.height)
  }

  resize(width, height) {
    super.resize(width, height)
    this.imageData = this.ctx.createImageData(width, height)
  }

  // Convert iteration count to color
  iterationToColor(iter, maxIter) {
    if (iter >= maxIter) {
      return { r: 0, g: 0, b: 0 } // Inside the set - black
    }

    // Smooth coloring using escape-time algorithm
    const smoothed = iter + 1 - Math.log2(Math.log2(iter + 1))
    const hue = (this.hueOffset + smoothed * this.colorCycles * 10) % 360

    // HSL to RGB
    const s = this.saturation / 100
    const l = 0.5

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1))
    const m = l - c / 2

    let r, g, b
    if (hue < 60) { r = c; g = x; b = 0 }
    else if (hue < 120) { r = x; g = c; b = 0 }
    else if (hue < 180) { r = 0; g = c; b = x }
    else if (hue < 240) { r = 0; g = x; b = c }
    else if (hue < 300) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }

    return {
      r: Math.floor((r + m) * 255),
      g: Math.floor((g + m) * 255),
      b: Math.floor((b + m) * 255)
    }
  }

  // Calculate Mandelbrot/Julia iteration for a point
  calculatePoint(x0, y0) {
    let x, y, x2, y2

    if (this.juliaMorph > 0.5) {
      // Julia set mode
      x = x0
      y = y0
      const cr = this.juliaReal
      const ci = this.juliaImag

      for (let i = 0; i < this.maxIterations; i++) {
        x2 = x * x
        y2 = y * y

        if (x2 + y2 > 4) return i

        y = 2 * x * y + ci
        x = x2 - y2 + cr
      }
    } else {
      // Mandelbrot set mode
      x = 0
      y = 0
      const cr = x0
      const ci = y0

      for (let i = 0; i < this.maxIterations; i++) {
        x2 = x * x
        y2 = y * y

        if (x2 + y2 > 4) return i

        y = 2 * x * y + ci
        x = x2 - y2 + cr
      }
    }

    return this.maxIterations
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude, centroid, dominantFrequency } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    this.time += 0.01

    // Color cycling based on audio
    this.hueOffset += (1 + this.smoothMid * 5) * (normalizedTempo + 0.5)
    this.saturation = 60 + this.smoothAmplitude * 40
    this.colorCycles = 2 + this.smoothHigh * 4

    // Max iterations based on zoom and audio
    this.maxIterations = Math.floor(50 + Math.log2(this.zoom + 1) * 20 + this.smoothAmplitude * 50)

    // Zoom based on bass
    if (this.autoZoom) {
      // Continuous zoom with audio modulation
      const zoomSpeed = 0.002 + this.smoothBass * 0.01
      this.targetZoom *= (1 + zoomSpeed * this.zoomDirection)

      // Reverse zoom direction at limits
      if (this.targetZoom > 1000000) {
        this.zoomDirection = -1
      } else if (this.targetZoom < 0.8) {
        this.zoomDirection = 1
      }
    }

    // Beat triggers zoom burst or location change
    if (onBeat && beatIntensity > 0.5) {
      // Jump to new interesting point
      if (beatIntensity > 0.7 && Math.random() < 0.3) {
        this.currentPointIdx = (this.currentPointIdx + 1) % this.interestingPoints.length
        const point = this.interestingPoints[this.currentPointIdx]
        this.targetX = point.x
        this.targetY = point.y
        this.targetZoom = 1 // Reset zoom when changing location
        this.zoomDirection = 1
      }

      // Zoom burst
      this.targetZoom *= (1 + beatIntensity * 0.5)
    }

    // Smooth zoom and pan transitions
    this.zoom += (this.targetZoom - this.zoom) * 0.05
    this.centerX += (this.targetX - this.centerX) * 0.02
    this.centerY += (this.targetY - this.centerY) * 0.02

    // High frequencies trigger Julia mode morphing
    if (this.smoothHigh > 0.5) {
      this.juliaMorph += (1 - this.juliaMorph) * 0.05
      // Animate Julia parameters
      this.juliaReal = -0.7 + Math.sin(this.time * 2) * 0.2 * this.smoothHigh
      this.juliaImag = 0.27015 + Math.cos(this.time * 1.5) * 0.2 * this.smoothHigh
    } else {
      this.juliaMorph += (0 - this.juliaMorph) * 0.05
    }

    // Saturation mode = rapid parameter changes
    if (isSaturated) {
      this.hueOffset += 10
      this.juliaReal += (Math.random() - 0.5) * 0.01
      this.juliaImag += (Math.random() - 0.5) * 0.01
    }

    // Small pan movements based on mid frequencies
    const panAmount = this.smoothMid * 0.01 / this.zoom
    this.targetX += Math.sin(this.time * 3) * panAmount
    this.targetY += Math.cos(this.time * 2) * panAmount
  }

  draw() {
    const ctx = this.ctx
    const data = this.imageData.data

    const w = this.width
    const h = this.height
    const step = this.pixelSize

    // Calculate view bounds
    const aspectRatio = w / h
    const viewHeight = 3 / this.zoom
    const viewWidth = viewHeight * aspectRatio

    const xMin = this.centerX - viewWidth / 2
    const yMin = this.centerY - viewHeight / 2
    const xStep = viewWidth / w
    const yStep = viewHeight / h

    // Render fractal
    for (let py = 0; py < h; py += step) {
      const y0 = yMin + py * yStep

      for (let px = 0; px < w; px += step) {
        const x0 = xMin + px * xStep

        const iter = this.calculatePoint(x0, y0)
        const color = this.iterationToColor(iter, this.maxIterations)

        // Fill pixel block
        for (let dy = 0; dy < step && py + dy < h; dy++) {
          for (let dx = 0; dx < step && px + dx < w; dx++) {
            const idx = ((py + dy) * w + (px + dx)) * 4
            data[idx] = color.r
            data[idx + 1] = color.g
            data[idx + 2] = color.b
            data[idx + 3] = 255
          }
        }
      }
    }

    ctx.putImageData(this.imageData, 0, 0)

    // Draw info overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(5, 5, 200, 80)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '12px monospace'
    ctx.fillText(`Zoom: ${this.zoom.toExponential(2)}`, 10, 22)
    ctx.fillText(`Center: (${this.centerX.toFixed(6)}, ${this.centerY.toFixed(6)})`, 10, 38)
    ctx.fillText(`Iterations: ${this.maxIterations}`, 10, 54)
    ctx.fillText(`Mode: ${this.juliaMorph > 0.5 ? 'Julia' : 'Mandelbrot'}`, 10, 70)

    // Draw minimap
    this.drawMinimap(ctx)
  }

  drawMinimap(ctx) {
    const mapSize = 80
    const mapX = this.width - mapSize - 10
    const mapY = 10

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(mapX, mapY, mapSize, mapSize)

    // Simple Mandelbrot thumbnail
    const mapStep = 4
    for (let y = 0; y < mapSize; y += mapStep) {
      for (let x = 0; x < mapSize; x += mapStep) {
        const x0 = -2.5 + (x / mapSize) * 3.5
        const y0 = -1.25 + (y / mapSize) * 2.5

        let zx = 0, zy = 0
        let iter = 0
        while (zx * zx + zy * zy < 4 && iter < 20) {
          const tmp = zx * zx - zy * zy + x0
          zy = 2 * zx * zy + y0
          zx = tmp
          iter++
        }

        ctx.fillStyle = iter >= 20 ? 'white' : 'black'
        ctx.fillRect(mapX + x, mapY + y, mapStep, mapStep)
      }
    }

    // Current view indicator
    const viewX = mapX + ((this.centerX + 2.5) / 3.5) * mapSize
    const viewY = mapY + ((this.centerY + 1.25) / 2.5) * mapSize
    const viewSize = Math.max(2, mapSize / this.zoom)

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'
    ctx.lineWidth = 1
    ctx.strokeRect(
      viewX - viewSize / 2,
      viewY - viewSize / 2,
      viewSize,
      viewSize
    )

    // Center point
    ctx.fillStyle = 'red'
    ctx.beginPath()
    ctx.arc(viewX, viewY, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  clear() {
    this.centerX = -0.5
    this.centerY = 0
    this.zoom = 1
    this.targetZoom = 1
    this.targetX = -0.5
    this.targetY = 0
    this.hueOffset = 0
    this.juliaMorph = 0
    this.time = 0
    this.zoomDirection = 1
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    this.ctx.fillStyle = 'rgb(0, 0, 0)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
