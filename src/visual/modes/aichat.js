import { VisualizationMode } from './base.js'

// AI Chat Mode - Responses become visual chaos
// Multiple visualization modes blend together driven by text

export class AIChatMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'aichat'
    this.description = 'AI chat where responses become multi-mode visual chaos'

    // Chat state
    this.messages = []
    this.currentResponse = ''
    this.responseIndex = 0
    this.isStreaming = false
    this.streamSpeed = 3 // characters per frame

    // Visual layers - each "mode" as a simple system
    this.particles = []      // Flow-like particles
    this.constellations = [] // Star points that connect
    this.rings = []          // Expanding rings
    this.glyphs = []         // Floating text fragments
    this.fractals = []       // Branching structures
    this.pixels = []         // Pixel sort bands

    // Layer activity levels (0-1)
    this.layerActivity = {
      particles: 0,
      constellation: 0,
      rings: 0,
      glyphs: 0,
      fractals: 0,
      pixels: 0
    }

    // Word analysis cache
    this.wordQueue = []
    this.currentWord = ''

    // Color state
    this.hueBase = Math.random() * 360
    this.hueShift = 0

    // UI elements
    this.inputVisible = true
    this.inputText = ''
    this.chatHistory = []
    this.maxHistory = 50

    // Response generation (simple markov-ish for demo, or could hook to API)
    this.responseBank = this.buildResponseBank()

    this.setupInput()
  }

  buildResponseBank() {
    // Poetic/abstract phrases that work well visually
    return {
      starters: [
        "The patterns emerge from",
        "I see cascading",
        "There's a resonance in",
        "Consider the way",
        "Fragments of",
        "The signal reveals",
        "Between the lines of",
        "Echoing through",
        "The structure suggests",
        "Underneath it all",
      ],
      middles: [
        "crystalline thought structures",
        "recursive loops of meaning",
        "shimmering data streams",
        "fractured light and shadow",
        "waves of information",
        "tangled neural pathways",
        "dissolving boundaries",
        "emergent complexity",
        "probabilistic dreams",
        "encoded memories",
        "synthetic intuition",
        "quantum uncertainty",
        "layered abstractions",
        "flickering possibilities",
      ],
      connectors: [
        "interweaving with",
        "colliding against",
        "flowing through",
        "transforming into",
        "resonating with",
        "branching from",
        "dissolving into",
        "emerging from",
        "spiraling around",
      ],
      enders: [
        "like light through water.",
        "in infinite regression.",
        "beyond comprehension.",
        "at the edge of meaning.",
        "where patterns dissolve.",
        "into pure sensation.",
        "through endless recursion.",
        "across dimensional boundaries.",
        "within the noise.",
        "toward emergence.",
      ]
    }
  }

  generateResponse(input) {
    // Analyze input for flavor
    const hasQuestion = input.includes('?')
    const wordCount = input.split(/\s+/).length
    const sentiment = this.analyzeSentiment(input)

    // Build response
    const bank = this.responseBank
    let response = ''

    // 2-4 sentences
    const sentences = 2 + Math.floor(Math.random() * 3)

    for (let i = 0; i < sentences; i++) {
      response += bank.starters[Math.floor(Math.random() * bank.starters.length)] + ' '
      response += bank.middles[Math.floor(Math.random() * bank.middles.length)] + ' '

      if (Math.random() > 0.4) {
        response += bank.connectors[Math.floor(Math.random() * bank.connectors.length)] + ' '
        response += bank.middles[Math.floor(Math.random() * bank.middles.length)] + ' '
      }

      response += bank.enders[Math.floor(Math.random() * bank.enders.length)] + ' '
    }

    return response.trim()
  }

  analyzeSentiment(text) {
    // Simple keyword-based sentiment
    const positive = ['good', 'great', 'love', 'beautiful', 'amazing', 'yes', 'happy']
    const negative = ['bad', 'hate', 'ugly', 'no', 'sad', 'angry', 'wrong']
    const technical = ['code', 'function', 'data', 'algorithm', 'system', 'process']
    const emotional = ['feel', 'think', 'believe', 'want', 'need', 'hope']

    const lower = text.toLowerCase()
    let score = { valence: 0, technical: 0, emotional: 0 }

    positive.forEach(w => { if (lower.includes(w)) score.valence += 0.2 })
    negative.forEach(w => { if (lower.includes(w)) score.valence -= 0.2 })
    technical.forEach(w => { if (lower.includes(w)) score.technical += 0.3 })
    emotional.forEach(w => { if (lower.includes(w)) score.emotional += 0.3 })

    return score
  }

  setupInput() {
    // Create chat UI overlay
    this.createChatUI()

    // Keyboard handler for canvas focus
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.inputVisible = !this.inputVisible
        this.updateUIVisibility()
      }
    })
  }

  createChatUI() {
    // Check if already exists
    if (document.getElementById('ai-chat-container')) return

    const container = document.createElement('div')
    container.id = 'ai-chat-container'
    container.innerHTML = `
      <div id="ai-chat-history"></div>
      <div id="ai-chat-input-row">
        <input type="text" id="ai-chat-input" placeholder="Say something..." autocomplete="off" />
        <button id="ai-chat-send">→</button>
      </div>
    `

    // Styles
    const style = document.createElement('style')
    style.textContent = `
      #ai-chat-container {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        width: 500px;
        max-width: 90vw;
        z-index: 200;
        font-family: 'SF Mono', Monaco, monospace;
      }
      #ai-chat-history {
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 10px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      #ai-chat-history:empty {
        display: none;
      }
      .chat-message {
        margin: 8px 0;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.5;
      }
      .chat-message.user {
        background: rgba(100, 150, 255, 0.2);
        color: #8af;
        margin-left: 20%;
        text-align: right;
      }
      .chat-message.ai {
        background: rgba(255, 100, 150, 0.2);
        color: #faa;
        margin-right: 20%;
      }
      .chat-message.ai.streaming {
        border: 1px solid rgba(255, 100, 150, 0.4);
      }
      #ai-chat-input-row {
        display: flex;
        gap: 8px;
      }
      #ai-chat-input {
        flex: 1;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: #fff;
        font-family: inherit;
        font-size: 14px;
        outline: none;
      }
      #ai-chat-input:focus {
        border-color: rgba(255, 255, 255, 0.4);
        background: rgba(0, 0, 0, 0.8);
      }
      #ai-chat-send {
        padding: 12px 20px;
        background: rgba(255, 100, 150, 0.3);
        border: 1px solid rgba(255, 100, 150, 0.5);
        border-radius: 8px;
        color: #fff;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }
      #ai-chat-send:hover {
        background: rgba(255, 100, 150, 0.5);
      }
      #ai-chat-container.hidden {
        opacity: 0;
        pointer-events: none;
      }
    `

    document.head.appendChild(style)
    document.body.appendChild(container)

    // Event handlers
    const input = document.getElementById('ai-chat-input')
    const sendBtn = document.getElementById('ai-chat-send')

    const send = () => {
      const text = input.value.trim()
      if (text && !this.isStreaming) {
        this.handleUserMessage(text)
        input.value = ''
      }
    }

    sendBtn.addEventListener('click', send)
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') send()
    })
  }

  updateUIVisibility() {
    const container = document.getElementById('ai-chat-container')
    if (container) {
      container.classList.toggle('hidden', !this.inputVisible)
    }
  }

  handleUserMessage(text) {
    // Add user message to history
    this.addToHistory('user', text)

    // Analyze and trigger visuals
    this.analyzeAndVisualize(text, 'user')

    // Generate response
    const response = this.generateResponse(text)

    // Start streaming response
    this.startResponseStream(response)
  }

  addToHistory(role, text) {
    const history = document.getElementById('ai-chat-history')
    if (!history) return

    const msg = document.createElement('div')
    msg.className = `chat-message ${role}`
    msg.textContent = text
    if (role === 'ai' && this.isStreaming) {
      msg.classList.add('streaming')
      msg.id = 'ai-streaming-message'
    }
    history.appendChild(msg)
    history.scrollTop = history.scrollHeight

    // Trim history
    while (history.children.length > this.maxHistory) {
      history.removeChild(history.firstChild)
    }
  }

  startResponseStream(response) {
    this.currentResponse = response
    this.responseIndex = 0
    this.isStreaming = true

    // Add empty AI message
    this.addToHistory('ai', '')
  }

  updateResponseStream() {
    if (!this.isStreaming) return

    const msg = document.getElementById('ai-streaming-message')
    if (!msg) return

    // Stream characters
    const charsToAdd = Math.min(this.streamSpeed, this.currentResponse.length - this.responseIndex)

    for (let i = 0; i < charsToAdd; i++) {
      const char = this.currentResponse[this.responseIndex]
      msg.textContent += char

      // Trigger visuals for each character
      this.onCharacter(char)

      // Word boundary
      if (char === ' ' || char === '.' || char === ',') {
        if (this.currentWord.length > 0) {
          this.onWord(this.currentWord)
          this.currentWord = ''
        }
      } else {
        this.currentWord += char
      }

      this.responseIndex++
    }

    // Check if done
    if (this.responseIndex >= this.currentResponse.length) {
      this.isStreaming = false
      msg.classList.remove('streaming')
      msg.removeAttribute('id')

      // Final word
      if (this.currentWord.length > 0) {
        this.onWord(this.currentWord)
        this.currentWord = ''
      }
    }

    // Scroll
    const history = document.getElementById('ai-chat-history')
    if (history) history.scrollTop = history.scrollHeight
  }

  analyzeAndVisualize(text, source) {
    const words = text.split(/\s+/)
    words.forEach((word, i) => {
      setTimeout(() => this.onWord(word), i * 50)
    })
  }

  onCharacter(char) {
    const code = char.charCodeAt(0)

    // Spawn particle based on char code
    if (Math.random() < 0.3) {
      this.spawnParticle(code)
    }

    // Shift hue
    this.hueShift += (code % 10) - 5
  }

  onWord(word) {
    if (!word || word.length === 0) return

    const len = word.length
    const code = word.charCodeAt(0)
    const vowelRatio = (word.match(/[aeiou]/gi) || []).length / len

    // Different words trigger different layers
    if (len > 8) {
      // Long words = fractals
      this.layerActivity.fractals = Math.min(1, this.layerActivity.fractals + 0.3)
      this.spawnFractal(word)
    }

    if (vowelRatio > 0.4) {
      // Vowel-heavy = rings (flowing, open sounds)
      this.layerActivity.rings = Math.min(1, this.layerActivity.rings + 0.2)
      this.spawnRing(word)
    }

    if (len <= 4) {
      // Short words = constellation points
      this.layerActivity.constellation = Math.min(1, this.layerActivity.constellation + 0.15)
      this.spawnStar(word)
    }

    // Always spawn some particles
    this.layerActivity.particles = Math.min(1, this.layerActivity.particles + 0.1)
    for (let i = 0; i < len; i++) {
      this.spawnParticle(word.charCodeAt(i % word.length))
    }

    // Spawn floating glyph
    if (Math.random() < 0.4) {
      this.spawnGlyph(word)
    }

    // Technical words = pixel sort bands
    if (/^[a-z]+$/.test(word) && len > 5) {
      this.layerActivity.pixels = Math.min(1, this.layerActivity.pixels + 0.2)
      this.spawnPixelBand()
    }
  }

  spawnParticle(seed) {
    const angle = (seed / 255) * Math.PI * 2
    const speed = 1 + Math.random() * 2

    this.particles.push({
      x: this.width / 2 + (Math.random() - 0.5) * 200,
      y: this.height / 2 + (Math.random() - 0.5) * 200,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 100 + Math.random() * 100,
      maxLife: 100 + Math.random() * 100,
      size: 2 + Math.random() * 3,
      hue: (this.hueBase + this.hueShift + seed) % 360
    })

    // Limit particles
    if (this.particles.length > 500) {
      this.particles.shift()
    }
  }

  spawnStar(word) {
    this.constellations.push({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: 3 + word.length,
      life: 200 + Math.random() * 200,
      maxLife: 200 + Math.random() * 200,
      word: word,
      hue: (this.hueBase + this.hueShift + word.charCodeAt(0) * 10) % 360
    })

    if (this.constellations.length > 50) {
      this.constellations.shift()
    }
  }

  spawnRing(word) {
    this.rings.push({
      x: this.width / 2 + (Math.random() - 0.5) * this.width * 0.5,
      y: this.height / 2 + (Math.random() - 0.5) * this.height * 0.5,
      radius: 10,
      maxRadius: 100 + word.length * 20,
      life: 100,
      maxLife: 100,
      hue: (this.hueBase + this.hueShift) % 360
    })

    if (this.rings.length > 20) {
      this.rings.shift()
    }
  }

  spawnFractal(word) {
    this.fractals.push({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      angle: Math.random() * Math.PI * 2,
      depth: Math.min(5, Math.floor(word.length / 2)),
      life: 150,
      maxLife: 150,
      len: 30 + word.length * 3,
      hue: (this.hueBase + this.hueShift) % 360
    })

    if (this.fractals.length > 10) {
      this.fractals.shift()
    }
  }

  spawnGlyph(word) {
    this.glyphs.push({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random() * 2,
      text: word,
      life: 100 + Math.random() * 100,
      maxLife: 100 + Math.random() * 100,
      size: 12 + Math.random() * 12,
      hue: (this.hueBase + this.hueShift) % 360
    })

    if (this.glyphs.length > 30) {
      this.glyphs.shift()
    }
  }

  spawnPixelBand() {
    this.pixels.push({
      y: Math.random() * this.height,
      height: 5 + Math.random() * 20,
      life: 50,
      maxLife: 50,
      direction: Math.random() > 0.5 ? 1 : -1,
      hue: (this.hueBase + this.hueShift) % 360
    })

    if (this.pixels.length > 15) {
      this.pixels.shift()
    }
  }

  init() {
    this.particles = []
    this.constellations = []
    this.rings = []
    this.glyphs = []
    this.fractals = []
    this.pixels = []
    this.createChatUI()
  }

  resize(width, height) {
    this.width = width
    this.height = height
  }

  update(audioFeatures, beatInfo) {
    // Stream response text
    this.updateResponseStream()

    // Decay layer activities
    Object.keys(this.layerActivity).forEach(key => {
      this.layerActivity[key] *= 0.98
    })

    // Update particles (flow-like)
    this.particles = this.particles.filter(p => {
      p.life--
      p.x += p.vx
      p.y += p.vy

      // Slight noise
      p.vx += (Math.random() - 0.5) * 0.1
      p.vy += (Math.random() - 0.5) * 0.1

      // Damping
      p.vx *= 0.99
      p.vy *= 0.99

      return p.life > 0
    })

    // Update constellations
    this.constellations = this.constellations.filter(s => {
      s.life--
      return s.life > 0
    })

    // Update rings
    this.rings = this.rings.filter(r => {
      r.life--
      r.radius += (r.maxRadius - r.radius) * 0.05
      return r.life > 0
    })

    // Update glyphs
    this.glyphs = this.glyphs.filter(g => {
      g.life--
      g.x += g.vx
      g.y += g.vy
      g.vy += 0.02 // slight gravity
      return g.life > 0
    })

    // Update fractals
    this.fractals = this.fractals.filter(f => {
      f.life--
      return f.life > 0
    })

    // Update pixels
    this.pixels = this.pixels.filter(p => {
      p.life--
      return p.life > 0
    })

    // Slowly drift hue
    this.hueBase += 0.1
  }

  draw() {
    // Layer 1: Pixel sort bands (background)
    this.drawPixelBands()

    // Layer 2: Rings
    this.drawRings()

    // Layer 3: Fractals
    this.drawFractals()

    // Layer 4: Constellation
    this.drawConstellation()

    // Layer 5: Particles
    this.drawParticles()

    // Layer 6: Glyphs (foreground)
    this.drawGlyphs()

    // Activity indicators
    this.drawActivityMeter()
  }

  drawPixelBands() {
    this.pixels.forEach(p => {
      const alpha = (p.life / p.maxLife) * 0.4
      const gradient = this.ctx.createLinearGradient(0, p.y, this.width, p.y)

      if (p.direction > 0) {
        gradient.addColorStop(0, `hsla(${p.hue}, 70%, 50%, 0)`)
        gradient.addColorStop(0.5, `hsla(${p.hue}, 70%, 50%, ${alpha})`)
        gradient.addColorStop(1, `hsla(${p.hue}, 70%, 50%, 0)`)
      } else {
        gradient.addColorStop(0, `hsla(${p.hue + 180}, 70%, 50%, 0)`)
        gradient.addColorStop(0.5, `hsla(${p.hue + 180}, 70%, 50%, ${alpha})`)
        gradient.addColorStop(1, `hsla(${p.hue + 180}, 70%, 50%, 0)`)
      }

      this.ctx.fillStyle = gradient
      this.ctx.fillRect(0, p.y, this.width, p.height)
    })
  }

  drawRings() {
    this.rings.forEach(r => {
      const alpha = (r.life / r.maxLife) * 0.6
      this.ctx.strokeStyle = `hsla(${r.hue}, 70%, 60%, ${alpha})`
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
      this.ctx.stroke()
    })
  }

  drawFractals() {
    this.fractals.forEach(f => {
      const alpha = (f.life / f.maxLife) * 0.7
      this.ctx.strokeStyle = `hsla(${f.hue}, 60%, 50%, ${alpha})`
      this.ctx.lineWidth = 1
      this.drawBranch(f.x, f.y, f.angle, f.len, f.depth)
    })
  }

  drawBranch(x, y, angle, len, depth) {
    if (depth <= 0) return

    const x2 = x + Math.cos(angle) * len
    const y2 = y + Math.sin(angle) * len

    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(x2, y2)
    this.ctx.stroke()

    const shrink = 0.7
    const spread = 0.4 + Math.random() * 0.3

    this.drawBranch(x2, y2, angle - spread, len * shrink, depth - 1)
    this.drawBranch(x2, y2, angle + spread, len * shrink, depth - 1)
  }

  drawConstellation() {
    // Draw connections first
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    this.ctx.lineWidth = 1

    for (let i = 0; i < this.constellations.length; i++) {
      const s1 = this.constellations[i]
      for (let j = i + 1; j < this.constellations.length; j++) {
        const s2 = this.constellations[j]
        const dx = s2.x - s1.x
        const dy = s2.y - s1.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 200) {
          const alpha = (1 - dist / 200) * 0.3 * (s1.life / s1.maxLife) * (s2.life / s2.maxLife)
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
          this.ctx.beginPath()
          this.ctx.moveTo(s1.x, s1.y)
          this.ctx.lineTo(s2.x, s2.y)
          this.ctx.stroke()
        }
      }
    }

    // Draw stars
    this.constellations.forEach(s => {
      const alpha = (s.life / s.maxLife)
      this.ctx.fillStyle = `hsla(${s.hue}, 60%, 70%, ${alpha})`
      this.ctx.beginPath()
      this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
      this.ctx.fill()
    })
  }

  drawParticles() {
    this.particles.forEach(p => {
      const alpha = (p.life / p.maxLife) * 0.8
      this.ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${alpha})`
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fill()
    })
  }

  drawGlyphs() {
    this.ctx.font = '14px "SF Mono", Monaco, monospace'

    this.glyphs.forEach(g => {
      const alpha = (g.life / g.maxLife) * 0.8
      this.ctx.fillStyle = `hsla(${g.hue}, 60%, 70%, ${alpha})`
      this.ctx.font = `${g.size}px "SF Mono", Monaco, monospace`
      this.ctx.fillText(g.text, g.x, g.y)
    })
  }

  drawActivityMeter() {
    // Small visualization of which layers are active
    const x = 20
    let y = 80
    const barWidth = 60
    const barHeight = 4

    this.ctx.font = '10px "SF Mono", Monaco, monospace'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'

    Object.entries(this.layerActivity).forEach(([name, value]) => {
      // Label
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      this.ctx.fillText(name.slice(0, 6), x, y)

      // Bar background
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      this.ctx.fillRect(x + 50, y - 8, barWidth, barHeight)

      // Bar fill
      const hue = (this.hueBase + name.charCodeAt(0) * 20) % 360
      this.ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.7)`
      this.ctx.fillRect(x + 50, y - 8, barWidth * value, barHeight)

      y += 15
    })
  }

  clear() {
    this.particles = []
    this.constellations = []
    this.rings = []
    this.glyphs = []
    this.fractals = []
    this.pixels = []

    // Clear chat history UI
    const history = document.getElementById('ai-chat-history')
    if (history) history.innerHTML = ''
  }

  destroy() {
    // Clean up UI when switching modes
    const container = document.getElementById('ai-chat-container')
    if (container) container.remove()
  }
}
