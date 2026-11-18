// The child's progress on the Write tab, kept on this device only (localStorage).
// Nothing here ever goes down: stars only add up, stickers are never taken away.

import { useSyncExternalStore } from 'react'
import { childKey, onChildSwitch } from './children'
import { CHART_VOWELS, CONSONANTS, SET_COUNT, composeSyllable, type Consonant, type Vowel } from './jamo'

/** Stars that fill the jar; a full jar gives a treasure sticker. */
export const JAR_SIZE = 10

/** The 24 basic jamo, in the Write tab's order. */
export const JAMO_CHARS = [...CONSONANTS.map((c) => c.char), ...CHART_VOWELS.map((v) => v.char)]

/** Every syllable that can be built and written (each is a sticker), with its set (1..4). */
export const SYLLABLES: { char: string; cons: Consonant; vowel: Vowel; set: number }[] = CONSONANTS.flatMap((cons) =>
  CHART_VOWELS.map((vowel) => ({ char: composeSyllable(cons, vowel), cons, vowel, set: cons.set })),
).sort((x, y) => x.set - y.set)
export const SYLLABLE_CHARS = SYLLABLES.map((s) => s.char)
export const syllablesOfSet = (set: number) => SYLLABLES.filter((s) => s.set === set)

/** Different syllables of a set to write before the next set's gift box can be opened. */
export const SET_GOAL = 20

/** Treasure stickers, given one at a time when the star jar is full. */
export const TREASURES = [
  '🦖', '🚀', '🍦', '🎈', '🦄', '🌟', '🍓', '🐬', '🚒', '🧸',
  '🍩', '🦋', '🌻', '🐙', '🎂', '🚁', '🐳', '🍉', '🦁', '🌙',
]

export type Progress = {
  /** How many times each letter (jamo or syllable) was written to the end. */
  written: Record<string, number>
  /** All stars ever earned. */
  stars: number
  /** Stars in the jar right now (0..JAR_SIZE-1). */
  jar: number
  /** Treasure stickers collected. */
  treasures: string[]
  /** A full jar's gift waiting to be opened (the jar shows full until then). */
  pendingGift: string | null
  /** The syllable road has been opened (gift box tapped, or opened by a parent). */
  syllablesOpen: boolean
  /** How many syllable sets are open (1..4). Set 1 is always open on Build. */
  setsOpen: number
}

/** Per child (see children.ts). */
export const PROGRESS_KEY = 'soriblocks.progress.v1'
const EMPTY: Progress = { written: {}, stars: 0, jar: 0, treasures: [], pendingGift: null, syllablesOpen: false, setsOpen: 1 }

function load(): Progress {
  try {
    const raw = localStorage.getItem(childKey(PROGRESS_KEY))
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Progress>) }
  } catch {
    /* private mode or bad data: start fresh */
  }
  return EMPTY
}

let state: Progress = load()
const listeners = new Set<() => void>()

function set(next: Progress) {
  state = next
  try {
    localStorage.setItem(childKey(PROGRESS_KEY), JSON.stringify(next))
  } catch {
    /* storage full or blocked: keep it in memory for this visit */
  }
  for (const l of listeners) l()
}

// Another child was chosen: show their stars and letters.
onChildSwitch(() => {
  state = load()
  for (const l of listeners) l()
})

export function getProgress(): Progress {
  return state
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, getProgress)
}

export const timesWritten = (p: Progress, char: string) => p.written[char] ?? 0
export const jamoWrittenCount = (p: Progress) => JAMO_CHARS.filter((c) => timesWritten(p, c) > 0).length
export const allJamoWritten = (p: Progress) => jamoWrittenCount(p) === JAMO_CHARS.length
/** Letter stickers: one for each syllable written at least once. */
export const letterStickers = (p: Progress) => SYLLABLE_CHARS.filter((c) => timesWritten(p, c) > 0)
/** Different syllables of a set written so far. */
export const writtenInSet = (p: Progress, set: number) => syllablesOfSet(set).filter((s) => timesWritten(p, s.char) > 0).length
/** The next set's gift box can be opened: enough of the newest open set has been written. */
export const nextSetReady = (p: Progress) => p.setsOpen < SET_COUNT && writtenInSet(p, p.setsOpen) >= SET_GOAL
/** Syllables the child can reach now. */
export const reachableSyllables = (p: Progress) => SYLLABLES.filter((s) => s.set <= p.setsOpen)

/**
 * A letter was written to the end: count it and drop one star in the jar.
 * Returns true when that star filled the jar (a gift is now waiting).
 */
export function addStar(char: string): boolean {
  const p = state
  const written = { ...p.written, [char]: timesWritten(p, char) + 1 }
  const jar = p.jar + 1
  if (jar < JAR_SIZE || p.pendingGift) {
    set({ ...p, written, stars: p.stars + 1, jar: Math.min(jar, JAR_SIZE) })
    return false
  }
  const left = TREASURES.filter((t) => !p.treasures.includes(t))
  const pool = left.length ? left : TREASURES
  const gift = pool[Math.floor(Math.random() * pool.length)]
  set({ ...p, written, stars: p.stars + 1, jar: JAR_SIZE, pendingGift: gift })
  return true
}

/** The gift was opened: it goes in the sticker book and the jar starts again. */
export function openGift() {
  const p = state
  if (!p.pendingGift) return
  const treasures = p.treasures.includes(p.pendingGift) ? p.treasures : [...p.treasures, p.pendingGift]
  set({ ...p, treasures, pendingGift: null, jar: 0 })
}

export function openSyllables() {
  if (!state.syllablesOpen) set({ ...state, syllablesOpen: true })
}

/** The next set's gift box was opened. */
export function openNextSet() {
  if (state.setsOpen < SET_COUNT) set({ ...state, setsOpen: state.setsOpen + 1 })
}

/** Parents: open everything now. */
export function openAllSets() {
  set({ ...state, syllablesOpen: true, setsOpen: SET_COUNT })
}

/** Parents: start over. */
export function resetProgress() {
  set(EMPTY)
}
