// What the child makes and keeps, on this device only (localStorage):
//  - scenes: stickers placed on the play scenes (home, park, sea, space)
//  - handwriting: the child's own strokes for each letter, first and most recent

import { useSyncExternalStore } from 'react'
import { childKey, onChildSwitch } from './children'
import { CHART_VOWELS, CONSONANTS, consonantSound, syllableSound, vowelSound } from './jamo'
import { SYLLABLES, TREASURES, timesWritten, type Progress } from './progress'
import type { Pt } from './strokes'
import { PUZZLE_WORDS, puzzleSound } from './puzzleWords'
import { cardFor } from './words'

/** A piece of the current child's data (see children.ts), reloaded when another child is chosen. */
function store<T>(key: string, empty: T) {
  const load = (): T => {
    try {
      const raw = localStorage.getItem(childKey(key))
      if (raw) return { ...empty, ...(JSON.parse(raw) as T) }
    } catch {
      /* private mode or bad data */
    }
    return empty
  }
  let state: T = load()
  const listeners = new Set<() => void>()
  const get = () => state
  const set = (next: T) => {
    state = next
    try {
      localStorage.setItem(childKey(key), JSON.stringify(next))
    } catch {
      /* storage full or blocked: keep it for this visit */
    }
    listeners.forEach((l) => l())
  }
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  onChildSwitch(() => {
    state = load()
    listeners.forEach((l) => l())
  })
  const use = () => useSyncExternalStore(subscribe, get, get)
  return { get, set, use }
}

// ---------- stickers ----------

/** Sticker ids: 'p:나비' a word built in the word puzzle, 's:가' a syllable's picture word, 't:🦖' a treasure
    ('j:ㄱ', a written jamo, is no longer given but stays wherever a child already placed one). */
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
  ...CHART_VOWELS.map((v) => ({ id: `j:${v.char}`, kind: 'jamo' as const, face: v.char, part: 'vowel' as const, sound: vowelSound(v), label: v.char })),
]

export function stickerInfo(id: StickerId): StickerInfo | null {
  const [kind, value] = [id.slice(0, 1), id.slice(2)]
  if (kind === 'j') return JAMO_INFO.find((j) => j.id === id) ?? null
  if (kind === 't') return { id, kind: 'treasure', face: value, label: value }
  if (kind === 'p') {
    const w = PUZZLE_WORDS.find((x) => x.word === value)
    return w ? { id, kind: 'word', face: w.emoji, sound: puzzleSound(w.word), label: w.word } : null
  }
  const syl = SYLLABLES.find((s) => s.char === value)
  if (!syl) return null
  const card = cardFor(syl.cons, syl.vowel)
  return { id, kind: 'word', face: card.emoji, sound: card.sound, label: card.before + card.syllable + card.after }
}

/**
 * The play tray: treasures, words built in the word puzzle, then the picture words of written
 * syllables (one sticker per picture: 나비 built and 나 written are the same butterfly).
 */
export function earnedStickers(p: Progress, solved: readonly string[] = puzzle.get().solved): StickerInfo[] {
  const all = [
    ...TREASURES.filter((t) => p.treasures.includes(t)).map((t) => stickerInfo(`t:${t}`)!),
    ...PUZZLE_WORDS.filter((w) => solved.includes(w.word)).map((w) => stickerInfo(`p:${w.word}`)!),
    ...SYLLABLES.filter((s) => timesWritten(p, s.char) > 0).map((s) => stickerInfo(`s:${s.char}`)!),
  ]
  const seen = new Set<string>()
  return all.filter((i) => !seen.has(i.label) && (seen.add(i.label), true))
}

/** All jamo stickers (earned or not), for the sticker book. */
export const ALL_JAMO_STICKERS = JAMO_INFO

// ---------- word puzzle ----------

/** Words the child has built in the word puzzle, in the order they were built. */
export const PUZZLE_KEY = 'soriblocks.puzzle.v1'
const puzzle = store<{ solved: string[] }>(PUZZLE_KEY, { solved: [] })
export const usePuzzle = puzzle.use
export const getPuzzle = puzzle.get
/** The key under which a child's name puzzle is kept once built (a new name is a new puzzle). */
export const namePuzzleKey = (name: string) => `name:${name}`
export function solvePuzzle(word: string) {
  const s = puzzle.get()
  if (!s.solved.includes(word)) puzzle.set({ solved: [...s.solved, word] })
}

// ---------- play scenes ----------

