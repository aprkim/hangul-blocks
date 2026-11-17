// What the child makes and keeps, on this device only (localStorage):
//  - scenes: stickers placed on the play scenes (home, park, sea, space)
//  - handwriting: the child's own strokes for each letter, first and most recent

import { useSyncExternalStore } from 'react'
import { CONSONANTS, VOWELS, consonantSound, syllableSound, vowelSound } from './jamo'
import { SYLLABLES, TREASURES, timesWritten, type Progress } from './progress'
import type { Pt } from './strokes'
import { cardFor } from './words'

function store<T>(key: string, empty: T) {
  let state: T = empty
  try {
    const raw = localStorage.getItem(key)
    if (raw) state = { ...empty, ...(JSON.parse(raw) as T) }
  } catch {
    /* private mode or bad data */
  }
  const listeners = new Set<() => void>()
  const get = () => state
  const set = (next: T) => {
    state = next
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* storage full or blocked: keep it for this visit */
    }
    listeners.forEach((l) => l())
  }
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  const use = () => useSyncExternalStore(subscribe, get, get)
  return { get, set, use }
}

// ---------- stickers ----------

/** Sticker ids: 'j:ㄱ' a jamo the child wrote, 's:가' a syllable's picture word, 't:🦖' a treasure. */
export type StickerId = string

export type StickerInfo = {
  id: StickerId
  kind: 'jamo' | 'word' | 'treasure'
  /** Emoji for words and treasures; the letter itself for jamo. */
  face: string
  /** For jamo: which color its tile is. */
  part?: 'consonant' | 'vowel'
  /** Sound to play when tapped (none for treasures). */
  sound?: string
  label: string
}

const JAMO_INFO: StickerInfo[] = [
  ...CONSONANTS.map((c) => ({ id: `j:${c.char}`, kind: 'jamo' as const, face: c.char, part: 'consonant' as const, sound: consonantSound(c), label: c.char })),
  ...VOWELS.map((v) => ({ id: `j:${v.char}`, kind: 'jamo' as const, face: v.char, part: 'vowel' as const, sound: vowelSound(v), label: v.char })),
]

export function stickerInfo(id: StickerId): StickerInfo | null {
  const [kind, value] = [id.slice(0, 1), id.slice(2)]
  if (kind === 'j') return JAMO_INFO.find((j) => j.id === id) ?? null
  if (kind === 't') return { id, kind: 'treasure', face: value, label: value }
  const syl = SYLLABLES.find((s) => s.char === value)
  if (!syl) return null
  const card = cardFor(syl.cons, syl.vowel)
  return { id, kind: 'word', face: card.emoji, sound: card.sound, label: card.before + card.syllable + card.after }
}

/** Every sticker the child has earned, in a stable order: jamo, picture words, treasures. */
export function earnedStickers(p: Progress): StickerInfo[] {
  return [
    ...JAMO_INFO.filter((j) => timesWritten(p, j.face) > 0),
    ...SYLLABLES.filter((s) => timesWritten(p, s.char) > 0).map((s) => stickerInfo(`s:${s.char}`)!),
    ...TREASURES.filter((t) => p.treasures.includes(t)).map((t) => stickerInfo(`t:${t}`)!),
  ]
}

/** All jamo stickers (earned or not), for the sticker book. */
export const ALL_JAMO_STICKERS = JAMO_INFO

// ---------- play scenes ----------

export const SCENES = ['home', 'park', 'sea', 'space'] as const
export type SceneId = (typeof SCENES)[number]
/** A sticker on a scene: position as fractions of the scene (center of the sticker). */
export type Placed = { key: number; id: StickerId; x: number; y: number }
type ScenesState = Record<SceneId, Placed[]>

/** So a scene never fills up with hundreds of stickers. */
export const SCENE_LIMIT = 40

const scenes = store<ScenesState>('soriblocks.scenes.v1', { home: [], park: [], sea: [], space: [] })
export const useScenes = scenes.use

export function placeSticker(scene: SceneId, id: StickerId, x: number, y: number) {
  const s = scenes.get()
  const list = s[scene]
  const key = list.reduce((m, p) => Math.max(m, p.key), 0) + 1
  // Over the limit, the oldest sticker makes room.
  const next = [...list, { key, id, x, y }].slice(-SCENE_LIMIT)
  scenes.set({ ...s, [scene]: next })
}

export function moveSticker(scene: SceneId, key: number, x: number, y: number) {
  const s = scenes.get()
  // Moved stickers come to the front.
  const moved = s[scene].find((p) => p.key === key)
  if (!moved) return
  scenes.set({ ...s, [scene]: [...s[scene].filter((p) => p.key !== key), { ...moved, x, y }] })
}

export function removeSticker(scene: SceneId, key: number) {
  const s = scenes.get()
  scenes.set({ ...s, [scene]: s[scene].filter((p) => p.key !== key) })
}

// ---------- handwriting ----------

/** One written letter: its strokes (flattened x,y pairs, rounded) and which part each stroke is. */
export type Writing = { parts: ('c' | 'v')[]; strokes: number[][]; at: number }
type HandwritingState = Record<string, { first: Writing; latest: Writing }>

const handwriting = store<HandwritingState>('soriblocks.handwriting.v1', {})
export const useHandwriting = handwriting.use

/** Keep points at least this far apart (on the 100 grid): plenty for drawing, small to store. */
const KEEP_GAP = 1.6

function compact(pts: readonly Pt[]): number[] {
  const out: number[] = []
  let lx = -99
  let ly = -99
  pts.forEach(([x, y], i) => {
    if (i === pts.length - 1 || Math.hypot(x - lx, y - ly) >= KEEP_GAP) {
      out.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
      lx = x
      ly = y
    }
  })
  return out
}

/** A letter was written to the end: keep the child's own strokes (the first time stays forever). */
export function recordWriting(char: string, parts: ('consonant' | 'vowel')[], strokes: readonly (readonly Pt[])[]) {
  const w: Writing = { parts: parts.map((p) => (p === 'consonant' ? 'c' : 'v')), strokes: strokes.map(compact), at: Date.now() }
  const h = handwriting.get()
  handwriting.set({ ...h, [char]: { first: h[char]?.first ?? w, latest: w } })
}

/** Parents: start over (with the writing record). */
export function resetKeepsakes() {
  scenes.set({ home: [], park: [], sea: [], space: [] })
  handwriting.set({})
}

/** The sound of a written letter (jamo or syllable). */
export function soundOf(char: string): string | undefined {
  const j = JAMO_INFO.find((x) => x.face === char)
  if (j) return j.sound
  const s = SYLLABLES.find((x) => x.char === char)
  return s ? syllableSound(s.cons, s.vowel) : undefined
}

/** Letters in the fridge, in road order (jamo, then syllables). */
export function writtenOrder(h: Record<string, unknown>): string[] {
  return [...JAMO_INFO.map((j) => j.face), ...SYLLABLES.map((s) => s.char)].filter((c) => c in h)
}

/** Take every sticker off a scene; returns what was there, so it can be put back. */
export function clearScene(scene: SceneId): Placed[] {
  const s = scenes.get()
  const was = s[scene]
  scenes.set({ ...s, [scene]: [] })
  return was
}

/** Put a cleared scene back (undo). */
export function restoreScene(scene: SceneId, placed: Placed[]) {
  const s = scenes.get()
  scenes.set({ ...s, [scene]: placed })
}
