# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start Vite dev server (localhost:3000)
npm run build    # Production build
npm run preview  # Preview production build
```

## Architecture

Audio Canvas transforms music into real-time generative art using the Web Audio API, Canvas 2D, and Three.js.

### Core Flow

```
Audio Input → AudioAnalyzer → BeatDetector → Renderer → Visualization Mode
                   ↓               ↓
            Audio Features    Beat Info (BPM, onBeat, intensity)
```

### Key Components

- **`src/main.js`** - Application entry point. `AudioCanvas` class orchestrates audio/visual systems, handles UI events, manages mode switching between 2D/3D, and controls ASCII/Lyrics/Painter overlay modes.

- **`src/audio/analyzer.js`** - `AudioAnalyzer` extracts frequency bands (bass/mid/high), amplitude, spectral centroid, and dominant frequency. Supports file playback, microphone, tab capture, and YouTube audio.

- **`src/audio/beatdetector.js`** - `BeatDetector` tracks BPM, beat events, and "blast beat saturation" for extreme tempos (>8 beats/sec).

- **`src/visual/renderer.js`** - `Renderer` manages the 2D canvas, mode lifecycle, pan/zoom, and export (PNG/SVG/GIF). Maps mode names to mode classes via `MODE_CLASSES`.

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

### Mode Categories

The app organizes modes into tabs:

- **2D** - Core visualizations, math/geometry, organic patterns, chemistry simulations
- **3D** - Three.js WebGL modes (geometry, nebula, tunnel, protein, physics)
- **Physics** - Multi-physics modes using Matter.js, Cannon-ES, Oimo.js
- **Games** - Interactive game modes (Bullet Hell, Tetris, Minesweeper, Audiosurf)
- **Glitch** - Experimental chaos modes (corruption, feedback, time displacement)
- **Code** - Meta modes that generate code (JSX, CSS/Tailwind themes, AI chat)

### Adding a New Mode

1. Create `src/visual/modes/yourmode.js` extending `VisualizationMode`
2. Register in `src/visual/modes/index.js`:
   - Add export statement
   - Add to `MODES` registry with metadata (name, description, icon, supportsSVG)
3. Add to `MODE_CLASSES` in `src/visual/renderer.js`
4. Add button to `index.html` in the appropriate mode panel tab

For 3D modes:
1. Create `src/visual/modes3d/yourmode.js` extending `Visualization3DMode`
2. Register in `src/visual/modes3d/index.js`
3. Add to `MODE_3D_CLASSES` in `src/visual/renderer3d.js`

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

### UI Structure

- **Mode tabs** - Tab-based navigation (2D/3D/Physics/Games/Glitch/Code)
- **Mode panels** - Each tab has a panel of mode buttons
- **Controls** - Audio input, export, toggles (Blast Mode, ASCII, Lyrics, Painter)
- **Help modal** - Documentation overlay triggered by ? button
- **Tuner panel** - Live parameter adjustment (decay, sensitivity, chaos, etc.)

## Tech Stack

- Vite for build/dev server
- Vanilla JS (no UI framework)
- Canvas 2D for most 2D visualizations
- Three.js for 3D modes
- Web Audio API for analysis
- Oimo.js, Cannon-ES, Matter.js for physics simulations
- gif.js for GIF export
