import { VisualizationMode } from './base.js'
import { tuner } from '../tuner.js'

// Time Displacement Mode - Render future, then past, then now
// Triple buffer displayed out of order. Causality violation as aesthetic.

export class TimeDisplacementMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'timedisplacement'
    this.description = 'Past, present, future rendered out of order.'

    // Triple buffer for time displacement
    this.buffers = {
      past: null,
      present: null,
      future: null
    }
    this.bufferContexts = {}

    // Audio history for "predicting" future
    this.audioHistory = []
    this.historyLength = 120 // 2 seconds at 60fps

    // Time offsets (in frames)
    this.pastOffset = 30    // Half second ago
    this.futureOffset = 15  // Quarter second "ahead"

    // Visual elements for each time layer
    this.pastElements = []
    this.presentElements = []
    this.futureElements = [] // "Predicted" based on trends

    // Time state
    this.frame = 0
    this.displayOrder = ['future', 'past', 'present'] // Wrong order!
    this.orderChangeFrame = 0
  }

  init() {
    // Create off-screen buffers
    const createBuffer = () => {
      const canvas = document.createElement('canvas')
      canvas.width = this.width
      canvas.height = this.height
      return canvas
    }

    this.buffers.past = createBuffer()
    this.buffers.present = createBuffer()
    this.buffers.future = createBuffer()

    this.bufferContexts = {
      past: this.buffers.past.getContext('2d'),
      present: this.buffers.present.getContext('2d'),
      future: this.buffers.future.getContext('2d')
    }

    this.audioHistory = []
    this.pastElements = []
    this.presentElements = []
    this.futureElements = []
    this.frame = 0
  }

  resize(width, height) {
    super.resize(width, height)
    // Recreate buffers on resize
    this.init()
  }

  update(audioFeatures, beatInfo) {
    this.frame++
    const params = tuner.getAll()

    // Store audio history
    this.audioHistory.push({ ...audioFeatures, beat: beatInfo.onBeat, frame: this.frame })
    if (this.audioHistory.length > this.historyLength) {
      this.audioHistory.shift()
    }

    // Get past audio (from history)
    const pastIndex = Math.max(0, this.audioHistory.length - 1 - this.pastOffset)
    const pastAudio = this.audioHistory[pastIndex] || audioFeatures

    // "Predict" future audio based on trends
    const futureAudio = this.predictFuture(audioFeatures, params)

    // Spawn elements in each time layer
    this.updateLayer('past', pastAudio, params)
    this.updateLayer('present', audioFeatures, params)
    this.updateLayer('future', futureAudio, params)

    // Randomly change display order (causality violation)
    if (beatInfo.onBeat && params.timeDisplacement > 0.5) {
      this.shuffleDisplayOrder()
    }

    // Age all elements
    this.ageElements()
  }

  predictFuture(current, params) {
    // "Predict" future audio based on recent trends
    // (Obviously wrong, that's the point)
    if (this.audioHistory.length < 10) return current

    const recent = this.audioHistory.slice(-10)

    // Calculate trends
    const bassTrend = this.calculateTrend(recent.map(a => a.bass))
    const midTrend = this.calculateTrend(recent.map(a => a.mid))
    const highTrend = this.calculateTrend(recent.map(a => a.high))
    const ampTrend = this.calculateTrend(recent.map(a => a.amplitude))

    // Extrapolate (badly)
    const chaos = params.chaos
    return {
      bass: Math.max(0, Math.min(1, current.bass + bassTrend * this.futureOffset + (Math.random() - 0.5) * chaos)),
      mid: Math.max(0, Math.min(1, current.mid + midTrend * this.futureOffset + (Math.random() - 0.5) * chaos)),
      high: Math.max(0, Math.min(1, current.high + highTrend * this.futureOffset + (Math.random() - 0.5) * chaos)),
      amplitude: Math.max(0, Math.min(1, current.amplitude + ampTrend * this.futureOffset)),
      centroid: current.centroid + (Math.random() - 0.5) * chaos * 0.2
    }
  }

  calculateTrend(values) {
    if (values.length < 2) return 0
    const first = values.slice(0, Math.floor(values.length / 2))
    const second = values.slice(Math.floor(values.length / 2))
    const avg1 = first.reduce((a, b) => a + b, 0) / first.length
    const avg2 = second.reduce((a, b) => a + b, 0) / second.length
    return (avg2 - avg1) / values.length
  }

  updateLayer(layer, audio, params) {
    const elements = this[`${layer}Elements`]

    // Spawn rate based on amplitude
    if (Math.random() < audio.amplitude * 0.3 * params.sensitivity) {
      const element = this.createElement(audio, layer)
      elements.push(element)
    }

    // Limit elements per layer
    while (elements.length > 100) {
      elements.shift()
    }
  }

  createElement(audio, layer) {
    const hueOffsets = { past: -60, present: 0, future: 60 }
    const baseHue = audio.centroid * 360 + (hueOffsets[layer] || 0)

    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: 5 + audio.amplitude * 20,
      hue: baseHue,
      life: 80 + Math.random() * 40,
      maxLife: 80 + Math.random() * 40,
      layer: layer,
      type: Math.random() > 0.5 ? 'circle' : 'line',
      angle: Math.random() * Math.PI * 2,
      bass: audio.bass,
      high: audio.high
    }
  }

  ageElements() {
    const layers = ['past', 'present', 'future']

    layers.forEach(layer => {
      const elements = this[`${layer}Elements`]
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i]
        el.x += el.vx
        el.y += el.vy
        el.life--

        // Time-specific behaviors
        if (layer === 'past') {
          el.size *= 0.99 // Past fades
          el.vx *= 0.98
          el.vy *= 0.98
        } else if (layer === 'future') {
          el.size *= 1.01 // Future grows (uncertainty)
          el.vx += (Math.random() - 0.5) * 0.2 // More chaotic
          el.vy += (Math.random() - 0.5) * 0.2
        }

        if (el.life <= 0) {
          elements.splice(i, 1)
        }
      }
    })
  }

  shuffleDisplayOrder() {
    const orders = [
      ['future', 'past', 'present'],    // Future first (precognition)
      ['past', 'future', 'present'],    // Past, future, then now
      ['present', 'future', 'past'],    // Now, future, past
      ['future', 'present', 'past'],    // Reverse causality
      ['past', 'present', 'future'],    // "Normal" (boring)
      ['present', 'past', 'future'],    // Present echoes to past
    ]
    this.displayOrder = orders[Math.floor(Math.random() * orders.length)]
    this.orderChangeFrame = this.frame
  }

  draw() {
    const params = tuner.getAll()

    // Clear main canvas
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Render each buffer
    this.renderBuffer('past', params)
    this.renderBuffer('present', params)
    this.renderBuffer('future', params)

    // Composite buffers in WRONG order
    this.compositeBuffers(params)

    // Draw time indicator
    this.drawTimeIndicator()
  }

  renderBuffer(layer, params) {
    const ctx = this.bufferContexts[layer]
    const elements = this[`${layer}Elements`]
    const decay = params.decay

    // Layer-specific background
    const bgAlpha = 1 - decay * 0.8
    const bgColors = {
      past: `rgba(10, 5, 15, ${bgAlpha})`,
      present: `rgba(10, 10, 10, ${bgAlpha})`,
      future: `rgba(15, 10, 5, ${bgAlpha})`
    }

    ctx.fillStyle = bgColors[layer]
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw elements
    elements.forEach(el => {
      const alpha = el.life / el.maxLife

      if (el.type === 'circle') {
        ctx.fillStyle = `hsla(${el.hue}, 70%, 60%, ${alpha * 0.8})`
        ctx.beginPath()
        ctx.arc(el.x, el.y, el.size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.strokeStyle = `hsla(${el.hue}, 70%, 60%, ${alpha * 0.8})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(el.x, el.y)
        ctx.lineTo(
          el.x + Math.cos(el.angle) * el.size * 3,
          el.y + Math.sin(el.angle) * el.size * 3
        )
        ctx.stroke()
      }
    })

    // Layer label
    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    const labels = { past: 't-30', present: 't=0', future: 't+15' }
    ctx.fillText(labels[layer], 10, 20)
  }

  compositeBuffers(params) {
    const displacement = params.timeDisplacement

    // Draw buffers in current (wrong) order with displacement effects
    this.displayOrder.forEach((layer, i) => {
      const buffer = this.buffers[layer]

      // Position offset based on layer (chromatic aberration style)
      const offsets = {
        past: { x: -5 * displacement, y: 0 },
        present: { x: 0, y: 0 },
        future: { x: 5 * displacement, y: 0 }
      }
      const offset = offsets[layer]

      // Blend mode based on position in order
      const blendModes = ['screen', 'lighten', 'normal']
      this.ctx.globalCompositeOperation = blendModes[i]

      // Opacity - first layer stronger, others blend
      this.ctx.globalAlpha = i === 0 ? 1 : 0.5 + displacement * 0.3

      this.ctx.drawImage(buffer, offset.x, offset.y)
    })

    // Reset
    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.globalAlpha = 1
  }

  drawTimeIndicator() {
    const y = this.height - 60
    const barWidth = 200
    const barX = (this.width - barWidth) / 2

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.fillRect(barX - 10, y - 10, barWidth + 20, 50)

    // Timeline
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(barX, y + 15)
    this.ctx.lineTo(barX + barWidth, y + 15)
    this.ctx.stroke()

    // Time markers
    const markers = [
      { pos: 0, label: 'PAST', color: '#a0a' },
      { pos: 0.5, label: 'NOW', color: '#fff' },
      { pos: 1, label: 'FUTURE', color: '#aa0' }
    ]

    markers.forEach(m => {
      const x = barX + m.pos * barWidth
      this.ctx.fillStyle = m.color
      this.ctx.beginPath()
      this.ctx.arc(x, y + 15, 5, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.font = '9px monospace'
      this.ctx.fillText(m.label, x - 15, y + 35)
    })

    // Current display order
    this.ctx.fillStyle = 'rgba(255, 200, 100, 0.8)'
    this.ctx.font = '10px monospace'
    this.ctx.fillText(`ORDER: ${this.displayOrder.join(' → ')}`, barX, y - 2)

    // Causality warning
    if (this.displayOrder[0] === 'future') {
      this.ctx.fillStyle = 'rgba(255, 50, 50, 0.8)'
      this.ctx.fillText('⚠ CAUSALITY VIOLATION', barX + barWidth - 120, y - 2)
    }
  }

  clear() {
    this.audioHistory = []
    this.pastElements = []
    this.presentElements = []
    this.futureElements = []

    // Clear buffers
    Object.values(this.bufferContexts).forEach(ctx => {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, this.width, this.height)
    })
  }
}
