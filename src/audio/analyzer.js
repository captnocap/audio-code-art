export class AudioAnalyzer {
  constructor() {
    this.audioContext = null
    this.analyser = null
    this.source = null
    this.audioElement = null
    this.dataArray = null
    this.frequencyData = null
    this.fftSize = 2048
    this.isPlaying = false
    this.isRecording = false
    this.mediaStream = null
  }

  async init() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = this.fftSize
    this.analyser.smoothingTimeConstant = 0.8

    const bufferLength = this.analyser.frequencyBinCount
    this.dataArray = new Uint8Array(bufferLength)
    this.frequencyData = new Uint8Array(bufferLength)
  }

  async loadFile(file) {
    if (this.source) {
      this.source.disconnect()
    }
    if (this.audioElement) {
      this.audioElement.pause()
    }

    this.audioElement = new Audio()
    this.audioElement.src = URL.createObjectURL(file)
    await this.audioElement.load()

    this.source = this.audioContext.createMediaElementSource(this.audioElement)
    this.source.connect(this.analyser)
    this.analyser.connect(this.audioContext.destination)

    return {
      duration: this.audioElement.duration,
      name: file.name
    }
  }

  async startMicrophone() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.source.connect(this.analyser)
      this.isRecording = true
      return true
    } catch (err) {
      console.error('Microphone access denied:', err)
      return false
    }
  }

  stopMicrophone() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    if (this.source) {
      this.source.disconnect()
      this.source = null
    }
    this.isRecording = false
  }

  play() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    if (this.audioElement) {
      this.audioElement.play()
      this.isPlaying = true
    }
  }

  pause() {
    if (this.audioElement) {
      this.audioElement.pause()
      this.isPlaying = false
    }
  }

  stop() {
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.currentTime = 0
      this.isPlaying = false
    }
  }

  getFrequencyData() {
    this.analyser.getByteFrequencyData(this.frequencyData)
    return this.frequencyData
  }

  getTimeDomainData() {
    this.analyser.getByteTimeDomainData(this.dataArray)
    return this.dataArray
  }

  getAudioFeatures() {
    const frequencies = this.getFrequencyData()
    const binCount = frequencies.length
    const sampleRate = this.audioContext.sampleRate

    // Split into frequency bands
    // Bass: 20-250Hz, Mid: 250-2000Hz, High: 2000-20000Hz
    const bassEnd = Math.floor(250 / (sampleRate / 2) * binCount)
    const midEnd = Math.floor(2000 / (sampleRate / 2) * binCount)
    const highEnd = Math.floor(20000 / (sampleRate / 2) * binCount)

    let bass = 0, mid = 0, high = 0
    let bassCount = 0, midCount = 0, highCount = 0

    for (let i = 0; i < binCount; i++) {
      const value = frequencies[i] / 255

      if (i < bassEnd) {
        bass += value
        bassCount++
      } else if (i < midEnd) {
        mid += value
        midCount++
      } else if (i < highEnd) {
        high += value
        highCount++
      }
    }

    bass = bassCount > 0 ? bass / bassCount : 0
    mid = midCount > 0 ? mid / midCount : 0
    high = highCount > 0 ? high / highCount : 0

    // Overall amplitude
    let amplitude = 0
    for (let i = 0; i < binCount; i++) {
      amplitude += frequencies[i] / 255
    }
    amplitude /= binCount

    // Spectral centroid (brightness indicator)
    let centroidNumerator = 0
    let centroidDenominator = 0
    for (let i = 0; i < binCount; i++) {
      const frequency = i * sampleRate / this.fftSize
      const magnitude = frequencies[i]
      centroidNumerator += frequency * magnitude
      centroidDenominator += magnitude
    }
    const centroid = centroidDenominator > 0 ? centroidNumerator / centroidDenominator : 0
    const normalizedCentroid = Math.min(centroid / 10000, 1) // Normalize to 0-1

    // Dominant frequency bin for color mapping
    let maxMagnitude = 0
    let dominantBin = 0
    for (let i = 0; i < binCount; i++) {
      if (frequencies[i] > maxMagnitude) {
        maxMagnitude = frequencies[i]
        dominantBin = i
      }
    }
    const dominantFrequency = dominantBin * sampleRate / this.fftSize
    const normalizedDominant = Math.min(dominantFrequency / 10000, 1)

    return {
      bass,
      mid,
      high,
      amplitude,
      centroid: normalizedCentroid,
      dominantFrequency: normalizedDominant,
      frequencies,
      raw: frequencies
    }
  }
}
