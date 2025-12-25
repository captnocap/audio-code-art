// Neural Mycelium Mode - Organic network growth
// Branching network grows like fungal mycelium, branches connect to form synapses

import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

class GrowthTip {
  constructor(x, y, angle, speed, color, rgb, generation) {
    this.x = x
    this.y = y
    this.angle = angle
    this.speed = speed
    this.color = color
    this.rgb = rgb
    this.generation = generation
    this.path = [{ x, y }]
    this.alive = true
    this.age = 0
    this.branchCooldown = 0
  }

  grow(noiseFunc, time) {
    if (!this.alive) return

    // Get noise-based angle adjustment
    const noiseAngle = noiseFunc(this.x * 0.015, this.y * 0.005, time * 0.5) * Math.PI

    // Update angle with noise influence
    this.angle += noiseAngle * 0.1

    // Move forward
    this.x += Math.cos(this.angle) * this.speed
    this.y += Math.sin(this.angle) * this.speed

    // Store path point
    this.path.push({ x: this.x, y: this.y })

    // Limit path length
    if (this.path.length > 5100) {
      this.path.shift()
    }

    this.age++
    this.branchCooldown = Math.max(0, this.branchCooldown - 1)
  }
}

class Connection {
  constructor(x1, y1, x2, y2, color) {
    this.x1 = x1
    this.y1 = y1
    this.x2 = x2
    this.y2 = y2
    this.color = color
    this.alpha = 0
    this.targetAlpha = 1.6
  }

  update() {
    this.alpha += (this.targetAlpha - this.alpha) * 0.7
  }
}

