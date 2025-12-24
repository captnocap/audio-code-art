# Audio Canvas

**Turn music into art.**

A browser-based generative art tool that transforms audio into unique visual compositions in real-time. Drop in a song, pick a visualization mode, and watch your music paint itself.

---

## How It Works

Audio is analyzed in real-time using the Web Audio API. Frequency data, amplitude, and beat detection feed into generative algorithms that create visuals unique to each song.

### The Color Formula

```
color = f(pitch, tempo, amplitude)
```

| Input | Output |
|-------|--------|
| **Pitch** | Hue — bass=red/orange, mids=yellow/green, highs=blue/purple/magenta |
| **Tempo** | Saturation + hue shift — fast=vibrant/electric, slow=muted/earthy |
| **Amplitude** | Brightness — quiet=dark, loud=bright |

Each song produces a unique chromatic fingerprint based on its harmonic and rhythmic content.

---

## Visualization Modes

### 2D Modes

#### Core Visualizations

| Mode | Description |
|------|-------------|
| 〰️ **Flow** | Particles follow audio-reactive flow fields built on Perlin noise. Accumulates as stippled texture over time. |
| ▦ **Pixel Sort** | Pixel sorting triggered by amplitude. Creates glitchy, smeared horizontal bands. |
| ◎ **Mandala** | Radial slices spawn on beats, building outward like tree rings. A circular timeline of the song. |
| 🌿 **L-System Tree** | Fractal trees grow on beats. Branch angle and length determined by pitch. |
| ○ **Rings** | Concentric circles pulse outward continuously. Rapid-fire spawning creates dense, layered forms. |
| ✦ **Constellation** | Stars spawn on beats and connect to nearby stars with lines. Builds a constellation map. |
| ⛰ **Terrain** | Scrolling mountain range generated from the waveform. Layered parallax landscape. |
| ✧ **Mirror** | 8-way kaleidoscope symmetry. Particles are mirrored radially around center. |
| ✎ **Plotter** | Single continuous line that never lifts. Perfect for pen plotters like AxiDraw. |

#### Mathematical & Geometric

| Mode | Description |
|------|-------------|
| ❋ **Spirograph** | Audio-modulated mathematical curves with SVG export. |
| ▣ **Cellular Automata** | Game of Life with audio-modulated rules and birth rates. |
| ◉ **Gravitational Orbits** | Particles orbit gravitational attractors influenced by audio. |
| ⬡ **Voronoi Shatter** | Cellular patterns that fracture and reform on beats. |
| ≋ **Topographic Contours** | Audio height field with contour lines. |
| ◇ **Stained Glass** | Delaunay triangulation mosaic with rippling colors. |
| 🏙 **Isometric City** | Procedural cityscapes that breathe and pulse with audio. |
| 〇 **Cymatics** | Chladni plate standing wave patterns driven by frequency. |
| 🌀 **Mandelbrot** | Audio-reactive fractal exploration with Julia set morphing. |

#### Organic & Nature

| Mode | Description |
|------|-------------|
| 🍄 **Neural Mycelium** | Organic branching network growth like fungal networks. |
| 🧫 **Reaction-Diffusion** | Gray-Scott chemical patterns evolving with audio. |
| 🏖️ **Beach Tides** | Sound as ocean waves. Sand remembers. Shells deposit. Tide pools form. |

#### Chemistry Simulations

| Mode | Description |
|------|-------------|
| ⚛ **Molecular Dynamics** | Atoms forming and breaking chemical bonds (HCNOS with proper valence). |
| ❄ **Crystal Growth** | Dendritic crystal nucleation and snowflake-like growth patterns. |
| ☢ **Electron Orbitals** | Quantum probability clouds (s, p, d, f orbitals) visualized with particles. |
| 🔥 **Combustion** | Realistic fire simulation with fuel particles, flames, and smoke. |
| 🧪 **pH Titration** | Color-changing pH indicator solution with acid/base diffusion. |
| 🔗 **Polymerization** | Chain reactions building polymer structures from monomers. |
| ⚡ **Electrochemistry** | Electrochemical cells with electron flow between electrodes. |

#### Data & Design

| Mode | Description |
|------|-------------|
| 📊 **Audio Commit Grid** | GitHub-style contribution grid where each cell is a musical note. Chords create lightning. |
| 🌑 **Edge Gravity** | Edges pull particles to the void. Sound pushes them back with light trails. |
| 🔧 **3D Pipes** | Classic Windows screensaver — pipes grow and turn through space. |

---

### 3D Modes (Three.js)

| Mode | Description |
|------|-------------|
| 💎 **3D Geometry** | Pulsing icosahedron with audio-reactive morphing and orbiting particles. |
| 🌌 **3D Nebula** | 80,000+ particles forming cosmic clouds with orbiting attractors. |
| 🕳️ **3D Tunnel** | Infinite tunnel flying through audio-reactive space. |
| 🧬 **3D Protein** | Amino acid chains folding with audio. Alpha helices and beta sheets form dynamically. |
| 💥 **Audio Demolition** | Physics structures destroyed by audio. Bass shakes. Beats explode. |
| 🫧 **Soft Body Mosh** | Jelly blobs colliding. Bass squishes. Beats bounce. |
| 🌀 **Dimensional Bleed** | 2D bleeds into 3D. Portals tear open. Physics breaks. |
| 🪐 **Audio Gravity** | Bass creates black holes. Treble creates anti-gravity. |
| 🏖️ **3D Beach Tides** | 3D ocean waves with sand, shells, and tide pools. |
| 🗻 **Sonic Topography** | 3D terrain built from audio — frequency × amplitude × time. |
| 🏄 **Audio Surfer** | Fly through a wormhole! Arrow keys to surf. Particles paint the walls. |
| 🧠 **Neural Dreams** | Neural cellular automata. Living walls that breathe, grow, heal, and hallucinate. |

