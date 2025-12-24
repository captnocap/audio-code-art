import { VisualizationMode } from './base.js'
import { styleExtractor } from '../../style/extractor.js'

/**
 * UIKit Mode - Visualizes audio as a generated UI design system
 * Shows live preview of buttons, cards, inputs styled by the music
 */
export class UIKitMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'uikit'
    this.description = 'Albums become design systems. Sound shapes UI.'

    this.theme = null
    this.isRecording = false
    this.recordingStarted = false

    // Animation state
    this.time = 0
    this.pulsePhase = 0

    // Smoothed audio for real-time reactivity
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
  }

  init() {
    this.theme = styleExtractor.getDefaultTheme()
    this.isRecording = false
    this.recordingStarted = false
    this.time = 0
  }

  update(audioFeatures, beatInfo) {
    if (!audioFeatures) return

    this.time += 0.016

    // Smooth audio values for reactivity
    this.smoothBass = this.smoothBass * 0.85 + audioFeatures.bass * 0.15
    this.smoothMid = this.smoothMid * 0.85 + audioFeatures.mid * 0.15
    this.smoothHigh = this.smoothHigh * 0.85 + audioFeatures.high * 0.15
    this.smoothAmplitude = this.smoothAmplitude * 0.9 + audioFeatures.amplitude * 0.1

    if (beatInfo.onBeat) {
      this.pulsePhase = 1
    }
    this.pulsePhase *= 0.92

    // Auto-start recording on first audio
    if (!this.recordingStarted && audioFeatures.amplitude > 0.05) {
      this.startRecording()
      this.recordingStarted = true
    }

    // Capture frame if recording
    if (this.isRecording) {
      const stillRecording = styleExtractor.captureFrame(audioFeatures, beatInfo)
      if (!stillRecording) {
        this.finishRecording()
      }
    }
  }

  startRecording(duration = 30000) {
    styleExtractor.startAnalysis(duration)
    this.isRecording = true
  }

  finishRecording() {
    this.isRecording = false
    this.theme = styleExtractor.generateTheme('Audio Theme')
  }

  draw() {
    const ctx = this.ctx

    // Background
    ctx.fillStyle = this.theme?.colors?.background || '#0a0a0a'
    ctx.fillRect(0, 0, this.width, this.height)

    const progress = styleExtractor.getProgress()

    if (this.isRecording) {
      this.drawRecordingState(ctx, progress)
    } else {
      this.drawUIKit(ctx)
    }
  }

  drawRecordingState(ctx, progress) {
    const centerX = this.width / 2
    const centerY = this.height / 2

    // Pulsing recording indicator
    const pulseSize = 80 + this.smoothAmplitude * 40 + this.pulsePhase * 20

    // Outer glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseSize * 2)
    gradient.addColorStop(0, `hsla(0, 80%, 50%, ${0.3 + this.smoothAmplitude * 0.3})`)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(centerX - pulseSize * 2, centerY - pulseSize * 2, pulseSize * 4, pulseSize * 4)

    // Recording circle
    ctx.fillStyle = `hsl(0, 80%, ${50 + this.pulsePhase * 20}%)`
    ctx.beginPath()
    ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2)
    ctx.fill()

    // Progress ring
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(centerX, centerY, pulseSize + 20, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
    ctx.stroke()

    // Text
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('ANALYZING AUDIO', centerX, centerY - pulseSize - 60)

    ctx.font = '16px system-ui'
    ctx.fillStyle = '#aaa'
    ctx.fillText(`${Math.floor(progress * 100)}% complete`, centerX, centerY + pulseSize + 50)
    ctx.fillText(`${styleExtractor.samples.length} samples captured`, centerX, centerY + pulseSize + 75)

    // Waveform visualization around the circle
    this.drawWaveformRing(ctx, centerX, centerY, pulseSize + 50)
  }

  drawWaveformRing(ctx, cx, cy, radius) {
    const segments = 64
    ctx.strokeStyle = `hsla(${this.smoothBass * 60}, 80%, 60%, 0.5)`
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2 - Math.PI / 2
      const wave = Math.sin(angle * 8 + this.time * 5) * this.smoothAmplitude * 20
      const r = radius + wave
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r

      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  drawUIKit(ctx) {
    const theme = this.theme
    const padding = 40
    const colWidth = (this.width - padding * 4) / 3

    // Title
    ctx.fillStyle = theme.colors.foreground
    ctx.font = 'bold 28px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText('SONIC STYLE SHEET', padding, padding + 20)

    ctx.font = '14px system-ui'
    ctx.fillStyle = theme.colors.muted
    ctx.fillText(theme.meta.characteristics || 'Generated from audio', padding, padding + 45)

    const startY = padding + 80

    // Column 1: Colors
    this.drawColorPalette(ctx, padding, startY, colWidth)

    // Column 2: Components
    this.drawComponents(ctx, padding + colWidth + padding, startY, colWidth)

    // Column 3: Typography & Code
    this.drawTypographyAndCode(ctx, padding + (colWidth + padding) * 2, startY, colWidth)

    // Bottom: Raw stats
    this.drawStats(ctx, padding, this.height - 100)
  }

  drawColorPalette(ctx, x, y, width) {
    const theme = this.theme
    const swatchSize = 50
    const gap = 10

    ctx.fillStyle = theme.colors.foreground
    ctx.font = 'bold 16px system-ui'
    ctx.fillText('COLOR PALETTE', x, y)

    const colors = [
      { name: 'Primary', value: theme.colors.primary },
      { name: 'Primary Light', value: theme.colors.primaryLight },
      { name: 'Primary Dark', value: theme.colors.primaryDark },
      { name: 'Secondary', value: theme.colors.secondary },
      { name: 'Accent', value: theme.colors.accent },
      { name: 'Background', value: theme.colors.background },
      { name: 'Foreground', value: theme.colors.foreground },
      { name: 'Muted', value: theme.colors.muted },
      { name: 'Border', value: theme.colors.border }
    ]

    let cy = y + 30

    colors.forEach((color, i) => {
      const row = Math.floor(i / 3)
      const col = i % 3
      const sx = x + col * (swatchSize + gap)
      const sy = cy + row * (swatchSize + gap + 20)

      // Swatch with border
      ctx.fillStyle = color.value
      ctx.strokeStyle = theme.colors.border
      ctx.lineWidth = 1
      ctx.fillRect(sx, sy, swatchSize, swatchSize)
      ctx.strokeRect(sx, sy, swatchSize, swatchSize)

      // Reactive pulse on beat
      if (this.pulsePhase > 0.1 && i === 0) {
        ctx.strokeStyle = theme.colors.primary
        ctx.lineWidth = 2 + this.pulsePhase * 3
        ctx.strokeRect(sx - 2, sy - 2, swatchSize + 4, swatchSize + 4)
      }

      // Label
      ctx.fillStyle = theme.colors.muted
      ctx.font = '10px system-ui'
      ctx.fillText(color.name, sx, sy + swatchSize + 12)
    })
  }

  drawComponents(ctx, x, y, width) {
    const theme = this.theme

    ctx.fillStyle = theme.colors.foreground
    ctx.font = 'bold 16px system-ui'
    ctx.fillText('COMPONENTS', x, y)

    let cy = y + 30

    // Button
    const btnWidth = 120
    const btnHeight = 40
    const radius = parseInt(theme.radius.md) || 8

    // Reactive button size
    const reactiveScale = 1 + this.smoothBass * 0.1

    ctx.save()
    ctx.translate(x + btnWidth / 2, cy + btnHeight / 2)
    ctx.scale(reactiveScale, reactiveScale)
    ctx.translate(-btnWidth / 2, -btnHeight / 2)

    // Button shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = parseInt(theme.shadows.md.split('px')[1]) || 6
    ctx.shadowOffsetY = parseInt(theme.shadows.md.split(' ')[1]) || 4

    ctx.fillStyle = theme.colors.primary
    this.roundRect(ctx, 0, 0, btnWidth, btnHeight, radius)
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Button', btnWidth / 2, btnHeight / 2 + 5)
    ctx.textAlign = 'left'

    ctx.restore()

    cy += 70

    // Card
    const cardWidth = width - 20
    const cardHeight = 100

    ctx.fillStyle = theme.colors.muted
    this.roundRect(ctx, x, cy, cardWidth, cardHeight, parseInt(theme.radius.lg) || 16)
    ctx.fill()

    ctx.strokeStyle = theme.colors.border
    ctx.lineWidth = parseInt(theme.borders.width) || 1
    this.roundRect(ctx, x, cy, cardWidth, cardHeight, parseInt(theme.radius.lg) || 16)
    ctx.stroke()

    ctx.fillStyle = theme.colors.foreground
    ctx.font = 'bold 14px system-ui'
    ctx.fillText('Card Component', x + 15, cy + 25)

    ctx.fillStyle = theme.colors.foreground
    ctx.globalAlpha = 0.6
    ctx.font = '12px system-ui'
    ctx.fillText('Styled by your music.', x + 15, cy + 45)
    ctx.fillText(`Border radius: ${theme.radius.lg}`, x + 15, cy + 65)
    ctx.fillText(`Spacing: ${theme.spacing.md}`, x + 15, cy + 85)
    ctx.globalAlpha = 1

    cy += 120

    // Input field
    const inputWidth = cardWidth
    const inputHeight = 36

    ctx.fillStyle = theme.colors.background
    ctx.strokeStyle = theme.colors.border
    ctx.lineWidth = parseInt(theme.borders.width) || 1
    this.roundRect(ctx, x, cy, inputWidth, inputHeight, parseInt(theme.radius.sm) || 4)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = theme.colors.muted
    ctx.font = '14px system-ui'
    ctx.fillText('Input placeholder...', x + 12, cy + 23)

    cy += 60

    // Badge/Tag
    const badgeText = theme.meta.characteristics?.split(',')[0] || 'audio'
    ctx.font = '12px system-ui'
    const badgeWidth = ctx.measureText(badgeText).width + 20
    const badgeHeight = 24

    ctx.fillStyle = theme.colors.accent
    this.roundRect(ctx, x, cy, badgeWidth, badgeHeight, parseInt(theme.radius.full) || 12)
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.fillText(badgeText, x + 10, cy + 16)
  }

  drawTypographyAndCode(ctx, x, y, width) {
    const theme = this.theme

    ctx.fillStyle = theme.colors.foreground
    ctx.font = 'bold 16px system-ui'
    ctx.fillText('TYPOGRAPHY', x, y)

    let cy = y + 30

    // Font family display
    ctx.fillStyle = theme.colors.foreground
    ctx.font = `24px ${theme.typography.fontFamily}`
    ctx.fillText('Aa Bb Cc', x, cy + 20)

    ctx.font = '12px system-ui'
    ctx.fillStyle = theme.colors.muted
    ctx.fillText(theme.typography.fontFamily.split(',')[0].replace(/'/g, ''), x, cy + 40)

    cy += 70

    // Spacing visualization
    ctx.fillStyle = theme.colors.foreground
    ctx.font = 'bold 14px system-ui'
    ctx.fillText('SPACING', x, cy)

    cy += 20

    const spacings = ['xs', 'sm', 'md', 'lg', 'xl']
    spacings.forEach((size, i) => {
      const val = parseFloat(theme.spacing[size]) * 16 // Convert rem to px approx
      ctx.fillStyle = theme.colors.primary
      ctx.globalAlpha = 0.3 + i * 0.15
      ctx.fillRect(x, cy + i * 20, Math.min(val * 3, width - 50), 12)
      ctx.globalAlpha = 1

      ctx.fillStyle = theme.colors.muted
      ctx.font = '10px system-ui'
      ctx.fillText(`${size}: ${theme.spacing[size]}`, x + Math.min(val * 3, width - 50) + 5, cy + i * 20 + 10)
    })

    cy += 120

    // CSS Code preview
    ctx.fillStyle = theme.colors.foreground
    ctx.font = 'bold 14px system-ui'
    ctx.fillText('CSS VARIABLES', x, cy)

    cy += 20

    // Code block background
    ctx.fillStyle = theme.raw.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    this.roundRect(ctx, x, cy, width - 10, 150, 8)
    ctx.fill()

    // Code text
    ctx.font = '10px monospace'
    ctx.fillStyle = theme.colors.accent
    const codeLines = [
      ':root {',
      `  --primary: ${theme.colors.primary};`,
      `  --spacing: ${theme.spacing.unit};`,
      `  --radius: ${theme.radius.md};`,
      `  --border: ${theme.borders.width};`,
      `  --shadow: ${theme.shadows.sm.substring(0, 25)}...`,
      `  --font: ${theme.typography.fontFamily.split(',')[0]};`,
      `  --duration: ${theme.animation.duration};`,
      '}'
    ]

    codeLines.forEach((line, i) => {
      ctx.fillStyle = line.includes(':') ? theme.colors.accent : theme.colors.muted
      ctx.fillText(line, x + 10, cy + 18 + i * 15)
    })
  }

  drawStats(ctx, x, y) {
    const theme = this.theme
    const raw = theme.raw

    if (!raw.avgLoudness) return

    ctx.fillStyle = theme.colors.muted
    ctx.font = '11px system-ui'

    const stats = [
      `Loudness: ${(raw.avgLoudness * 100).toFixed(0)}%`,
      `Brightness: ${(raw.avgBrightness * 100).toFixed(0)}%`,
      `Tempo: ${raw.avgTempo?.toFixed(0) || '?'} BPM`,
      `Bass: ${(raw.avgBass * 100).toFixed(0)}%`,
      `Mids: ${(raw.avgMid * 100).toFixed(0)}%`,
      `Highs: ${(raw.avgHigh * 100).toFixed(0)}%`,
      `Dynamic Range: ${(raw.dynamicRange * 100).toFixed(0)}%`,
      `Roughness: ${(raw.avgRoughness * 100).toFixed(0)}%`,
      `Samples: ${raw.sampleCount}`
    ]

    stats.forEach((stat, i) => {
      ctx.fillText(stat, x + (i % 5) * 160, y + Math.floor(i / 5) * 20)
    })

    // Export hint
    ctx.fillStyle = theme.colors.accent
    ctx.font = '12px system-ui'
    ctx.fillText('Press E to export CSS | T for Tailwind | J for JSON', x, y + 50)
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  // Export methods
  exportCSS() {
    const css = styleExtractor.toCSS(this.theme)
    this.downloadFile(css, 'audio-theme.css', 'text/css')
  }

  exportTailwind() {
    const config = styleExtractor.toTailwind(this.theme)
    this.downloadFile(config, 'tailwind.config.js', 'text/javascript')
  }

  exportJSON() {
    const json = JSON.stringify(this.theme, null, 2)
    this.downloadFile(json, 'audio-theme.json', 'application/json')
  }

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  // Handle keyboard shortcuts
  handleKeyPress(key) {
    if (key === 'e' || key === 'E') this.exportCSS()
    if (key === 't' || key === 'T') this.exportTailwind()
    if (key === 'j' || key === 'J') this.exportJSON()
    if (key === 'r' || key === 'R') this.startRecording()
  }

  clear() {
    this.init()
  }
}
