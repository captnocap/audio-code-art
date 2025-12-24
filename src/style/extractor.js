/**
 * StyleExtractor - Analyzes audio to generate UI design tokens
 * "The Sonic Style Sheet" - Albums become themes
 */
export class StyleExtractor {
  constructor() {
    this.samples = []
    this.isAnalyzing = false
    this.startTime = 0
    this.duration = 30000 // 30 second analysis window by default

    // Aggregated stats
    this.stats = {
      loudnessHistory: [],
      brightnessHistory: [],
      tempoHistory: [],
      bassHistory: [],
      midHistory: [],
      highHistory: [],
      transientHistory: [],
      beatCount: 0,
      peakLoudness: 0,
      minLoudness: 1
    }

    // Previous frame for transient detection
    this.prevAmplitude = 0
  }

  startAnalysis(durationMs = 30000) {
    this.samples = []
    this.stats = {
      loudnessHistory: [],
      brightnessHistory: [],
      tempoHistory: [],
      bassHistory: [],
      midHistory: [],
      highHistory: [],
      transientHistory: [],
      beatCount: 0,
      peakLoudness: 0,
      minLoudness: 1
    }
    this.isAnalyzing = true
    this.startTime = Date.now()
    this.duration = durationMs
    this.prevAmplitude = 0
  }

  stopAnalysis() {
    this.isAnalyzing = false
  }

  // Call this every frame during analysis
  captureFrame(audioFeatures, beatInfo) {
    if (!this.isAnalyzing) return false

    // Check if analysis window complete
    if (Date.now() - this.startTime > this.duration) {
      this.isAnalyzing = false
      return false
    }

    const { amplitude, bass, mid, high, centroid, frequencies } = audioFeatures
    const { bpm, onBeat } = beatInfo

    // Detect transients (sudden loud attacks)
    const transient = Math.max(0, amplitude - this.prevAmplitude)
    this.prevAmplitude = amplitude

    // Store sample
    this.samples.push({
      loudness: amplitude,
      brightness: centroid,
      roughness: this.calculateRoughness(frequencies),
      bass,
      mid,
      high,
      tempo: bpm,
      transient
    })

    // Update stats
    this.stats.loudnessHistory.push(amplitude)
    this.stats.brightnessHistory.push(centroid)
    this.stats.bassHistory.push(bass)
    this.stats.midHistory.push(mid)
    this.stats.highHistory.push(high)
    this.stats.transientHistory.push(transient)

    if (bpm > 0) {
      this.stats.tempoHistory.push(bpm)
    }

    if (onBeat) {
      this.stats.beatCount++
    }

    if (amplitude > this.stats.peakLoudness) {
      this.stats.peakLoudness = amplitude
    }
    if (amplitude < this.stats.minLoudness && amplitude > 0.01) {
      this.stats.minLoudness = amplitude
    }

    return true
  }

  // Calculate "noise" - how chaotic/distorted the frequency spectrum is
  calculateRoughness(frequencies) {
    if (!frequencies || frequencies.length === 0) return 0.5

    // Calculate variance in frequency distribution
    // Pure tones have low variance, noise has high variance
    const values = Array.from(frequencies).map(v => v / 255)
    const mean = values.reduce((a, b) => a + b, 0) / values.length

    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length

    // High variance = more varied spectrum = more noise/distortion
    // Normalize to 0-1 range
    return Math.min(1, variance * 10)
  }

  // Calculate dynamic range (difference between loud and quiet)
  getDynamicRange() {
    if (this.stats.loudnessHistory.length === 0) return 0.5

    const sorted = [...this.stats.loudnessHistory].sort((a, b) => a - b)
    const p10 = sorted[Math.floor(sorted.length * 0.1)]
    const p90 = sorted[Math.floor(sorted.length * 0.9)]

    return p90 - p10 // 0 = compressed, 1 = very dynamic
  }

