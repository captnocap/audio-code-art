// Topographic Contours Mode - Audio creates height fields with contour lines
// Marching squares algorithm traces elevation levels for cartographic aesthetics

import { VisualizationMode } from './base.js'
import { pitchTempoToColor } from '../palette.js'

export class ContoursMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'contours'
    this.description = 'Topographic contours from audio height field'

    // Height field grid
    this.gridSize = 8 // Pixels per cell
    this.cols = 0
    this.rows = 0
    this.heightField = null
    this.targetField = null

    // Contour levels
    this.numLevels = 12

    // Peaks spawned on beats
    this.peaks = []
    this.maxPeaks = 20

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    // Animation time
    this.time = 0
  }

  init() {
    this.cols = Math.ceil(this.width / this.gridSize) + 1
    this.rows = Math.ceil(this.height / this.gridSize) + 1

    this.heightField = new Float32Array(this.cols * this.rows)
    this.targetField = new Float32Array(this.cols * this.rows)

    this.peaks = []
    this.clear()
  }

  resize(width, height) {
    super.resize(width, height)
    this.init()
  }

  // Add a peak to the height field
  addPeak(x, y, height, radius) {
    this.peaks.push({
      x, y,
      height,
      radius,
      age: 0,
      maxAge: 200 + Math.random() * 100
    })

    if (this.peaks.length > this.maxPeaks) {
      this.peaks.shift()
    }
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { bass, mid, high, amplitude, centroid, frequencies } = weighted
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    this.time += 0.02

    // Spawn peaks on beat
    if (onBeat && beatIntensity > 0.3) {
      const numPeaks = Math.ceil(beatIntensity * 2)
      for (let i = 0; i < numPeaks; i++) {
        const x = Math.random() * this.width
        const y = Math.random() * this.height
        const height = 0.5 + beatIntensity * 0.5
        const radius = 100 + beatIntensity * 150

        this.addPeak(x, y, height, radius)
      }
    }

    // During saturation, continuous peaks
    if (isSaturated && Math.random() < 0.1) {
      this.addPeak(
        Math.random() * this.width,
        Math.random() * this.height,
        0.3 + Math.random() * 0.3,
        80 + Math.random() * 80
      )
    }

    // Update peaks
    for (let i = this.peaks.length - 1; i >= 0; i--) {
      this.peaks[i].age++
      if (this.peaks[i].age > this.peaks[i].maxAge) {
        this.peaks.splice(i, 1)
      }
    }

    // Calculate target height field
    this.calculateHeightField(frequencies, amplitude)

    // Smooth interpolation to target
    const interpSpeed = 0.1 + normalizedTempo * 0.1
    for (let i = 0; i < this.heightField.length; i++) {
      this.heightField[i] += (this.targetField[i] - this.heightField[i]) * interpSpeed
    }
  }

  calculateHeightField(frequencies, amplitude) {
    // Base the height field on FFT + peaks
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const idx = y * this.cols + x
        const px = x * this.gridSize
        const py = y * this.gridSize

        // Base height from noise
        let height = this.noise2D(px * 0.003 + this.time * 0.1, py * 0.003) * 0.3

        // Add FFT contribution - map x position to frequency bin
        const freqIdx = Math.floor((x / this.cols) * Math.min(frequencies.length, 256))
        const freqContrib = frequencies[freqIdx] / 255
        height += freqContrib * 0.4

        // Add peaks
        for (const peak of this.peaks) {
          const dx = px - peak.x
          const dy = py - peak.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          // Age-based decay
          const lifeRatio = 1 - peak.age / peak.maxAge

          if (dist < peak.radius) {
            // Gaussian falloff
            const falloff = Math.exp(-(dist * dist) / (peak.radius * peak.radius * 0.5))
            height += peak.height * falloff * lifeRatio
          }
        }

        // Add some animation waves
        height += Math.sin(px * 0.01 + this.time) * Math.cos(py * 0.01 + this.time * 0.7) * 0.1 * amplitude

        this.targetField[idx] = Math.max(0, Math.min(1, height))
      }
    }
  }

  // Simple 2D noise
  noise2D(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1
  }

  draw() {
    const ctx = this.ctx

    // Dark background
    ctx.fillStyle = 'rgb(10, 10, 10)'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw contour lines using marching squares
    for (let level = 0; level < this.numLevels; level++) {
      const threshold = (level + 1) / (this.numLevels + 1)
      const color = pitchTempoToColor(threshold, 0.5, 0.3 + threshold * 0.5)

      ctx.strokeStyle = color
      ctx.lineWidth = level === this.numLevels - 1 ? 2 : 1

      this.drawContourLevel(ctx, threshold)
    }

    // Draw peak centers
    for (const peak of this.peaks) {
      const lifeRatio = 1 - peak.age / peak.maxAge
      const alpha = lifeRatio * 0.5

      const gradient = ctx.createRadialGradient(
        peak.x, peak.y, 0,
        peak.x, peak.y, 20
      )
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(peak.x, peak.y, 20, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawContourLevel(ctx, threshold) {
    // Marching squares algorithm
    ctx.beginPath()

    for (let y = 0; y < this.rows - 1; y++) {
      for (let x = 0; x < this.cols - 1; x++) {
        const idx = y * this.cols + x

        // Get corner values
        const v0 = this.heightField[idx]
        const v1 = this.heightField[idx + 1]
        const v2 = this.heightField[idx + this.cols + 1]
        const v3 = this.heightField[idx + this.cols]

        // Calculate case index
        let caseIndex = 0
        if (v0 > threshold) caseIndex |= 1
        if (v1 > threshold) caseIndex |= 2
        if (v2 > threshold) caseIndex |= 4
        if (v3 > threshold) caseIndex |= 8

        // Skip empty and full cells
        if (caseIndex === 0 || caseIndex === 15) continue

        // Cell coordinates
        const px = x * this.gridSize
        const py = y * this.gridSize

        // Interpolate edge crossings
        const edges = this.getMarchingSquaresEdges(caseIndex, v0, v1, v2, v3, threshold, px, py)

        for (let i = 0; i < edges.length; i += 2) {
          ctx.moveTo(edges[i].x, edges[i].y)
          ctx.lineTo(edges[i + 1].x, edges[i + 1].y)
        }
      }
    }

    ctx.stroke()
  }

  getMarchingSquaresEdges(caseIndex, v0, v1, v2, v3, threshold, px, py) {
    const s = this.gridSize
    const edges = []

    // Linear interpolation helper
    const lerp = (a, b, t) => a + (b - a) * t
    const getT = (a, b) => (threshold - a) / (b - a)

    // Edge midpoints with interpolation
    const top = { x: px + lerp(0, s, getT(v0, v1)), y: py }
    const right = { x: px + s, y: py + lerp(0, s, getT(v1, v2)) }
    const bottom = { x: px + lerp(0, s, getT(v3, v2)), y: py + s }
    const left = { x: px, y: py + lerp(0, s, getT(v0, v3)) }

    // Marching squares lookup
    switch (caseIndex) {
      case 1: edges.push(left, top); break
      case 2: edges.push(top, right); break
      case 3: edges.push(left, right); break
      case 4: edges.push(right, bottom); break
      case 5: edges.push(left, top, right, bottom); break
      case 6: edges.push(top, bottom); break
      case 7: edges.push(left, bottom); break
      case 8: edges.push(bottom, left); break
      case 9: edges.push(bottom, top); break
      case 10: edges.push(top, right, bottom, left); break
      case 11: edges.push(bottom, right); break
      case 12: edges.push(right, left); break
      case 13: edges.push(right, top); break
      case 14: edges.push(top, left); break
    }

    return edges
  }

  clear() {
    this.peaks = []
    this.time = 0
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    if (this.heightField) {
      this.heightField.fill(0)
      this.targetField.fill(0)
    }

    this.ctx.fillStyle = 'rgb(10, 10, 10)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  // SVG export
  exportSVG(screenWidth, screenHeight) {
    const scaleX = screenWidth / this.width
    const scaleY = screenHeight / this.height

    let paths = ''

    for (let level = 0; level < this.numLevels; level++) {
      const threshold = (level + 1) / (this.numLevels + 1)
      const strokeWidth = level === this.numLevels - 1 ? 2 : 1

      let pathData = ''

      for (let y = 0; y < this.rows - 1; y++) {
        for (let x = 0; x < this.cols - 1; x++) {
          const idx = y * this.cols + x

          const v0 = this.heightField[idx]
          const v1 = this.heightField[idx + 1]
          const v2 = this.heightField[idx + this.cols + 1]
          const v3 = this.heightField[idx + this.cols]

          let caseIndex = 0
          if (v0 > threshold) caseIndex |= 1
          if (v1 > threshold) caseIndex |= 2
          if (v2 > threshold) caseIndex |= 4
          if (v3 > threshold) caseIndex |= 8

          if (caseIndex === 0 || caseIndex === 15) continue

          const px = x * this.gridSize
          const py = y * this.gridSize

          const edges = this.getMarchingSquaresEdges(caseIndex, v0, v1, v2, v3, threshold, px, py)

          for (let i = 0; i < edges.length; i += 2) {
            const x1 = edges[i].x * scaleX
            const y1 = edges[i].y * scaleY
            const x2 = edges[i + 1].x * scaleX
            const y2 = edges[i + 1].y * scaleY

            pathData += `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} `
          }
        }
      }

      if (pathData) {
        const brightness = Math.floor(100 + threshold * 155)
        paths += `<path d="${pathData}" fill="none" stroke="rgb(${brightness}, ${brightness}, ${brightness})" stroke-width="${strokeWidth}"/>\n`
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${screenWidth} ${screenHeight}">
        <rect width="100%" height="100%" fill="#0a0a0a"/>
        ${paths}
      </svg>
    `.trim()
  }
}
