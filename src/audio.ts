// HTML5 Audio player: everything preloaded, one sound at a time.
// A missing file never throws or shows UI; it logs one console warning.

const BASE = `${import.meta.env.BASE_URL}audio/`

const clips = new Map<string, HTMLAudioElement>()
const missing = new Set<string>()
let current: HTMLAudioElement | null = null

function warnMissing(name: string) {
  if (missing.has(name)) return
  missing.add(name)
  console.warn(`[audio] missing or unplayable: ${name}.mp3`)
}

function load(name: string): HTMLAudioElement {
  let el = clips.get(name)
  if (el) return el
  el = new Audio()
  el.preload = 'auto'
  el.addEventListener('error', () => warnMissing(name), { once: true })
  el.src = `${BASE}${name}.mp3`
  el.load()
  clips.set(name, el)
  return el
}

export function preload(names: string[]) {
  names.forEach(load)
}

export function stop() {
  if (!current) return
  current.pause()
  try {
    current.currentTime = 0
  } catch {
    /* not loaded yet */
  }
  current = null
}

export function play(name: string) {
  stop()
  if (missing.has(name)) return
  const el = load(name)
  current = el
  el.muted = false
  try {
    el.currentTime = 0
  } catch {
    /* not loaded yet */
  }
  el.play().catch((err: DOMException) => {
    // AbortError = interrupted by the next tap, which is expected.
    if (err.name !== 'AbortError') warnMissing(name)
  })
}

/**
 * iOS Safari only fetches media after play() is called inside a user gesture.
 * On the first tap anywhere, start every clip muted and pause it immediately,
 * so later taps play without a load delay.
 */
export function installUnlock() {
  const unlock = () => {
    window.removeEventListener('pointerdown', unlock, true)
    for (const [name, el] of clips) {
      if (missing.has(name) || el === current) continue
      el.muted = true
      el.play()
        .then(() => {
          if (el !== current) {
            el.pause()
            el.currentTime = 0
          }
        })
        .catch(() => {})
        .finally(() => {
          el.muted = false
        })
    }
  }
  window.addEventListener('pointerdown', unlock, true)
}
