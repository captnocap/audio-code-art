// Pan and Zoom functionality for infinite canvas
// Uses internal coordinate transform instead of CSS transform
// Canvas always fills screen, content scales/pans within it

export class PanZoom {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    // Transform state (internal coordinates, not CSS)
    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0

    // Interaction state
    this.isDragging = false
    this.lastX = 0
    this.lastY = 0

    // Limits
    this.minScale = 0.1
    this.maxScale = 20

    this.init()
  }

  init() {
    // Mouse events directly on canvas
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e))
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))
    window.addEventListener('mouseup', () => this.onMouseUp())

    // Wheel zoom
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false })

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e))
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e))
    this.canvas.addEventListener('touchend', () => this.onTouchEnd())

    // Double-click to reset
    this.canvas.addEventListener('dblclick', () => this.reset())

    this.canvas.style.cursor = 'grab'
  }

  // Apply transform to canvas context before drawing
  applyTransform(ctx) {
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY)
  }

  // Reset transform after drawing
  resetTransform(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    }
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.scale + this.offsetX,
      y: worldY * this.scale + this.offsetY
    }
  }

  onMouseDown(e) {
    if (e.button === 0) {
      this.isDragging = true
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.canvas.style.cursor = 'grabbing'
      e.preventDefault()
    }
  }

  onMouseMove(e) {
    if (!this.isDragging) return

    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY

    this.offsetX += dx
    this.offsetY += dy

    this.lastX = e.clientX
    this.lastY = e.clientY
  }

  onMouseUp() {
    this.isDragging = false
    this.canvas.style.cursor = 'grab'
  }

  onWheel(e) {
    e.preventDefault()

    const rect = this.canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Zoom direction
    const delta = -e.deltaY * 0.001
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * (1 + delta)))

    // Zoom toward mouse position
    const scaleRatio = newScale / this.scale

    // Adjust offset so zoom centers on mouse
    this.offsetX = mouseX - (mouseX - this.offsetX) * scaleRatio
    this.offsetY = mouseY - (mouseY - this.offsetY) * scaleRatio

    this.scale = newScale
  }

  // Touch handling
  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true
      this.lastX = e.touches[0].clientX
      this.lastY = e.touches[0].clientY
    } else if (e.touches.length === 2) {
      this.lastPinchDist = this.getPinchDistance(e.touches)
      this.pinchCenter = this.getPinchCenter(e.touches)
    }
  }

  onTouchMove(e) {
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastX
      const dy = e.touches[0].clientY - this.lastY

      this.offsetX += dx
      this.offsetY += dy

      this.lastX = e.touches[0].clientX
      this.lastY = e.touches[0].clientY
      e.preventDefault()
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const dist = this.getPinchDistance(e.touches)
      const center = this.getPinchCenter(e.touches)
      const delta = (dist - this.lastPinchDist) * 0.01
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * (1 + delta)))

      const scaleRatio = newScale / this.scale
      this.offsetX = center.x - (center.x - this.offsetX) * scaleRatio
      this.offsetY = center.y - (center.y - this.offsetY) * scaleRatio

      this.scale = newScale
      this.lastPinchDist = dist
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

  getPinchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    }
  }

  reset() {
    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0
  }

  // Get current state
  getState() {
    return {
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY
    }
  }

  // Get visible world bounds (for infinite canvas - what area is currently visible)
  getVisibleBounds(screenWidth, screenHeight) {
    const topLeft = this.screenToWorld(0, 0)
    const bottomRight = this.screenToWorld(screenWidth, screenHeight)
    return {
      minX: topLeft.x,
      minY: topLeft.y,
      maxX: bottomRight.x,
      maxY: bottomRight.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    }
  }

  // Zoom in (toward center)
  zoomIn() {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2
    const newScale = Math.min(this.maxScale, this.scale * 1.25)
    const scaleRatio = newScale / this.scale

    this.offsetX = centerX - (centerX - this.offsetX) * scaleRatio
    this.offsetY = centerY - (centerY - this.offsetY) * scaleRatio
    this.scale = newScale
  }

  // Zoom out (from center)
  zoomOut() {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2
    const newScale = Math.max(this.minScale, this.scale / 1.25)
    const scaleRatio = newScale / this.scale

    this.offsetX = centerX - (centerX - this.offsetX) * scaleRatio
    this.offsetY = centerY - (centerY - this.offsetY) * scaleRatio
    this.scale = newScale
  }
}
