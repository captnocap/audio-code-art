// YouTube Embed Handler
// Embeds video behind canvas and fetches metadata

export class YouTubeEmbed {
  constructor() {
    this.player = null
    this.videoId = null
    this.container = null
    this.isReady = false
    this.onReadyCallback = null
  }

  // Extract video ID from various YouTube URL formats
  parseVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Fetch video title via oEmbed (no API key needed)
  async fetchVideoInfo(videoId) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      const response = await fetch(oembedUrl)
      if (!response.ok) throw new Error('Failed to fetch video info')
      const data = await response.json()
      return {
        title: data.title,
        author: data.author_name,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    } catch (err) {
      console.error('Failed to fetch video info:', err)
      return { title: 'Unknown', author: 'Unknown', thumbnail: null }
    }
  }

  // Create the video container and iframe
  async embed(url, containerElement) {
    this.videoId = this.parseVideoId(url)
    if (!this.videoId) {
      throw new Error('Invalid YouTube URL')
    }

    this.container = containerElement

    // Fetch video info
    const info = await this.fetchVideoInfo(this.videoId)

    // Create iframe with YouTube embed
    // Using embed URL with autoplay, no controls, loop
    const iframe = document.createElement('iframe')
    iframe.id = 'youtube-player'
    iframe.src = `https://www.youtube.com/embed/${this.videoId}?autoplay=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${this.videoId}&mute=0&enablejsapi=1`
    iframe.allow = 'autoplay; encrypted-media'
    iframe.allowFullscreen = true
    iframe.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100vw;
      height: 56.25vw; /* 16:9 aspect ratio */
      min-height: 100vh;
      min-width: 177.78vh; /* 16:9 aspect ratio */
      border: none;
      pointer-events: none;
      z-index: 0;
    `

    // Clear any existing video
    const existing = this.container.querySelector('#youtube-player')
    if (existing) existing.remove()

    this.container.appendChild(iframe)
    this.isReady = true

    return info
  }

  // Remove the video
  remove() {
    if (this.container) {
      const iframe = this.container.querySelector('#youtube-player')
      if (iframe) iframe.remove()
    }
    this.videoId = null
    this.isReady = false
  }

  // Show/hide the video
  setVisible(visible) {
    const iframe = this.container?.querySelector('#youtube-player')
    if (iframe) {
      iframe.style.display = visible ? 'block' : 'none'
    }
  }

  // Set video opacity
  setOpacity(opacity) {
    const iframe = this.container?.querySelector('#youtube-player')
    if (iframe) {
      iframe.style.opacity = opacity
    }
  }
}

export const youtubeEmbed = new YouTubeEmbed()
