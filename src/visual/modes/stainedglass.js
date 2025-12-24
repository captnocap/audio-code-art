// Stained Glass Mosaic Mode - Delaunay triangulation with colored fills
// Vertices oscillate with FFT, colors ripple through cells like medieval rose windows

import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

class Vertex {
  constructor(x, y, homeX, homeY) {
    this.x = x
    this.y = y
    this.homeX = homeX
    this.homeY = homeY
    this.vx = 0
    this.vy = 0
  }

  update(returnStrength) {
    // Spring back to home
    const dx = this.homeX - this.x
    const dy = this.homeY - this.y

    this.vx += dx * returnStrength
    this.vy += dy * returnStrength

    // Damping
    this.vx *= 0.9
    this.vy *= 0.9

    this.x += this.vx
    this.y += this.vy
  }

  disturb(fx, fy) {
    this.vx += fx
    this.vy += fy
  }
}

class Triangle {
  constructor(v0, v1, v2) {
    this.vertices = [v0, v1, v2]
    this.color = { h: 0, s: 50, l: 50 }
    this.targetColor = { h: 0, s: 50, l: 50 }
  }

  get centroid() {
    const [v0, v1, v2] = this.vertices
    return {
      x: (v0.x + v1.x + v2.x) / 3,
      y: (v0.y + v1.y + v2.y) / 3
    }
  }

  updateColor(speed = 0.1) {
    this.color.h += (this.targetColor.h - this.color.h) * speed
    this.color.s += (this.targetColor.s - this.color.s) * speed
    this.color.l += (this.targetColor.l - this.color.l) * speed
  }
}

