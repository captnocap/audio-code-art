// SVG Export Utility
// Converts visualization data to scalable vector graphics
// Techniques inspired by https://www.joshwcomeau.com/svg/interactive-guide-to-paths/

export class SVGExporter {
  constructor(width = 3840, height = 2160) {
    this.width = width
    this.height = height
  }

  // Create SVG document wrapper with optional CSS animations
  createDocument(content, options = {}) {
    const {
      background = '#0a0a0a',
      viewBox = `0 0 ${this.width} ${this.height}`,
      preserveAspectRatio = 'xMidYMid meet',
      includeDrawAnimation = false,
      animationDuration = '5s'
    } = options

    // Optional CSS for "drawing" animation effect
    const animationCSS = includeDrawAnimation ? `
  <style>
    .draw-path {
      stroke-dasharray: var(--path-length);
      stroke-dashoffset: var(--path-length);
      animation: draw ${animationDuration} ease-out forwards;
    }
    @keyframes draw {
      to { stroke-dashoffset: 0; }
    }
  </style>` : ''

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${this.width}"
     height="${this.height}"
     viewBox="${viewBox}"
     preserveAspectRatio="${preserveAspectRatio}">
  ${animationCSS}
  <rect width="100%" height="100%" fill="${background}"/>
  ${content}
</svg>`
  }

  // Create a circle element
  circle(cx, cy, r, options = {}) {
    const { fill = 'none', stroke = '#fff', strokeWidth = 1, opacity = 1 } = options
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
  }

  // Create a line element
  line(x1, y1, x2, y2, options = {}) {
    const { stroke = '#fff', strokeWidth = 1, opacity = 1 } = options
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
  }

  // Create a path element from points
  path(points, options = {}) {
    const {
      stroke = '#fff',
      strokeWidth = 1,
      fill = 'none',
      opacity = 1,
      closed = false,
      smooth = false,
      className = '',
      pathLength = null,  // For dash animations
      miterlimit = 10
    } = options

    if (points.length < 2) return ''

    let d
    if (smooth && points.length > 2) {
      d = this.smoothPath(points, closed)
    } else {
      d = `M ${points[0].x} ${points[0].y}`
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`
      }
      if (closed) d += ' Z'
    }

    const classAttr = className ? `class="${className}"` : ''
    const styleAttr = pathLength ? `style="--path-length: ${pathLength}"` : ''

    return `<path d="${d}" ${classAttr} ${styleAttr} stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="${miterlimit}"/>`
  }

  // Create an arc path (great for circular elements)
  arc(cx, cy, r, startAngle, endAngle, options = {}) {
    const {
      stroke = '#fff',
      strokeWidth = 1,
      fill = 'none',
      opacity = 1
    } = options

    // Convert angles to radians
    const start = startAngle * Math.PI / 180
    const end = endAngle * Math.PI / 180

    // Calculate start and end points
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)

    // Large arc flag (1 if > 180 degrees)
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
    // Sweep flag (1 for clockwise)
    const sweep = endAngle > startAngle ? 1 : 0

    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`

    return `<path d="${d}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}" opacity="${opacity}" stroke-linecap="round"/>`
  }

  // Create smooth bezier path through points
  smoothPath(points, closed = false) {
    if (points.length < 2) return ''

    let d = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      // Catmull-Rom to Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    if (closed) d += ' Z'
    return d
  }

  // Create a polyline (no fill, just stroke)
  polyline(points, options = {}) {
    const { stroke = '#fff', strokeWidth = 1, opacity = 1 } = options
    const pointStr = points.map(p => `${p.x},${p.y}`).join(' ')
    return `<polyline points="${pointStr}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`
  }

  // Create a group with optional transform
  group(content, options = {}) {
    const { transform = '', opacity = 1, id = '' } = options
    const idAttr = id ? `id="${id}"` : ''
    const transformAttr = transform ? `transform="${transform}"` : ''
    return `<g ${idAttr} ${transformAttr} opacity="${opacity}">${content}</g>`
  }

  // RGB object to hex color
  rgbToHex(rgb) {
    const toHex = (n) => Math.round(n).toString(16).padStart(2, '0')
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
  }

  // Trigger download of SVG file
  download(svgContent, filename = 'audio-canvas.svg') {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  // Scale coordinates from screen to export size
  scale(x, y, screenWidth, screenHeight) {
    return {
      x: (x / screenWidth) * this.width,
      y: (y / screenHeight) * this.height
    }
  }
}

// Singleton instance
export const svgExporter = new SVGExporter()
