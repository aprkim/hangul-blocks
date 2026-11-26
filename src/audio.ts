// Low-latency player (Web Audio). Every sound is fetched and decoded into memory up front,
// so a tap starts it in about 10ms instead of HTML <audio>'s 100–500ms on iPad Safari.
// One sound at a time: a new tap cuts the previous one.
// A missing file never throws or shows UI; it logs one console warning.

const BASE = `${import.meta.env.BASE_URL}audio/`

type Clip = { buffer: AudioBuffer; offset: number }

const clips = new Map<string, Clip>()
/** Sounds Web Audio couldn't decode: played with a plain <audio> element instead. */
const htmlFallback = new Map<string, HTMLAudioElement>()
/** iOS only lets an <audio> element play from a timer once it has played inside a tap. */
const needsUnlock = new Set<HTMLAudioElement>()
function unlockFallbacks() {
  for (const el of needsUnlock) {
    if (el === currentHtml) continue
    el.muted = true
    el.play()
      .then(() => {
        if (el !== currentHtml) el.pause()
        needsUnlock.delete(el)
      })
      .catch(() => {})
      .finally(() => {
        el.muted = false
      })
  }
}
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
/** The clips of a word read syllable by syllable (playSequence), so stop() can end them all. */
let sequence: AudioBufferSourceNode[] = []

const audioSession = () => (navigator as Navigator & { audioSession?: { type: string } }).audioSession
let recordingSession = false

function audioContext(): AudioContext {
  if (!ctx) {
    // iOS: play through the silent switch, like a media app (unless the recorder needs the mic).
    const session = audioSession()
    if (session && !recordingSession) session.type = 'playback'
    ctx = new AudioContext({ latencyHint: 'interactive' })
  }
  return ctx
}

/**
 * The parents' recorder is open (or closed again). On iOS a "playback" audio session refuses
 * the microphone outright (Safari reports it as "not available"), so while recording the
 * session must be play-and-record; back in the game it returns to playback.
 */
export function setRecordingSession(on: boolean) {
  recordingSession = on
  const session = audioSession()
  if (!session) return
  try {
    session.type = on ? 'play-and-record' : 'playback'
  } catch {
    /* older iOS: leave it */
  }
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

/** <audio> fallbacks that have shown they hold real audio (a missing file never gets here). */
const playable = new Set<string>()

function useHtmlAudio(name: string, url: string) {
  const el = new Audio(url)
  el.preload = 'auto'
  el.addEventListener('loadedmetadata', () => playable.add(name))
  // Not audio after all (a missing file answered with a page, or nothing): forget it.
  el.addEventListener('error', () => {
    if (htmlFallback.get(name) !== el) return
    htmlFallback.delete(name)
    needsUnlock.delete(el)
    warnMissing(name, 'not playable')
  })
  htmlFallback.set(name, el)
  needsUnlock.add(el)
}

function load(name: string): Promise<Clip | null> {
  const ready = clips.get(name)
  if (ready) return Promise.resolve(ready)
  let p = loading.get(name)
  if (p) return p
  p = (async () => {
    const url = local.get(name) ?? `${BASE}${name}.mp3`
    let bytes: ArrayBuffer | null = null
    try {
      const res = await fetch(url)
      // Inside the iOS app (capacitor:// scheme) bundled files arrive with status 0, not 200.
      if (res.status === 404) throw new Error('HTTP 404')
      if (res.ok || res.status === 0) {
        const b = await res.arrayBuffer()
        if (b.byteLength > 0) bytes = b
      }
      if (!bytes) throw new Error(`HTTP ${res.status}, empty body`)
    } catch (err) {
      if (err instanceof Error && err.message === 'HTTP 404') {
        warnMissing(name, err)
        loading.delete(name)
        return null
      }
      // Couldn't read the bytes, but <audio> may still play the file: fall back to it.
      console.warn(`[audio] fetch failed, using <audio> for ${name}.mp3`, err instanceof Error ? err.message : err)
      useHtmlAudio(name, url)
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
      useHtmlAudio(name, url)
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
  playable.delete(name)
  missing.delete(name)
  void load(name)
}

/** A sound known to be there: recorded on this device, or loaded and decoded from the app. */
export function hasSound(name: string): boolean {
  return local.has(name) || clips.has(name) || playable.has(name)
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
  for (const s of sequence) {
    try {
      s.stop()
    } catch {
      /* already stopped */
    }
  }
  sequence = []
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

/**
 * Several clips back to back, as one word (a name read syllable by syllable: 리, 하). Waits
 * until every clip is loaded, so a slow first load never drops or overlaps a syllable.
 */
export function playSequence(names: string[], gapMs = 60) {
  if (names.length === 1) return play(names[0])
  stop()
  const token = `seq:${names.join('+')}:${Date.now()}`
  wanted = token
  const ac = audioContext()
  if (ac.state !== 'running') void ac.resume()
  void Promise.all(names.map(load)).then((loaded) => {
    if (wanted !== token) return
    let at = ac.currentTime + 0.02
    for (const clip of loaded) {
      if (!clip) continue
      const src = ac.createBufferSource()
      src.buffer = clip.buffer
      src.connect(ac.destination)
      src.start(at, clip.offset)
      at += clip.buffer.duration - clip.offset + gapMs / 1000
      sequence.push(src)
    }
  })
}

function playHtml(name: string): boolean {
  const el = htmlFallback.get(name)
  if (!el) return false
  el.muted = false
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
  // Every touch also unlocks any <audio> fallbacks created since the last one.
  window.addEventListener('pointerdown', unlockFallbacks, true)
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

/**
 * Small synthesized sounds for rewards (no files): 'star' is a bright two-note "ding" when a star
 * lands in the jar, 'fanfare' a rising arpeggio for a full jar or an opened gift. They mix over
 * whatever is playing (a letter's sound keeps going).
 */
export function chime(kind: 'star' | 'fanfare' | 'soft') {
  const ac = audioContext()
  if (ac.state !== 'running') void ac.resume()
  const notes: [number, number][] =
    kind === 'star'
      ? [[1318.5, 0], [1975.5, 0.09]]
      : kind === 'fanfare'
        ? [[1046.5, 0], [1318.5, 0.11], [1568, 0.22], [2093, 0.33]]
        : [[880, 0]]
  const out = ac.createGain()
  out.gain.value = kind === 'soft' ? 0.1 : 0.16
  out.connect(ac.destination)
  const t0 = ac.currentTime + 0.01
  for (const [freq, at] of notes) {
    const tail = kind === 'fanfare' && at === notes[notes.length - 1][1] ? 0.9 : 0.45
    for (const [mult, level, type] of [[1, 1, 'sine'], [2, 0.25, 'triangle']] as const) {
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = type
      osc.frequency.value = freq * mult
      g.gain.setValueAtTime(0.0001, t0 + at)
      g.gain.exponentialRampToValueAtTime(level, t0 + at + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + tail)
      osc.connect(g).connect(out)
      osc.start(t0 + at)
      osc.stop(t0 + at + tail + 0.05)
    }
  }
}
