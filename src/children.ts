// The children who use this device, each with their own name, animal and progress.
//
// A parent adds them on the parents' page (a name in Hangul, and an animal a child who can't
// read yet can pick as "me"). Stars, stickers, play scenes and handwriting are kept per child;
// the family's voice recordings are shared by everyone.
//
// Storage: the first child keeps the original keys (so nothing written before children
// existed is lost), every later child's keys get "@<id>" on the end. Nothing leaves the device.

import { useSyncExternalStore } from 'react'

export const ANIMALS = ['🐰', '🐻', '🐯', '🦊', '🐼', '🐸', '🐧', '🐶'] as const
export type Animal = (typeof ANIMALS)[number]

export type Child = { id: string; name: string; animal: Animal }
type State = { list: Child[]; current: string | null }

/** The first child ever added keeps the storage keys used before there were children. */
const FIRST_ID = 'c1'
const KEY = 'soriblocks.children.v1'
export const MAX_CHILDREN = 4
/** A Korean given name or nickname: 1 to 5 Hangul syllables. */
export const NAME_RE = /^[가-힣]{1,5}$/

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as State
      if (Array.isArray(s.list)) return { list: s.list, current: s.list.some((c) => c.id === s.current) ? s.current : (s.list[0]?.id ?? null) }
    }
  } catch {
    /* private mode or bad data */
  }
  return { list: [], current: null }
}

let state: State = load()
const listeners = new Set<() => void>()
/** Called when the current child changes, so each store can load that child's data. */
const switchers = new Set<() => void>()

function save(next: State) {
  const switched = next.current !== state.current
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* keep it for this visit */
  }
  if (switched) switchers.forEach((f) => f())
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const get = () => state
export const useChildren = () => useSyncExternalStore(subscribe, get, get)
export const getChildren = () => state

export function currentChild(s: State = state): Child | null {
  return s.list.find((c) => c.id === s.current) ?? null
}

/** Storage key for a piece of the current child's data. */
export function childKey(base: string): string {
  const id = state.current
  return !id || id === FIRST_ID ? base : `${base}@${id}`
}

/** Run `f` whenever the current child changes (stores reload their data). */
export function onChildSwitch(f: () => void) {
  switchers.add(f)
}

export function addChild(name: string, animal: Animal): Child {
  const used = new Set(state.list.map((c) => c.id))
  let n = 1
  while (used.has(`c${n}`)) n++
  const child: Child = { id: `c${n}`, name, animal }
  save({ list: [...state.list, child], current: state.current ?? child.id })
  return child
}

export function updateChild(id: string, change: Partial<Pick<Child, 'name' | 'animal'>>) {
  save({ ...state, list: state.list.map((c) => (c.id === id ? { ...c, ...change } : c)) })
}

export function chooseChild(id: string) {
  if (state.list.some((c) => c.id === id)) save({ ...state, current: id })
}

/**
 * Removes a child and their stars, stickers, scenes and handwriting. The first child's data
 * lives under the original keys; if they are removed while others remain, those keys are
 * cleared so the next "first" child starts fresh.
 */
export function removeChild(id: string, dataKeys: string[]) {
  const list = state.list.filter((c) => c.id !== id)
  try {
    for (const base of dataKeys) localStorage.removeItem(id === FIRST_ID ? base : `${base}@${id}`)
  } catch {
    /* nothing to clear */
  }
  const current = state.current === id ? (list[0]?.id ?? null) : state.current
  // Force the stores to reload even if the current id is unchanged (its data was just cleared).
  state = { ...state, current: '__none__' }
  save({ list, current })
}

/** The recording of a child's name, made by the family on the parents' page. */
export const nameSound = (c: Child) => `name-${c.id}`
