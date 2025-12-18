# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start Vite dev server (localhost:3000)
npm run build    # Production build
npm run preview  # Preview production build
```

## Architecture

Audio Canvas transforms music into real-time generative art using the Web Audio API and Canvas 2D/Three.js.

### Core Flow

```
Audio Input → AudioAnalyzer → BeatDetector → Renderer → Visualization Mode
                   ↓               ↓
            Audio Features    Beat Info (BPM, onBeat, intensity)
```

### Key Components

- **`src/main.js`** - Application entry point. `AudioCanvas` class orchestrates audio/visual systems, handles UI events, manages mode switching between 2D/3D.

- **`src/audio/analyzer.js`** - `AudioAnalyzer` extracts frequency bands (bass/mid/high), amplitude, spectral centroid, and dominant frequency. Supports file playback, microphone, and tab capture.

- **`src/audio/beatdetector.js`** - `BeatDetector` tracks BPM, beat events, and "blast beat saturation" for extreme tempos.

- **`src/visual/renderer.js`** - `Renderer` manages the 2D canvas, mode lifecycle, pan/zoom, and export. Maps mode names to mode classes via `MODE_CLASSES`.

- **`src/visual/renderer3d.js`** - `Renderer3D` handles Three.js scenes for 3D modes.

### Mode System

All 2D visualization modes extend `VisualizationMode` (`src/visual/modes/base.js`):

```javascript
class VisualizationMode {
  init()                        // Setup when mode activates
  resize(width, height)         // Handle canvas resize
  update(audioFeatures, beatInfo) // Process audio data each frame
  draw()                        // Render to canvas
  clear()                       // Reset state
  exportSVG(width, height)      // Optional SVG export
}
```

3D modes extend `Mode3D` (`src/visual/modes3d/base.js`) with Three.js scene management.

### Adding a New Mode

1. Create `src/visual/modes/yourmode.js` extending `VisualizationMode`
2. Register in `src/visual/modes/index.js`:
   - Add export statement
   - Add to `MODES` registry with metadata
3. Add to `MODE_CLASSES` in `src/visual/renderer.js`
4. Add button to `index.html` in the appropriate mode panel

### Audio Features Object

```javascript
{
  bass: 0-1,           // Low frequency energy
  mid: 0-1,            // Mid frequency energy
  high: 0-1,           // High frequency energy
  amplitude: 0-1,      // Overall loudness
  centroid: 0-1,       // Spectral brightness
  dominantFrequency: 0-1,
  frequencies: Uint8Array  // Raw FFT data
}
```

### Beat Info Object

```javascript
{
  bpm: number,
  onBeat: boolean,     // True on beat frames
  beatIntensity: 0-1,
  isSaturated: boolean, // Blast beat mode active
  normalizedTempo: 0-1
}
```

## Tech Stack

- Vite for build/dev server
- Vanilla JS (no framework)
- Canvas 2D for most visualizations
- Three.js for 3D modes
- Web Audio API for analysis
