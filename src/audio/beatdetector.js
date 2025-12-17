// Beat and tempo detection using onset detection and autocorrelation

export class BeatDetector {
  constructor() {
    this.energyHistory = []
    this.historySize = 43  // ~1 second at 60fps
    this.beatThreshold = 1.3
    this.lastBeatTime = 0
    this.beatCooldown = 100  // ms between beats
    this.recentBeats = []
    this.bpm = 0
    this.beatIntensity = 0
    this.onBeat = false

    // Blast beat saturation detection
    this.saturationEnabled = true
    this.saturationThreshold = 8  // beats per second to trigger saturation
    this.isSaturated = false
  }

  update(audioFeatures, currentTime) {
    const { bass, amplitude } = audioFeatures

    // Use bass-weighted energy for beat detection (drums hit bass frequencies)
    const energy = bass * 0.7 + amplitude * 0.3

    this.energyHistory.push(energy)
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift()
    }

    // Calculate average energy
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length

    // Detect beat when current energy exceeds average by threshold
    const timeSinceLastBeat = currentTime - this.lastBeatTime
    this.onBeat = false

    if (energy > avgEnergy * this.beatThreshold && timeSinceLastBeat > this.beatCooldown) {
      this.onBeat = true
      this.beatIntensity = Math.min((energy / avgEnergy) - 1, 1)

      // Record beat time for BPM calculation
      this.recentBeats.push(currentTime)
      this.lastBeatTime = currentTime

      // Keep only recent beats (last 5 seconds)
      const fiveSecondsAgo = currentTime - 5000
      this.recentBeats = this.recentBeats.filter(t => t > fiveSecondsAgo)

      // Calculate BPM from beat intervals
      if (this.recentBeats.length > 2) {
        const intervals = []
        for (let i = 1; i < this.recentBeats.length; i++) {
          intervals.push(this.recentBeats[i] - this.recentBeats[i - 1])
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        this.bpm = 60000 / avgInterval  // Convert ms interval to BPM
      }
    }

    // Blast beat saturation detection
    if (this.saturationEnabled) {
      const beatRate = this.recentBeats.length / 5  // beats per second over last 5s
      this.isSaturated = beatRate > this.saturationThreshold

      if (this.isSaturated) {
        // Sustained intensity instead of spikes during blast beats
        this.beatIntensity = 0.7
        this.onBeat = false  // stop triggering burst spawns
      }
    }

    // Decay beat intensity (only when not saturated)
    if (!this.isSaturated) {
      this.beatIntensity *= 0.9
    }

    return {
      onBeat: this.onBeat,
      beatIntensity: this.beatIntensity,
      bpm: this.bpm,
      normalizedTempo: this.getNormalizedTempo(),
      isSaturated: this.isSaturated
    }
  }

  setSaturationEnabled(enabled) {
    this.saturationEnabled = enabled
  }

  setSaturationThreshold(threshold) {
    this.saturationThreshold = threshold
  }

  getNormalizedTempo() {
    // Normalize BPM to 0-1 range
    // 60 BPM = 0 (very slow)
    // 120 BPM = 0.5 (moderate)
    // 200+ BPM = 1 (blast beats, fast black metal)
    // Cold start: return 0 when no beats detected yet (muted colors until tempo established)
    if (this.bpm <= 0) return 0
    return Math.min(Math.max((this.bpm - 60) / 140, 0), 1)
  }

  reset() {
    this.energyHistory = []
    this.recentBeats = []
    this.bpm = 0
    this.beatIntensity = 0
    this.lastBeatTime = 0
  }
}
