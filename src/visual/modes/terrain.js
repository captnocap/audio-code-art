import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

// Waveform rendered as scrolling mountain terrain
// Creates landscape that evolves with the music
export class TerrainMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'terrain'
    this.description = 'Scrolling mountain terrain generated from waveform'
    this.layers = []
    this.numLayers = 5
    this.historyLength = 200
    this.scrollSpeed = 2
  }

  init() {
    this.layers = []
    for (let i = 0; i < this.numLayers; i++) {
      this.layers.push({
        heights: new Array(this.historyLength).fill(0),
        colors: new Array(this.historyLength).fill(null),
        depth: i / this.numLayers,  // 0 = front, 1 = back
        yBase: this.height * (0.9 - i * 0.15),
        amplitude: 0.3 - i * 0.04,
        scrollOffset: 0
      })
    }
  }

  resize(width, height) {
    super.resize(width, height)
    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].yBase = height * (0.9 - i * 0.15)
    }
  }

  update(audioFeatures, beatInfo) {
    const { amplitude, centroid, bass, mid, high, frequencies } = audioFeatures
    const { normalizedTempo, beatIntensity, onBeat } = beatInfo

    // Sample different frequency ranges for different layers
    const freqBands = [bass, mid * 0.8 + bass * 0.2, mid, high * 0.5 + mid * 0.5, high]

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      const bandValue = freqBands[i] || amplitude

      // Scroll
      layer.scrollOffset += this.scrollSpeed * (0.5 + layer.depth * 0.5)

      // Add new height value
      const newHeight = bandValue * this.height * layer.amplitude
      layer.heights.push(newHeight)
      layer.colors.push(pitchTempoToRGB(centroid, normalizedTempo, bandValue))

      // Remove old values
      if (layer.heights.length > this.historyLength) {
        layer.heights.shift()
        layer.colors.shift()
      }
    }
  }

  draw() {
    // Clear with gradient sky
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
    skyGradient.addColorStop(0, '#0a0a0a')
    skyGradient.addColorStop(1, '#1a1a2a')
    this.ctx.fillStyle = skyGradient
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw layers back to front
    for (let i = this.layers.length - 1; i >= 0; i--) {
      this.drawLayer(this.layers[i], i)
    }
  }

  drawLayer(layer, index) {
    const { heights, colors, yBase, depth } = layer
    const segmentWidth = this.width / (heights.length - 1)

    // Depth-based darkening
    const depthFade = 1 - depth * 0.6

    this.ctx.beginPath()
    this.ctx.moveTo(0, this.height)

    // Draw mountain silhouette
    for (let i = 0; i < heights.length; i++) {
      const x = i * segmentWidth
      const y = yBase - heights[i]

      if (i === 0) {
        this.ctx.lineTo(x, y)
      } else {
        // Smooth curve between points
        const prevX = (i - 1) * segmentWidth
        const prevY = yBase - heights[i - 1]
        const cpX = (prevX + x) / 2
        this.ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2)
      }
    }

    // Close path
    this.ctx.lineTo(this.width, this.height)
    this.ctx.closePath()

    // Create gradient fill based on recent colors
    const recentColor = colors[colors.length - 1] || { r: 100, g: 100, b: 100 }
    const gradient = this.ctx.createLinearGradient(0, yBase - this.height * 0.3, 0, this.height)
    gradient.addColorStop(0, `rgba(${recentColor.r * depthFade}, ${recentColor.g * depthFade}, ${recentColor.b * depthFade}, 0.9)`)
    gradient.addColorStop(1, `rgba(${recentColor.r * depthFade * 0.3}, ${recentColor.g * depthFade * 0.3}, ${recentColor.b * depthFade * 0.3}, 0.95)`)

    this.ctx.fillStyle = gradient
    this.ctx.fill()

    // Subtle edge highlight on front layers
    if (index < 2) {
      this.ctx.strokeStyle = `rgba(${recentColor.r}, ${recentColor.g}, ${recentColor.b}, ${0.3 * depthFade})`
      this.ctx.lineWidth = 1
      this.ctx.stroke()
    }
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.init()
  }
}
