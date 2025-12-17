import { VisualizationMode } from './base.js'
import { pitchTempoToRGB } from '../palette.js'

// Audio Minesweeper - The song plants mines, you try to survive
// Beats spawn mines, quiet sections = safe clearing time
export class MinesweeperMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'minesweeper'
    this.description = 'Minesweeper where beats spawn mines. Clear between the chaos.'

    // Grid settings
    this.cols = 20
    this.rows = 14
    this.cellSize = Math.min(
      Math.floor((height * 0.75) / this.rows),
      Math.floor((width * 0.7) / this.cols)
    )

    // Center the grid
    this.gridX = (width - this.cols * this.cellSize) / 2
    this.gridY = (height - this.rows * this.cellSize) / 2

    // Game state
    this.grid = []
    this.revealed = []
    this.flagged = []
    this.mineCount = 0
    this.revealedCount = 0
    this.gameOver = false
    this.won = false
    this.startTime = 0
    this.elapsedTime = 0

    // Audio tracking
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
    this.mineSpawnCooldown = 0
    this.totalBeats = 0

    // Visual effects
    this.explosions = []
    this.ripples = []
    this.dangerPulse = 0

    // Mouse state
    this.mouseX = 0
    this.mouseY = 0
    this.hoverCell = null

    this.setupInput()
  }

  setupInput() {
    this.clickHandler = (e) => {
      if (this.gameOver) {
        this.init()
        return
      }

      const rect = this.ctx.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const col = Math.floor((x - this.gridX) / this.cellSize)
      const row = Math.floor((y - this.gridY) / this.cellSize)

      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        if (e.button === 0) {
          // Left click - reveal
          this.revealCell(col, row)
        }
      }
    }

    this.rightClickHandler = (e) => {
      e.preventDefault()
      if (this.gameOver) return

      const rect = this.ctx.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const col = Math.floor((x - this.gridX) / this.cellSize)
      const row = Math.floor((y - this.gridY) / this.cellSize)

      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        this.toggleFlag(col, row)
      }
    }

    this.moveHandler = (e) => {
      const rect = this.ctx.canvas.getBoundingClientRect()
      this.mouseX = e.clientX - rect.left
      this.mouseY = e.clientY - rect.top

      const col = Math.floor((this.mouseX - this.gridX) / this.cellSize)
      const row = Math.floor((this.mouseY - this.gridY) / this.cellSize)

      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        this.hoverCell = { col, row }
      } else {
        this.hoverCell = null
      }
    }

    this.ctx.canvas.addEventListener('mousedown', this.clickHandler)
    this.ctx.canvas.addEventListener('contextmenu', this.rightClickHandler)
    this.ctx.canvas.addEventListener('mousemove', this.moveHandler)
  }

  init() {
    // Initialize empty grid (mines added by audio)
    this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0))
    this.revealed = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false))
    this.flagged = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false))

    this.mineCount = 0
    this.revealedCount = 0
    this.gameOver = false
    this.won = false
    this.startTime = Date.now()
    this.elapsedTime = 0
    this.totalBeats = 0
    this.explosions = []
    this.ripples = []
  }

  spawnMine(intensity) {
    // Find a random unrevealed cell
    const candidates = []
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.revealed[r][c] && this.grid[r][c] !== -1) {
          candidates.push({ row: r, col: c })
        }
      }
    }

    if (candidates.length === 0) return

    // Pick random cell
    const cell = candidates[Math.floor(Math.random() * candidates.length)]

    // Place mine
    this.grid[cell.row][cell.col] = -1
    this.mineCount++

    // Update neighbor counts
    this.updateNeighborCounts(cell.col, cell.row)

    // Visual effect
    this.ripples.push({
      x: this.gridX + cell.col * this.cellSize + this.cellSize / 2,
      y: this.gridY + cell.row * this.cellSize + this.cellSize / 2,
      radius: 0,
      maxRadius: this.cellSize * 2,
      alpha: 0.8,
      color: `hsl(${Math.random() * 60}, 80%, 50%)`
    })
  }

  updateNeighborCounts(mineCol, mineRow) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue

        const r = mineRow + dr
        const c = mineCol + dc

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          if (this.grid[r][c] !== -1) {
            this.grid[r][c]++
          }
        }
      }
    }
  }

  revealCell(col, row) {
    if (this.revealed[row][col] || this.flagged[row][col]) return

    this.revealed[row][col] = true
    this.revealedCount++

    // Hit a mine
    if (this.grid[row][col] === -1) {
      this.gameOver = true
      this.explode(col, row)
      this.revealAllMines()
      return
    }

    // Empty cell - flood fill
    if (this.grid[row][col] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr
          const c = col + dc
          if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            this.revealCell(c, r)
          }
        }
      }
    }

    // Check win (all non-mine cells revealed)
    const totalCells = this.rows * this.cols
    const safeCells = totalCells - this.mineCount
    if (this.revealedCount >= safeCells && this.mineCount > 0) {
      this.won = true
      this.gameOver = true
    }
  }

  toggleFlag(col, row) {
    if (this.revealed[row][col]) return
    this.flagged[row][col] = !this.flagged[row][col]
  }

  explode(col, row) {
    this.explosions.push({
      x: this.gridX + col * this.cellSize + this.cellSize / 2,
      y: this.gridY + row * this.cellSize + this.cellSize / 2,
      radius: 0,
      maxRadius: this.cellSize * 4,
      alpha: 1
    })
  }

  revealAllMines() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === -1) {
          this.revealed[r][c] = true
        }
      }
    }
  }

  update(audioFeatures, beatInfo) {
    const { amplitude, centroid, bass, mid, high } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    // Smooth audio
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Update elapsed time
    if (!this.gameOver) {
      this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000)
    }

    // Spawn mines on beats (if not game over)
    if (!this.gameOver) {
      this.mineSpawnCooldown--

      if (onBeat && beatIntensity > 0.4 && this.mineSpawnCooldown <= 0) {
        // More intense beats = more mines
        const minesToSpawn = beatIntensity > 0.8 ? 2 : 1
        for (let i = 0; i < minesToSpawn; i++) {
          this.spawnMine(beatIntensity)
        }
        this.mineSpawnCooldown = 10 // Cooldown frames
        this.totalBeats++
      }

      // High amplitude also spawns mines occasionally
      if (amplitude > 0.7 && Math.random() < 0.02 && this.mineSpawnCooldown <= 0) {
        this.spawnMine(amplitude)
        this.mineSpawnCooldown = 20
      }
    }

    // Danger pulse (proximity to mines)
    this.dangerPulse = this.smoothBass * 0.5 + this.smoothAmplitude * 0.3

    // Update visual effects
    this.ripples = this.ripples.filter(r => {
      r.radius += 3
      r.alpha -= 0.02
      return r.alpha > 0
    })

    this.explosions = this.explosions.filter(e => {
      e.radius += 8
      e.alpha -= 0.03
      return e.alpha > 0
    })
  }

  draw() {
    // Draw grid background
    this.ctx.fillStyle = 'rgba(20, 25, 30, 0.95)'
    this.ctx.fillRect(
      this.gridX - 5,
      this.gridY - 5,
      this.cols * this.cellSize + 10,
      this.rows * this.cellSize + 10
    )

    // Draw ripples (mine spawn effects)
    for (const ripple of this.ripples) {
      this.ctx.beginPath()
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
      this.ctx.strokeStyle = ripple.color.replace(')', `, ${ripple.alpha})`)
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }

    // Draw cells
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.drawCell(c, r)
      }
    }

    // Draw hover highlight
    if (this.hoverCell && !this.gameOver) {
      const { col, row } = this.hoverCell
      if (!this.revealed[row][col]) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        this.ctx.lineWidth = 2
        this.ctx.strokeRect(
          this.gridX + col * this.cellSize,
          this.gridY + row * this.cellSize,
          this.cellSize,
          this.cellSize
        )
      }
    }

    // Draw explosions
    for (const exp of this.explosions) {
      const gradient = this.ctx.createRadialGradient(
        exp.x, exp.y, 0,
        exp.x, exp.y, exp.radius
      )
      gradient.addColorStop(0, `rgba(255, 200, 50, ${exp.alpha})`)
      gradient.addColorStop(0.5, `rgba(255, 100, 0, ${exp.alpha * 0.5})`)
      gradient.addColorStop(1, `rgba(255, 0, 0, 0)`)

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2)
      this.ctx.fill()
    }

    // Draw UI
    this.drawUI()

    // Game over overlay
    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      this.ctx.fillRect(0, 0, this.width, this.height)

      this.ctx.fillStyle = this.won ? '#4f4' : '#f44'
      this.ctx.font = 'bold 48px "SF Mono", Monaco, monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(this.won ? 'YOU WIN!' : 'BOOM!', this.width / 2, this.height / 2 - 20)

      this.ctx.fillStyle = '#fff'
      this.ctx.font = '20px "SF Mono", Monaco, monospace'
      this.ctx.fillText(`Time: ${this.elapsedTime}s | Mines: ${this.mineCount}`, this.width / 2, this.height / 2 + 30)

      this.ctx.font = '14px "SF Mono", Monaco, monospace'
      this.ctx.fillStyle = '#888'
      this.ctx.fillText('Click to restart', this.width / 2, this.height / 2 + 70)

      this.ctx.textAlign = 'left'
    }
  }

  drawCell(col, row) {
    const x = this.gridX + col * this.cellSize
    const y = this.gridY + row * this.cellSize
    const size = this.cellSize - 1

    if (this.revealed[row][col]) {
      // Revealed cell
      if (this.grid[row][col] === -1) {
        // Mine
        this.ctx.fillStyle = '#f44'
        this.ctx.fillRect(x, y, size, size)

        // Mine icon
        this.ctx.fillStyle = '#000'
        this.ctx.beginPath()
        this.ctx.arc(x + size/2, y + size/2, size/4, 0, Math.PI * 2)
        this.ctx.fill()

        // Spikes
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2
          this.ctx.beginPath()
          this.ctx.moveTo(x + size/2, y + size/2)
          this.ctx.lineTo(
            x + size/2 + Math.cos(angle) * size/3,
            y + size/2 + Math.sin(angle) * size/3
          )
          this.ctx.strokeStyle = '#000'
          this.ctx.lineWidth = 2
          this.ctx.stroke()
        }
      } else {
        // Empty or number
        this.ctx.fillStyle = 'rgba(40, 45, 50, 0.9)'
        this.ctx.fillRect(x, y, size, size)

        if (this.grid[row][col] > 0) {
          const colors = ['', '#4af', '#4a4', '#f44', '#44a', '#a44', '#4aa', '#444', '#888']
          this.ctx.fillStyle = colors[this.grid[row][col]] || '#fff'
          this.ctx.font = `bold ${size * 0.6}px "SF Mono", Monaco, monospace`
          this.ctx.textAlign = 'center'
          this.ctx.textBaseline = 'middle'
          this.ctx.fillText(this.grid[row][col].toString(), x + size/2, y + size/2)
          this.ctx.textAlign = 'left'
          this.ctx.textBaseline = 'alphabetic'
        }
      }
    } else {
      // Unrevealed cell
      const pulse = Math.sin(Date.now() * 0.005) * this.dangerPulse * 10

      // Check if adjacent to mine (danger glow)
      let nearMine = false
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr
          const c = col + dc
          if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            if (this.grid[r][c] === -1 && !this.revealed[r][c]) {
              nearMine = true
            }
          }
        }
      }

      if (nearMine && this.smoothAmplitude > 0.3) {
        this.ctx.fillStyle = `rgba(100, 50, 50, ${0.8 + this.dangerPulse * 0.2})`
      } else {
        this.ctx.fillStyle = 'rgba(60, 65, 70, 0.9)'
      }

      this.ctx.fillRect(x, y, size, size)

      // 3D effect
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      this.ctx.fillRect(x, y, size, 2)
      this.ctx.fillRect(x, y, 2, size)

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      this.ctx.fillRect(x, y + size - 2, size, 2)
      this.ctx.fillRect(x + size - 2, y, 2, size)

      // Flag
      if (this.flagged[row][col]) {
        this.ctx.fillStyle = '#f44'
        this.ctx.beginPath()
        this.ctx.moveTo(x + size * 0.3, y + size * 0.2)
        this.ctx.lineTo(x + size * 0.3, y + size * 0.8)
        this.ctx.lineTo(x + size * 0.7, y + size * 0.35)
        this.ctx.closePath()
        this.ctx.fill()

        this.ctx.strokeStyle = '#fff'
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.moveTo(x + size * 0.3, y + size * 0.2)
        this.ctx.lineTo(x + size * 0.3, y + size * 0.85)
        this.ctx.stroke()
      }
    }
  }

  drawUI() {
    const uiY = this.gridY - 40

    this.ctx.fillStyle = '#fff'
    this.ctx.font = '18px "SF Mono", Monaco, monospace'

    // Mine count
    this.ctx.fillText(`💣 ${this.mineCount}`, this.gridX, uiY)

    // Timer
    this.ctx.fillText(`⏱ ${this.elapsedTime}s`, this.gridX + 120, uiY)

    // Beats spawned
    this.ctx.fillStyle = '#888'
    this.ctx.font = '14px "SF Mono", Monaco, monospace'
    this.ctx.fillText(`Beats: ${this.totalBeats}`, this.gridX + 240, uiY)

    // Audio intensity bar
    const barX = this.gridX + this.cols * this.cellSize - 150
    this.ctx.fillStyle = '#333'
    this.ctx.fillRect(barX, uiY - 15, 150, 10)
    this.ctx.fillStyle = this.smoothAmplitude > 0.6 ? '#f44' : '#4af'
    this.ctx.fillRect(barX, uiY - 15, this.smoothAmplitude * 150, 10)

    // Instructions
    const hintY = this.gridY + this.rows * this.cellSize + 25
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    this.ctx.font = '12px "SF Mono", Monaco, monospace'
    this.ctx.fillText('Left click: Reveal | Right click: Flag | Beats spawn mines!', this.gridX, hintY)
  }

  clear() {
    this.init()
  }

  dispose() {
    this.ctx.canvas.removeEventListener('mousedown', this.clickHandler)
    this.ctx.canvas.removeEventListener('contextmenu', this.rightClickHandler)
    this.ctx.canvas.removeEventListener('mousemove', this.moveHandler)
  }
}
