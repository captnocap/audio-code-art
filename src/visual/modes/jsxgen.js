import { VisualizationMode } from './base.js'
import { pitchTempoToRGB } from '../palette.js'

// Audio → JSX Component Generator
// Turns songs into React component libraries
export class JSXGenMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'jsxgen'
    this.description = 'Generate React components from audio - songs become design systems'

    // Component tree being built
    this.componentTree = null
    this.components = []
    this.currentDepth = 0
    this.maxDepth = 5

    // Accumulated audio signature
    this.signature = {
      avgAmplitude: 0,
      avgPitch: 0.5,
      avgTempo: 0.5,
      beatCount: 0,
      peakMoments: [],
      dominantFreq: 'mid',
      energy: 'medium'
    }

    // Frame counter for sampling
    this.frameCount = 0
    this.sampleCount = 0

    // Generated code display
    this.displayCode = ''
    this.codeLines = []

    // Component palette based on audio
    this.palette = {
      primary: '#fff',
      secondary: '#888',
      accent: '#f0f',
      background: '#0a0a0a'
    }
  }

  init() {
    this.componentTree = null
    this.components = []
    this.codeLines = []
    this.frameCount = 0
    this.sampleCount = 0
    this.signature = {
      avgAmplitude: 0,
      avgPitch: 0.5,
      avgTempo: 0.5,
      beatCount: 0,
      peakMoments: [],
      dominantFreq: 'mid',
      energy: 'medium'
    }
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { amplitude, centroid, bass, mid, high, waveform } = weighted
    const { onBeat, beatIntensity, normalizedTempo, bpm } = beatInfo

    this.frameCount++

    // Sample audio signature
    if (this.frameCount % 3 === 0) {
      this.sampleCount++
      const n = this.sampleCount

      // Running averages
      this.signature.avgAmplitude = (this.signature.avgAmplitude * (n-1) + amplitude) / n
      this.signature.avgPitch = (this.signature.avgPitch * (n-1) + centroid) / n
      this.signature.avgTempo = (this.signature.avgTempo * (n-1) + normalizedTempo) / n

      // Determine dominant frequency band
      if (bass > mid && bass > high) this.signature.dominantFreq = 'bass'
      else if (high > mid && high > bass) this.signature.dominantFreq = 'high'
      else this.signature.dominantFreq = 'mid'

      // Energy classification
      if (this.signature.avgAmplitude > 0.7) this.signature.energy = 'intense'
      else if (this.signature.avgAmplitude > 0.4) this.signature.energy = 'medium'
      else this.signature.energy = 'calm'
    }

    // Update palette based on current audio
    const rgb = pitchTempoToRGB(centroid, normalizedTempo, amplitude)
    this.palette.primary = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    this.palette.secondary = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
    this.palette.accent = `hsl(${(centroid * 360 + 180) % 360}, 80%, 60%)`

    // Generate components on beats
    if (onBeat) {
      this.signature.beatCount++
      this.generateComponent(audioFeatures, beatInfo)
    }

    // Generate container on sustained amplitude
    if (amplitude > 0.6 && this.frameCount % 30 === 0) {
      this.generateContainer(audioFeatures, beatInfo)
    }

    // Update code display
    this.updateCodeDisplay()
  }

  generateComponent(audioFeatures, beatInfo) {
    const { amplitude, centroid, bass, mid, high } = audioFeatures
    const { beatIntensity, normalizedTempo, bpm } = beatInfo

    // Component type based on audio characteristics
    let componentType
    let props = {}

    if (beatIntensity > 0.8) {
      // Intense beat = action component
      componentType = this.pickRandom(['Pulse', 'Shatter', 'Burst', 'Strike', 'Impact'])
      props = {
        intensity: beatIntensity.toFixed(2),
        fragments: Math.floor(4 + beatIntensity * 12),
        duration: Math.floor(100 + (1 - normalizedTempo) * 400)
      }
    } else if (high > bass && high > 0.5) {
      // High frequencies = delicate/detail components
      componentType = this.pickRandom(['Sparkle', 'Glint', 'Shimmer', 'Flicker', 'Twinkle'])
      props = {
        opacity: (0.3 + high * 0.7).toFixed(2),
        blur: Math.floor(high * 20),
        scale: (0.5 + high).toFixed(2)
      }
    } else if (bass > high && bass > 0.5) {
      // Bass = heavy/structural components
      componentType = this.pickRandom(['Foundation', 'Anchor', 'Mass', 'Weight', 'Ground'])
      props = {
        weight: Math.floor(300 + bass * 600),
        radius: Math.floor(bass * 24),
        depth: Math.floor(bass * 10)
      }
    } else {
      // Mid = balanced components
      componentType = this.pickRandom(['Flow', 'Wave', 'Drift', 'Morph', 'Blend'])
      props = {
        speed: normalizedTempo.toFixed(2),
        smoothness: (1 - beatIntensity).toFixed(2)
      }
    }

    // Color from pitch
    const rgb = pitchTempoToRGB(centroid, normalizedTempo, amplitude)
    props.color = `"hsl(${Math.floor(centroid * 360)}, ${Math.floor(50 + amplitude * 50)}%, ${Math.floor(40 + amplitude * 40)}%)"`

    // Size from amplitude
    props.size = Math.floor(20 + amplitude * 80)

    this.components.push({
      type: componentType,
      props,
      depth: this.currentDepth,
      timestamp: Date.now()
    })

    // Limit components
    if (this.components.length > 30) {
      this.components.shift()
    }
  }

  generateContainer(audioFeatures, beatInfo) {
    const { amplitude, centroid } = audioFeatures
    const { normalizedTempo } = beatInfo

    const containerType = this.pickRandom(['Ambient', 'Chaos', 'Drift', 'Void', 'Field', 'Space'])

    const container = {
      type: containerType,
      props: {
        intensity: amplitude.toFixed(2),
        tempo: normalizedTempo.toFixed(2)
      },
      isContainer: true,
      depth: 0,
      timestamp: Date.now()
    }

    // Insert at beginning
    this.components.unshift(container)
  }

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  updateCodeDisplay() {
    // Generate JSX code from components
    const lines = []

    // Header comment
    lines.push(`// Generated from audio @ ${new Date().toLocaleTimeString()}`)
    lines.push(`// Energy: ${this.signature.energy} | Beats: ${this.signature.beatCount}`)
    lines.push(`// Dominant: ${this.signature.dominantFreq} | BPM: ~${Math.floor(this.signature.avgTempo * 200)}`)
    lines.push('')

    // Build component tree
    let indent = 0
    let openTags = []

    for (const comp of this.components.slice(-15)) {
      const propsStr = Object.entries(comp.props)
        .map(([k, v]) => typeof v === 'string' && v.startsWith('"') ? `${k}=${v}` : `${k}={${v}}`)
        .join(' ')

      if (comp.isContainer) {
        if (openTags.length > 0) {
          // Close previous
          lines.push('  '.repeat(indent) + `</${openTags.pop()}>`)
          indent = Math.max(0, indent - 1)
        }
        lines.push('  '.repeat(indent) + `<${comp.type} ${propsStr}>`)
        openTags.push(comp.type)
        indent++
      } else {
        lines.push('  '.repeat(indent) + `<${comp.type} ${propsStr} />`)
      }
    }

    // Close remaining tags
    while (openTags.length > 0) {
      indent = Math.max(0, indent - 1)
      lines.push('  '.repeat(indent) + `</${openTags.pop()}>`)
    }

    this.codeLines = lines
  }

  draw() {
    // Dark background
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw code on left side
    this.drawCode()

    // Draw component preview on right side
    this.drawPreview()

    // Draw signature info
    this.drawSignature()
  }

  drawCode() {
    const startX = 40
    const startY = 80
    const lineHeight = 20

    this.ctx.font = '14px "SF Mono", Monaco, monospace'

    // Title
    this.ctx.fillStyle = '#666'
    this.ctx.fillText('GENERATED JSX', startX, 40)

    // Code lines with syntax highlighting
    this.codeLines.forEach((line, i) => {
      const y = startY + i * lineHeight
      if (y > this.height - 100) return

      // Basic syntax highlighting
      if (line.startsWith('//')) {
        this.ctx.fillStyle = '#666'
      } else if (line.includes('<') && line.includes('>')) {
        // JSX tag
        this.ctx.fillStyle = this.palette.primary
      } else {
        this.ctx.fillStyle = '#888'
      }

      this.ctx.fillText(line, startX, y)
    })
  }

  drawPreview() {
    const previewX = this.width * 0.55
    const previewY = 80
    const previewW = this.width * 0.4
    const previewH = this.height * 0.7

    // Preview container
    this.ctx.strokeStyle = '#333'
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(previewX, previewY, previewW, previewH)

    // Title
    this.ctx.fillStyle = '#666'
    this.ctx.font = '14px "SF Mono", Monaco, monospace'
    this.ctx.fillText('COMPONENT PREVIEW', previewX, 40)

    // Draw component representations
    let y = previewY + 40
    const maxComponents = 10

    this.components.slice(-maxComponents).forEach((comp, i) => {
      const x = previewX + 20 + (comp.depth || 0) * 20
      const w = previewW - 40 - (comp.depth || 0) * 40
      const h = comp.isContainer ? 50 : 30

      // Component box
      const alpha = 0.3 + (i / maxComponents) * 0.7

      if (comp.isContainer) {
        this.ctx.strokeStyle = this.palette.accent
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(x, y, w, h)
      } else {
        this.ctx.fillStyle = `${this.palette.primary}`.replace('rgb', 'rgba').replace(')', `, ${alpha})`)

        // Shape based on component type
        if (comp.type.includes('Pulse') || comp.type.includes('Burst')) {
          this.ctx.beginPath()
          this.ctx.arc(x + w/2, y + h/2, h/2, 0, Math.PI * 2)
          this.ctx.fill()
        } else if (comp.type.includes('Shatter') || comp.type.includes('Strike')) {
          // Angular shape
          this.ctx.beginPath()
          this.ctx.moveTo(x + w/2, y)
          this.ctx.lineTo(x + w, y + h)
          this.ctx.lineTo(x, y + h)
          this.ctx.closePath()
          this.ctx.fill()
        } else {
          // Rounded rect
          const radius = comp.props.radius || 4
          this.roundRect(x, y, w, h, radius)
          this.ctx.fill()
        }
      }

      // Component name
      this.ctx.fillStyle = '#fff'
      this.ctx.font = '11px "SF Mono", Monaco, monospace'
      this.ctx.fillText(comp.type, x + 5, y + h/2 + 4)

      y += h + 10
      if (y > previewY + previewH - 20) return
    })
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath()
    this.ctx.moveTo(x + r, y)
    this.ctx.lineTo(x + w - r, y)
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    this.ctx.lineTo(x + w, y + h - r)
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    this.ctx.lineTo(x + r, y + h)
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    this.ctx.lineTo(x, y + r)
    this.ctx.quadraticCurveTo(x, y, x + r, y)
    this.ctx.closePath()
  }

  drawSignature() {
    const x = 40
    const y = this.height - 60

    this.ctx.font = '12px "SF Mono", Monaco, monospace'
    this.ctx.fillStyle = '#444'

    const sig = this.signature
    this.ctx.fillText(
      `Signature: ${sig.energy.toUpperCase()} | ${sig.dominantFreq.toUpperCase()} dominant | ${sig.beatCount} beats captured`,
      x, y
    )

    // Color swatches
    const swatches = [
      { color: this.palette.primary, label: 'primary' },
      { color: this.palette.accent, label: 'accent' },
      { color: this.palette.secondary, label: 'secondary' }
    ]

    swatches.forEach((swatch, i) => {
      const sx = x + i * 100
      const sy = y + 20

      this.ctx.fillStyle = swatch.color
      this.ctx.fillRect(sx, sy, 20, 20)

      this.ctx.fillStyle = '#666'
      this.ctx.fillText(swatch.label, sx + 25, sy + 14)
    })
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.init()
  }

  // Export generated code as JSX file
  exportJSX() {
    const filename = `audio-components-${Date.now()}.jsx`
    const content = this.generateExportCode()

    const blob = new Blob([content], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)

    return content
  }

  generateExportCode() {
    const sig = this.signature

    let code = `// Audio-Generated Component Library
// Generated: ${new Date().toISOString()}
// Energy: ${sig.energy} | Dominant Frequency: ${sig.dominantFreq}
// Beats Captured: ${sig.beatCount}

import React from 'react';

// Color Palette (extracted from audio)
export const palette = {
  primary: '${this.palette.primary}',
  secondary: '${this.palette.secondary}',
  accent: '${this.palette.accent}',
  background: '${this.palette.background}'
};

// Audio Signature
export const audioSignature = {
  energy: '${sig.energy}',
  dominantFrequency: '${sig.dominantFreq}',
  averageAmplitude: ${sig.avgAmplitude.toFixed(3)},
  averagePitch: ${sig.avgPitch.toFixed(3)},
  averageTempo: ${sig.avgTempo.toFixed(3)},
  beatCount: ${sig.beatCount}
};

`

    // Generate unique component types
    const uniqueTypes = [...new Set(this.components.map(c => c.type))]

    uniqueTypes.forEach(type => {
      const comp = this.components.find(c => c.type === type)
      if (!comp) return

      code += `
export const ${type} = ({ children, ...props }) => (
  <div
    style={{
      padding: '${comp.props.size || 20}px',
      borderRadius: '${comp.props.radius || 8}px',
      background: palette.primary,
      opacity: ${comp.props.opacity || 1},
      transition: 'all ${comp.props.duration || 200}ms ease',
      ...props.style
    }}
    {...props}
  >
    {children}
  </div>
);
`
    })

    // Add example usage
    code += `
// Example Usage:
// ${this.codeLines.filter(l => !l.startsWith('//')).join('\n// ')}
`

    return code
  }
}
