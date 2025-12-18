// Global Tuner Panel - Live adjustment of visualization parameters
// Like an audio producer's mixer but for visuals

export class TunerPanel {
  constructor() {
    this.params = {
      decay: 0.5,           // How fast things fade (0 = instant, 1 = forever)
      sensitivity: 0.5,     // Audio reactivity threshold
      feedback: 0.3,        // Self-reference amount
      timeBleed: 0.2,       // How much past bleeds into present
      bassWeight: 0.5,      // Bass influence multiplier
      midWeight: 0.5,       // Mid influence multiplier
      highWeight: 0.5,      // High influence multiplier
      destruction: 0.5,     // For anti-viz: how much sound destroys
      colorDrift: 0.3,      // How much hue shifts over time
      chaos: 0.5,           // General randomness/unpredictability
      timeDisplacement: 0,  // Frame order scrambling
      errorVisualization: 0.5, // How prominently to show errors
    }

    this.visible = false
    this.listeners = []

    this.createUI()
  }

  createUI() {
    if (document.getElementById('tuner-panel')) return

    const panel = document.createElement('div')
    panel.id = 'tuner-panel'
    panel.innerHTML = `
      <div class="tuner-header">
        <span>TUNER</span>
        <button id="tuner-close">×</button>
      </div>
      <div class="tuner-grid">
        ${this.createSlider('decay', 'DECAY', 'How fast things fade')}
        ${this.createSlider('sensitivity', 'SENSITIVITY', 'Audio reactivity threshold')}
        ${this.createSlider('feedback', 'FEEDBACK', 'Self-reference amount')}
        ${this.createSlider('timeBleed', 'TIME BLEED', 'Past bleeds into present')}
        ${this.createSlider('bassWeight', 'BASS', 'Low frequency weight')}
        ${this.createSlider('midWeight', 'MID', 'Mid frequency weight')}
        ${this.createSlider('highWeight', 'HIGH', 'High frequency weight')}
        ${this.createSlider('destruction', 'DESTRUCTION', 'Sound erosion rate')}
        ${this.createSlider('colorDrift', 'COLOR DRIFT', 'Hue shift over time')}
        ${this.createSlider('chaos', 'CHAOS', 'Randomness factor')}
        ${this.createSlider('timeDisplacement', 'TIME WARP', 'Frame order scramble')}
        ${this.createSlider('errorVisualization', 'ERROR VIZ', 'Error prominence')}
      </div>
      <div class="tuner-presets">
        <button class="preset-btn" data-preset="subtle">Subtle</button>
        <button class="preset-btn" data-preset="aggressive">Aggressive</button>
        <button class="preset-btn" data-preset="chaos">Pure Chaos</button>
        <button class="preset-btn" data-preset="temporal">Temporal</button>
        <button class="preset-btn" data-preset="reset">Reset</button>
      </div>
    `

    const style = document.createElement('style')
    style.textContent = `
      #tuner-panel {
        position: fixed;
        top: 60px;
        right: 20px;
        width: 280px;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 15px;
        z-index: 300;
        font-family: 'SF Mono', Monaco, monospace;
        display: none;
      }
      #tuner-panel.visible {
        display: block;
      }
      .tuner-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .tuner-header span {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 2px;
        color: rgba(255, 255, 255, 0.7);
      }
      #tuner-close {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
      }
      #tuner-close:hover {
        color: #fff;
      }
      .tuner-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .tuner-param {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .tuner-param label {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 1px;
        display: flex;
        justify-content: space-between;
      }
      .tuner-param label .value {
        color: rgba(255, 150, 100, 0.8);
      }
      .tuner-param input[type="range"] {
        width: 100%;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        cursor: pointer;
      }
      .tuner-param input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        background: rgba(255, 150, 100, 0.8);
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s;
      }
      .tuner-param input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      .tuner-param input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: rgba(255, 150, 100, 0.8);
        border-radius: 50%;
        border: none;
        cursor: pointer;
      }
      .tuner-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 15px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .preset-btn {
        padding: 5px 10px;
        font-size: 9px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        letter-spacing: 0.5px;
      }
      .preset-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      #tuner-toggle {
        position: fixed;
        top: 60px;
        right: 20px;
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.6);
        font-size: 18px;
        cursor: pointer;
        z-index: 250;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      #tuner-toggle:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
      #tuner-toggle.active {
        background: rgba(255, 150, 100, 0.3);
        border-color: rgba(255, 150, 100, 0.5);
      }
    `

    document.head.appendChild(style)
    document.body.appendChild(panel)

    // Create toggle button
    const toggle = document.createElement('button')
    toggle.id = 'tuner-toggle'
    toggle.innerHTML = '🎛️'
    toggle.title = 'Tuner Panel'
    document.body.appendChild(toggle)

    // Event handlers
    toggle.addEventListener('click', () => this.toggle())
    document.getElementById('tuner-close').addEventListener('click', () => this.hide())

    // Slider handlers
    Object.keys(this.params).forEach(key => {
      const slider = document.getElementById(`tuner-${key}`)
      if (slider) {
        slider.addEventListener('input', (e) => {
          this.params[key] = parseFloat(e.target.value)
          this.updateDisplay(key)
          this.notify()
        })
      }
    })

    // Preset handlers
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset))
    })
  }

  createSlider(key, label, tooltip) {
    const value = this.params[key]
    return `
      <div class="tuner-param" title="${tooltip}">
        <label>
          <span>${label}</span>
          <span class="value" id="tuner-${key}-display">${(value * 100).toFixed(0)}%</span>
        </label>
        <input type="range" id="tuner-${key}" min="0" max="1" step="0.01" value="${value}" />
      </div>
    `
  }

  updateDisplay(key) {
    const display = document.getElementById(`tuner-${key}-display`)
    if (display) {
      display.textContent = `${(this.params[key] * 100).toFixed(0)}%`
    }
  }

  updateAllDisplays() {
    Object.keys(this.params).forEach(key => {
      const slider = document.getElementById(`tuner-${key}`)
      if (slider) {
        slider.value = this.params[key]
        this.updateDisplay(key)
      }
    })
  }

  applyPreset(preset) {
    switch (preset) {
      case 'subtle':
        this.params = {
          ...this.params,
          decay: 0.7,
          sensitivity: 0.3,
          feedback: 0.1,
          timeBleed: 0.1,
          bassWeight: 0.4,
          midWeight: 0.5,
          highWeight: 0.4,
          destruction: 0.2,
          colorDrift: 0.1,
          chaos: 0.1,
        }
        break
      case 'aggressive':
        this.params = {
          ...this.params,
          decay: 0.3,
          sensitivity: 0.8,
          feedback: 0.5,
          timeBleed: 0.3,
          bassWeight: 0.8,
          midWeight: 0.6,
          highWeight: 0.9,
          destruction: 0.7,
          colorDrift: 0.5,
          chaos: 0.4,
        }
        break
      case 'chaos':
        this.params = {
          ...this.params,
          decay: 0.1,
          sensitivity: 1.0,
          feedback: 0.9,
          timeBleed: 0.8,
          bassWeight: 1.0,
          midWeight: 1.0,
          highWeight: 1.0,
          destruction: 0.9,
          colorDrift: 0.8,
          chaos: 1.0,
        }
        break
      case 'temporal':
        this.params = {
          ...this.params,
          decay: 0.8,
          sensitivity: 0.5,
          feedback: 0.6,
          timeBleed: 1.0,
          timeDisplacement: 0.8,
          chaos: 0.3,
        }
        break
      case 'reset':
        this.params = {
          decay: 0.5,
          sensitivity: 0.5,
          feedback: 0.3,
          timeBleed: 0.2,
          bassWeight: 0.5,
          midWeight: 0.5,
          highWeight: 0.5,
          destruction: 0.5,
          colorDrift: 0.3,
          chaos: 0.5,
          timeDisplacement: 0,
          errorVisualization: 0.5,
        }
        break
    }
    this.updateAllDisplays()
    this.notify()
  }

  toggle() {
    this.visible = !this.visible
    const panel = document.getElementById('tuner-panel')
    const toggle = document.getElementById('tuner-toggle')
    if (panel) panel.classList.toggle('visible', this.visible)
    if (toggle) toggle.classList.toggle('active', this.visible)
  }

  show() {
    this.visible = true
    const panel = document.getElementById('tuner-panel')
    const toggle = document.getElementById('tuner-toggle')
    if (panel) panel.classList.add('visible')
    if (toggle) toggle.classList.add('active')
  }

  hide() {
    this.visible = false
    const panel = document.getElementById('tuner-panel')
    const toggle = document.getElementById('tuner-toggle')
    if (panel) panel.classList.remove('visible')
    if (toggle) toggle.classList.remove('active')
  }

  // Subscribe to parameter changes
  onChange(callback) {
    this.listeners.push(callback)
  }

  notify() {
    this.listeners.forEach(cb => cb(this.params))
  }

  get(key) {
    return this.params[key]
  }

  getAll() {
    return { ...this.params }
  }
}

// Global singleton
export const tuner = new TunerPanel()
