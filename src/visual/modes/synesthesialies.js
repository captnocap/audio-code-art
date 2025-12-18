import { VisualizationMode } from './base.js'
import { tuner } from '../tuner.js'

// Synesthesia Lies Mode - Audio maps to impossible sensations
// Pitch → smell descriptions
// Amplitude → taste words
// Rhythm → texture adjectives
// Words spawning everywhere describing sensations you can't have through a screen

export class SynesthesiaLiesMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'synesthesialies'
    this.description = 'Audio becomes smell, taste, texture. Impossible sensations.'

    // Word pools for synesthetic mappings
    this.smells = {
      low: ['petrichor', 'moss', 'cedar', 'earth', 'musk', 'tobacco', 'leather', 'wood smoke', 'wet stone', 'pine tar'],
      mid: ['jasmine', 'honey', 'grass', 'rain', 'copper', 'bread', 'coffee', 'vanilla', 'sandalwood', 'sage'],
      high: ['ozone', 'citrus', 'mint', 'frost', 'static', 'chlorine', 'metal', 'ice', 'eucalyptus', 'lightning']
    }

    this.tastes = {
      quiet: ['water', 'air', 'nothing', 'void', 'silence', 'empty', 'null', 'absence'],
      soft: ['honey', 'milk', 'cream', 'butter', 'silk', 'cloud', 'whisper', 'velvet'],
      medium: ['salt', 'bread', 'wine', 'copper', 'earth', 'iron', 'blood', 'stone'],
      loud: ['fire', 'acid', 'lightning', 'glass', 'metal', 'burning', 'electric', 'thunder'],
      extreme: ['supernova', 'void', 'infinity', 'chaos', 'death', 'rebirth', 'everything', 'oblivion']
    }

    this.textures = {
      slow: ['smooth', 'flowing', 'liquid', 'heavy', 'thick', 'viscous', 'molten', 'glacial'],
      medium: ['rough', 'grainy', 'woven', 'fibrous', 'layered', 'porous', 'cellular', 'organic'],
      fast: ['sharp', 'jagged', 'crystalline', 'fractured', 'splintered', 'electric', 'vibrating', 'shattering']
    }

    this.temperatures = ['freezing', 'cold', 'cool', 'lukewarm', 'warm', 'hot', 'burning', 'incandescent']

    // Floating words
    this.words = []
    this.maxWords = 150

    // Sensation trails
    this.trails = []

    // Beat tracking for rhythm
    this.beatHistory = []
    this.lastBeatTime = 0

    // Frame counter
    this.frame = 0
  }

  init() {
    this.words = []
    this.trails = []
    this.beatHistory = []
    this.frame = 0
  }

  update(audioFeatures, beatInfo) {
    this.frame++
    const params = tuner.getAll()
    const { bass, mid, high, amplitude, centroid } = audioFeatures

    // Track beats for rhythm analysis
    if (beatInfo.onBeat) {
      const now = Date.now()
      this.beatHistory.push(now)
      if (this.beatHistory.length > 20) this.beatHistory.shift()
      this.lastBeatTime = now
    }

    const tempo = this.calculateTempo()

    // SYNESTHESIA MAPPINGS

    // Pitch (centroid) → Smell
    if (Math.random() < params.sensitivity * 0.15) {
      const smell = this.getSmell(centroid)
      this.spawnWord(smell, 'smell', centroid, params)
    }

    // Amplitude → Taste
    if (Math.random() < params.sensitivity * 0.12) {
      const taste = this.getTaste(amplitude)
      this.spawnWord(taste, 'taste', amplitude, params)
    }

    // Tempo/Rhythm → Texture
    if (beatInfo.onBeat) {
      const texture = this.getTexture(tempo)
      this.spawnWord(texture, 'texture', beatInfo.beatIntensity, params)
    }

    // Bass → Temperature + Weight
    if (bass > 0.3 && Math.random() < 0.1) {
      const temp = this.getTemperature(bass)
      this.spawnWord(temp, 'temperature', bass, params)
    }

    // High frequencies → Sharpness descriptions
    if (high > 0.3 && Math.random() < 0.08) {
      const sharpness = this.getSharpness(high)
      this.spawnWord(sharpness, 'sharpness', high, params)
    }

    // Combined sensations on strong beats
    if (beatInfo.onBeat && beatInfo.beatIntensity > 0.6) {
      const combined = this.getCombinedSensation(audioFeatures, tempo)
      this.spawnWord(combined, 'combined', beatInfo.beatIntensity, params)
    }

    // Update words
    this.words = this.words.filter(w => {
      w.life--
      w.x += w.vx
      w.y += w.vy
      w.vy += 0.02 // slight gravity
      w.vx *= 0.995
      w.vy *= 0.995
      w.rotation += w.rotationSpeed

      // Add to trail
      if (w.life % 5 === 0 && Math.random() < 0.3) {
        this.trails.push({
          x: w.x,
          y: w.y,
          text: w.text.charAt(Math.floor(Math.random() * w.text.length)),
          life: 30,
          alpha: 0.3
        })
      }

      return w.life > 0 && w.x > -200 && w.x < this.width + 200 && w.y < this.height + 100
    })

    // Update trails
    this.trails = this.trails.filter(t => {
      t.life--
      t.alpha *= 0.95
      return t.life > 0
    })
  }

  calculateTempo() {
    if (this.beatHistory.length < 2) return 0.5

    const intervals = []
    for (let i = 1; i < this.beatHistory.length; i++) {
      intervals.push(this.beatHistory[i] - this.beatHistory[i - 1])
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const bpm = 60000 / avgInterval

    // Normalize to 0-1 (60-200 bpm range)
    return Math.max(0, Math.min(1, (bpm - 60) / 140))
  }

  getSmell(pitch) {
    if (pitch < 0.33) {
      return this.smells.low[Math.floor(Math.random() * this.smells.low.length)]
    } else if (pitch < 0.66) {
      return this.smells.mid[Math.floor(Math.random() * this.smells.mid.length)]
    } else {
      return this.smells.high[Math.floor(Math.random() * this.smells.high.length)]
    }
  }

  getTaste(amplitude) {
    if (amplitude < 0.1) {
      return this.tastes.quiet[Math.floor(Math.random() * this.tastes.quiet.length)]
    } else if (amplitude < 0.3) {
      return this.tastes.soft[Math.floor(Math.random() * this.tastes.soft.length)]
    } else if (amplitude < 0.6) {
      return this.tastes.medium[Math.floor(Math.random() * this.tastes.medium.length)]
    } else if (amplitude < 0.85) {
      return this.tastes.loud[Math.floor(Math.random() * this.tastes.loud.length)]
    } else {
      return this.tastes.extreme[Math.floor(Math.random() * this.tastes.extreme.length)]
    }
  }

  getTexture(tempo) {
    if (tempo < 0.33) {
      return this.textures.slow[Math.floor(Math.random() * this.textures.slow.length)]
    } else if (tempo < 0.66) {
      return this.textures.medium[Math.floor(Math.random() * this.textures.medium.length)]
    } else {
      return this.textures.fast[Math.floor(Math.random() * this.textures.fast.length)]
    }
  }

  getTemperature(bass) {
    const index = Math.floor(bass * (this.temperatures.length - 1))
    return this.temperatures[index]
  }

  getSharpness(high) {
    const sharpnesses = ['dull', 'blunt', 'edge', 'point', 'needle', 'razor', 'scalpel', 'laser']
    const index = Math.floor(high * (sharpnesses.length - 1))
    return sharpnesses[index]
  }

  getCombinedSensation(audio, tempo) {
    // Create impossible combined sensations
    const combinations = [
      () => `${this.getSmell(audio.centroid)} tastes like ${this.getTaste(audio.amplitude)}`,
      () => `${this.getTexture(tempo)} ${this.getSmell(audio.centroid)}`,
      () => `${this.getTemperature(audio.bass)} ${this.getTaste(audio.amplitude)}`,
      () => `the ${this.getSmell(audio.centroid)} of ${this.getTexture(tempo)}`,
      () => `${this.getTaste(audio.amplitude)}-colored ${this.getSmell(audio.centroid)}`,
      () => `${this.getSharpness(audio.high)} ${this.getTemperature(audio.bass)}`,
      () => `${this.getTexture(tempo)} silence`,
      () => `liquid ${this.getSmell(audio.centroid)}`,
      () => `crystallized ${this.getTaste(audio.amplitude)}`,
      () => `the weight of ${this.getSmell(audio.centroid)}`,
    ]

    return combinations[Math.floor(Math.random() * combinations.length)]()
  }

  spawnWord(text, type, intensity, params) {
    const typeColors = {
      smell: { h: 280, s: 60 },      // Purple
      taste: { h: 30, s: 80 },       // Orange
      texture: { h: 180, s: 50 },    // Cyan
      temperature: { h: 0, s: 70 },  // Red
      sharpness: { h: 60, s: 70 },   // Yellow
      combined: { h: 120, s: 50 }    // Green
    }

    const color = typeColors[type] || { h: 0, s: 0 }

    this.words.push({
      text: text,
      type: type,
      x: Math.random() * this.width,
      y: type === 'combined' ? this.height / 2 : Math.random() * this.height * 0.7 + 50,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 2 - 1,
      life: 100 + Math.random() * 100,
      maxLife: 100 + Math.random() * 100,
      size: type === 'combined' ? 16 + intensity * 10 : 12 + intensity * 8,
      hue: color.h + Math.random() * 30 - 15,
      saturation: color.s,
      rotation: (Math.random() - 0.5) * 0.3,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      intensity: intensity
    })

    while (this.words.length > this.maxWords) {
      this.words.shift()
    }
  }

  draw() {
    const params = tuner.getAll()
    const decay = params.decay

    // Dark background
    this.ctx.fillStyle = `rgba(5, 5, 10, ${1 - decay * 0.7})`
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw trails first (background)
    this.drawTrails()

    // Draw words
    this.drawWords()

    // Draw legend
    this.drawLegend()

    // Draw sensation meter
    this.drawSensationMeter()
  }

  drawTrails() {
    this.ctx.font = '10px serif'
    this.trails.forEach(t => {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${t.alpha})`
      this.ctx.fillText(t.text, t.x, t.y)
    })
  }

  drawWords() {
    this.words.forEach(w => {
      const alpha = Math.min(1, w.life / 30)
      const scale = 0.5 + (w.life / w.maxLife) * 0.5

      this.ctx.save()
      this.ctx.translate(w.x, w.y)
      this.ctx.rotate(w.rotation)
      this.ctx.scale(scale, scale)

      // Glow effect
      this.ctx.shadowColor = `hsla(${w.hue}, ${w.saturation}%, 60%, ${alpha * 0.5})`
      this.ctx.shadowBlur = 10

      // Text
      this.ctx.font = `${w.type === 'combined' ? 'italic ' : ''}${w.size}px serif`
      this.ctx.fillStyle = `hsla(${w.hue}, ${w.saturation}%, 70%, ${alpha})`
      this.ctx.textAlign = 'center'
      this.ctx.fillText(w.text, 0, 0)

      // Type indicator (small)
      if (w.type !== 'combined') {
        this.ctx.font = '8px monospace'
        this.ctx.fillStyle = `hsla(${w.hue}, ${w.saturation}%, 50%, ${alpha * 0.5})`
        this.ctx.fillText(`[${w.type}]`, 0, w.size * 0.8)
      }

      this.ctx.restore()
    })
  }

  drawLegend() {
    const legend = [
      { type: 'smell', label: 'PITCH → SMELL', color: 'hsl(280, 60%, 60%)' },
      { type: 'taste', label: 'VOLUME → TASTE', color: 'hsl(30, 80%, 60%)' },
      { type: 'texture', label: 'RHYTHM → TEXTURE', color: 'hsl(180, 50%, 60%)' },
      { type: 'temperature', label: 'BASS → TEMPERATURE', color: 'hsl(0, 70%, 60%)' },
    ]

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.fillRect(10, 10, 180, legend.length * 18 + 10)

    this.ctx.font = '10px monospace'
    legend.forEach((item, i) => {
      this.ctx.fillStyle = item.color
      this.ctx.fillText(item.label, 20, 28 + i * 18)
    })
  }

  drawSensationMeter() {
    // Count words by type
    const counts = {}
    this.words.forEach(w => {
      counts[w.type] = (counts[w.type] || 0) + 1
    })

    const x = this.width - 120
    const y = 20
    const barHeight = 8
    const maxWidth = 100

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.fillRect(x - 10, y - 10, 120, 100)

    this.ctx.font = '9px monospace'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.fillText('SENSATION LOAD', x, y + 5)

    const types = ['smell', 'taste', 'texture', 'temperature', 'combined']
    const colors = ['hsl(280,60%,50%)', 'hsl(30,80%,50%)', 'hsl(180,50%,50%)', 'hsl(0,70%,50%)', 'hsl(120,50%,50%)']

    types.forEach((type, i) => {
      const count = counts[type] || 0
      const width = (count / 30) * maxWidth // 30 as max per type

      this.ctx.fillStyle = 'rgba(255,255,255,0.1)'
      this.ctx.fillRect(x, y + 15 + i * 15, maxWidth, barHeight)

      this.ctx.fillStyle = colors[i]
      this.ctx.fillRect(x, y + 15 + i * 15, Math.min(width, maxWidth), barHeight)
    })
  }

  clear() {
    this.words = []
    this.trails = []
    this.beatHistory = []
  }
}
