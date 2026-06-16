// Lightweight sound engine using the Web Audio API — no audio files, fully
// offline. All sounds are synthesised. iOS only allows audio after a user
// gesture, so the context is created/resumed on the first tap.

let ctx: AudioContext | null = null
let enabled = (typeof localStorage !== 'undefined' ? localStorage.getItem('gb-sound') : null) !== '0'

export function soundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(v: boolean): void {
  enabled = v
  try {
    localStorage.setItem('gb-sound', v ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (v) {
    ensure()
    whistle() // confirm it's on
  }
}

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Unlock audio on the first user interaction (iOS requirement).
if (typeof window !== 'undefined') {
  const unlock = () => {
    ensure()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('touchstart', unlock, { passive: true })
}

function tone(opts: {
  freq: number | number[]
  start?: number
  dur: number
  type?: OscillatorType
  gain?: number
}): void {
  const ac = ensure()
  if (!ac) return
  const t0 = ac.currentTime + (opts.start ?? 0)
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = opts.type ?? 'sine'
  const peak = opts.gain ?? 0.2
  if (Array.isArray(opts.freq)) {
    osc.frequency.setValueCurveAtTime(Float32Array.from(opts.freq), t0, opts.dur)
  } else {
    osc.frequency.setValueAtTime(opts.freq, t0)
  }
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur)
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + opts.dur + 0.02)
}

function noiseSwell(dur: number, gain = 0.18): void {
  const ac = ensure()
  if (!ac) return
  const t0 = ac.currentTime
  const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buffer
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(700, t0)
  bp.frequency.linearRampToValueAtTime(1600, t0 + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.4)
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
  src.connect(bp).connect(g).connect(ac.destination)
  src.start(t0)
  src.stop(t0 + dur)
}

// ---------- Public sounds ----------

export function whistle(): void {
  if (!enabled) return
  // Warbling pea-whistle.
  tone({ freq: [2050, 2350, 2050, 2350, 2100], dur: 0.32, type: 'triangle', gain: 0.22 })
}

export function longWhistle(): void {
  if (!enabled) return
  tone({ freq: [2050, 2350, 2050, 2350, 2050, 2350, 2050], dur: 0.75, type: 'triangle', gain: 0.24 })
}

export function beep(): void {
  if (!enabled) return
  tone({ freq: 880, dur: 0.12, type: 'square', gain: 0.16 })
}

export function pop(): void {
  if (!enabled) return
  tone({ freq: [620, 320], dur: 0.08, type: 'sine', gain: 0.12 })
}

export function chime(): void {
  if (!enabled) return
  // Ascending major triad.
  tone({ freq: 523, dur: 0.14, gain: 0.18 })
  tone({ freq: 659, start: 0.12, dur: 0.14, gain: 0.18 })
  tone({ freq: 784, start: 0.24, dur: 0.22, gain: 0.2 })
}

export function cheer(): void {
  if (!enabled) return
  noiseSwell(0.9)
  longWhistle()
}

export function fanfare(): void {
  if (!enabled) return
  tone({ freq: 523, dur: 0.16, gain: 0.2 })
  tone({ freq: 659, start: 0.14, dur: 0.16, gain: 0.2 })
  tone({ freq: 784, start: 0.28, dur: 0.16, gain: 0.2 })
  tone({ freq: 1047, start: 0.42, dur: 0.3, gain: 0.22 })
  noiseSwell(1.0)
}