  // Generate the complete theme
  generateTheme(albumName = 'Untitled Album') {
    if (this.samples.length === 0) {
      return this.getDefaultTheme()
    }

    // Calculate averages
    const avgLoudness = this.getAverage(this.stats.loudnessHistory)
    const avgBrightness = this.getAverage(this.stats.brightnessHistory)
    const avgBass = this.getAverage(this.stats.bassHistory)
    const avgMid = this.getAverage(this.stats.midHistory)
    const avgHigh = this.getAverage(this.stats.highHistory)
    const avgTempo = this.getAverage(this.stats.tempoHistory) || 120
    const avgTransient = this.getAverage(this.stats.transientHistory)
    const avgRoughness = this.getAverage(this.samples.map(s => s.roughness))
    const dynamicRange = this.getDynamicRange()

    // ========== SPACING ==========
    // Fast tempo = tight, slow = airy
    // 60 BPM -> 2rem, 200 BPM -> 0.25rem
    const spacingUnit = this.mapRange(avgTempo, 60, 200, 2.0, 0.25)
    const spacingXs = spacingUnit * 0.25
    const spacingSm = spacingUnit * 0.5
    const spacingMd = spacingUnit
    const spacingLg = spacingUnit * 2
    const spacingXl = spacingUnit * 4

    // ========== BORDER RADIUS ==========
    // High compression/loudness = sharp, dynamic/quiet = round
    const maxRadius = this.mapRange(dynamicRange, 0, 0.5, 0, 24)
    const radiusSm = Math.max(0, maxRadius * 0.25)
    const radiusMd = Math.max(0, maxRadius * 0.5)
    const radiusLg = Math.max(0, maxRadius)
    const radiusFull = maxRadius > 8 ? '9999px' : `${maxRadius}px`

    // ========== COLORS ==========
    // Brightness (spectral centroid) determines hue temperature
    // Low brightness = warm (red/orange), High = cold (blue/white)
    const primaryHue = this.mapRange(avgBrightness, 0, 1, 0, 240)

    // Loudness determines saturation
    const saturation = this.mapRange(avgLoudness, 0, 1, 30, 100)

    // Bass presence shifts toward warmer
    const bassHueShift = avgBass * 30 // Shift toward red

    // High presence shifts toward cooler
    const highHueShift = -avgHigh * 40 // Shift toward blue

    const finalHue = (primaryHue + bassHueShift + highHueShift + 360) % 360

    // Background: Loud/aggressive = dark, quiet/soft = light
    const isDarkMode = avgLoudness > 0.5 || avgRoughness > 0.4
    const bgLightness = isDarkMode ? 5 : 95
    const fgLightness = isDarkMode ? 95 : 10

    // ========== BORDERS ==========
    // Louder = thicker borders
    const borderWidth = Math.max(1, Math.round(avgLoudness * 4))

    // ========== SHADOWS ==========
    // Transient attacks = hard shadows, smooth audio = soft/no shadows
    const shadowStrength = this.mapRange(avgTransient, 0, 0.3, 0, 30)
    const shadowBlur = this.mapRange(avgTransient, 0, 0.3, 30, 5)
    const shadowOpacity = this.mapRange(avgTransient, 0, 0.3, 0.1, 0.5)

    // ========== TYPOGRAPHY ==========
    // Roughness determines font character
    // Clean = elegant serif/sans, Noisy = monospace/brutal
    const fontFamily = avgRoughness > 0.5
      ? "'Courier New', 'Monaco', monospace"
      : avgRoughness > 0.3
        ? "'Inter', 'Helvetica', sans-serif"
        : "'Georgia', 'Times New Roman', serif"

    // Tempo affects letter spacing
    const letterSpacing = this.mapRange(avgTempo, 60, 200, 0.05, -0.02)

    // ========== ANIMATION ==========
    // Tempo defines animation speed
    const animationDuration = this.mapRange(avgTempo, 60, 200, 1.5, 0.15)

    // Roughness affects easing
    const animationEasing = avgRoughness > 0.5
      ? 'steps(4, end)' // Glitchy
      : avgRoughness > 0.3
        ? 'cubic-bezier(0.25, 0.1, 0.25, 1)' // Snappy
        : 'cubic-bezier(0.4, 0, 0.2, 1)' // Smooth

    // ========== GENERATE OUTPUT ==========
    const theme = {
      meta: {
        name: albumName,
        generatedAt: new Date().toISOString(),
        analysisSeconds: this.samples.length / 60,
        characteristics: this.describeSound(avgLoudness, avgBrightness, avgTempo, avgRoughness, dynamicRange)
      },

      colors: {
        primary: `hsl(${finalHue.toFixed(0)}, ${saturation.toFixed(0)}%, 50%)`,
        primaryLight: `hsl(${finalHue.toFixed(0)}, ${saturation.toFixed(0)}%, 70%)`,
        primaryDark: `hsl(${finalHue.toFixed(0)}, ${saturation.toFixed(0)}%, 30%)`,
        secondary: `hsl(${((finalHue + 180) % 360).toFixed(0)}, ${(saturation * 0.7).toFixed(0)}%, 50%)`,
        accent: `hsl(${((finalHue + 45) % 360).toFixed(0)}, ${saturation.toFixed(0)}%, 60%)`,
        background: `hsl(0, 0%, ${bgLightness}%)`,
        foreground: `hsl(0, 0%, ${fgLightness}%)`,
        muted: `hsl(${finalHue.toFixed(0)}, ${(saturation * 0.3).toFixed(0)}%, ${isDarkMode ? 20 : 80}%)`,
        border: `hsl(${finalHue.toFixed(0)}, ${(saturation * 0.5).toFixed(0)}%, ${isDarkMode ? 30 : 70}%)`
      },

      spacing: {
        unit: `${spacingUnit.toFixed(3)}rem`,
        xs: `${spacingXs.toFixed(3)}rem`,
        sm: `${spacingSm.toFixed(3)}rem`,
        md: `${spacingMd.toFixed(3)}rem`,
        lg: `${spacingLg.toFixed(3)}rem`,
        xl: `${spacingXl.toFixed(3)}rem`
      },

      radius: {
        sm: `${radiusSm.toFixed(0)}px`,
        md: `${radiusMd.toFixed(0)}px`,
        lg: `${radiusLg.toFixed(0)}px`,
        full: radiusFull
      },

      borders: {
        width: `${borderWidth}px`,
        style: avgRoughness > 0.5 ? 'double' : 'solid'
      },

      shadows: {
        sm: `0 ${(shadowStrength * 0.25).toFixed(0)}px ${(shadowBlur * 0.5).toFixed(0)}px rgba(0,0,0,${shadowOpacity.toFixed(2)})`,
        md: `0 ${shadowStrength.toFixed(0)}px ${shadowBlur.toFixed(0)}px rgba(0,0,0,${shadowOpacity.toFixed(2)})`,
        lg: `0 ${(shadowStrength * 2).toFixed(0)}px ${(shadowBlur * 2).toFixed(0)}px rgba(0,0,0,${shadowOpacity.toFixed(2)})`
      },

      typography: {
        fontFamily,
        letterSpacing: `${letterSpacing.toFixed(3)}em`,
        lineHeight: this.mapRange(avgTempo, 60, 200, 1.8, 1.2).toFixed(2)
      },

      animation: {
        duration: `${animationDuration.toFixed(2)}s`,
        easing: animationEasing
      },

      // Raw analysis data for custom use
      raw: {
        avgLoudness,
        avgBrightness,
        avgBass,
        avgMid,
        avgHigh,
        avgTempo,
        avgTransient,
        avgRoughness,
        dynamicRange,
        isDarkMode,
        beatCount: this.stats.beatCount,
        sampleCount: this.samples.length
      }
    }

    return theme
  }