---

### Glitch Modes (Chaos)

| Mode | Description |
|------|-------------|
| 💾 **Corruption** | Memory artifacts. Audio from 30 seconds ago bleeds into now. |
| ♾️ **Feedback Loop** | Canvas becomes audio input. Recursive chaos until crash. The journey is art. |
| ⚠️ **Wrong API** | Audio controls impossible things. Errors become art. |
| ⏳ **Time Displacement** | Past, present, future rendered out of order. |
| 🕳️ **Anti-Visualization** | Sound destroys. Silence preserves. Negative space portrait. |
| 👃 **Synesthesia Lies** | Audio becomes smell, taste, texture. Impossible sensations visualized. |
| 🌌 **Quantum Gravity** | Sound IS gravity. Bass warps spacetime. Beats collapse wave functions. |

---

### Interactive Modes (Games)

| Mode | Description |
|------|-------------|
| 👾 **Bullet Hell** | Navigate audio-generated bullet patterns. You cannot die, only transform. WASD to move. |
| 🧱 **Audio Tetris** | Tetris where pieces are chosen by audio. Bass = heavy blocks, highs = light pieces. |
| 💣 **Audio Minesweeper** | Beats spawn hidden mines. Clear between the chaos. |
| 🏄 **Audiosurf** | Ride a 3D highway generated from audio. Collect orbs, feel the flow. |

---

### Code Generation Modes (Meta)

| Mode | Description |
|------|-------------|
| ⚛️ **JSX Generator** | Generate React components from audio. Songs become design systems. |
| 🧠 **AI Chat** | Chat interface where responses become multi-mode visual chaos. |
| 🎨 **UI Kit Generator** | Albums become CSS/Tailwind themes. Colors, spacing, typography from audio. |

---

## Features

- **50+ visualization modes** — 2D, 3D, games, glitch art, and code generation
- **Real-time audio analysis** — frequency bands, amplitude, spectral centroid, beat detection
- **Multiple audio sources** — file upload, microphone, browser tab capture, YouTube
- **Blast beat detection** — automatically handles extreme tempos (>8 beats/sec)
- **4K PNG export** — save creations at 3840×2160
- **SVG export** — vector output for supported modes (pen plotters, laser cutters)
- **GIF recording** — capture 5-second loops
- **ASCII mode** — text-based visualization overlay
- **Lyrics mode** — speech recognition interprets vocals as visual data
- **Painter mode** — canvas accumulates like oil paint
- **Live tuner panel** — real-time parameter adjustment
- **Pan & zoom** — navigate the canvas with mouse

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/captnocap/audio-canvas.git
cd audio-canvas

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:3000` and drop in an audio file.

---

## Controls

| Control | Action |
|---------|--------|
| **Drop zone** | Load audio file (drag & drop or click) |
| **🎤 Mic** | Record from microphone |
| **🔊 Tab** | Capture audio from browser tab |
| **YouTube URL** | Paste URL to visualize YouTube audio |
| **Mode tabs** | Switch between 2D/3D/Physics/Games/Glitch/Code |
| **📷 PNG** | Export 4K image |
| **✒️ SVG** | Export vector (supported modes) |
| **🎬 GIF** | Record 5-second loop |
| **🗑️ Clear** | Reset canvas |
| **+/-** | Zoom in/out |
| **Drag** | Pan around canvas |
| **Double-click** | Reset zoom and pan |
| **H** | Hide/show UI |
| **F** | Toggle fullscreen |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Play/pause |
| **H** | Hide UI |
| **F** | Fullscreen |
| **+/-** | Zoom |
| **WASD** | Move player (game modes) |
| **Arrow keys** | Navigate (Audiosurf, Surfer modes) |

---

## Tips

- Let a full song play to build up dense, detailed artwork
- Try different genres — each creates distinct visual signatures
- Export during interesting moments or at the end
- The same song will produce similar (but not identical) results each time
- Compare the same track across different modes
- Enable ASCII + Lyrics together for text-based vocal visualization
- Use the tuner panel (🎛️) to fine-tune visualization parameters

---

## Tech Stack

- **Vite** — build tool
- **Canvas 2D** — 2D rendering
- **Three.js** — 3D rendering
- **Web Audio API** — real-time audio analysis
- **Oimo.js / Cannon-ES / Matter.js** — physics engines
- **Vanilla JS** — no UI frameworks

---

## Inspiration

Inspired by the algorithmic art of [Monokai](https://monokai.com/work), particularly:
- [Draad](https://monokai.com/work/draad/) — flow field weaving
- [Fire Card](https://monokai.com/work/fire-card/) — stippled particle systems
- [Origin](https://monokai.com/work/origin/) — code-based generative art

---

## License

MIT — do whatever you want with it. Make art. Print it. Sell it. Just have fun.

---

*Built with [Claude Code](https://claude.ai/code)*