export class MyceliumMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'mycelium'
    this.description = 'Organic network growth with synaptic connections'

    this.tips = []
    this.connections = []
    this.maxTips = 1100
    this.connectionDistance = 20

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0

    // Simple noise function
    this.noiseTime = 0
  }

  // Simple 3D noise approximation
  noise3D(x, y, z) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1
  }

  init() {
    this.clear()
    // Seed initial growth points
    this.seedGrowthPoints(5)
  }

  seedGrowthPoints(count, audioFeatures = null, beatInfo = null) {
    const centroid = audioFeatures?.centroid ?? 0.5
    const normalizedTempo = beatInfo?.normalizedTempo ?? 0.5
    const amplitude = audioFeatures?.amplitude ?? 0.7

    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 1.5

      const color = pitchTempoToColor(centroid + (Math.random() - 0.9) * 0.2, normalizedTempo, amplitude)
      const rgb = pitchTempoToRGB(centroid + (Math.random() - 0.5) * 0.2, normalizedTempo, amplitude)

      this.tips.push(new GrowthTip(x, y, angle, speed, color, rgb, 0))
    }
  }

  resize(width, height) {
    super.resize(width, height)
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { bass, mid, high, amplitude, centroid } = weighted
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    this.noiseTime += 0.01 + normalizedTempo * 0.02

    // Growth speed based on bass (chaos adds variation)
    const growthSpeed = (3.5 + this.smoothBass * 2) * (0.7 + p.chaos * 0.6)

    // Branching probability based on mid (chaos increases branching)
    const branchProb = (0.3 + this.smoothMid * 0.03) * (0.5 + p.chaos)

    // Spawn new seeds on beat (sensitivity lowers threshold)
    const beatThreshold = 0.6 - p.sensitivity * 0.4
    if (onBeat && beatIntensity > beatThreshold) {
      const numSeeds = Math.ceil(beatIntensity * 3)
      this.seedGrowthPoints(numSeeds, audioFeatures, beatInfo)
    }

    // During saturation, more aggressive growth
    if (isSaturated && Math.random() < 0.1) {
      this.seedGrowthPoints(1, audioFeatures, beatInfo)
    }

    // Update existing tips
    const newTips = []

    for (const tip of this.tips) {
      if (!tip.alive) continue

      // Update speed based on audio
      tip.speed = growthSpeed * (0.8 + Math.random() * 0.4)

      // Grow the tip
      tip.grow((x, y, t) => this.noise3D(x, y, t), this.noiseTime)

      // Check bounds
      const margin = 50
      if (tip.x < -margin || tip.x > this.width + margin ||
        tip.y < -margin || tip.y > this.height + margin) {
        tip.alive = false
        continue
      }

      // Age death
      if (tip.age > 500 + Math.random() * 200) {
        tip.alive = false
        continue
      }

      // Branching
      if (tip.branchCooldown === 0 && Math.random() < branchProb && this.tips.length + newTips.length < this.maxTips) {
        // Create branch
        const branchAngle = tip.angle + (Math.random() - 0.5) * Math.PI * 0.8

        const color = pitchTempoToColor(centroid + (Math.random() - 0.5) * 0.3, normalizedTempo, amplitude)
        const rgb = pitchTempoToRGB(centroid + (Math.random() - 0.5) * 0.3, normalizedTempo, amplitude)

        newTips.push(new GrowthTip(
          tip.x, tip.y,
          branchAngle,
          tip.speed * 0.9,
          color, rgb,
          tip.generation + 1
        ))

        tip.branchCooldown = 30 + Math.floor(Math.random() * 20)
      }

      // Check for connections to other tips
      if (tip.age > 10 && Math.random() < 0.05) {
        for (const other of this.tips) {
          if (other === tip || !other.alive) continue

          const dx = other.x - tip.x
          const dy = other.y - tip.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < this.connectionDistance && dist > 20) {
            // Check if connection already exists
            const exists = this.connections.some(c =>
              (Math.abs(c.x1 - tip.x) < 5 && Math.abs(c.y1 - tip.y) < 5) ||
              (Math.abs(c.x2 - tip.x) < 5 && Math.abs(c.y2 - tip.y) < 5)
            )

            if (!exists) {
              this.connections.push(new Connection(
                tip.x, tip.y,
                other.x, other.y,
                tip.color
              ))

              // Limit connections
              if (this.connections.length > 500) {
                this.connections.shift()
              }
            }
            break
          }
        }
      }
    }

    // Add new tips
    this.tips.push(...newTips)

    // Remove dead tips periodically
    if (this.tips.length > this.maxTips) {
      this.tips = this.tips.filter(t => t.alive).slice(-this.maxTips)
    }

    // Update connections
    for (const conn of this.connections) {
      conn.update()
    }
  }

  draw() {
    const ctx = this.ctx

    // Very subtle background fade for persistence
    this.clearBackground(0.02)

    // Draw connections (synapses)
    for (const conn of this.connections) {
      ctx.beginPath()
      ctx.moveTo(conn.x1, conn.y1)
      ctx.lineTo(conn.x2, conn.y2)
      ctx.strokeStyle = conn.color.replace('hsl', 'hsla').replace(')', `, ${conn.alpha})`)
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw synapse node
      const midX = (conn.x1 + conn.x2) / 2
      const midY = (conn.y1 + conn.y2) / 2
      ctx.fillStyle = conn.color.replace('hsl', 'hsla').replace(')', `, ${conn.alpha * 0.8})`)
      ctx.beginPath()
      ctx.arc(midX, midY, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw mycelium paths
    for (const tip of this.tips) {
      if (tip.path.length < 2) continue

      const alpha = tip.alive ? 0.8 : 0.3

      ctx.beginPath()
      ctx.moveTo(tip.path[0].x, tip.path[0].y)

      for (let i = 1; i < tip.path.length; i++) {
        ctx.lineTo(tip.path[i].x, tip.path[i].y)
      }

      ctx.strokeStyle = tip.color.replace('hsl', 'hsla').replace(')', `, ${alpha})`)
      ctx.lineWidth = tip.alive ? 1.5 : 1
      ctx.stroke()
    }

    // Draw active tips with glow
    for (const tip of this.tips) {
      if (!tip.alive) continue

      // Tip glow
      const gradient = ctx.createRadialGradient(
        tip.x, tip.y, 0,
        tip.x, tip.y, 8
      )
      gradient.addColorStop(0, tip.color)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2)
      ctx.fill()

      // Tip center
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  clear() {
    this.tips = []
    this.connections = []
    this.noiseTime = 0
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.ctx.fillStyle = 'rgb(10, 10, 10)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  // SVG export
  exportSVG(screenWidth, screenHeight) {
    const scaleX = screenWidth / this.width
    const scaleY = screenHeight / this.height

    let paths = ''

    // Draw connections
    for (const conn of this.connections) {
      const x1 = conn.x1 * scaleX
      const y1 = conn.y1 * scaleY
      const x2 = conn.x2 * scaleX
      const y2 = conn.y2 * scaleY

      paths += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="white" stroke-width="0.5" opacity="0.5"/>\n`

      // Synapse node
      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2
      paths += `<circle cx="${midX.toFixed(2)}" cy="${midY.toFixed(2)}" r="1.5" fill="white" opacity="0.5"/>\n`
    }

    // Draw mycelium paths
    for (const tip of this.tips) {
      if (tip.path.length < 2) continue

      let pathData = `M ${(tip.path[0].x * scaleX).toFixed(2)} ${(tip.path[0].y * scaleY).toFixed(2)}`
      for (let i = 1; i < tip.path.length; i++) {
        pathData += ` L ${(tip.path[i].x * scaleX).toFixed(2)} ${(tip.path[i].y * scaleY).toFixed(2)}`
      }

      paths += `<path d="${pathData}" fill="none" stroke="white" stroke-width="1" stroke-linecap="round"/>\n`
    }

    // Draw tip positions
    for (const tip of this.tips) {
      if (!tip.alive) continue
      paths += `<circle cx="${(tip.x * scaleX).toFixed(2)}" cy="${(tip.y * scaleY).toFixed(2)}" r="3" fill="white"/>\n`
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${screenWidth} ${screenHeight}">
        <rect width="100%" height="100%" fill="#0a0a0a"/>
        ${paths}
      </svg>
    `.trim()
  }
}