  // Generate CSS custom properties
  toCSS(theme) {
    return `:root {
  /* Generated from: ${theme.meta.name} */
  /* ${theme.meta.characteristics} */

  /* Colors */
  --color-primary: ${theme.colors.primary};
  --color-primary-light: ${theme.colors.primaryLight};
  --color-primary-dark: ${theme.colors.primaryDark};
  --color-secondary: ${theme.colors.secondary};
  --color-accent: ${theme.colors.accent};
  --color-background: ${theme.colors.background};
  --color-foreground: ${theme.colors.foreground};
  --color-muted: ${theme.colors.muted};
  --color-border: ${theme.colors.border};

  /* Spacing */
  --spacing-unit: ${theme.spacing.unit};
  --spacing-xs: ${theme.spacing.xs};
  --spacing-sm: ${theme.spacing.sm};
  --spacing-md: ${theme.spacing.md};
  --spacing-lg: ${theme.spacing.lg};
  --spacing-xl: ${theme.spacing.xl};

  /* Border Radius */
  --radius-sm: ${theme.radius.sm};
  --radius-md: ${theme.radius.md};
  --radius-lg: ${theme.radius.lg};
  --radius-full: ${theme.radius.full};

  /* Borders */
  --border-width: ${theme.borders.width};
  --border-style: ${theme.borders.style};

  /* Shadows */
  --shadow-sm: ${theme.shadows.sm};
  --shadow-md: ${theme.shadows.md};
  --shadow-lg: ${theme.shadows.lg};

  /* Typography */
  --font-family: ${theme.typography.fontFamily};
  --letter-spacing: ${theme.typography.letterSpacing};
  --line-height: ${theme.typography.lineHeight};

  /* Animation */
  --animation-duration: ${theme.animation.duration};
  --animation-easing: ${theme.animation.easing};
}`
  }

