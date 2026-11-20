// A day's worth: a small daily goal (a few letters written, a few words built). Reaching it
// shows "all done for today" once. Nothing is locked afterwards and nothing is lost by
// skipping a day: this is a finish line for a 4-year-old, not a streak to protect.
//
// Kept per child (see children.ts), on this device only.

import { useSyncExternalStore } from 'react'
import { childKey, onChildSwitch } from './children'

export const DAILY_KEY = 'soriblocks.daily.v1'
const GOAL_KEY = 'soriblocks.goal.v1'

export type GoalSize = 'small' | 'normal' | 'big'
/** Letters to write and words to build in a day. */
export const GOALS: Record<GoalSize, { letters: number; words: number }> = {
  small: { letters: 3, words: 2 },
  normal: { letters: 5, words: 3 },
  big: { letters: 8, words: 5 },
}

type Day = { letters: number; words: number; /** "All done" was shown. */ cheered?: boolean }
type State = { days: Record<string, Day>; goal: GoalSize }

/** Today's date here, as 2026-11-20. */
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function load(): State {
  let days: Record<string, Day> = {}
  let goal: GoalSize = 'normal'
  try {
    days = (JSON.parse(localStorage.getItem(childKey(DAILY_KEY)) ?? '{}') as { days?: Record<string, Day> }).days ?? {}
    const g = localStorage.getItem(GOAL_KEY) as GoalSize | null
    if (g && g in GOALS) goal = g
  } catch {
    /* private mode or bad data */
  }
  return { days, goal }
}

let state = load()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function saveDays(days: Record<string, Day>) {
  // Two months is plenty for the parents' week view.
  const keep = Object.keys(days).sort().slice(-60)
  state = { ...state, days: Object.fromEntries(keep.map((k) => [k, days[k]])) }
  try {
    localStorage.setItem(childKey(DAILY_KEY), JSON.stringify({ days: state.days }))
  } catch {
    /* keep it for this visit */
  }
  emit()
}

onChildSwitch(() => {
  state = load()
  emit()
})

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const get = () => state
export const useDaily = () => useSyncExternalStore(subscribe, get, get)

const EMPTY: Day = { letters: 0, words: 0 }
export const dayOf = (s: State, key = today()): Day => s.days[key] ?? EMPTY
export const goalMet = (s: State, key = today()) => {
  const d = dayOf(s, key)
  const g = GOALS[s.goal]
  return d.letters >= g.letters && d.words >= g.words
}

function bump(part: 'letters' | 'words') {
  const key = today()
  const d = dayOf(state, key)
  saveDays({ ...state.days, [key]: { ...d, [part]: d[part] + 1 } })
}
/** A letter was written to the end. */
export const countLetter = () => bump('letters')
/** A word was built in the word puzzle. */
export const countWord = () => bump('words')

/** "All done for today" was shown: once a day. */
export function markCheered() {
  const key = today()
  saveDays({ ...state.days, [key]: { ...dayOf(state, key), cheered: true } })
}

export function setGoal(goal: GoalSize) {
  state = { ...state, goal }
  try {
    localStorage.setItem(GOAL_KEY, goal)
  } catch {
    /* keep it for this visit */
  }
  emit()
}

export function resetDaily() {
  saveDays({})
}
