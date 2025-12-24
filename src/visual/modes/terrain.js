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
    this.numLayers = 24  // Many more layers
    this.historyLength = 200
    this.scrollSpeed = 2
    this.layerColors = []  // Track colors to ensure uniqueness
  }

  init() {
    this.layers = []
    this.layerColors = []

    for (let i = 0; i < this.numLayers; i++) {
      const depth = i / this.numLayers

      // Assign each layer a unique hue offset to ensure color variety
      // Spread across the spectrum with some randomness
      const hueOffset = (i / this.numLayers) + (Math.random() * 0.1 - 0.05)

      this.layers.push({
        heights: new Array(this.historyLength).fill(0),
        colors: new Array(this.historyLength).fill(null),
        depth,
        yBase: this.height * (0.95 - i * (0.7 / this.numLayers)),  // Spread across more of screen
        amplitude: 0.15 - depth * 0.08,  // Front layers taller
        scrollOffset: 0,
        hueOffset,  // Unique color offset for this layer
        freqBand: i % 8,  // Cycle through frequency bands
        speedVariance: 0.8 + Math.random() * 0.4  // Slight speed variation
      })
    }
  }

  resize(width, height) {
    super.resize(width, height)
    for (let i = 0; i < this.layers.length; i++) {
      const depth = i / this.numLayers
      this.layers[i].yBase = height * (0.95 - i * (0.7 / this.numLayers))
    }
  }

  // Ensure color is distinct from nearby layers
  getDistinctColor(baseHue, layerIndex, normalizedTempo, amplitude) {
    const layer = this.layers[layerIndex]

    // Shift hue based on layer's unique offset
    let hue = baseHue + layer.hueOffset

    // Ensure hue wraps correctly
    if (hue > 1) hue -= 1
    if (hue < 0) hue += 1

    // Vary saturation and lightness by depth
    const depthFactor = 1 - layer.depth * 0.5
    const satBoost = (layerIndex % 3) * 0.1  // Alternate saturation

    return pitchTempoToRGB(hue, normalizedTempo + satBoost, amplitude * depthFactor)
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { amplitude, centroid, bass, mid, high, frequencies } = weighted
    const { normalizedTempo, beatIntensity, onBeat } = beatInfo

    // More granular frequency bands for 24 layers
    const freqBands = [
      bass,
      bass * 0.8 + mid * 0.2,
      bass * 0.6 + mid * 0.4,
      bass * 0.4 + mid * 0.6,
      bass * 0.2 + mid * 0.8,
      mid,
      mid * 0.8 + high * 0.2,
      high * 0.4 + mid * 0.6,
      high * 0.6 + mid * 0.4,
      high * 0.8 + mid * 0.2,
      high,
      amplitude  // Fallback
    ]

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]
      const bandIndex = layer.freqBand % freqBands.length
      const bandValue = freqBands[bandIndex]

      // Scroll with layer-specific speed
      layer.scrollOffset += this.scrollSpeed * (0.3 + layer.depth * 0.7) * layer.speedVariance

      // Add new height value with some per-layer variation (chaos adds more variation)
      const heightVariance = 1 + Math.sin(Date.now() * 0.001 + i) * (0.1 + p.chaos * 0.3)
      const newHeight = bandValue * this.height * layer.amplitude * heightVariance
      layer.heights.push(newHeight)

      // Get distinct color for this layer (colorDrift shifts hue over time)
      const driftedCentroid = centroid + (Date.now() * 0.00001 * p.colorDrift)
      layer.colors.push(this.getDistinctColor(driftedCentroid, i, normalizedTempo, bandValue))

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
    const { heights, colors, yBase, depth, hueOffset } = layer
    const segmentWidth = this.width / (heights.length - 1)

    // Depth-based darkening - back layers darker
    const depthFade = 1 - depth * 0.7

    // Opacity varies by layer to create depth
    const layerOpacity = 0.6 + (1 - depth) * 0.35

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

    // Apply depth fade to colors
    const r = Math.floor(recentColor.r * depthFade)
    const g = Math.floor(recentColor.g * depthFade)
    const b = Math.floor(recentColor.b * depthFade)

    const gradient = this.ctx.createLinearGradient(0, yBase - this.height * 0.2, 0, yBase + 50)
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${layerOpacity})`)
    gradient.addColorStop(0.7, `rgba(${Math.floor(r * 0.5)}, ${Math.floor(g * 0.5)}, ${Math.floor(b * 0.5)}, ${layerOpacity * 0.9})`)
    gradient.addColorStop(1, `rgba(${Math.floor(r * 0.2)}, ${Math.floor(g * 0.2)}, ${Math.floor(b * 0.2)}, ${layerOpacity * 0.8})`)

    this.ctx.fillStyle = gradient
    this.ctx.fill()

    // Edge highlight on front layers for definition
    if (index < 6) {
      const highlightAlpha = (1 - index / 6) * 0.4 * depthFade
      this.ctx.strokeStyle = `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, ${highlightAlpha})`
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
