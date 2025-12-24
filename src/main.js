import { AudioAnalyzer } from './audio/analyzer.js'
import { BeatDetector } from './audio/beatdetector.js'
import { Renderer } from './visual/renderer.js'
import { Renderer3D } from './visual/renderer3d.js'
import { MODES_3D, GeometryMode, NebulaMode, TunnelMode, ProteinMode, DemolitionMode, SoftBodyMode, DimensionalMode, GravityMode, Beach3DMode, TopographyMode, WormholeMode, HallucinationMode } from './visual/modes3d/index.js'
import { MODES_PHYSICS, RagdollMode, PinballMode, ChainMode } from './visual/modesPhysics/index.js'
import { youtubeEmbed } from './youtube/embed.js'
import { speechInterpreter } from './audio/speech.js'
import { ASCIIRenderer } from './visual/ascii.js'
import { PanZoom } from './visual/panzoom.js'
import { gifExporter } from './export/gif.js'
import { tuner } from './visual/tuner.js'

class AudioCanvas {
  constructor() {
    this.audioAnalyzer = new AudioAnalyzer()
    this.beatDetector = new BeatDetector()
    this.renderer = null
    this.renderer3d = null
    this.asciiRenderer = null
    this.isPlaying = false
    this.isRecording = false
    this.isTabCapturing = false
    this.isSpeechActive = false
    this.asciiMode = false
    this.is3DMode = false
    this.animationId = null
    this.hasVideo = false

    this.initUI()
    this.initASCII()
    this.initSpeech()
    this.initPanZoom()
    this.init3D()
  }

  initASCII() {
    const container = document.getElementById('app')
    this.asciiRenderer = new ASCIIRenderer(container)
  }

  initPanZoom() {
    const canvas = document.getElementById('canvas')
    this.panZoom = new PanZoom(canvas)
    // Connect panZoom to renderer for internal coordinate transforms
    this.renderer.setPanZoom(this.panZoom)
  }

  init3D() {
    const container = document.getElementById('app')
    this.renderer3d = new Renderer3D(container)
    this.renderer3d.mount()
    this.renderer3d.hide() // Hidden by default

    // 3D mode classes
    this.mode3DClasses = {
      geometry3d: GeometryMode,
      nebula3d: NebulaMode,
      tunnel3d: TunnelMode,
      protein3d: ProteinMode,
      demolition3d: DemolitionMode,
      softbody3d: SoftBodyMode,
      dimensional3d: DimensionalMode,
      gravity3d: GravityMode,
      beach3d: Beach3DMode,
      topography3d: TopographyMode,
      wormhole3d: WormholeMode,
      hallucination3d: HallucinationMode
    }

    // 2D Physics mode classes
    this.modePhysicsClasses = {
      ragdoll: RagdollMode,
      pinball: PinballMode,
      chains: ChainMode
    }
  }

  set3DMode(modeName) {
    const ModeClass = this.mode3DClasses[modeName]
    if (!ModeClass) {
      console.error(`Unknown 3D mode: ${modeName}`)
      return
    }

    // Switch to 3D
    this.is3DMode = true

    // Hide 2D canvas, show 3D
    document.getElementById('canvas').style.display = 'none'
    this.renderer3d.show()

    // Set the mode
    const mode = new ModeClass()
    this.renderer3d.setMode(mode)

    // Start animation if not running
    if (!this.animationId) {
      this.animate()
    }
  }

  set2DMode(modeName) {
    // Switch to 2D
    this.is3DMode = false

    // Show 2D canvas, hide 3D
    document.getElementById('canvas').style.display = 'block'
    this.renderer3d.hide()

    // Set the 2D mode
    this.renderer.setMode(modeName)
  }

  initSpeech() {
    // Wire up speech recognition callbacks
    speechInterpreter.onWord = (wordData) => {
      if (this.asciiMode) {
        this.asciiRenderer.addWord(wordData)
      }
    }

    speechInterpreter.onCharacter = (charData) => {
      if (this.asciiMode) {
        this.asciiRenderer.addCharacter(charData)
      }
    }
  }

