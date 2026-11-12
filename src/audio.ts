// Low-latency player (Web Audio). Every sound is fetched and decoded into memory up front,
// so a tap starts it in about 10ms instead of HTML <audio>'s 100–500ms on iPad Safari.
// One sound at a time: a new tap cuts the previous one.
// A missing file never throws or shows UI; it logs one console warning.

const BASE = `${import.meta.env.BASE_URL}audio/`

type Clip = { buffer: AudioBuffer; offset: number }

const clips = new Map<string, Clip>()
/** Sounds Web Audio couldn't decode: played with a plain <audio> element instead. */
const htmlFallback = new Map<string, HTMLAudioElement>()
let currentHtml: HTMLAudioElement | null = null
const loading = new Map<string, Promise<Clip | null>>()
/** Sounds that failed to load, with when. Retried after a while: a file may be uploaded later. */
const missing = new Map<string, number>()
const RETRY_MISSING_MS = 5000
/** Recordings made on this device (blob URLs). They win over public/audio/. */
const local = new Map<string, string>()

let ctx: AudioContext | null = null
let current: AudioBufferSourceNode | null = null
/** The latest sound asked for; a slow load must not play over a newer tap. */
let wanted: string | null = null

function audioContext(): AudioContext {
  if (!ctx) {
    // iOS: play through the silent switch, like a media app.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
    ctx = new AudioContext({ latencyHint: 'interactive' })
  }
  return ctx
}

function warnMissing(name: string, reason?: unknown) {
  if (missing.has(name)) return
  missing.set(name, Date.now())
  console.warn(`[audio] missing or unplayable: ${name}.mp3`, reason instanceof Error ? `${reason.name}: ${reason.message}` : (reason ?? ''))
}

/**
 * Where the voice starts: skips the recorder's padding and the mp3 encoder delay, so the
 * sound begins the instant it's played. Keeps 8ms before the first audible sample.
 */
function voiceOffset(buf: AudioBuffer): number {
  const d = buf.getChannelData(0)
  let peak = 0
  for (const v of d) peak = Math.max(peak, Math.abs(v))
  const threshold = peak * 0.05
  const first = d.findIndex((v) => Math.abs(v) > threshold)
  return first < 0 ? 0 : Math.max(0, first / buf.sampleRate - 0.008)
}

function load(name: string): Promise<Clip | null> {
  const ready = clips.get(name)
  if (ready) return Promise.resolve(ready)
  let p = loading.get(name)
  if (p) return p
  p = (async () => {
    const url = local.get(name) ?? `${BASE}${name}.mp3`
    let bytes: ArrayBuffer
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      bytes = await res.arrayBuffer()
    } catch (err) {
      warnMissing(name, err)
      loading.delete(name)
      return null
    }
    try {
      const buffer = await audioContext().decodeAudioData(bytes)
      const clip = { buffer, offset: voiceOffset(buffer) }
      clips.set(name, clip)
      return clip
    } catch (err) {
      // The file exists but this decoder refused it: keep it playable through <audio>.
      console.warn(`[audio] decode failed, using <audio> for ${name}.mp3`, err instanceof Error ? `${err.name}: ${err.message}` : err)
      const el = new Audio(url)
      el.preload = 'auto'
      htmlFallback.set(name, el)
      return null
    } finally {
      loading.delete(name)
    }
  })()
  loading.set(name, p)
  return p
}

/** Use an on-device recording for this sound from now on (replaces any loaded clip). */
export function setLocalRecording(name: string, mp3: Blob | null) {
  const old = local.get(name)
  if (old) URL.revokeObjectURL(old)
  if (mp3) local.set(name, URL.createObjectURL(mp3))
  else local.delete(name)
  clips.delete(name)
  htmlFallback.delete(name)
  missing.delete(name)
  void load(name)
}

/** Fetch and decode in the background, a few at a time. */
export function preload(names: string[]) {
  const queue = [...names]
  const worker = async () => {
    for (let name = queue.shift(); name; name = queue.shift()) await load(name)
  }
  for (let i = 0; i < 6; i++) void worker()
}

export function stop() {
  wanted = null
  if (currentHtml) {
    currentHtml.pause()
    currentHtml = null
  }
  if (!current) return
  try {
    current.stop()
  } catch {
    /* already stopped */
  }
  current = null
}

function start(clip: Clip) {
  const ac = audioContext()
  const src = ac.createBufferSource()
  src.buffer = clip.buffer
  src.connect(ac.destination)
  src.onended = () => {
    if (current === src) current = null
  }
  src.start(0, clip.offset)
  current = src
}

export function play(name: string) {
  stop()
  wanted = name
  const ac = audioContext()
  if (ac.state !== 'running') void ac.resume()

  const failedAt = missing.get(name)
  if (failedAt !== undefined) {
    if (Date.now() - failedAt < RETRY_MISSING_MS) return
    missing.delete(name) // the file may have been deployed since
  }

  const clip = clips.get(name)
  if (clip) return start(clip)
  if (playHtml(name)) return
  // Not decoded yet (first seconds after opening): play it as soon as it is, unless
  // another tap has come in meanwhile.
  void load(name).then((c) => {
    if (wanted !== name) return
    if (c) start(c)
    else playHtml(name)
  })
}

function playHtml(name: string): boolean {
  const el = htmlFallback.get(name)
  if (!el) return false
  el.currentTime = 0
  currentHtml = el
  el.play().catch(() => {})
  return true
}

/**
 * iOS starts audio suspended until a user gesture. On the first touch, resume the context and
 * play one silent sample so every later tap is instant.
 */
export function installUnlock() {
  const unlock = () => {
    const ac = audioContext()
    void ac.resume()
    const src = ac.createBufferSource()
    src.buffer = ac.createBuffer(1, 1, ac.sampleRate)
    src.connect(ac.destination)
    src.start(0)
    if (ac.state === 'running') {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('touchend', unlock, true)
    }
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('touchend', unlock, true)
}
