// Spirograph Mode - Audio-modulated mathematical curves
// Creates hypotrochoid/epitrochoid patterns where wheel sizes respond to frequency bands

import { VisualizationMode } from './base.js'
import { pitchTempoToColor } from '../palette.js'

export class SpirographMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'spirograph'
    this.description = 'Audio-modulated mathematical curves creating unique song fingerprints'

    // Curve parameters
    this.angle = 0
    this.points = []
    this.maxPoints = 20000

    // Base wheel sizes (will be modulated by audio)
    this.baseR1 = 0 // Outer wheel
    this.baseR2 = 0 // Inner wheel
    this.baseD = 0  // Pen distance

    // Current modulated values
    this.R1 = 0
    this.R2 = 0
    this.d = 0

    // Drawing state
    this.lastX = null
    this.lastY = null
    this.rotationSpeed = 0.02

    // Smoothing for audio reactivity
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
  }

  init() {
    this.clear()
    const size = Math.min(this.width, this.height) * 0.35
    this.baseR1 = size
    this.baseR2 = size * 0.4
    this.baseD = size * 0.25
    this.centerX = this.width / 2
    this.centerY = this.height / 2
  }

  resize(width, height) {
    super.resize(width, height)
    this.init()
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity } = beatInfo

    // Smooth audio values for fluid motion
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    // Modulate wheel sizes based on frequency bands
    // Bass affects outer wheel (larger movements)
    this.R1 = this.baseR1 * (0.6 + this.smoothBass * 0.8)
    // Mid affects inner wheel ratio
    this.R2 = this.baseR2 * (0.5 + this.smoothMid * 1.0)
    // High affects pen distance (detail level)
    this.d = this.baseD * (0.3 + this.smoothHigh * 1.4)

    // Rotation speed based on tempo
    this.rotationSpeed = 0.015 + normalizedTempo * 0.03

    // On beat, add a small phase jump for visual accent
    if (onBeat && beatIntensity > 0.5) {
      this.angle += beatIntensity * 0.3
    }

    // Calculate spirograph position using hypotrochoid equations
    // x = (R - r) * cos(t) + d * cos((R - r) / r * t)
    // y = (R - r) * sin(t) + d * sin((R - r) / r * t)
    const R = this.R1
    const r = this.R2
    const d = this.d
    const t = this.angle

    // Prevent division by zero
    const ratio = r > 0.01 ? (R - r) / r : 0

    const x = this.centerX + (R - r) * Math.cos(t) + d * Math.cos(ratio * t)
    const y = this.centerY + (R - r) * Math.sin(t) - d * Math.sin(ratio * t)

    // Store point with color based on audio
    const color = pitchTempoToColor(centroid, normalizedTempo, amplitude)

    this.points.push({
      x, y,
      color,
      amplitude
    })

    // Trim old points
    if (this.points.length > this.maxPoints) {
      this.points.shift()
    }

    // Advance angle
    this.angle += this.rotationSpeed

    // Store for line drawing
    this.lastX = x
    this.lastY = y
  }

  draw() {
    // Semi-transparent background for trail effect
    this.clearBackground(0.03)

    if (this.points.length < 2) return

    const ctx = this.ctx

    // Draw the curve with varying thickness based on amplitude
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw recent portion with full opacity
    const drawStart = Math.max(0, this.points.length - 5000)

    for (let i = drawStart + 1; i < this.points.length; i++) {
      const p0 = this.points[i - 1]
      const p1 = this.points[i]

      // Line width based on amplitude
      const lineWidth = 0.5 + p1.amplitude * 2.5

      ctx.beginPath()
      ctx.strokeStyle = p1.color
      ctx.lineWidth = lineWidth
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.stroke()
    }

    // Draw a glow at the current position
    if (this.points.length > 0) {
      const current = this.points[this.points.length - 1]
      const gradient = ctx.createRadialGradient(
        current.x, current.y, 0,
        current.x, current.y, 15 + current.amplitude * 20
      )
      gradient.addColorStop(0, current.color)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(current.x, current.y, 15 + current.amplitude * 20, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  clear() {
    this.points = []
    this.angle = 0
    this.lastX = null
    this.lastY = null
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.ctx.fillStyle = 'rgb(10, 10, 10)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  // SVG export for pen plotters
  exportSVG(screenWidth, screenHeight) {
    const scaleX = screenWidth / this.width
    const scaleY = screenHeight / this.height

    if (this.points.length < 2) return ''

    // Build path data
    let pathData = `M ${(this.points[0].x * scaleX).toFixed(2)} ${(this.points[0].y * scaleY).toFixed(2)}`

    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i]
      pathData += ` L ${(p.x * scaleX).toFixed(2)} ${(p.y * scaleY).toFixed(2)}`
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${screenWidth} ${screenHeight}">
        <rect width="100%" height="100%" fill="#0a0a0a"/>
        <path d="${pathData}" fill="none" stroke="white" stroke-width="1" stroke-linecap="round"/>
      </svg>
    `.trim()
  }
}
