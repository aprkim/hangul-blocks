// HTML5 Audio player: everything preloaded, one sound at a time.
// A missing file never throws or shows UI; it logs one console warning.

const BASE = `${import.meta.env.BASE_URL}audio/`

const clips = new Map<string, HTMLAudioElement>()
/** Sounds that failed to load, with when. Retried after a while: a file may be uploaded later. */
const missing = new Map<string, number>()
const RETRY_MISSING_MS = 5000
let current: HTMLAudioElement | null = null
/** Recordings made on this device (blob URLs). They win over public/audio/. */
const local = new Map<string, string>()

function warnMissing(name: string) {
  if (missing.has(name)) return
  missing.set(name, Date.now())
  console.warn(`[audio] missing or unplayable: ${name}.mp3`)
}

function load(name: string): HTMLAudioElement {
  let el = clips.get(name)
  if (el) return el
  el = new Audio()
  el.preload = 'auto'
  el.addEventListener('error', () => warnMissing(name), { once: true })
  el.src = local.get(name) ?? `${BASE}${name}.mp3`
  el.load()
  clips.set(name, el)
  return el
}

/** Use an on-device recording for this sound from now on (replaces any loaded clip). */
export function setLocalRecording(name: string, mp3: Blob | null) {
  const old = local.get(name)
  if (old) URL.revokeObjectURL(old)
  if (mp3) local.set(name, URL.createObjectURL(mp3))
  else local.delete(name)
  const el = clips.get(name)
  if (el === current) stop()
  clips.delete(name)
  missing.delete(name)
  if (el) load(name)
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
  const failedAt = missing.get(name)
  if (failedAt !== undefined) {
    if (Date.now() - failedAt < RETRY_MISSING_MS) return
    // Try again from scratch: the file may have been deployed since.
    missing.delete(name)
    clips.delete(name)
  }
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
