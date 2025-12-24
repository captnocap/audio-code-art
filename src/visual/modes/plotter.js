import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'
import { svgExporter } from '../../export/svg.js'

// Single continuous line that never lifts - perfect for pen plotters
// The path weaves across canvas following audio-reactive movement
export class PlotterMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'plotter'
    this.description = 'Single continuous line for pen plotters - never lifts'

    // The ONE path - all points in order
    this.points = []
    this.maxPoints = 50000

    // Current pen position
    this.penX = 0
    this.penY = 0

    // Movement parameters
    this.baseSpeed = 3
    this.angle = 0
    this.noiseOffset = 0

    // Style
    this.strokeWidth = 1
    this.currentColor = { r: 255, g: 255, b: 255 }

    // Spiral/weave parameters
    this.spiralAngle = 0
    this.wavePhase = 0
  }

  init() {
    this.points = []
    // Start from center
    this.penX = this.width / 2
    this.penY = this.height / 2
    this.angle = Math.random() * Math.PI * 2
    this.noiseOffset = Math.random() * 1000
    this.spiralAngle = 0
    this.wavePhase = 0

    // Add starting point
    this.points.push({
      x: this.penX,
      y: this.penY,
      rgb: { r: 255, g: 255, b: 255 }
    })
  }

  resize(width, height) {
    super.resize(width, height)
  }

  // Simple noise function
  noise(x, y, z = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 43.758) * 43758.5453
    return n - Math.floor(n)
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { amplitude, centroid, bass, mid, high } = weighted
    const { onBeat, beatIntensity, normalizedTempo, isSaturated } = beatInfo

    // Update color from audio
    this.currentColor = pitchTempoToRGB(centroid, normalizedTempo, amplitude)

    // Movement speed based on amplitude
    const speed = this.baseSpeed * (0.5 + amplitude * 2)

    // Multiple movement patterns layered together
    const time = Date.now() * 0.001

    // 1. Base flow - perlin-like wandering
    const noiseAngle = this.noise(
      this.penX * 0.003 + this.noiseOffset,
      this.penY * 0.003,
      time * 0.1
    ) * Math.PI * 4

    // 2. Spiral tendency on beats
    if (onBeat || isSaturated) {
      this.spiralAngle += 0.3 * (beatIntensity || 0.5)
    }
    const spiralInfluence = Math.sin(this.spiralAngle) * 0.5

    // 3. Wave modulation from bass
    this.wavePhase += bass * 0.2
    const waveInfluence = Math.sin(this.wavePhase) * bass * 30

    // 4. High frequency jitter
    const jitterX = (Math.random() - 0.5) * high * 20
    const jitterY = (Math.random() - 0.5) * high * 20

    // 5. Pull toward edges on mids, center on bass
    const centerX = this.width / 2
    const centerY = this.height / 2
    const distFromCenter = Math.hypot(this.penX - centerX, this.penY - centerY)
    const maxDist = Math.hypot(centerX, centerY)

    let pullX = 0, pullY = 0
    if (bass > 0.5) {
      // Pull toward center on bass hits
      pullX = (centerX - this.penX) * 0.02 * bass
      pullY = (centerY - this.penY) * 0.02 * bass
    } else if (mid > 0.5 && distFromCenter < maxDist * 0.7) {
      // Push outward on mids
      const angle = Math.atan2(this.penY - centerY, this.penX - centerX)
      pullX = Math.cos(angle) * mid * 5
      pullY = Math.sin(angle) * mid * 5
    }

    // Combine all influences
    this.angle = noiseAngle + spiralInfluence

    // Calculate new position
    const moveX = Math.cos(this.angle) * speed + jitterX + pullX + Math.cos(this.wavePhase) * waveInfluence * 0.1
    const moveY = Math.sin(this.angle) * speed + jitterY + pullY + Math.sin(this.wavePhase) * waveInfluence * 0.1

    this.penX += moveX
    this.penY += moveY

    // Boundary behavior - wrap or bounce
    const margin = 50
    if (this.penX < margin) {
      this.penX = margin
      this.angle = Math.PI - this.angle
    }
    if (this.penX > this.width - margin) {
      this.penX = this.width - margin
      this.angle = Math.PI - this.angle
    }
    if (this.penY < margin) {
      this.penY = margin
      this.angle = -this.angle
    }
    if (this.penY > this.height - margin) {
      this.penY = this.height - margin
      this.angle = -this.angle
    }

    // Add point to path
    this.points.push({
      x: this.penX,
      y: this.penY,
      rgb: { ...this.currentColor },
      amplitude
    })

    // Limit total points
    if (this.points.length > this.maxPoints) {
      this.points = this.points.slice(-this.maxPoints)
    }

    this.noiseOffset += 0.01
  }

  draw() {
    // Subtle fade for trail effect
    this.clearBackground(0.02)

    if (this.points.length < 2) return

    // Draw the continuous path with color gradients
    // For performance, draw in segments
    const segmentSize = 100

    for (let start = 0; start < this.points.length - 1; start += segmentSize) {
      const end = Math.min(start + segmentSize + 1, this.points.length)

      this.ctx.beginPath()
      this.ctx.moveTo(this.points[start].x, this.points[start].y)

      for (let i = start + 1; i < end; i++) {
        this.ctx.lineTo(this.points[i].x, this.points[i].y)
      }

      // Use color from middle of segment
      const midPoint = this.points[Math.floor((start + end) / 2)]
      const { r, g, b } = midPoint.rgb
      this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`
      this.ctx.lineWidth = this.strokeWidth + (midPoint.amplitude || 0) * 2
      this.ctx.lineCap = 'round'
      this.ctx.lineJoin = 'round'
      this.ctx.stroke()
    }

    // Draw current pen position
    this.ctx.beginPath()
    this.ctx.arc(this.penX, this.penY, 3, 0, Math.PI * 2)
    this.ctx.fillStyle = '#fff'
    this.ctx.fill()
  }

  clear() {
    this.clearBackground(1)
    this.init()
  }

  // Export as SVG - single continuous path!
  exportSVG(screenWidth, screenHeight) {
    if (this.points.length < 2) return null

    // Scale points to export size
    const scaledPoints = this.points.map(p => ({
      ...svgExporter.scale(p.x, p.y, screenWidth, screenHeight),
      rgb: p.rgb
    }))

    // Option 1: Single color path (true plotter mode)
    const singlePath = svgExporter.path(scaledPoints, {
      stroke: '#ffffff',
      strokeWidth: 1,
      smooth: true
    })

    // Option 2: Colored segments (for digital/print)
    let coloredPaths = ''
    const segmentSize = 50
    for (let i = 0; i < scaledPoints.length - 1; i += segmentSize) {
      const segment = scaledPoints.slice(i, i + segmentSize + 1)
      const color = svgExporter.rgbToHex(segment[Math.floor(segment.length / 2)].rgb)
      coloredPaths += svgExporter.path(segment, {
        stroke: color,
        strokeWidth: 1.5,
        smooth: true
      })
    }

    // Create both versions in layers
    const content = `
      <g id="plotter-single-color" style="display:none">
        ${singlePath}
      </g>
      <g id="plotter-colored">
        ${coloredPaths}
      </g>
      <!-- Toggle visibility: show plotter-single-color, hide plotter-colored for pen plotter use -->
    `

    return svgExporter.createDocument(content)
  }

  exportData() {
    return { points: this.points }
  }
}
