import { AudioAnalyzer } from './audio/analyzer.js'
import { BeatDetector } from './audio/beatdetector.js'
import { Renderer } from './visual/renderer.js'

class AudioCanvas {
  constructor() {
    this.audioAnalyzer = new AudioAnalyzer()
    this.beatDetector = new BeatDetector()
    this.renderer = null
    this.isPlaying = false
    this.isRecording = false
    this.animationId = null

    this.initUI()
  }

  initUI() {
    // Canvas
    const canvas = document.getElementById('canvas')
    this.renderer = new Renderer(canvas)

    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        this.renderer.setMode(btn.dataset.mode)
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

    // Export buttons
    document.getElementById('export-png').addEventListener('click', () => this.exportPNG())

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

  animate() {
    if (!this.isPlaying && !this.isRecording) return

    const audioFeatures = this.audioAnalyzer.getAudioFeatures()
    const beatInfo = this.beatDetector.update(audioFeatures, performance.now())

    const fps = this.renderer.render(audioFeatures, beatInfo)

    // Update info display
    const bpmText = beatInfo.bpm > 0 ? `${beatInfo.bpm.toFixed(0)} BPM` : 'detecting...'
    const satText = beatInfo.isSaturated ? ' | BLAST' : ''
    this.fpsElement.textContent = `${fps} FPS | ${bpmText}${satText}`

    this.animationId = requestAnimationFrame(() => this.animate())
  }

  exportPNG() {
    this.renderer.exportPNG()
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.audioCanvas = new AudioCanvas()
})
