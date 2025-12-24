import { VisualizationMode } from './base.js'
import { pitchTempoToRGB } from '../palette.js'

// Pixel sorting mode - sorts columns by brightness on amplitude threshold
// Creates glitchy, smeared aesthetic
export class PixelSortMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'pixelSort'
    this.description = 'Pixel sorting creates glitchy smears when amplitude crosses threshold'
    this.sortThreshold = 0.4
    this.sortIntensity = 0
    this.baseImageData = null
    this.lastBeat = 0
    this.colorBands = []
  }

  init() {
    // Start with black canvas
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Initialize with some color bands based on screen position
    this.generateBaseBands()
  }

  generateBaseBands() {
    // Create horizontal color bands that will get sorted
    this.colorBands = []
    const bandHeight = 2
    for (let y = 0; y < this.height; y += bandHeight) {
      this.colorBands.push({
        y,
        height: bandHeight,
        hue: (y / this.height) * 360,
        brightness: 0.1,
        sorted: false
      })
    }
  }

  resize(width, height) {
    super.resize(width, height)
    this.generateBaseBands()
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { amplitude, bass, high, centroid } = weighted
    const { onBeat, normalizedTempo, beatIntensity } = beatInfo

    // Dynamic threshold based on sensitivity (higher sensitivity = lower threshold)
    this.sortThreshold = 0.6 - p.sensitivity * 0.4

    // Update color bands based on frequency spectrum
    const frequencies = audioFeatures.frequencies
    const bandCount = this.colorBands.length
    const freqPerBand = Math.floor(frequencies.length / bandCount)

    for (let i = 0; i < bandCount; i++) {
      const band = this.colorBands[i]
      const freqIdx = Math.min(i * freqPerBand, frequencies.length - 1)
      const magnitude = frequencies[freqIdx] / 255

      // Color from pitch position + tempo
      const pitch = i / bandCount
      const rgb = pitchTempoToRGB(pitch, normalizedTempo, magnitude)

      band.rgb = rgb
      band.brightness = magnitude
      band.active = magnitude > 0.1
    }

    // Trigger sorting on amplitude threshold or beats
    this.sortIntensity = 0
    if (amplitude > this.sortThreshold) {
      this.sortIntensity = (amplitude - this.sortThreshold) / (1 - this.sortThreshold)
    }
    if (onBeat) {
      this.sortIntensity = Math.max(this.sortIntensity, beatIntensity)
    }
  }

  draw() {
    // Get current canvas as image data for sorting
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height)
    const data = imageData.data

    // Draw new color bands on top
    for (const band of this.colorBands) {
      if (!band.active || !band.rgb) continue

      this.ctx.fillStyle = `rgba(${band.rgb.r}, ${band.rgb.g}, ${band.rgb.b}, 0.3)`

      // Slight horizontal offset based on brightness for organic feel
      const offset = (band.brightness - 0.5) * 50
      this.ctx.fillRect(offset, band.y, this.width, band.height)
    }

    // Apply pixel sorting when intensity is high (chaos amplifies effect)
    const p = this.tunerParams
    if (this.sortIntensity > 0.1) {
      this.applyPixelSort(this.sortIntensity * (0.5 + p.chaos * 0.5))
    }

    // Subtle fade (tuner decay controls)
    this.clearBackground(0.01)
  }

  applyPixelSort(intensity) {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height)
    const data = imageData.data

    // Sort random columns
    const columnsToSort = Math.floor(this.width * intensity * 0.3)

    for (let c = 0; c < columnsToSort; c++) {
      const x = Math.floor(Math.random() * this.width)
      this.sortColumn(data, x, intensity)
    }

    this.ctx.putImageData(imageData, 0, 0)
  }

  sortColumn(data, x, intensity) {
    // Extract column pixels
    const column = []
    for (let y = 0; y < this.height; y++) {
      const idx = (y * this.width + x) * 4
      column.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3],
        brightness: (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      })
    }

    // Find spans of similar brightness to sort
    const threshold = 30
    let spanStart = 0

    for (let i = 1; i <= column.length; i++) {
      const prev = column[i - 1]
      const curr = column[i]

      // End of span if brightness jumps or end of column
      if (!curr || Math.abs(curr.brightness - prev.brightness) > threshold) {
        const spanLength = i - spanStart

        // Only sort spans of reasonable length
        if (spanLength > 5 && spanLength < this.height * 0.5) {
          // Sort this span by brightness
          const span = column.slice(spanStart, i)
          span.sort((a, b) => a.brightness - b.brightness)

          // Write back
          for (let j = 0; j < span.length; j++) {
            column[spanStart + j] = span[j]
          }
        }
        spanStart = i
      }
    }

    // Write column back to image data
    for (let y = 0; y < this.height; y++) {
      const idx = (y * this.width + x) * 4
      const pixel = column[y]
      data[idx] = pixel.r
      data[idx + 1] = pixel.g
      data[idx + 2] = pixel.b
      data[idx + 3] = pixel.a
    }
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.generateBaseBands()
  }
}
