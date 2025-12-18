import { VisualizationMode } from './base.js'
import { tuner } from '../tuner.js'

// Feedback Loop Mode - Screenshot canvas, analyze as audio, feed back
// Pure recursive chaos. Will probably crash to white or black.
// The journey there is the art.

export class FeedbackMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'feedback'
    this.description = 'Canvas becomes audio input. Recursive visual chaos.'

    // Pseudo-audio extracted from canvas
    this.canvasAudio = {
      bass: 0,
      mid: 0,
      high: 0,
      amplitude: 0,
      centroid: 0.5
    }

    // Feedback state
    this.feedbackRatio = 0.5 // How much canvas-audio vs real-audio
    this.iterationCount = 0
    this.crashState = 'none' // 'none', 'approaching-white', 'approaching-black', 'oscillating'
    this.crashProgress = 0

    // Visual elements
    this.rings = []
    this.trails = []
    this.feedbackBuffer = null

    // Analysis grid
    this.gridSize = 16
    this.analysisGrid = []

    // Attractor detection
    this.attractorHistory = []
    this.attractorDetected = false
  }

  init() {
    this.rings = []
    this.trails = []
    this.iterationCount = 0
    this.crashState = 'none'
    this.crashProgress = 0
    this.attractorHistory = []

    // Initialize with some noise to seed the feedback
    this.seedCanvas()
  }

  seedCanvas() {
    // Start with random noise to give the feedback something to work with
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 50
      data[i] = noise     // R
      data[i + 1] = noise // G
      data[i + 2] = noise // B
      data[i + 3] = 255   // A
    }

    this.ctx.putImageData(imageData, 0, 0)
  }

  analyzeCanvas() {
    // Sample the canvas and convert to pseudo-frequency data
    const sampleSize = 64
    const stepX = Math.floor(this.width / sampleSize)
    const stepY = Math.floor(this.height / sampleSize)

    let totalBrightness = 0
    let lowFreq = 0  // Bottom third of image
    let midFreq = 0  // Middle third
    let highFreq = 0 // Top third
    let colorSum = 0
    let sampleCount = 0

    const imageData = this.ctx.getImageData(0, 0, this.width, this.height)
    const data = imageData.data

    // Analyze in frequency-like bands (vertical position = frequency)
    for (let y = 0; y < this.height; y += stepY) {
      for (let x = 0; x < this.width; x += stepX) {
        const i = (y * this.width + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        const brightness = (r + g + b) / 3 / 255
        totalBrightness += brightness

        // Assign to frequency band based on Y position
        const yRatio = y / this.height
        if (yRatio < 0.33) {
          lowFreq += brightness
        } else if (yRatio < 0.66) {
          midFreq += brightness
        } else {
          highFreq += brightness
        }

        // Use hue as pitch indicator
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        if (max !== min) {
          let hue
          if (max === r) hue = (g - b) / (max - min)
          else if (max === g) hue = 2 + (b - r) / (max - min)
          else hue = 4 + (r - g) / (max - min)
          hue = (hue / 6 + 1) % 1
          colorSum += hue
        }

        sampleCount++
      }
    }

    // Normalize to 0-1 range
    const bandSamples = sampleCount / 3
    this.canvasAudio = {
      bass: Math.min(1, (lowFreq / bandSamples) * 1.5),
      mid: Math.min(1, (midFreq / bandSamples) * 1.5),
      high: Math.min(1, (highFreq / bandSamples) * 1.5),
      amplitude: totalBrightness / sampleCount,
      centroid: colorSum / sampleCount
    }

    return this.canvasAudio
  }

  detectCrashState() {
    const amp = this.canvasAudio.amplitude

    // Track amplitude history for attractor detection
    this.attractorHistory.push(amp)
    if (this.attractorHistory.length > 60) {
      this.attractorHistory.shift()
    }

    // Detect approaching white (amplitude → 1)
    if (amp > 0.9) {
      this.crashState = 'approaching-white'
      this.crashProgress = (amp - 0.9) / 0.1
    }
    // Detect approaching black (amplitude → 0)
    else if (amp < 0.1) {
      this.crashState = 'approaching-black'
      this.crashProgress = (0.1 - amp) / 0.1
    }
    // Detect oscillation (attractor)
    else if (this.attractorHistory.length >= 30) {
      const recent = this.attractorHistory.slice(-30)
      const variance = this.calculateVariance(recent)
      if (variance < 0.01) {
        this.crashState = 'attractor'
        this.attractorDetected = true
      } else if (variance > 0.1) {
        this.crashState = 'oscillating'
      } else {
        this.crashState = 'stable'
      }
    }
  }

  calculateVariance(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    return arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length
  }

  update(audioFeatures, beatInfo) {
    this.iterationCount++
    const params = tuner.getAll()
    const feedbackRatio = params.feedback

    // Analyze current canvas state
    this.analyzeCanvas()
    this.detectCrashState()

    // Mix real audio with canvas-derived audio
    const mixedAudio = {
      bass: audioFeatures.bass * (1 - feedbackRatio) + this.canvasAudio.bass * feedbackRatio,
      mid: audioFeatures.mid * (1 - feedbackRatio) + this.canvasAudio.mid * feedbackRatio,
      high: audioFeatures.high * (1 - feedbackRatio) + this.canvasAudio.high * feedbackRatio,
      amplitude: audioFeatures.amplitude * (1 - feedbackRatio) + this.canvasAudio.amplitude * feedbackRatio,
      centroid: audioFeatures.centroid * (1 - feedbackRatio) + this.canvasAudio.centroid * feedbackRatio
    }

    // Spawn visual elements based on mixed audio
    if (mixedAudio.amplitude > 0.3 || beatInfo.onBeat) {
      this.spawnRing(mixedAudio)
    }

    // Add trails that persist and feed back
    if (Math.random() < mixedAudio.amplitude * 0.3) {
      this.spawnTrail(mixedAudio)
    }

    // Update elements
    this.rings = this.rings.filter(r => {
      r.radius += r.speed
      r.life--
      return r.life > 0 && r.radius < Math.max(this.width, this.height)
    })

    this.trails = this.trails.filter(t => {
      t.x += t.vx
      t.y += t.vy
      t.vx *= 0.99
      t.vy *= 0.99

      // Trails are attracted to brightness/darkness based on feedback
      if (this.canvasAudio.amplitude > 0.5) {
        t.vy -= 0.1 // Rise toward brightness
      } else {
        t.vy += 0.1 // Fall toward darkness
      }

      t.life--
      return t.life > 0
    })

    // Perturbation to prevent stable states (chaos injection)
    if (params.chaos > 0.5 && this.crashState === 'attractor') {
      // Inject noise to escape attractor
      this.injectNoise(params.chaos)
    }
  }

  spawnRing(audio) {
    const cx = this.width / 2 + (Math.random() - 0.5) * this.width * 0.5
    const cy = this.height / 2 + (Math.random() - 0.5) * this.height * 0.5

    this.rings.push({
      x: cx,
      y: cy,
      radius: 10,
      speed: 2 + audio.amplitude * 5,
      life: 60,
      maxLife: 60,
      hue: audio.centroid * 360,
      thickness: 2 + audio.bass * 10
    })

    if (this.rings.length > 30) this.rings.shift()
  }

  spawnTrail(audio) {
    this.trails.push({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: 3 + audio.amplitude * 10,
      hue: audio.centroid * 360,
      life: 100 + Math.random() * 100,
      maxLife: 100 + Math.random() * 100
    })

    if (this.trails.length > 200) this.trails.shift()
  }

  injectNoise(amount) {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height)
    const data = imageData.data

    const noisePixels = Math.floor(data.length / 4 * amount * 0.1)
    for (let n = 0; n < noisePixels; n++) {
      const i = Math.floor(Math.random() * data.length / 4) * 4
      data[i] = Math.random() * 255
      data[i + 1] = Math.random() * 255
      data[i + 2] = Math.random() * 255
    }

    this.ctx.putImageData(imageData, 0, 0)
  }

  draw() {
    const params = tuner.getAll()
    const decay = params.decay

    // Feedback decay - this is what creates the recursion
    // Less decay = more feedback = faster crash
    this.ctx.fillStyle = `rgba(10, 10, 10, ${(1 - decay) * 0.5})`
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw rings
    this.rings.forEach(r => {
      const alpha = (r.life / r.maxLife)
      this.ctx.strokeStyle = `hsla(${r.hue}, 70%, 60%, ${alpha})`
      this.ctx.lineWidth = r.thickness * alpha
      this.ctx.beginPath()
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
      this.ctx.stroke()
    })

    // Draw trails
    this.trails.forEach(t => {
      const alpha = (t.life / t.maxLife)
      this.ctx.fillStyle = `hsla(${t.hue}, 60%, 60%, ${alpha})`
      this.ctx.beginPath()
      this.ctx.arc(t.x, t.y, t.size * alpha, 0, Math.PI * 2)
      this.ctx.fill()
    })

    // Draw feedback state indicator
    this.drawStateIndicator()

    // Draw analysis visualization
    this.drawAnalysis()
  }

  drawStateIndicator() {
    const states = {
      'none': { color: 'rgba(100, 100, 100, 0.5)', label: 'INITIALIZING' },
      'approaching-white': { color: 'rgba(255, 255, 200, 0.8)', label: 'APPROACHING WHITE' },
      'approaching-black': { color: 'rgba(100, 50, 50, 0.8)', label: 'APPROACHING BLACK' },
      'oscillating': { color: 'rgba(100, 200, 255, 0.8)', label: 'OSCILLATING' },
      'attractor': { color: 'rgba(100, 255, 100, 0.8)', label: 'ATTRACTOR FOUND' },
      'stable': { color: 'rgba(200, 200, 100, 0.8)', label: 'STABLE' }
    }

    const state = states[this.crashState] || states['none']

    this.ctx.font = '12px monospace'
    this.ctx.fillStyle = state.color
    this.ctx.fillText(state.label, 20, 30)
    this.ctx.fillText(`Iteration: ${this.iterationCount}`, 20, 45)

    // Progress bar for crash states
    if (this.crashState.startsWith('approaching')) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      this.ctx.fillRect(20, 55, 150, 8)
      this.ctx.fillStyle = state.color
      this.ctx.fillRect(20, 55, 150 * this.crashProgress, 8)
      this.ctx.fillText(`${(this.crashProgress * 100).toFixed(0)}% to crash`, 20, 80)
    }
  }

  drawAnalysis() {
    // Mini visualization of canvas-derived audio
    const x = this.width - 150
    const y = 20
    const barWidth = 30
    const maxHeight = 60

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.fillRect(x - 10, y - 10, 140, maxHeight + 40)

    this.ctx.font = '9px monospace'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.fillText('CANVAS → AUDIO', x, y)

    // Bass bar
    this.ctx.fillStyle = `rgba(255, 100, 100, 0.8)`
    this.ctx.fillRect(x, y + 15, barWidth, this.canvasAudio.bass * maxHeight)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fillText('B', x + 12, y + 15 + maxHeight + 12)

    // Mid bar
    this.ctx.fillStyle = `rgba(100, 255, 100, 0.8)`
    this.ctx.fillRect(x + 40, y + 15, barWidth, this.canvasAudio.mid * maxHeight)
    this.ctx.fillText('M', x + 52, y + 15 + maxHeight + 12)

    // High bar
    this.ctx.fillStyle = `rgba(100, 100, 255, 0.8)`
    this.ctx.fillRect(x + 80, y + 15, barWidth, this.canvasAudio.high * maxHeight)
    this.ctx.fillText('H', x + 92, y + 15 + maxHeight + 12)
  }

  clear() {
    this.rings = []
    this.trails = []
    this.iterationCount = 0
    this.crashState = 'none'
    this.attractorHistory = []
    this.seedCanvas()
  }
}
