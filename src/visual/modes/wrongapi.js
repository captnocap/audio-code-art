import { VisualizationMode } from './base.js'
import { tuner } from '../tuner.js'

// Wrong API Mode - Use audio to control things that make no sense
// Bass = z-index of non-existent elements
// Treble = CSS variables that don't exist
// Mid = try to modify readonly properties
// Catch errors and visualize them

export class WrongAPIMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'wrongapi'
    this.description = 'Audio controls impossible things. Errors become art.'

    // Error collection
    this.errors = []
    this.maxErrors = 100

    // "Impossible" element tracking
    this.phantomElements = []
    this.impossibleCSS = []
    this.readonlyAttempts = []

    // Visual representation of errors
    this.errorParticles = []
    this.errorText = []
    this.errorWaves = []

    // Nonsense state
    this.phantomZIndex = 0
    this.impossibleVariables = {}
    this.readonlyViolations = 0

    // Frame counter
    this.frame = 0
  }

  init() {
    this.errors = []
    this.errorParticles = []
    this.errorText = []
    this.errorWaves = []
    this.phantomElements = []
    this.frame = 0
  }

  update(audioFeatures, beatInfo) {
    this.frame++
    const params = tuner.getAll()
    const { bass, mid, high, amplitude, centroid } = audioFeatures

    // ============================================
    // WRONG API CALLS - Intentionally break things
    // ============================================

    // Bass controls z-index of non-existent elements
    this.attemptPhantomZIndex(bass, params)

    // Treble sets CSS variables that don't exist
    this.attemptImpossibleCSS(high, centroid, params)

    // Mid tries to modify readonly properties
    this.attemptReadonlyModification(mid, params)

    // Amplitude does math that shouldn't work
    this.attemptImpossibleMath(amplitude, params)

    // Beats trigger API calls to nowhere
    if (beatInfo.onBeat) {
      this.attemptGhostAPICalls(beatInfo.beatIntensity, params)
    }

    // Update error visualizations
    this.updateErrorParticles()
    this.updateErrorText()
    this.updateErrorWaves()
  }

  attemptPhantomZIndex(bass, params) {
    // Try to set z-index on elements that don't exist
    const phantomId = `phantom-${Math.floor(bass * 1000)}`
    const zIndex = Math.floor(bass * 999999) - 500000 // Negative z-index? Sure!

    try {
      const phantom = document.getElementById(phantomId)
      if (phantom) {
        phantom.style.zIndex = zIndex // This won't run, element doesn't exist
      } else {
        // "Create" a phantom element in our imagination
        this.phantomElements.push({
          id: phantomId,
          zIndex: zIndex,
          frame: this.frame,
          bass: bass
        })

        // Try setting it anyway - this creates an error visualization
        this.logError('PHANTOM_Z_INDEX', `Set z-index ${zIndex} on non-existent #${phantomId}`, bass)
      }
    } catch (e) {
      this.logError('Z_INDEX_ERROR', e.message, bass)
    }

    // Keep phantom list reasonable
    if (this.phantomElements.length > 50) this.phantomElements.shift()
  }

  attemptImpossibleCSS(high, centroid, params) {
    // Try to set CSS variables that make no sense
    const impossibleVars = [
      `--frequency-${Math.floor(high * 20000)}hz`,
      `--color-of-sound-${Math.floor(centroid * 360)}`,
      `--time-direction-${high > 0.5 ? 'backwards' : 'sideways'}`,
      `--dimension-${Math.floor(high * 11)}d`,
      `--emotion-intensity-${Math.floor(high * 100)}`,
      `--taste-of-treble-${['sweet', 'sour', 'umami', 'bitter'][Math.floor(high * 4)]}`,
      `--smell-frequency-${Math.floor(centroid * 1000)}`,
    ]

    const varName = impossibleVars[Math.floor(Math.random() * impossibleVars.length)]
    const varValue = `${high * 100}impossible-units`

    try {
      document.documentElement.style.setProperty(varName, varValue)
      this.impossibleCSS.push({ name: varName, value: varValue, frame: this.frame })
      this.logError('IMPOSSIBLE_CSS', `${varName}: ${varValue}`, high)
    } catch (e) {
      this.logError('CSS_ERROR', e.message, high)
    }

    if (this.impossibleCSS.length > 30) this.impossibleCSS.shift()
  }

  attemptReadonlyModification(mid, params) {
    // Try to modify things that can't be modified
    const attempts = [
      () => { Math.PI = mid * 10; return 'Math.PI' },
      () => { Math.E = mid * 5; return 'Math.E' },
      () => { undefined = mid; return 'undefined' },
      () => { NaN = mid; return 'NaN' },
      () => { Infinity = mid * 1000; return 'Infinity' },
      () => { window.innerWidth = mid * 10000; return 'window.innerWidth' },
      () => { document.body.nodeName = 'AUDIO'; return 'nodeName' },
      () => { navigator.userAgent = 'AudioBrowser/1.0'; return 'userAgent' },
    ]

    const attempt = attempts[Math.floor(Math.random() * attempts.length)]

    try {
      const propName = attempt()
      this.readonlyAttempts.push({ prop: propName, value: mid, frame: this.frame })
      this.logError('READONLY_VIOLATION', `Attempted to set ${propName} = ${mid.toFixed(3)}`, mid)
    } catch (e) {
      this.logError('READONLY_ERROR', e.message, mid)
      this.readonlyViolations++
    }

    if (this.readonlyAttempts.length > 30) this.readonlyAttempts.shift()
  }

  attemptImpossibleMath(amplitude, params) {
    // Math that shouldn't work
    const impossibleOperations = [
      () => ({ op: '0/0', result: 0/0 }),
      () => ({ op: 'Infinity - Infinity', result: Infinity - Infinity }),
      () => ({ op: 'Math.sqrt(-amplitude)', result: Math.sqrt(-amplitude) }),
      () => ({ op: '"audio" * amplitude', result: "audio" * amplitude }),
      () => ({ op: '[1,2,3] + amplitude', result: [1,2,3] + amplitude }),
      () => ({ op: '{} + []', result: {} + [] }),
      () => ({ op: '[] + {}', result: [] + {} }),
      () => ({ op: 'null ** amplitude', result: null ** amplitude }),
    ]

    const { op, result } = impossibleOperations[Math.floor(Math.random() * impossibleOperations.length)]()

    // NaN and weird results become visual events
    if (isNaN(result) || typeof result === 'string') {
      this.logError('IMPOSSIBLE_MATH', `${op} = ${result}`, amplitude)
    }
  }

  attemptGhostAPICalls(intensity, params) {
    // API calls to endpoints that don't exist
    const ghostAPIs = [
      '/api/convert-sound-to-color',
      '/api/feelings/translate',
      '/api/time/reverse',
      '/api/dimension/shift',
      '/api/reality/toggle',
      '/api/music/taste',
      '/api/frequency/smell',
    ]

    const api = ghostAPIs[Math.floor(Math.random() * ghostAPIs.length)]

    // Don't actually fetch, just log the "attempt"
    this.logError('GHOST_API', `POST ${api} { intensity: ${intensity.toFixed(3)} }`, intensity)

    // Spawn error wave on beat
    this.errorWaves.push({
      x: this.width / 2,
      y: this.height / 2,
      radius: 10,
      maxRadius: 200 + intensity * 300,
      life: 60,
      maxLife: 60,
      message: api
    })
  }

  logError(type, message, intensity) {
    const error = {
      type,
      message,
      intensity,
      frame: this.frame,
      x: Math.random() * this.width,
      y: Math.random() * this.height
    }

    this.errors.push(error)
    if (this.errors.length > this.maxErrors) this.errors.shift()

    // Create visual particle for error
    const params = tuner.getAll()
    const errorViz = params.errorVisualization

    for (let i = 0; i < Math.ceil(intensity * 5 * errorViz); i++) {
      this.errorParticles.push({
        x: error.x + (Math.random() - 0.5) * 50,
        y: error.y + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: 2 + intensity * 6,
        life: 50 + Math.random() * 50,
        maxLife: 50 + Math.random() * 50,
        type: type,
        hue: this.typeToHue(type)
      })
    }

    // Sometimes spawn floating error text
    if (Math.random() < errorViz * 0.3) {
      this.errorText.push({
        x: error.x,
        y: error.y,
        text: message.substring(0, 40),
        life: 80,
        maxLife: 80,
        vy: -1,
        type: type
      })
    }

    if (this.errorParticles.length > 500) this.errorParticles.shift()
    if (this.errorText.length > 20) this.errorText.shift()
  }

  typeToHue(type) {
    const hues = {
      'PHANTOM_Z_INDEX': 280,    // Purple
      'IMPOSSIBLE_CSS': 180,     // Cyan
      'READONLY_VIOLATION': 0,   // Red
      'READONLY_ERROR': 30,      // Orange
      'IMPOSSIBLE_MATH': 60,     // Yellow
      'GHOST_API': 120,          // Green
      'Z_INDEX_ERROR': 300,      // Magenta
      'CSS_ERROR': 200,          // Light blue
    }
    return hues[type] || 0
  }

  updateErrorParticles() {
    this.errorParticles = this.errorParticles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05 // gravity
      p.life--
      return p.life > 0
    })
  }

  updateErrorText() {
    this.errorText = this.errorText.filter(t => {
      t.y += t.vy
      t.life--
      return t.life > 0
    })
  }

  updateErrorWaves() {
    this.errorWaves = this.errorWaves.filter(w => {
      w.radius += (w.maxRadius - w.radius) * 0.1
      w.life--
      return w.life > 0
    })
  }

  draw() {
    const params = tuner.getAll()
    const decay = params.decay

    // Dark background with decay
    this.ctx.fillStyle = `rgba(5, 5, 15, ${1 - decay * 0.9})`
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw error waves (background)
    this.drawErrorWaves()

    // Draw phantom elements visualization
    this.drawPhantomElements()

    // Draw error particles
    this.drawErrorParticles()

    // Draw floating error text
    this.drawErrorText()

    // Draw error console
    this.drawErrorConsole()

    // Draw impossible CSS panel
    this.drawImpossibleCSSPanel()
  }

  drawErrorWaves() {
    this.errorWaves.forEach(w => {
      const alpha = (w.life / w.maxLife) * 0.3
      this.ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2)
      this.ctx.stroke()

      // API label
      if (w.life > w.maxLife * 0.7) {
        this.ctx.font = '10px monospace'
        this.ctx.fillStyle = `rgba(255, 100, 100, ${alpha * 2})`
        this.ctx.fillText(w.message, w.x - 50, w.y)
      }
    })
  }

  drawPhantomElements() {
    // Visualize "phantom" DOM elements that don't exist
    this.phantomElements.forEach((p, i) => {
      const age = this.frame - p.frame
      const alpha = Math.max(0, 1 - age / 200)
      if (alpha <= 0) return

      const x = (i / this.phantomElements.length) * this.width
      const y = this.height / 2 + (p.zIndex / 1000000) * this.height * 0.3

      // Draw phantom box
      this.ctx.strokeStyle = `rgba(150, 100, 255, ${alpha * 0.5})`
      this.ctx.setLineDash([5, 5])
      this.ctx.strokeRect(x - 20, y - 15, 40, 30)
      this.ctx.setLineDash([])

      // z-index label
      this.ctx.font = '8px monospace'
      this.ctx.fillStyle = `rgba(150, 100, 255, ${alpha})`
      this.ctx.fillText(`z:${p.zIndex}`, x - 15, y + 3)
    })
  }

  drawErrorParticles() {
    this.errorParticles.forEach(p => {
      const alpha = (p.life / p.maxLife)
      this.ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${alpha})`
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      this.ctx.fill()
    })
  }

  drawErrorText() {
    this.errorText.forEach(t => {
      const alpha = (t.life / t.maxLife)
      const hue = this.typeToHue(t.type)
      this.ctx.font = '11px monospace'
      this.ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${alpha})`
      this.ctx.fillText(t.text, t.x, t.y)
    })
  }

  drawErrorConsole() {
    // Mini console showing recent errors
    const consoleX = 20
    const consoleY = 20
    const consoleWidth = 350
    const lineHeight = 14
    const maxLines = 8

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(consoleX - 5, consoleY - 5, consoleWidth + 10, lineHeight * (maxLines + 1) + 10)

    this.ctx.font = '10px monospace'
    this.ctx.fillStyle = 'rgba(255, 100, 100, 0.8)'
    this.ctx.fillText('// ERROR CONSOLE', consoleX, consoleY + 10)

    const recentErrors = this.errors.slice(-maxLines)
    recentErrors.forEach((e, i) => {
      const y = consoleY + 25 + i * lineHeight
      const age = this.frame - e.frame
      const alpha = Math.max(0.3, 1 - age / 200)

      const hue = this.typeToHue(e.type)
      this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${alpha})`
      this.ctx.fillText(`[${e.type}] ${e.message.substring(0, 40)}`, consoleX, y)
    })
  }

  drawImpossibleCSSPanel() {
    // Show the impossible CSS variables we "set"
    const panelX = this.width - 250
    const panelY = 20
    const lineHeight = 12
    const maxVars = 6

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(panelX - 5, panelY - 5, 240, lineHeight * (maxVars + 2) + 15)

    this.ctx.font = '9px monospace'
    this.ctx.fillStyle = 'rgba(100, 200, 255, 0.8)'
    this.ctx.fillText(':root { /* impossible */}', panelX, panelY + 10)

    const recentCSS = this.impossibleCSS.slice(-maxVars)
    recentCSS.forEach((c, i) => {
      const y = panelY + 25 + i * lineHeight
      const age = this.frame - c.frame
      const alpha = Math.max(0.3, 1 - age / 300)

      this.ctx.fillStyle = `rgba(100, 255, 200, ${alpha})`
      this.ctx.fillText(`  ${c.name.substring(0, 25)}:`, panelX, y)
      this.ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`
      this.ctx.fillText(c.value.substring(0, 15), panelX + 150, y)
    })
  }

  clear() {
    this.errors = []
    this.errorParticles = []
    this.errorText = []
    this.errorWaves = []
    this.phantomElements = []
    this.impossibleCSS = []
  }
}
