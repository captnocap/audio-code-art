// ASCII Renderer
// Text-based visualization - the whole screen is characters

import { pitchTempoToRGB } from './palette.js'

// Character sets by density (dark to light)
const DENSITY_CHARS = ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'
const BLOCK_CHARS = ' ░▒▓█'
const MINIMAL_CHARS = ' .-:=+*#%@'
const BRAILLE_BASE = 0x2800  // Unicode braille patterns

export class ASCIIRenderer {
  constructor(container) {
    this.container = container
    this.element = null
    this.width = 0
    this.height = 0
    this.cols = 120
    this.rows = 40
    this.grid = []
    this.colorGrid = []
    this.charSet = MINIMAL_CHARS

    // Word/character injection
    this.floatingWords = []
    this.characterRain = []

    // Settings
    this.colorMode = true
    this.rainSpeed = 0.5
    this.wordDecay = 5000  // ms before words fade

    this.init()
  }

  init() {
    // Create pre element for ASCII display
    this.element = document.createElement('pre')
    this.element.id = 'ascii-display'
    this.element.style.cssText = `
      position: fixed;
      inset: 0;
      margin: 0;
      padding: 20px;
      font-family: 'SF Mono', 'Monaco', 'Consolas', 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.2;
      background: #0a0a0a;
      color: #fff;
      overflow: hidden;
      z-index: 10;
      white-space: pre;
      display: none;
      pointer-events: none;
    `
    this.container.appendChild(this.element)

    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  resize() {
    // Calculate grid size based on window
    const charWidth = 7.2   // approximate monospace char width at 12px
    const charHeight = 14.4  // line height

    this.width = window.innerWidth
    this.height = window.innerHeight
    this.cols = Math.floor((this.width - 40) / charWidth)
    this.rows = Math.floor((this.height - 40) / charHeight)

    // Initialize grids
    this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(' '))
    this.colorGrid = Array(this.rows).fill(null).map(() =>
      Array(this.cols).fill(null).map(() => ({ r: 255, g: 255, b: 255, a: 1 }))
    )
  }

  show() {
    this.element.style.display = 'block'
  }

  hide() {
    this.element.style.display = 'none'
  }

  toggle() {
    if (this.element.style.display === 'none') {
      this.show()
    } else {
      this.hide()
    }
    return this.element.style.display !== 'none'
  }

  isVisible() {
    return this.element.style.display !== 'none'
  }