export const SCENES = ['home', 'park', 'sea', 'space'] as const
export type SceneId = (typeof SCENES)[number]
/** A sticker on a scene: position as fractions of the scene (center of the sticker), size factor. */
export type Placed = { key: number; id: StickerId; x: number; y: number; s?: number }

/** The sizes a placed sticker can take, smallest to biggest (1 is where it starts). */
export const STICKER_SIZES = [0.5, 0.7, 1, 1.4, 1.9, 2.5]
type ScenesState = Record<SceneId, Placed[]>

/** So a scene never fills up with hundreds of stickers. */
export const SCENE_LIMIT = 40

export const SCENES_KEY = 'soriblocks.scenes.v1'
const scenes = store<ScenesState>(SCENES_KEY, { home: [], park: [], sea: [], space: [] })
export const useScenes = scenes.use

export function placeSticker(scene: SceneId, id: StickerId, x: number, y: number): number {
  const s = scenes.get()
  const list = s[scene]
  const key = list.reduce((m, p) => Math.max(m, p.key), 0) + 1
  // Over the limit, the oldest sticker makes room.
  const next = [...list, { key, id, x, y }].slice(-SCENE_LIMIT)
  scenes.set({ ...s, [scene]: next })
  return key
}

/** One size step bigger (+1) or smaller (-1). */
export function resizeSticker(scene: SceneId, key: number, step: 1 | -1) {
  const s = scenes.get()
  scenes.set({
    ...s,
    [scene]: s[scene].map((p) => {
      if (p.key !== key) return p
      const i = STICKER_SIZES.indexOf(p.s ?? 1)
      const next = STICKER_SIZES[Math.max(0, Math.min(STICKER_SIZES.length - 1, (i < 0 ? 2 : i) + step))]
      return { ...p, s: next }
    }),
  })
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

export const HANDWRITING_KEY = 'soriblocks.handwriting.v1'
const handwriting = store<HandwritingState>(HANDWRITING_KEY, {})
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
export function recordWriting(char: string, parts: ('consonant' | 'vowel' | 'final')[], strokes: readonly (readonly Pt[])[]) {
  const w: Writing = { parts: parts.map((p) => (p === 'vowel' ? 'v' : 'c')), strokes: strokes.map(compact), at: Date.now() }
  const h = handwriting.get()
  handwriting.set({ ...h, [char]: { first: h[char]?.first ?? w, latest: w } })
}

/** Parents: start over (with the writing record). */
export function resetKeepsakes() {
  scenes.set({ home: [], park: [], sea: [], space: [] })
  handwriting.set({})
  puzzle.set({ solved: [] })
}

/** The sound of a written letter (jamo or syllable). */
export function soundOf(char: string): string | undefined {
  const j = JAMO_INFO.find((x) => x.face === char)
  if (j) return j.sound
  const s = SYLLABLES.find((x) => x.char === char)
  return s ? syllableSound(s.cons, s.vowel) : undefined
}

/** Letters in the fridge, in road order (jamo, then syllables), then any others (from names). */
export function writtenOrder(h: Record<string, unknown>): string[] {
  const known = [...JAMO_INFO.map((j) => j.face), ...SYLLABLES.map((s) => s.char)]
  const set = new Set(known)
  return [...known.filter((c) => c in h), ...Object.keys(h).filter((c) => !set.has(c))]
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

// ---------- finished pictures ----------

/**
 * A sticker picture the child said was finished (the camera button on the play scene): kept as
 * data, not an image, so it is tiny and redrawn sharp at any size. `aspect` is the scene's shape
 * when it was taken and `unit` the sticker size as a share of its shorter side, so it looks the
 * same as it did on the screen.
 */
export type Picture = { at: number; scene: SceneId; placed: Placed[]; aspect: number; unit: number }

export const GALLERY_KEY = 'soriblocks.gallery.v1'
/** The fridge keeps the most recent pictures; older ones make room. */
export const GALLERY_LIMIT = 12
const gallery = store<{ pictures: Picture[] }>(GALLERY_KEY, { pictures: [] })
export const useGallery = gallery.use

export function savePicture(scene: SceneId, aspect: number, unit: number): Picture | null {
  const placed = scenes.get()[scene]
  if (!placed.length) return null
  const pic: Picture = { at: Date.now(), scene, placed, aspect, unit }
  gallery.set({ pictures: [pic, ...gallery.get().pictures].slice(0, GALLERY_LIMIT) })
  return pic
}

export function removePicture(at: number) {
  gallery.set({ pictures: gallery.get().pictures.filter((p) => p.at !== at) })
}
