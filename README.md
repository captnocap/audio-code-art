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

### 〰️ Flow
Particles follow audio-reactive flow fields built on Perlin noise. Accumulates as stippled texture over time. The longer the song, the denser the result.

### ▦ Sort
Pixel sorting triggered by amplitude. Creates glitchy, smeared horizontal bands. Full-spectrum music lights up like a rainbow; sparse tracks reveal distinct frequency layers.

### ◎ Mandala
Radial slices spawn on beats, building outward like tree rings. A circular timeline of the song — you can literally read the music's structure.

### 🌿 Tree
L-system fractal trees grow on beats. Branch angle and length determined by pitch. Each song grows its own unique forest.

### ○ Rings
Concentric circles pulse outward continuously. Rapid-fire spawning creates dense, layered forms that blend into solid gradients.

### ✦ Stars
Stars spawn on beats and connect to nearby stars with lines. Builds a constellation map over time.

### ⛰ Terrain
Scrolling mountain range generated from the waveform. Layered parallax landscape that evolves with the music.

### ✧ Mirror
8-way kaleidoscope symmetry. Particles are mirrored radially around center, turning chaos into sacred geometry.

---

## Features

- **Real-time visualization** — watch art generate as music plays
- **Mic recording** — capture any audio and generate art from it
- **Blast beat detection** — automatically handles extreme tempos (>8 beats/sec) with sustained intensity instead of overwhelming pulses
- **4K PNG export** — save your creations at 3840×2160
- **8 distinct modes** — each creates completely different artwork from the same song

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/captnocap/audio-code-art.git
cd audio-code-art

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
| **Mode buttons** | Switch visualization (clears canvas) |
| **Drop zone** | Load audio file |
| **🎤 Mic** | Record from microphone |
| **📷 PNG** | Export 4K image |
| **🗑️ Clear** | Reset canvas |
| **Blast Mode** | Toggle sustained intensity during blast beats |
| **?** | Open documentation modal |

---

## Tips

- Let a full song play to build up dense, detailed artwork
- Try different genres — each creates distinct visual signatures
- Export during interesting moments or at the end
- The same song will produce similar (but not identical) results each time
- Compare the same track across different modes

---

## Tech Stack

- **Vite** — build tool
- **Canvas 2D** — rendering
- **Web Audio API** — real-time audio analysis
- **Vanilla JS** — no frameworks, just code

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

*Built in one session with [Claude Code](https://claude.com/claude-code)*
