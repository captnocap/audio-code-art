import { MODES, MODE_LIST } from './modes/index.js'
import { FlowParticlesMode } from './modes/flowParticles.js'
import { PixelSortMode } from './modes/pixelSort.js'
import { MandalaMode } from './modes/mandala.js'
import { LSystemMode } from './modes/lsystem.js'
import { RingsMode } from './modes/rings.js'
import { ConstellationMode } from './modes/constellation.js'
import { TerrainMode } from './modes/terrain.js'
import { MirrorMode } from './modes/mirror.js'
import { PlotterMode } from './modes/plotter.js'
import { SpirographMode } from './modes/spirograph.js'
import { AutomataMode } from './modes/automata.js'
import { OrbitsMode } from './modes/orbits.js'
import { VoronoiMode } from './modes/voronoi.js'
import { MyceliumMode } from './modes/mycelium.js'
import { ContoursMode } from './modes/contours.js'
import { StainedGlassMode } from './modes/stainedglass.js'
import { IsometricMode } from './modes/isometric.js'
import { CymaticsMode } from './modes/cymatics.js'
import { ReactionDiffusionMode } from './modes/reactiondiffusion.js'
import { MolecularMode } from './modes/molecular.js'
import { CrystalMode } from './modes/crystal.js'
import { OrbitalsMode } from './modes/orbitals.js'
import { CombustionMode } from './modes/combustion.js'
import { TitrationMode } from './modes/titration.js'
import { PolymerMode } from './modes/polymer.js'
import { ElectrochemistryMode } from './modes/electrochemistry.js'
import { PipesMode } from './modes/pipes.js'
import { MandelbrotMode } from './modes/mandelbrot.js'
import { JSXGenMode } from './modes/jsxgen.js'
import { AIChatMode } from './modes/aichat.js'
import { BulletHellMode } from './modes/bullethell.js'
import { TetrisMode } from './modes/tetris.js'
import { MinesweeperMode } from './modes/minesweeper.js'
import { AudiosurfMode } from './modes/audiosurf.js'
import { svgExporter } from '../export/svg.js'

