// Speech Recognition Module
// Captures attempted interpretations of vocals - even garbage is useful data

export class SpeechInterpreter {
  constructor() {
    this.recognition = null
    this.isListening = false
    this.supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window

    // Data streams
    this.currentWords = []        // Recent words with timing
    this.characterStream = []     // Individual characters with metadata
    this.confidence = 0           // Current confidence level
    this.lastResult = ''          // Most recent interpretation
    this.wordBuffer = []          // Buffer of recent words for visualization
    this.maxBufferSize = 50

    // Callbacks
    this.onWord = null
    this.onCharacter = null
    this.onResult = null
  }

  init() {
    if (!this.supported) {
      console.warn('Speech recognition not supported')
      return false
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()

    // Configuration for continuous, real-time results
    this.recognition.continuous = true
    this.recognition.interimResults = true  // Get results as they come
    this.recognition.maxAlternatives = 3    // Multiple interpretations
    this.recognition.lang = 'en-US'

    this.recognition.onresult = (event) => this.handleResult(event)
    this.recognition.onerror = (event) => this.handleError(event)
    this.recognition.onend = () => this.handleEnd()

    return true
  }

  start() {
    if (!this.recognition) {
      if (!this.init()) return false
    }

    try {
      this.recognition.start()
      this.isListening = true
      return true
    } catch (err) {
      console.error('Speech recognition start failed:', err)
      return false
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  handleResult(event) {
    const now = Date.now()

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const transcript = result[0].transcript
      const confidence = result[0].confidence || 0.5
      const isFinal = result.isFinal

      this.confidence = confidence
      this.lastResult = transcript

      // Extract words
      const words = transcript.trim().split(/\s+/)

      for (const word of words) {
        if (!word) continue

        const wordData = {
          text: word,
          confidence,
          timestamp: now,
          isFinal,
          // Derived data for visualization
          length: word.length,
          asciiSum: this.getAsciiSum(word),
          vowelRatio: this.getVowelRatio(word),
          hash: this.hashWord(word)
        }

        this.wordBuffer.push(wordData)
        if (this.wordBuffer.length > this.maxBufferSize) {
          this.wordBuffer.shift()
        }

        if (this.onWord) this.onWord(wordData)

        // Stream individual characters
        for (let j = 0; j < word.length; j++) {
          const char = word[j]
          const charData = {
            char,
            code: char.charCodeAt(0),
            position: j / word.length,  // 0-1 position in word
            wordConfidence: confidence,
            timestamp: now + j * 10,  // Slight offset per character
            isVowel: 'aeiouAEIOU'.includes(char)
          }

          this.characterStream.push(charData)
          if (this.characterStream.length > 200) {
            this.characterStream.shift()
          }

          if (this.onCharacter) this.onCharacter(charData)
        }
      }

      if (this.onResult) {
        this.onResult({
          transcript,
          confidence,
          isFinal,
          alternatives: Array.from(result).map(r => ({
            text: r.transcript,
            confidence: r.confidence
          }))
        })
      }
    }
  }

  handleError(event) {
    console.warn('Speech recognition error:', event.error)
    // Restart on recoverable errors
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      if (this.isListening) {
        setTimeout(() => this.start(), 100)
      }
    }
  }

  handleEnd() {
    // Auto-restart if we're supposed to be listening
    if (this.isListening) {
      setTimeout(() => this.start(), 100)
    }
  }

  // Utility functions for visualization data
  getAsciiSum(word) {
    let sum = 0
    for (const char of word) {
      sum += char.charCodeAt(0)
    }
    return sum
  }

  getVowelRatio(word) {
    const vowels = word.match(/[aeiou]/gi) || []
    return vowels.length / word.length
  }

  hashWord(word) {
    // Simple hash for consistent color/position mapping
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash  // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  // Get current state for visualization
  getState() {
    return {
      isListening: this.isListening,
      confidence: this.confidence,
      lastResult: this.lastResult,
      wordBuffer: this.wordBuffer,
      characterStream: this.characterStream,
      recentWords: this.wordBuffer.slice(-10)
    }
  }

  // Get visualization-ready data
  getVisualizationData() {
    const now = Date.now()
    const recentChars = this.characterStream.filter(c => now - c.timestamp < 5000)
    const recentWords = this.wordBuffer.filter(w => now - w.timestamp < 10000)

    return {
      chars: recentChars,
      words: recentWords,
      avgConfidence: recentWords.length > 0
        ? recentWords.reduce((sum, w) => sum + w.confidence, 0) / recentWords.length
        : 0,
      charRate: recentChars.length / 5,  // chars per second
      wordRate: recentWords.length / 10   // words per second
    }
  }
}

export const speechInterpreter = new SpeechInterpreter()