  // Clear grid
  clear() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x] = ' '
        this.colorGrid[y][x] = { r: 255, g: 255, b: 255, a: 0.1 }
      }
    }
    this.floatingWords = []
    this.characterRain = []
  }

  // Map value 0-1 to character by density
  valueToChar(value, charSet = this.charSet) {
    const index = Math.floor(value * (charSet.length - 1))
    return charSet[Math.min(index, charSet.length - 1)]
  }

  // Add a word to float/rain through the display
  addWord(wordData) {
    this.floatingWords.push({
      text: wordData.text,
      x: Math.random() * (this.cols - wordData.text.length),
      y: -1,
      speed: 0.1 + Math.random() * 0.3,
      color: this.hashToColor(wordData.hash),
      confidence: wordData.confidence,
      birth: Date.now(),
      wobble: Math.random() * Math.PI * 2
    })
  }

  // Add character to rain
  addCharacter(charData) {
    this.characterRain.push({
      char: charData.char,
      x: Math.floor(Math.random() * this.cols),
      y: 0,
      speed: 0.2 + Math.random() * 0.5,
      color: this.codeToColor(charData.code),
      birth: Date.now()
    })
  }

  // Convert hash to color
  hashToColor(hash) {
    return {
      r: (hash & 0xFF0000) >> 16,
      g: (hash & 0x00FF00) >> 8,
      b: hash & 0x0000FF
    }
  }

  // Convert char code to color
  codeToColor(code) {
    const hue = (code * 2.5) % 360
    return this.hslToRgb(hue / 360, 0.7, 0.6)
  }

  hslToRgb(h, s, l) {
    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
  }

  // Update with audio features and speech data
  update(audioFeatures, speechData) {
    const { amplitude = 0, bass = 0, mid = 0, high = 0, centroid = 0.5 } = audioFeatures || {}
    const now = Date.now()

    // Clear grid each frame for cleaner updates
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.grid[y][x] = ' '
        this.colorGrid[y][x] = { r: 255, g: 255, b: 255, a: 0.1 }
      }
    }

    // Base animated pattern - ALWAYS visible, even without audio
    // Use higher base values so animation is visible immediately
    const baseAmplitude = Math.max(amplitude, 0.4) // Higher minimum for visibility
    const bassBoosted = bass + 0.3
    const midBoosted = mid + 0.3
    const highBoosted = high + 0.3

    // Audio-reactive background waves
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        // Wave pattern - always animates, audio makes it stronger
        const wave = Math.sin(x * 0.1 + now * 0.002) * bassBoosted +
                     Math.cos(y * 0.1 + now * 0.003) * midBoosted +
                     Math.sin((x + y) * 0.05 + now * 0.001) * highBoosted

        // Scale value to ensure visibility without audio
        const value = (wave + 1.5) * 0.4 * baseAmplitude

        // Lower threshold so pattern is visible
        if (value > 0.02) {
          this.grid[y][x] = this.valueToChar(Math.min(value, 1))
          const rgb = pitchTempoToRGB(centroid, 0.5, Math.min(value, 1))
          this.colorGrid[y][x] = { ...rgb, a: Math.min(value * 0.8, 1) }
        }
      }
    }

    // Update floating words
    this.floatingWords = this.floatingWords.filter(word => {
      word.y += word.speed
      word.x += Math.sin(now * 0.001 + word.wobble) * 0.1

      const age = now - word.birth
      const alpha = Math.max(0, 1 - age / this.wordDecay)

      if (word.y >= this.rows || alpha <= 0) return false

      // Draw word to grid
      const y = Math.floor(word.y)
      if (y >= 0 && y < this.rows) {
        for (let i = 0; i < word.text.length; i++) {
          const x = Math.floor(word.x) + i
          if (x >= 0 && x < this.cols) {
            this.grid[y][x] = word.text[i]
            this.colorGrid[y][x] = { ...word.color, a: alpha * word.confidence }
          }
        }
      }

      return true
    })

    // Update character rain
    this.characterRain = this.characterRain.filter(char => {
      char.y += char.speed

      const age = now - char.birth
      const alpha = Math.max(0, 1 - age / 3000)

      if (char.y >= this.rows || alpha <= 0) return false

      const x = Math.floor(char.x)
      const y = Math.floor(char.y)

      if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) {
        this.grid[y][x] = char.char
        this.colorGrid[y][x] = { ...char.color, a: alpha }
      }

      return true
    })
  }

  // Render grid to DOM
  render() {
    if (!this.isVisible()) return

    let html = ''

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const char = this.grid[y][x]
        const color = this.colorGrid[y][x]

        if (char === ' ' || color.a < 0.05) {
          html += ' '
        } else if (this.colorMode) {
          const { r, g, b, a } = color
          html += `<span style="color:rgba(${r},${g},${b},${a})">${this.escapeHtml(char)}</span>`
        } else {
          html += this.escapeHtml(char)
        }
      }
      html += '\n'
    }

    this.element.innerHTML = html
  }

  escapeHtml(char) {
    const escapes = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }
    return escapes[char] || char
  }

  // Set character set
  setCharSet(set) {
    const sets = {
      minimal: MINIMAL_CHARS,
      density: DENSITY_CHARS,
      blocks: BLOCK_CHARS
    }
    this.charSet = sets[set] || MINIMAL_CHARS
  }
}
