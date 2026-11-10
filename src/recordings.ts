// Recordings made in the in-app recorder: processing, on-device storage, zip export.
//
// Each take is trimmed (≤0.1s silence at each end), peak-normalized so every clip has the
// same loudness, encoded to mono mp3, and stored in IndexedDB under its AUDIO.md file name.
// The game plays these before falling back to public/audio/, so a take is live immediately.

import { Mp3Encoder } from '@breezystack/lamejs'
import { zipSync } from 'fflate'

const DB = 'hangul-blocks'
const STORE = 'recordings'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const saveRecording = (name: string, mp3: Blob) => tx('readwrite', (s) => s.put(mp3, name))
export const deleteRecording = (name: string) => tx('readwrite', (s) => s.delete(name))

export async function loadRecordings(): Promise<Map<string, Blob>> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const out = new Map<string, Blob>()
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor()
      req.onsuccess = () => {
        const cur = req.result
        if (!cur) return resolve(out)
        out.set(String(cur.key), cur.value as Blob)
        cur.continue()
      }
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn('[recordings] storage unavailable', err)
    return new Map()
  }
}

// ---------- processing ----------

const PAD_START = 0.08 // kept before the voice: protects quiet onsets (the hiss of ㅅ ㅈ ㅊ ㅎ ㅋ ㅌ ㅍ)
const PAD_END = 0.1 // and after (the vowel tail fades out here)
const TARGET_PEAK = 0.89 // about -1 dBFS

/** Mono samples, trimmed to the voice and normalized. Returns null if nothing was heard. */
export function trimAndNormalize(buf: AudioBuffer): Float32Array | null {
  const n = buf.length
  const mono = new Float32Array(n)
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels
  }

  // RMS in 10ms windows; the voice is where RMS clears a threshold relative to the loudest window.
  // The threshold is low on purpose: fricative and aspirated onsets are far quieter than the vowel.
  const win = Math.max(1, Math.round(buf.sampleRate * 0.01))
  const rms: number[] = []
  for (let i = 0; i < n; i += win) {
    let sum = 0
    const end = Math.min(n, i + win)
    for (let j = i; j < end; j++) sum += mono[j] * mono[j]
    rms.push(Math.sqrt(sum / (end - i)))
  }
  const loudest = Math.max(...rms)
  if (loudest < 0.01) return null
  const threshold = Math.max(0.004, loudest * 0.02)
  const first = rms.findIndex((r) => r > threshold)
  let last = rms.length - 1
  while (last > first && rms[last] <= threshold) last--

  const start = Math.max(0, first * win - Math.round(PAD_START * buf.sampleRate))
  const end = Math.min(n, (last + 1) * win + Math.round(PAD_END * buf.sampleRate))
  const out = mono.slice(start, end)

  let peak = 0
  for (const s of out) peak = Math.max(peak, Math.abs(s))
  const gain = peak > 0 ? TARGET_PEAK / peak : 1
  // Short fades so the cut never clicks.
  const fade = Math.min(out.length >> 1, Math.round(buf.sampleRate * 0.008))
  for (let i = 0; i < out.length; i++) {
    let g = gain
    if (i < fade) g *= i / fade
    else if (i > out.length - fade) g *= (out.length - i) / fade
    out[i] *= g
  }
  return out
}

export function encodeMp3(samples: Float32Array, sampleRate: number): Blob {
  const enc = new Mp3Encoder(1, sampleRate, 96)
  const pcm = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  const parts: Uint8Array[] = []
  for (let i = 0; i < pcm.length; i += 1152) {
    const chunk = enc.encodeBuffer(pcm.subarray(i, i + 1152))
    if (chunk.length) parts.push(chunk)
  }
  const tail = enc.flush()
  if (tail.length) parts.push(tail)
  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' })
}

export async function exportZip(recordings: Map<string, Blob>): Promise<Blob> {
  const files: Record<string, Uint8Array> = {}
  for (const [name, blob] of recordings) {
    files[`${name}.mp3`] = new Uint8Array(await blob.arrayBuffer())
  }
  return new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: 'application/zip' })
}