  // Generate Tailwind config
  toTailwind(theme) {
    return `// tailwind.config.js - Generated from: ${theme.meta.name}
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '${theme.colors.primary}',
          light: '${theme.colors.primaryLight}',
          dark: '${theme.colors.primaryDark}'
        },
        secondary: '${theme.colors.secondary}',
        accent: '${theme.colors.accent}',
        background: '${theme.colors.background}',
        foreground: '${theme.colors.foreground}',
        muted: '${theme.colors.muted}',
        border: '${theme.colors.border}'
      },
      spacing: {
        'audio-xs': '${theme.spacing.xs}',
        'audio-sm': '${theme.spacing.sm}',
        'audio-md': '${theme.spacing.md}',
        'audio-lg': '${theme.spacing.lg}',
        'audio-xl': '${theme.spacing.xl}'
      },
      borderRadius: {
        'audio-sm': '${theme.radius.sm}',
        'audio-md': '${theme.radius.md}',
        'audio-lg': '${theme.radius.lg}'
      },
      fontFamily: {
        'audio': [${theme.typography.fontFamily}]
      },
      transitionDuration: {
        'audio': '${theme.animation.duration}'
      },
      transitionTimingFunction: {
        'audio': '${theme.animation.easing}'
      }
    }
  }
}`
  }

  // Describe the sound character
  describeSound(loudness, brightness, tempo, roughness, dynamicRange) {
    const descriptors = []

    // Loudness
    if (loudness > 0.7) descriptors.push('aggressive')
    else if (loudness > 0.4) descriptors.push('energetic')
    else descriptors.push('gentle')

    // Brightness
    if (brightness > 0.6) descriptors.push('bright')
    else if (brightness < 0.3) descriptors.push('warm')

    // Tempo
    if (tempo > 160) descriptors.push('fast')
    else if (tempo > 100) descriptors.push('upbeat')
    else if (tempo < 80) descriptors.push('slow')

    // Roughness
    if (roughness > 0.5) descriptors.push('distorted')
    else if (roughness < 0.2) descriptors.push('clean')

    // Dynamic Range
    if (dynamicRange < 0.2) descriptors.push('compressed')
    else if (dynamicRange > 0.5) descriptors.push('dynamic')

    return descriptors.join(', ')
  }

  getDefaultTheme() {
    return {
      meta: { name: 'Default', characteristics: 'No audio analyzed' },
      colors: {
        primary: 'hsl(220, 60%, 50%)',
        primaryLight: 'hsl(220, 60%, 70%)',
        primaryDark: 'hsl(220, 60%, 30%)',
        secondary: 'hsl(40, 60%, 50%)',
        accent: 'hsl(265, 60%, 60%)',
        background: 'hsl(0, 0%, 95%)',
        foreground: 'hsl(0, 0%, 10%)',
        muted: 'hsl(220, 20%, 80%)',
        border: 'hsl(220, 20%, 70%)'
      },
      spacing: { unit: '1rem', xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '2rem', xl: '4rem' },
      radius: { sm: '4px', md: '8px', lg: '16px', full: '9999px' },
      borders: { width: '1px', style: 'solid' },
      shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)' },
      typography: { fontFamily: "'Inter', sans-serif", letterSpacing: '0em', lineHeight: '1.5' },
      animation: { duration: '0.3s', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      raw: {}
    }
  }

  // Helpers
  getAverage(arr) {
    if (arr.length === 0) return 0
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }

  mapRange(value, inMin, inMax, outMin, outMax) {
    const clamped = Math.max(inMin, Math.min(inMax, value))
    return (clamped - inMin) * (outMax - outMin) / (inMax - inMin) + outMin
  }

  getProgress() {
    if (!this.isAnalyzing) return 1
    return Math.min(1, (Date.now() - this.startTime) / this.duration)
  }
}

// Singleton instance
export const styleExtractor = new StyleExtractor()