export class StainedGlassMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'stainedglass'
    this.description = 'Delaunay triangulation with rippling colors'

    this.vertices = []
    this.triangles = []

    // Color wave system
    this.colorWaves = []

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
  }

  init() {
    this.clear()
    this.createMesh()
  }

  createMesh() {
    this.vertices = []
    this.triangles = []

    // Create grid of vertices with some randomness
    const spacing = 60
    const jitter = 20

    const cols = Math.ceil(this.width / spacing) + 2
    const rows = Math.ceil(this.height / spacing) + 2

    // Create vertices
    for (let y = -1; y <= rows; y++) {
      for (let x = -1; x <= cols; x++) {
        const baseX = x * spacing
        const baseY = y * spacing

        // Add jitter except for edge vertices
        const isEdge = x === -1 || y === -1 || x === cols || y === rows
        const jx = isEdge ? 0 : (Math.random() - 0.5) * jitter * 2
        const jy = isEdge ? 0 : (Math.random() - 0.5) * jitter * 2

        this.vertices.push(new Vertex(
          baseX + jx,
          baseY + jy,
          baseX + jx,
          baseY + jy
        ))
      }
    }

    // Triangulate using simple Delaunay-like approach
    // For simplicity, we'll use a regular grid triangulation
    const gridCols = cols + 2

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols + 1; x++) {
        const i0 = y * gridCols + x
        const i1 = i0 + 1
        const i2 = i0 + gridCols
        const i3 = i2 + 1

        if (i3 < this.vertices.length) {
          // Two triangles per quad
          this.triangles.push(new Triangle(
            this.vertices[i0],
            this.vertices[i1],
            this.vertices[i2]
          ))

          this.triangles.push(new Triangle(
            this.vertices[i1],
            this.vertices[i3],
            this.vertices[i2]
          ))
        }
      }
    }

    // Initialize triangle colors
    for (const tri of this.triangles) {
      const c = tri.centroid
      const hue = (c.x / this.width * 180 + c.y / this.height * 180) % 360
      tri.color = { h: hue, s: 60, l: 40 }
      tri.targetColor = { ...tri.color }
    }
  }

  resize(width, height) {
    super.resize(width, height)
    this.init()
  }

  // Spawn a color wave from a point
  spawnColorWave(x, y, hue, saturation, lightness) {
    this.colorWaves.push({
      x, y,
      radius: 0,
      speed: 8,
      hue,
      saturation,
      lightness,
      maxRadius: Math.max(this.width, this.height) * 1.5
    })

    // Limit waves
    if (this.colorWaves.length > 10) {
      this.colorWaves.shift()
    }
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { bass, mid, high, amplitude, centroid, frequencies } = weighted
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    // Vertex disturbance based on FFT
    const numFreqs = Math.min(frequencies.length, this.vertices.length)
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i]

      // Map vertex to frequency bin
      const freqIdx = Math.floor((i / this.vertices.length) * numFreqs)
      const freqMag = frequencies[freqIdx] / 255

      // Disturb based on frequency magnitude
      const angle = Math.atan2(v.y - this.height / 2, v.x - this.width / 2)
      const force = freqMag * this.smoothBass * 3

      v.disturb(
        Math.cos(angle) * force,
        Math.sin(angle) * force
      )
    }

    // High frequency adds random jitter
    if (this.smoothHigh > 0.3) {
      const jitter = (this.smoothHigh - 0.3) * 5
      for (const v of this.vertices) {
        v.disturb(
          (Math.random() - 0.5) * jitter,
          (Math.random() - 0.5) * jitter
        )
      }
    }

    // Return strength based on mid (higher mid = more stable)
    const returnStrength = 0.05 + this.smoothMid * 0.1

    // Update vertices
    for (const v of this.vertices) {
      v.update(returnStrength)
    }

    // Spawn color wave on beat
    if (onBeat && beatIntensity > 0.3) {
      // Spawn from random position or center
      const spawnX = Math.random() < 0.5 ? this.width / 2 : Math.random() * this.width
      const spawnY = Math.random() < 0.5 ? this.height / 2 : Math.random() * this.height

      // Color based on audio
      const hue = centroid * 360
      const saturation = 50 + beatIntensity * 40
      const lightness = 30 + amplitude * 40

      this.spawnColorWave(spawnX, spawnY, hue, saturation, lightness)
    }

    // Update color waves
    for (let i = this.colorWaves.length - 1; i >= 0; i--) {
      const wave = this.colorWaves[i]
      wave.radius += wave.speed * (1 + normalizedTempo)

      if (wave.radius > wave.maxRadius) {
        this.colorWaves.splice(i, 1)
        continue
      }

      // Affect triangles within wave radius
      const waveWidth = 100
      for (const tri of this.triangles) {
        const c = tri.centroid
        const dx = c.x - wave.x
        const dy = c.y - wave.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Check if triangle is within wave band
        if (dist > wave.radius - waveWidth && dist < wave.radius + waveWidth) {
          const intensity = 1 - Math.abs(dist - wave.radius) / waveWidth
          const fadeOut = 1 - wave.radius / wave.maxRadius

          // Blend toward wave color
          tri.targetColor.h = wave.hue + (Math.random() - 0.5) * 20
          tri.targetColor.s = wave.saturation * intensity * fadeOut + tri.targetColor.s * (1 - intensity * fadeOut)
          tri.targetColor.l = wave.lightness * intensity * fadeOut + tri.targetColor.l * (1 - intensity * fadeOut)
        }
      }
    }

    // Update triangle colors
    const colorSpeed = 0.05 + normalizedTempo * 0.1
    for (const tri of this.triangles) {
      tri.updateColor(colorSpeed)
    }
  }

  draw() {
    const ctx = this.ctx

    // Draw triangles with colored fills
    for (const tri of this.triangles) {
      const [v0, v1, v2] = tri.vertices

      ctx.beginPath()
      ctx.moveTo(v0.x, v0.y)
      ctx.lineTo(v1.x, v1.y)
      ctx.lineTo(v2.x, v2.y)
      ctx.closePath()

      // Fill with HSL color
      const h = ((tri.color.h % 360) + 360) % 360
      ctx.fillStyle = `hsl(${h}, ${tri.color.s}%, ${tri.color.l}%)`
      ctx.fill()
    }

    // Draw "leading" (dark edges)
    ctx.strokeStyle = 'rgba(10, 10, 10, 0.9)'
    ctx.lineWidth = 3

    for (const tri of this.triangles) {
      const [v0, v1, v2] = tri.vertices

      ctx.beginPath()
      ctx.moveTo(v0.x, v0.y)
      ctx.lineTo(v1.x, v1.y)
      ctx.lineTo(v2.x, v2.y)
      ctx.closePath()
      ctx.stroke()
    }

    // Draw vertex points as small circles (like solder joints)
    ctx.fillStyle = 'rgba(30, 30, 30, 0.8)'
    for (const v of this.vertices) {
      ctx.beginPath()
      ctx.arc(v.x, v.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  clear() {
    this.colorWaves = []
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

    // Draw filled triangles
    for (const tri of this.triangles) {
      const [v0, v1, v2] = tri.vertices

      const x0 = v0.x * scaleX
      const y0 = v0.y * scaleY
      const x1 = v1.x * scaleX
      const y1 = v1.y * scaleY
      const x2 = v2.x * scaleX
      const y2 = v2.y * scaleY

      const h = ((tri.color.h % 360) + 360) % 360

      paths += `<polygon points="${x0.toFixed(2)},${y0.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}" fill="hsl(${h}, ${tri.color.s}%, ${tri.color.l}%)" stroke="#0a0a0a" stroke-width="2"/>\n`
    }

    // Draw vertices
    for (const v of this.vertices) {
      const x = v.x * scaleX
      const y = v.y * scaleY
      paths += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2" fill="#1e1e1e"/>\n`
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${screenWidth} ${screenHeight}">
        <rect width="100%" height="100%" fill="#0a0a0a"/>
        ${paths}
      </svg>
    `.trim()
  }
}
