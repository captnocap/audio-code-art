// Pan and Zoom functionality for the canvas

export class PanZoom {
  constructor(canvas) {
    this.canvas = canvas
    this.container = canvas.parentElement

    // Transform state
    this.scale = 1
    this.translateX = 0
    this.translateY = 0

    // Interaction state
    this.isDragging = false
    this.lastX = 0
    this.lastY = 0

    // Limits
    this.minScale = 0.25
    this.maxScale = 10

    this.init()
  }

  init() {
    // Create wrapper for transforms
    this.wrapper = document.createElement('div')
    this.wrapper.id = 'canvas-wrapper'
    this.wrapper.style.cssText = `
      position: absolute;
      inset: 0;
      transform-origin: center center;
      will-change: transform;
    `

    // Move canvas into wrapper
    this.canvas.parentElement.insertBefore(this.wrapper, this.canvas)
    this.wrapper.appendChild(this.canvas)

    // Mouse events
    this.wrapper.addEventListener('mousedown', (e) => this.onMouseDown(e))
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))
    window.addEventListener('mouseup', () => this.onMouseUp())

    // Wheel zoom
    this.wrapper.addEventListener('wheel', (e) => this.onWheel(e), { passive: false })

    // Touch events for mobile
    this.wrapper.addEventListener('touchstart', (e) => this.onTouchStart(e))
    this.wrapper.addEventListener('touchmove', (e) => this.onTouchMove(e))
    this.wrapper.addEventListener('touchend', () => this.onTouchEnd())

    // Double-click to reset
    this.wrapper.addEventListener('dblclick', () => this.reset())

    this.updateTransform()
  }

  onMouseDown(e) {
    // Only pan with middle mouse or when holding space
    if (e.button === 1 || e.button === 0) {
      this.isDragging = true
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.wrapper.style.cursor = 'grabbing'
      e.preventDefault()
    }
  }

  onMouseMove(e) {
    if (!this.isDragging) return

    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY

    this.translateX += dx
    this.translateY += dy

    this.lastX = e.clientX
    this.lastY = e.clientY

    this.updateTransform()
  }

  onMouseUp() {
    this.isDragging = false
    this.wrapper.style.cursor = 'grab'
  }

  onWheel(e) {
    e.preventDefault()

    const rect = this.wrapper.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2

    // Zoom direction
    const delta = -e.deltaY * 0.001
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * (1 + delta)))

    // Zoom toward mouse position
    const scaleRatio = newScale / this.scale
    this.translateX = mouseX - (mouseX - this.translateX) * scaleRatio
    this.translateY = mouseY - (mouseY - this.translateY) * scaleRatio

    this.scale = newScale
    this.updateTransform()
  }

  // Touch handling
  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true
      this.lastX = e.touches[0].clientX
      this.lastY = e.touches[0].clientY
    } else if (e.touches.length === 2) {
      this.lastPinchDist = this.getPinchDistance(e.touches)
    }
  }

  onTouchMove(e) {
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastX
      const dy = e.touches[0].clientY - this.lastY

      this.translateX += dx
      this.translateY += dy

      this.lastX = e.touches[0].clientX
      this.lastY = e.touches[0].clientY

      this.updateTransform()
      e.preventDefault()
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const dist = this.getPinchDistance(e.touches)
      const delta = (dist - this.lastPinchDist) * 0.01

      this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * (1 + delta)))
      this.lastPinchDist = dist

      this.updateTransform()
      e.preventDefault()
    }
  }

  onTouchEnd() {
    this.isDragging = false
  }

  getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  updateTransform() {
    this.wrapper.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`
  }

  reset() {
    this.scale = 1
    this.translateX = 0
    this.translateY = 0
    this.updateTransform()
  }

  // Get current state
  getState() {
    return {
      scale: this.scale,
      translateX: this.translateX,
      translateY: this.translateY
    }
  }

  // Set state
  setState(state) {
    this.scale = state.scale ?? this.scale
    this.translateX = state.translateX ?? this.translateX
    this.translateY = state.translateY ?? this.translateY
    this.updateTransform()
  }

  // Zoom to fit
  zoomToFit() {
    this.reset()
  }

  // Zoom in
  zoomIn() {
    this.scale = Math.min(this.maxScale, this.scale * 1.2)
    this.updateTransform()
  }

  // Zoom out
  zoomOut() {
    this.scale = Math.max(this.minScale, this.scale / 1.2)
    this.updateTransform()
  }
}
