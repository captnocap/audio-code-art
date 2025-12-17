import { AudioAnalyzer } from './audio/analyzer.js'
import { BeatDetector } from './audio/beatdetector.js'
import { Renderer } from './visual/renderer.js'
import { youtubeEmbed } from './youtube/embed.js'

class AudioCanvas {
  constructor() {
    this.audioAnalyzer = new AudioAnalyzer()
    this.beatDetector = new BeatDetector()
    this.renderer = null
    this.isPlaying = false
    this.isRecording = false
    this.isTabCapturing = false
    this.animationId = null
    this.hasVideo = false

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

    // Export buttons
    document.getElementById('export-png').addEventListener('click', () => this.exportPNG())
    document.getElementById('export-svg').addEventListener('click', () => this.exportSVG())

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

  animate() {
    if (!this.isPlaying && !this.isRecording && !this.isTabCapturing) return

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

  exportSVG() {
    this.renderer.exportSVG()
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.audioCanvas = new AudioCanvas()
})