  initUI() {
    // Canvas
    const canvas = document.getElementById('canvas')
    this.renderer = new Renderer(canvas)

    // Tab switching
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Update tab active states
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')

        // Update panel visibility
        document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'))
        const panel = document.querySelector(`[data-panel="${tab.dataset.tab}"]`)
        if (panel) {
          panel.classList.add('active')
        }
      })
    })

    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')

        const modeName = btn.dataset.mode
        // Check if it's a 3D mode (ends with '3d')
        if (modeName.endsWith('3d')) {
          this.set3DMode(modeName)
        } else {
          this.set2DMode(modeName)
        }
      })
    })

    // File input
    const dropZone = document.getElementById('drop-zone')
    const fileInput = document.getElementById('file-input')

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault()
      dropZone.classList.add('dragover')
    })

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover')
    })

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault()
      dropZone.classList.remove('dragover')
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('audio/')) {
        await this.loadAudioFile(file)
      }
    })

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (file) {
        await this.loadAudioFile(file)
      }
    })

    // Playback controls
    document.getElementById('play-btn').addEventListener('click', () => this.togglePlay())
    document.getElementById('stop-btn').addEventListener('click', () => this.stop())

    // Record button
    document.getElementById('record-btn').addEventListener('click', () => this.toggleRecord())

    // Tab capture button
    document.getElementById('tab-capture-btn').addEventListener('click', () => this.toggleTabCapture())

    // YouTube controls
    document.getElementById('youtube-load').addEventListener('click', () => this.loadYouTube())
    document.getElementById('youtube-url').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loadYouTube()
    })
    document.getElementById('youtube-clear').addEventListener('click', () => this.clearYouTube())

    // Video settings
    document.getElementById('video-toggle').addEventListener('change', (e) => {
      youtubeEmbed.setVisible(e.target.checked)
    })
    document.getElementById('video-opacity').addEventListener('input', (e) => {
      youtubeEmbed.setOpacity(e.target.value / 100)
    })

    // ASCII mode toggle
    document.getElementById('ascii-toggle')?.addEventListener('change', (e) => {
      this.toggleASCII(e.target.checked)
    })

    // Speech/Lyrics toggle
    document.getElementById('speech-toggle')?.addEventListener('change', (e) => {
      this.toggleSpeech(e.target.checked)
    })

    // Painter mode toggle
    document.getElementById('painter-toggle')?.addEventListener('change', (e) => {
      this.renderer.setPainterMode(e.target.checked)
    })

    // Fullscreen toggle
    document.getElementById('fullscreen-toggle')?.addEventListener('change', (e) => {
      this.toggleFullscreen(e.target.checked)
    })

    // Listen for fullscreen changes (user pressing Escape, etc.)
    document.addEventListener('fullscreenchange', () => {
      const isFullscreen = !!document.fullscreenElement
      document.getElementById('fullscreen-toggle').checked = isFullscreen
    })

    // Hide UI button
    document.getElementById('hide-ui-btn')?.addEventListener('click', () => {
      this.toggleUIVisibility()
    })

    // Zoom controls
    document.getElementById('zoom-in')?.addEventListener('click', () => this.panZoom?.zoomIn())
    document.getElementById('zoom-out')?.addEventListener('click', () => this.panZoom?.zoomOut())
    document.getElementById('zoom-reset')?.addEventListener('click', () => this.panZoom?.reset())

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return // Don't trigger when typing

      if (e.key === '=' || e.key === '+') {
        this.panZoom?.zoomIn()
      } else if (e.key === '-') {
        this.panZoom?.zoomOut()
      } else if (e.key === '0') {
        this.panZoom?.reset()
      } else if (e.key === 'f' || e.key === 'F') {
        const toggle = document.getElementById('fullscreen-toggle')
        toggle.checked = !toggle.checked
        this.toggleFullscreen(toggle.checked)
      } else if (e.key === 'h' || e.key === 'H') {
        this.toggleUIVisibility()
      }

      // Forward key events to current mode if it handles them
      if (this.is3DMode && this.renderer3d?.currentMode?.handleKeyPress) {
        this.renderer3d.currentMode.handleKeyPress(e.key)
      } else if (this.renderer?.currentMode?.handleKeyPress) {
        this.renderer.currentMode.handleKeyPress(e.key)
      }
    })

    // Export buttons
    document.getElementById('export-png').addEventListener('click', () => this.exportPNG())
    document.getElementById('export-svg').addEventListener('click', () => this.exportSVG())
    document.getElementById('export-gif').addEventListener('click', () => this.exportGIF())

    // Clear button
    document.getElementById('clear-btn').addEventListener('click', () => {
      this.renderer.clear()
      this.beatDetector.reset()
    })

    // Blast beat saturation toggle
    document.getElementById('saturation-toggle').addEventListener('change', (e) => {
      this.beatDetector.setSaturationEnabled(e.target.checked)
    })

    // FPS display
    this.fpsElement = document.getElementById('fps')
    this.trackInfoElement = document.getElementById('track-info')
    this.trackNameElement = document.getElementById('track-name')

    // Help modal
    const modalOverlay = document.getElementById('modal-overlay')
    document.getElementById('help-btn').addEventListener('click', () => {
      modalOverlay.classList.remove('hidden')
    })
    document.getElementById('modal-close').addEventListener('click', () => {
      modalOverlay.classList.add('hidden')
    })
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.add('hidden')
      }
    })
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modalOverlay.classList.add('hidden')
      }
    })
  }

  async loadAudioFile(file) {
    if (!this.audioAnalyzer.audioContext) {
      await this.audioAnalyzer.init()
    }

    const info = await this.audioAnalyzer.loadFile(file)

    this.trackNameElement.textContent = info.name
    this.trackInfoElement.classList.remove('hidden')
    document.getElementById('playback-controls').classList.remove('hidden')
    document.getElementById('export-controls').classList.remove('hidden')

    // Clear previous visualization
    this.renderer.clear()
    this.beatDetector.reset()

    // Auto-play
    this.play()
  }

  play() {
    this.audioAnalyzer.play()
    this.isPlaying = true
    document.getElementById('play-btn').textContent = 'Pause'
    this.renderer.start()
    this.animate()
  }

  pause() {
    this.audioAnalyzer.pause()
    this.isPlaying = false
    document.getElementById('play-btn').textContent = 'Play'
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  stop() {
    this.audioAnalyzer.stop()
    this.isPlaying = false
    document.getElementById('play-btn').textContent = 'Play'
    this.renderer.stop()
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  async toggleRecord() {
    const btn = document.getElementById('record-btn')

    if (this.isRecording) {
      this.audioAnalyzer.stopMicrophone()
      this.isRecording = false
      btn.textContent = '🎤 Mic'
      btn.classList.remove('recording')
      this.renderer.stop()
      this.trackInfoElement.classList.add('hidden')
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
      }
    } else {
      if (!this.audioAnalyzer.audioContext) {
        await this.audioAnalyzer.init()
      }

      const success = await this.audioAnalyzer.startMicrophone()
      if (success) {
        this.isRecording = true
        btn.textContent = '⏹️ Stop'
        btn.classList.add('recording')
        document.getElementById('export-controls').classList.remove('hidden')
        this.trackNameElement.textContent = 'Recording from microphone...'
        this.trackInfoElement.classList.remove('hidden')

        // Clear and start fresh
        this.renderer.clear()
        this.beatDetector.reset()
        this.renderer.start()
        this.animate()
      }
    }
  }

  async toggleTabCapture() {
    const btn = document.getElementById('tab-capture-btn')

    if (this.isTabCapturing) {
      this.audioAnalyzer.stopTabCapture()
      this.isTabCapturing = false
      btn.textContent = '🔊 Tab'
      btn.classList.remove('tab-capturing')
      this.renderer.stop()
      if (!this.hasVideo) {
        this.trackInfoElement.classList.add('hidden')
      }
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
      }
    } else {
      if (!this.audioAnalyzer.audioContext) {
        await this.audioAnalyzer.init()
      }

      // Show instructions
      alert('Select this tab and check "Share audio" to capture YouTube/Spotify audio')

      const success = await this.audioAnalyzer.startTabCapture()
      if (success) {
        this.isTabCapturing = true
        btn.textContent = '⏹️ Stop'
        btn.classList.add('tab-capturing')
        document.getElementById('export-controls').classList.remove('hidden')

        if (!this.hasVideo) {
          this.trackNameElement.textContent = 'Capturing tab audio...'
          this.trackInfoElement.classList.remove('hidden')
        }

        // Clear and start fresh
        this.renderer.clear()
        this.beatDetector.reset()
        this.renderer.start()
        this.animate()
      }
    }
  }

  async loadYouTube() {
    const urlInput = document.getElementById('youtube-url')
    const url = urlInput.value.trim()

    if (!url) return

    try {
      const container = document.getElementById('video-container')
      const info = await youtubeEmbed.embed(url, container)

      // Set initial opacity
      const opacity = document.getElementById('video-opacity').value / 100
      youtubeEmbed.setOpacity(opacity)

      // Update UI
      this.hasVideo = true
      document.getElementById('youtube-clear').classList.remove('hidden')
      document.getElementById('video-settings').classList.remove('hidden')

      // Show video title
      this.trackNameElement.textContent = `▶️ ${info.title}`
      this.trackInfoElement.classList.remove('hidden')

      // Make canvas background transparent so video shows through
      document.getElementById('canvas').classList.add('transparent-bg')
      this.renderer.setTransparentBackground(true)

      // Show export controls
      document.getElementById('export-controls').classList.remove('hidden')

    } catch (err) {
      alert('Invalid YouTube URL')
      console.error(err)
    }
  }

  clearYouTube() {
    youtubeEmbed.remove()
    this.hasVideo = false

    document.getElementById('youtube-url').value = ''
    document.getElementById('youtube-clear').classList.add('hidden')
    document.getElementById('video-settings').classList.add('hidden')

    // Restore opaque canvas background
    document.getElementById('canvas').classList.remove('transparent-bg')
    this.renderer.setTransparentBackground(false)

    if (!this.isTabCapturing && !this.isRecording && !this.isPlaying) {
      this.trackInfoElement.classList.add('hidden')
    }
  }

  toggleASCII(enabled) {
    this.asciiMode = enabled
    if (enabled) {
      this.asciiRenderer.show()
      document.getElementById('canvas').style.opacity = '0'
      // Start animation loop if not already running
      if (!this.animationId) {
        this.animate()
      }
    } else {
      this.asciiRenderer.hide()
      document.getElementById('canvas').style.opacity = '1'
      // Stop animation if no audio
      if (!this.isPlaying && !this.isRecording && !this.isTabCapturing) {
        if (this.animationId) {
          cancelAnimationFrame(this.animationId)
          this.animationId = null
        }
      }
    }
  }

  toggleSpeech(enabled) {
    if (enabled) {
      speechInterpreter.start()
      this.isSpeechActive = true
    } else {
      speechInterpreter.stop()
      this.isSpeechActive = false
    }
  }

  toggleFullscreen(enabled) {
    if (enabled) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err)
        document.getElementById('fullscreen-toggle').checked = false
      })
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn('Exit fullscreen failed:', err)
        })
      }
    }
  }

  toggleUIVisibility() {
    document.body.classList.toggle('ui-hidden')
  }

  animate() {
    const hasAudio = this.isPlaying || this.isRecording || this.isTabCapturing

    // Stop if no audio AND no ASCII mode AND not in 3D mode
    if (!hasAudio && !this.asciiMode && !this.is3DMode) return

    let audioFeatures = null
    let beatInfo = { bpm: 0, onBeat: false, beatIntensity: 0, isSaturated: false, normalizedTempo: 0.5 }
    let fps = 0

    if (hasAudio) {
      audioFeatures = this.audioAnalyzer.getAudioFeatures()
      beatInfo = this.beatDetector.update(audioFeatures, performance.now())
    }

    // Render 3D if in 3D mode
    if (this.is3DMode) {
      if (audioFeatures) {
        this.renderer3d.update(audioFeatures, beatInfo)
      }
      this.renderer3d.render()
      fps = 60 // Approximate, could track actual FPS
    } else if (hasAudio) {
      // Render 2D
      fps = this.renderer.render(audioFeatures, beatInfo)
    }

    // Render ASCII mode if active (works with or without audio)
    if (this.asciiMode) {
      const speechData = speechInterpreter.getVisualizationData()
      this.asciiRenderer.update(audioFeatures, speechData)
      this.asciiRenderer.render()
    }

    // Update info display
    const bpmText = beatInfo.bpm > 0 ? `${beatInfo.bpm.toFixed(0)} BPM` : 'detecting...'
    const satText = beatInfo.isSaturated ? ' | BLAST' : ''
    const asciiText = this.asciiMode ? ' | ASCII' : ''
    const speechText = this.isSpeechActive ? ' | LYRICS' : ''
    const mode3DText = this.is3DMode ? ' | 3D' : ''
    this.fpsElement.textContent = `${fps} FPS | ${bpmText}${satText}${asciiText}${speechText}${mode3DText}`

    this.animationId = requestAnimationFrame(() => this.animate())
  }

  exportPNG() {
    this.renderer.exportPNG()
  }

  exportSVG() {
    this.renderer.exportSVG()
  }

  async exportGIF() {
    const btn = document.getElementById('export-gif')
    const originalText = btn.textContent

    // Check if already recording
    if (gifExporter.isRecording) {
      return
    }

    // Use the correct canvas based on mode
    const canvas = this.is3DMode
      ? this.renderer3d.renderer.domElement
      : document.getElementById('canvas')
    const modeName = this.is3DMode
      ? this.renderer3d.currentModeName
      : this.renderer.currentModeName

    // Update button to show recording state
    btn.textContent = '⏺ Recording...'
    btn.classList.add('recording')

    // Progress callback
    gifExporter.onProgress = (progress) => {
      if (gifExporter.isRecording) {
        btn.textContent = `⏺ ${Math.floor(progress * 100)}%`
      } else {
        btn.textContent = `⚙️ ${Math.floor(progress * 100)}%`
      }
    }

    try {
      // Record for 5 seconds at 20fps, output at 800x450
      await gifExporter.recordAndDownload(
        canvas,
        `audio-canvas-${modeName}-${Date.now()}.gif`,
        {
          duration: 5000,
          fps: 20,
          width: 800,
          height: 450,
          quality: 10
        }
      )
    } catch (err) {
      console.error('GIF export failed:', err)
      alert('GIF export failed: ' + err.message)
    }

    // Reset button
    btn.textContent = originalText
    btn.classList.remove('recording')
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.audioCanvas = new AudioCanvas()
})
