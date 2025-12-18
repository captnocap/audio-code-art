import { VisualizationMode } from './base.js'
import { tuner } from '../tuner.js'

// Anti-Visualization Mode - Sound destroys, silence preserves
// Start with texture/image. Music erases. What remains is the negative space portrait.

export class AntiVizMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'antiviz'
    this.description = 'Sound destroys. Silence preserves. Negative space portrait.'

    // Starting image/texture
    this.baseImage = null
    this.baseImageData = null

    // Destruction tracking
    this.destructionMap = null // Float array tracking how much each pixel has been destroyed
    this.totalDestruction = 0

    // Erosion state
    this.erosionPoints = []
    this.erosionTrails = []

    // Stats
    this.pixelsDestroyed = 0
    this.silenceTime = 0
    this.loudTime = 0
  }

  init() {
    // Create base texture
    this.createBaseTexture()

    // Initialize destruction map
    this.destructionMap = new Float32Array(this.width * this.height)
    this.totalDestruction = 0
    this.erosionPoints = []
    this.erosionTrails = []
    this.pixelsDestroyed = 0
    this.silenceTime = 0
    this.loudTime = 0
  }

  createBaseTexture() {
    // Generate an interesting starting texture
    const imageData = this.ctx.createImageData(this.width, this.height)
    const data = imageData.data
    const params = tuner.getAll()

    // Create layered noise texture
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4

        // Multiple noise layers
        const noise1 = this.noise(x * 0.01, y * 0.01) // Large scale
        const noise2 = this.noise(x * 0.05, y * 0.05) // Medium scale
        const noise3 = this.noise(x * 0.15, y * 0.15) // Fine detail

        // Combine noise layers
        const combined = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2)

        // Create gradient influence (center brighter)
        const cx = x / this.width - 0.5
        const cy = y / this.height - 0.5
        const gradient = 1 - Math.sqrt(cx * cx + cy * cy) * 1.2

        // Final value
        const value = Math.max(0, Math.min(1, combined * gradient + 0.2))

        // Color based on position and noise
        const hue = (noise1 * 60 + y / this.height * 40) % 360
        const sat = 0.3 + noise2 * 0.4
        const light = 0.3 + value * 0.5

        // Convert HSL to RGB
        const rgb = this.hslToRgb(hue / 360, sat, light)

        data[i] = rgb.r
        data[i + 1] = rgb.g
        data[i + 2] = rgb.b
        data[i + 3] = 255
      }
    }

    this.ctx.putImageData(imageData, 0, 0)
    this.baseImageData = this.ctx.getImageData(0, 0, this.width, this.height)
  }

  // Simple value noise
  noise(x, y) {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi

    const hash = (x, y) => {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
      return n - Math.floor(n)
    }

    const a = hash(xi, yi)
    const b = hash(xi + 1, yi)
    const c = hash(xi, yi + 1)
    const d = hash(xi + 1, yi + 1)

    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)

    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
  }

  hslToRgb(h, s, l) {
    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
  }

  update(audioFeatures, beatInfo) {
    const params = tuner.getAll()
    const { bass, mid, high, amplitude } = audioFeatures
    const destruction = params.destruction

    // Track silence vs loud time
    if (amplitude < 0.1) {
      this.silenceTime++
    } else {
      this.loudTime++
    }

    // ANTI-VISUALIZATION: Sound destroys!

    // Bass erodes from center outward
    if (bass > 0.2) {
      const strength = bass * destruction
      this.erodeFromCenter(strength, params)
    }

    // Treble eats edges
    if (high > 0.2) {
      const strength = high * destruction
      this.erodeEdges(strength, params)
    }

    // Mids dissolve mid-tones (brightness-based)
    if (mid > 0.2) {
      const strength = mid * destruction
      this.dissolveMidtones(strength, params)
    }

    // Beats cause burst destruction
    if (beatInfo.onBeat && beatInfo.beatIntensity > 0.3) {
      this.burstDestruction(beatInfo.beatIntensity, params)
    }

    // Update erosion trails
    this.erosionTrails = this.erosionTrails.filter(t => {
      t.life--
      t.x += t.vx
      t.y += t.vy
      t.vx *= 0.98
      t.vy *= 0.98

      // Trail erodes as it moves
      if (t.life > 0) {
        this.erodePoint(Math.floor(t.x), Math.floor(t.y), t.strength * 0.5, params)
      }

      return t.life > 0
    })

    // Clamp destruction values
    for (let i = 0; i < this.destructionMap.length; i++) {
      this.destructionMap[i] = Math.min(1, this.destructionMap[i])
    }
  }

  erodeFromCenter(strength, params) {
    const cx = this.width / 2
    const cy = this.height / 2
    const count = Math.floor(strength * 50)

    for (let i = 0; i < count; i++) {
      // Radial distribution from center
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * Math.min(this.width, this.height) * 0.4 * strength
      const x = Math.floor(cx + Math.cos(angle) * dist)
      const y = Math.floor(cy + Math.sin(angle) * dist)

      this.erodePoint(x, y, strength, params)

      // Sometimes spawn erosion trail
      if (Math.random() < 0.1) {
        this.erosionTrails.push({
          x, y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          strength: strength * 0.3,
          life: 30
        })
      }
    }
  }

  erodeEdges(strength, params) {
    const count = Math.floor(strength * 40)

    for (let i = 0; i < count; i++) {
      // Pick random edge
      const edge = Math.floor(Math.random() * 4)
      let x, y

      switch (edge) {
        case 0: // Top
          x = Math.floor(Math.random() * this.width)
          y = Math.floor(Math.random() * 50)
          break
        case 1: // Right
          x = this.width - Math.floor(Math.random() * 50)
          y = Math.floor(Math.random() * this.height)
          break
        case 2: // Bottom
          x = Math.floor(Math.random() * this.width)
          y = this.height - Math.floor(Math.random() * 50)
          break
        case 3: // Left
          x = Math.floor(Math.random() * 50)
          y = Math.floor(Math.random() * this.height)
          break
      }

      this.erodePoint(x, y, strength, params)
    }
  }

  dissolveMidtones(strength, params) {
    // Target pixels with mid-range brightness
    const count = Math.floor(strength * 30)
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height)
    const data = imageData.data

    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * this.width)
      const y = Math.floor(Math.random() * this.height)
      const idx = (y * this.width + x) * 4

      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 / 255

      // Target mid-tones (0.3 - 0.7 brightness)
      if (brightness > 0.3 && brightness < 0.7) {
        this.erodePoint(x, y, strength * 1.5, params)
      }
    }
  }

  burstDestruction(intensity, params) {
    // Random burst location
    const bx = Math.random() * this.width
    const by = Math.random() * this.height
    const radius = 30 + intensity * 100

    const points = Math.floor(intensity * 100)
    for (let i = 0; i < points; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * radius
      const x = Math.floor(bx + Math.cos(angle) * dist)
      const y = Math.floor(by + Math.sin(angle) * dist)

      this.erodePoint(x, y, intensity, params)
    }

    // Spawn outward trails
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      this.erosionTrails.push({
        x: bx,
        y: by,
        vx: Math.cos(angle) * 5 * intensity,
        vy: Math.sin(angle) * 5 * intensity,
        strength: intensity * 0.5,
        life: 50
      })
    }
  }

  erodePoint(x, y, strength, params) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return

    const idx = y * this.width + x
    const currentDestruction = this.destructionMap[idx]

    if (currentDestruction < 1) {
      // Increase destruction at this point
      const increase = strength * 0.1 * params.destruction
      this.destructionMap[idx] = Math.min(1, currentDestruction + increase)

      if (this.destructionMap[idx] >= 1 && currentDestruction < 1) {
        this.pixelsDestroyed++
      }

      // Also affect neighbors (blur erosion)
      const neighborStrength = increase * 0.3
      if (x > 0) this.destructionMap[idx - 1] = Math.min(1, this.destructionMap[idx - 1] + neighborStrength)
      if (x < this.width - 1) this.destructionMap[idx + 1] = Math.min(1, this.destructionMap[idx + 1] + neighborStrength)
      if (y > 0) this.destructionMap[idx - this.width] = Math.min(1, this.destructionMap[idx - this.width] + neighborStrength)
      if (y < this.height - 1) this.destructionMap[idx + this.width] = Math.min(1, this.destructionMap[idx + this.width] + neighborStrength)
    }
  }

  draw() {
    if (!this.baseImageData) return

    // Create output image by applying destruction map
    const outputData = this.ctx.createImageData(this.width, this.height)
    const output = outputData.data
    const base = this.baseImageData.data

    this.totalDestruction = 0

    for (let i = 0; i < this.destructionMap.length; i++) {
      const destruction = this.destructionMap[i]
      this.totalDestruction += destruction

      const pi = i * 4
      const alpha = 1 - destruction

      // Fade to black based on destruction
      output[pi] = base[pi] * alpha
      output[pi + 1] = base[pi + 1] * alpha
      output[pi + 2] = base[pi + 2] * alpha
      output[pi + 3] = 255

      // Add slight red tint to recently destroyed areas
      if (destruction > 0.5 && destruction < 1) {
        output[pi] = Math.min(255, output[pi] + (destruction - 0.5) * 50)
      }
    }

    this.ctx.putImageData(outputData, 0, 0)

    // Draw erosion trails
    this.drawErosionTrails()

    // Draw stats
    this.drawStats()
  }

  drawErosionTrails() {
    this.erosionTrails.forEach(t => {
      const alpha = t.life / 30
      this.ctx.fillStyle = `rgba(255, 50, 50, ${alpha * 0.5})`
      this.ctx.beginPath()
      this.ctx.arc(t.x, t.y, 3 + t.strength * 5, 0, Math.PI * 2)
      this.ctx.fill()
    })
  }

  drawStats() {
    const totalPixels = this.width * this.height
    const destructionPercent = (this.totalDestruction / totalPixels * 100).toFixed(1)
    const silencePercent = this.silenceTime / (this.silenceTime + this.loudTime + 1) * 100

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(15, 15, 200, 90)

    this.ctx.font = '11px monospace'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.fillText('ANTI-VISUALIZATION', 25, 35)

    this.ctx.fillStyle = 'rgba(255, 100, 100, 0.8)'
    this.ctx.fillText(`Destroyed: ${destructionPercent}%`, 25, 55)

    // Destruction bar
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    this.ctx.fillRect(25, 65, 150, 8)
    this.ctx.fillStyle = 'rgba(255, 50, 50, 0.8)'
    this.ctx.fillRect(25, 65, 150 * (this.totalDestruction / totalPixels), 8)

    this.ctx.fillStyle = 'rgba(100, 255, 100, 0.8)'
    this.ctx.fillText(`Silence: ${silencePercent.toFixed(0)}%`, 25, 95)

    // Message
    if (this.totalDestruction / totalPixels > 0.9) {
      this.ctx.fillStyle = 'rgba(255, 200, 100, 0.9)'
      this.ctx.font = '14px monospace'
      this.ctx.fillText('THE SONG\'S NEGATIVE SPACE', this.width / 2 - 100, this.height / 2)
    }
  }

  clear() {
    this.createBaseTexture()
    this.destructionMap = new Float32Array(this.width * this.height)
    this.totalDestruction = 0
    this.erosionTrails = []
    this.pixelsDestroyed = 0
    this.silenceTime = 0
    this.loudTime = 0
  }
}