const MODE_CLASSES = {
  flowParticles: FlowParticlesMode,
  pixelSort: PixelSortMode,
  mandala: MandalaMode,
  lsystem: LSystemMode,
  rings: RingsMode,
  constellation: ConstellationMode,
  terrain: TerrainMode,
  mirror: MirrorMode,
  plotter: PlotterMode,
  spirograph: SpirographMode,
  automata: AutomataMode,
  orbits: OrbitsMode,
  voronoi: VoronoiMode,
  mycelium: MyceliumMode,
  contours: ContoursMode,
  stainedglass: StainedGlassMode,
  isometric: IsometricMode,
  cymatics: CymaticsMode,
  reactiondiffusion: ReactionDiffusionMode,
  molecular: MolecularMode,
  crystal: CrystalMode,
  orbitals: OrbitalsMode,
  combustion: CombustionMode,
  titration: TitrationMode,
  polymer: PolymerMode,
  electrochemistry: ElectrochemistryMode,
  pipes: PipesMode,
  mandelbrot: MandelbrotMode,
  jsxgen: JSXGenMode,
  aichat: AIChatMode,
  bullethell: BulletHellMode,
  tetris: TetrisMode,
  minesweeper: MinesweeperMode,
  audiosurf: AudiosurfMode
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.width = 0
    this.height = 0
    this.isRunning = false
    this.lastTime = 0
    this.fps = 0
    this.frameCount = 0
    this.fpsUpdateTime = 0

    // Mode system
    this.currentMode = null
    this.currentModeName = 'flowParticles'

    // For high-res export
    this.exportWidth = 3840
    this.exportHeight = 2160

    // Background transparency (for YouTube overlay)
    this.transparentBackground = false

    // Pan/zoom reference (set externally)
    this.panZoom = null

    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  setPanZoom(panZoom) {
    this.panZoom = panZoom
  }

  setTransparentBackground(transparent) {
    this.transparentBackground = transparent
    if (this.currentMode) {
      this.currentMode.transparentBackground = transparent
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.canvas.width = this.width * dpr
    this.canvas.height = this.height * dpr
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`

    this.ctx.scale(dpr, dpr)

    if (this.currentMode) {
      this.currentMode.resize(this.width, this.height)
    }
  }

  async setMode(modeName) {
    if (!MODE_CLASSES[modeName]) {
      console.error(`Unknown mode: ${modeName}`)
      return
    }

    // Clean up previous mode if it has a destroy method
    if (this.currentMode && typeof this.currentMode.destroy === 'function') {
      this.currentMode.destroy()
    }

    this.currentModeName = modeName
    const ModeClass = MODE_CLASSES[modeName]
    this.currentMode = new ModeClass(this.ctx, this.width, this.height)
    this.currentMode.transparentBackground = this.transparentBackground
    this.currentMode.init()
    this.clear()
  }

  getModeList() {
    return Object.entries(MODES).map(([key, info]) => ({
      key,
      name: info.name,
      description: info.description,
      icon: info.icon
    }))
  }

  init() {
    this.setMode(this.currentModeName)
  }

  start() {
    if (!this.currentMode) this.init()
    this.isRunning = true
    this.lastTime = performance.now()
    this.fpsUpdateTime = this.lastTime
  }

  stop() {
    this.isRunning = false
  }

  clear() {
    // Always clear in screen space first
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (this.transparentBackground) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    } else {
      this.ctx.fillStyle = '#0a0a0a'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
    if (this.currentMode) {
      this.currentMode.clear()
    }
  }

  update(audioFeatures, beatInfo) {
    if (!this.isRunning || !this.currentMode) return

    const now = performance.now()
    this.lastTime = now

    // FPS calculation
    this.frameCount++
    if (now - this.fpsUpdateTime > 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.fpsUpdateTime = now
    }

    this.currentMode.update(audioFeatures, beatInfo)
  }

  draw() {
    if (this.currentMode) {
      // Clear in screen space first (before transform)
      // This prevents duplicate frames when zoomed
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      if (this.transparentBackground) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      } else {
        this.ctx.fillStyle = '#0a0a0a'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      }

      // Apply pan/zoom transform before drawing content
      if (this.panZoom) {
        this.panZoom.applyTransform(this.ctx)
      }

      this.currentMode.draw()

      // Reset transform after drawing
      if (this.panZoom) {
        this.panZoom.resetTransform(this.ctx)
      }
    }
  }

  render(audioFeatures, beatInfo) {
    this.update(audioFeatures, beatInfo)
    this.draw()
    return this.fps
  }

  // Export high-resolution PNG
  exportPNG() {
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = this.exportWidth
    exportCanvas.height = this.exportHeight
    const exportCtx = exportCanvas.getContext('2d')

    // Scale current canvas to export size
    exportCtx.fillStyle = '#0a0a0a'
    exportCtx.fillRect(0, 0, this.exportWidth, this.exportHeight)

    // Draw scaled version of current canvas
    exportCtx.drawImage(
      this.canvas,
      0, 0, this.canvas.width, this.canvas.height,
      0, 0, this.exportWidth, this.exportHeight
    )

    // Trigger download
    const link = document.createElement('a')
    const modeName = this.currentModeName
    link.download = `audio-canvas-${modeName}-${Date.now()}.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }

  // Export as SVG (for modes that support it)
  exportSVG() {
    if (!this.currentMode || typeof this.currentMode.exportSVG !== 'function') {
      console.warn(`SVG export not supported for mode: ${this.currentModeName}`)
      alert(`SVG export is available for: Constellation, Tree, Plotter`)
      return
    }

    const svgContent = this.currentMode.exportSVG(this.width, this.height)
    if (svgContent) {
      const modeName = this.currentModeName
      svgExporter.download(svgContent, `audio-canvas-${modeName}-${Date.now()}.svg`)
    }
  }

  // Check if current mode supports SVG export
  supportsSVG() {
    return this.currentMode && typeof this.currentMode.exportSVG === 'function'
  }
}
