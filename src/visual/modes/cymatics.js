// Cymatics Mode - Chladni plate standing wave patterns
// Particles accumulate at nodal lines where waves cancel out
// Real physics made visible through frequency-driven geometric patterns

import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

class CymaticsParticle {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.settled = false
    this.settleTime = 0
  }
}

export class CymaticsMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'cymatics'
    this.description = 'Chladni plate standing wave patterns'

    this.particles = []
    this.maxParticles = 8000

    // Chladni pattern parameters
    // Pattern determined by integers n and m in the equation
    this.n = 3
    this.m = 2
    this.targetN = 3
    this.targetM = 2

    // Plate properties
    this.plateSize = 0
    this.centerX = 0
    this.centerY = 0

    // Vibration state
    this.vibrationIntensity = 0
    this.phase = 0

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Accumulated pattern for rendering
    this.accumulation = null
  }

  init() {
    this.clear()

    this.plateSize = Math.min(this.width, this.height) * 0.45
    this.centerX = this.width / 2
    this.centerY = this.height / 2

    // Initialize accumulation buffer
    this.accumulation = new Float32Array(this.width * this.height)

    // Spawn initial particles uniformly
    this.spawnParticles(this.maxParticles * 0.5)
  }

  spawnParticles(count) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      // Spawn within circular plate
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * this.plateSize

      this.particles.push(new CymaticsParticle(
        this.centerX + Math.cos(angle) * radius,
        this.centerY + Math.sin(angle) * radius
      ))
    }
  }

  // Chladni pattern function
  // Returns the vibration amplitude at a point
  // Nodal lines occur where this equals zero
  chladniPattern(x, y) {
    // Normalize to plate coordinates (-1 to 1)
    const px = (x - this.centerX) / this.plateSize
    const py = (y - this.centerY) / this.plateSize

    // Check if outside plate
    if (px * px + py * py > 1) return 0

    // Chladni equation for square plate (approximated for circular)
    // z = cos(n*pi*x)*cos(m*pi*y) - cos(m*pi*x)*cos(n*pi*y)
    // This creates beautiful symmetric patterns

    const n = this.n
    const m = this.m

    const pattern1 = Math.cos(n * Math.PI * px) * Math.cos(m * Math.PI * py)
    const pattern2 = Math.cos(m * Math.PI * px) * Math.cos(n * Math.PI * py)

    return pattern1 - pattern2
  }

  // Gradient of Chladni pattern (direction particles should move)
  chladniGradient(x, y) {
    const epsilon = 2
    const center = Math.abs(this.chladniPattern(x, y))
    const dx = Math.abs(this.chladniPattern(x + epsilon, y)) - center
    const dy = Math.abs(this.chladniPattern(x, y + epsilon)) - center

    // Normalize
    const mag = Math.sqrt(dx * dx + dy * dy) || 1

    return {
      x: -dx / mag, // Move toward lower amplitude (nodal lines)
      y: -dy / mag
    }
  }

  resize(width, height) {
    super.resize(width, height)
    this.init()
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude, centroid, dominantFrequency } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Update vibration intensity
    this.vibrationIntensity = this.smoothAmplitude * 0.5 + this.smoothBass * 0.5
    this.phase += 0.1 + normalizedTempo * 0.2

    // Change pattern based on dominant frequency
    // Higher frequencies = more complex patterns
    this.targetN = Math.floor(2 + dominantFrequency * 6)
    this.targetM = Math.floor(1 + centroid * 5)

    // Smoothly transition pattern (integers)
    if (onBeat && beatIntensity > 0.5) {
      this.n = this.targetN
      this.m = this.targetM

      // "Kick" the plate - scatter particles
      for (const p of this.particles) {
        p.settled = false
        p.vx += (Math.random() - 0.5) * beatIntensity * 20
        p.vy += (Math.random() - 0.5) * beatIntensity * 20
      }

      // Spawn new particles on strong beats
      if (beatIntensity > 0.7) {
        this.spawnParticles(100)
      }
    }

    // Update particles
    const settleDist = 0.02 // Distance from nodal line to consider settled
    const attractionStrength = 0.3 + this.smoothBass * 0.5

    for (const p of this.particles) {
      // Get distance from center
      const dx = p.x - this.centerX
      const dy = p.y - this.centerY
      const distFromCenter = Math.sqrt(dx * dx + dy * dy)

      // Remove particles outside plate
      if (distFromCenter > this.plateSize * 1.1) {
        p.x = this.centerX + (Math.random() - 0.5) * this.plateSize * 2
        p.y = this.centerY + (Math.random() - 0.5) * this.plateSize * 2
        p.settled = false
        continue
      }

      // Get pattern value at particle position
      const patternValue = Math.abs(this.chladniPattern(p.x, p.y))

      if (!p.settled) {
        // Move toward nodal lines (where pattern = 0)
        const grad = this.chladniGradient(p.x, p.y)

        // Apply force toward nodal line
        p.vx += grad.x * attractionStrength * patternValue
        p.vy += grad.y * attractionStrength * patternValue

        // Add vibration (perpendicular to gradient)
        const vibration = Math.sin(this.phase) * this.vibrationIntensity
        p.vx += (Math.random() - 0.5) * vibration
        p.vy += (Math.random() - 0.5) * vibration

        // Damping
        p.vx *= 0.95
        p.vy *= 0.95

        // Update position
        p.x += p.vx
        p.y += p.vy

        // Check if settled on nodal line
        if (patternValue < settleDist && Math.abs(p.vx) < 0.5 && Math.abs(p.vy) < 0.5) {
          p.settleTime++
          if (p.settleTime > 30) {
            p.settled = true
          }
        } else {
          p.settleTime = 0
        }
      } else {
        // Settled particles still vibrate slightly
        p.x += (Math.random() - 0.5) * this.vibrationIntensity * 0.5
        p.y += (Math.random() - 0.5) * this.vibrationIntensity * 0.5

        // Un-settle if vibration is strong
        if (this.vibrationIntensity > 0.5 && Math.random() < 0.01) {
          p.settled = false
          p.settleTime = 0
        }
      }

      // Accumulate settled particle positions
      if (p.settled) {
        const px = Math.floor(p.x)
        const py = Math.floor(p.y)
        if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
          this.accumulation[py * this.width + px] += 0.1
        }
      }
    }

    // Fade accumulation slowly
    for (let i = 0; i < this.accumulation.length; i++) {
      this.accumulation[i] *= 0.995
    }
  }

  draw() {
    const ctx = this.ctx

    // Dark background
    ctx.fillStyle = 'rgb(10, 10, 10)'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw plate outline
    ctx.strokeStyle = 'rgba(50, 50, 70, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(this.centerX, this.centerY, this.plateSize, 0, Math.PI * 2)
    ctx.stroke()

    // Draw faint nodal line pattern for reference
    this.drawNodalLines(ctx)

    // Draw accumulated pattern
    this.drawAccumulation(ctx)

    // Draw particles
    const particleColor = pitchTempoToRGB(0.5, 0.5, 0.8)

    for (const p of this.particles) {
      const alpha = p.settled ? 0.9 : 0.4
      const size = p.settled ? 1.5 : 1

      ctx.fillStyle = `rgba(${particleColor.r}, ${particleColor.g}, ${particleColor.b}, ${alpha})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw pattern info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '12px monospace'
    ctx.fillText(`Pattern: n=${this.n}, m=${this.m}`, 10, 20)
    ctx.fillText(`Particles: ${this.particles.length}`, 10, 35)
  }

  drawNodalLines(ctx) {
    // Draw the theoretical nodal lines faintly
    const step = 4
    ctx.strokeStyle = 'rgba(40, 40, 60, 0.3)'
    ctx.lineWidth = 1

    // Draw contour at pattern = 0
    for (let y = this.centerY - this.plateSize; y < this.centerY + this.plateSize; y += step) {
      for (let x = this.centerX - this.plateSize; x < this.centerX + this.plateSize; x += step) {
        const val = this.chladniPattern(x, y)

        // If sign changes, we're near nodal line
        const valRight = this.chladniPattern(x + step, y)
        const valDown = this.chladniPattern(x, y + step)

        if (val * valRight < 0) {
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x + step, y)
          ctx.stroke()
        }

        if (val * valDown < 0) {
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x, y + step)
          ctx.stroke()
        }
      }
    }
  }

  drawAccumulation(ctx) {
    // Draw accumulated pattern as subtle glow
    const imageData = ctx.getImageData(0, 0, this.width, this.height)
    const data = imageData.data

    for (let i = 0; i < this.accumulation.length; i++) {
      const acc = Math.min(this.accumulation[i], 1)
      if (acc > 0.1) {
        const idx = i * 4
        const brightness = Math.floor(acc * 100)
        data[idx] = Math.min(255, data[idx] + brightness)
        data[idx + 1] = Math.min(255, data[idx + 1] + brightness)
        data[idx + 2] = Math.min(255, data[idx + 2] + brightness + 20)
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  clear() {
    this.particles = []
    this.n = 3
    this.m = 2
    this.targetN = 3
    this.targetM = 2
    this.vibrationIntensity = 0
    this.phase = 0
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    if (this.accumulation) {
      this.accumulation.fill(0)
    }

    this.ctx.fillStyle = 'rgb(10, 10, 10)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  // Export settled particle positions for SVG
  exportSVG(screenWidth, screenHeight) {
    const scaleX = screenWidth / this.width
    const scaleY = screenHeight / this.height

    let circles = ''

    // Export settled particles as small circles
    for (const p of this.particles) {
      if (p.settled) {
        const x = p.x * scaleX
        const y = p.y * scaleY
        circles += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1" fill="white"/>\n`
      }
    }

    // Draw plate outline
    const plateCX = this.centerX * scaleX
    const plateCY = this.centerY * scaleY
    const plateR = this.plateSize * Math.min(scaleX, scaleY)

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${screenWidth} ${screenHeight}">
        <rect width="100%" height="100%" fill="#0a0a0a"/>
        <circle cx="${plateCX.toFixed(2)}" cy="${plateCY.toFixed(2)}" r="${plateR.toFixed(2)}" fill="none" stroke="white" stroke-width="1" opacity="0.3"/>
        ${circles}
      </svg>
    `.trim()
  }
}
