// GIF export using gif.js
// Captures canvas frames and encodes to animated GIF

export class GIFExporter {
  constructor() {
    this.frames = []
    this.isRecording = false
    this.duration = 5000  // 5 seconds default
    this.fps = 20
    this.quality = 10  // 1-30, lower is better quality
    this.width = 800
    this.height = 450
    this.onProgress = null
    this.onComplete = null
  }

  // Load gif.js library dynamically
  async loadGifJS() {
    if (window.GIF) return window.GIF

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
      script.onload = () => resolve(window.GIF)
      script.onerror = () => reject(new Error('Failed to load gif.js'))
      document.head.appendChild(script)
    })
  }

  // Start recording frames
  startRecording(canvas, options = {}) {
    this.duration = options.duration || 5000
    this.fps = options.fps || 20
    this.width = options.width || 800
    this.height = options.height || 450
    this.quality = options.quality || 10

    this.frames = []
    this.isRecording = true
    this.startTime = Date.now()
    this.canvas = canvas
    this.frameInterval = 1000 / this.fps

    console.log(`GIF recording started: ${this.duration}ms at ${this.fps}fps`)

    // Capture frames at interval
    this.captureLoop()

    return new Promise((resolve) => {
      this.recordingResolve = resolve
    })
  }

  captureLoop() {
    if (!this.isRecording) return

    const elapsed = Date.now() - this.startTime

    if (elapsed >= this.duration) {
      this.stopRecording()
      return
    }

    // Capture current frame
    this.captureFrame()

    // Report progress
    if (this.onProgress) {
      this.onProgress(elapsed / this.duration)
    }

    // Schedule next frame
    setTimeout(() => this.captureLoop(), this.frameInterval)
  }

  captureFrame() {
    if (!this.canvas) return

    // Create scaled canvas for frame
    const frameCanvas = document.createElement('canvas')
    frameCanvas.width = this.width
    frameCanvas.height = this.height
    const ctx = frameCanvas.getContext('2d')

    // Draw scaled version
    ctx.drawImage(
      this.canvas,
      0, 0, this.canvas.width, this.canvas.height,
      0, 0, this.width, this.height
    )

    this.frames.push(frameCanvas)
  }

  stopRecording() {
    this.isRecording = false
    console.log(`GIF recording stopped: ${this.frames.length} frames captured`)

    if (this.recordingResolve) {
      this.recordingResolve(this.frames.length)
    }
  }

  // Encode frames to GIF
  async encode() {
    if (this.frames.length === 0) {
      throw new Error('No frames to encode')
    }

    const GIF = await this.loadGifJS()

    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 4,
        quality: this.quality,
        width: this.width,
        height: this.height,
        workerScript: '/public/gif.worker.js'
      })

      // Add frames
      const delay = 1000 / this.fps
      for (const frame of this.frames) {
        gif.addFrame(frame, { delay, copy: true })
      }

      gif.on('progress', (p) => {
        if (this.onProgress) {
          this.onProgress(p)
        }
      })

      gif.on('finished', (blob) => {
        console.log(`GIF encoded: ${(blob.size / 1024 / 1024).toFixed(2)}MB`)
        resolve(blob)
      })

      gif.render()
    })
  }

  // Full workflow: record, encode, download
  async recordAndDownload(canvas, filename, options = {}) {
    await this.startRecording(canvas, options)

    if (this.onProgress) {
      this.onProgress(0)
    }

    const blob = await this.encode()
    this.download(blob, filename)

    return blob
  }

  download(blob, filename = 'animation.gif') {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
}

export const gifExporter = new GIFExporter()
