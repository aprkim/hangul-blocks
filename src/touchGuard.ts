// Children write with one finger while the rest of the hand (or the other hand) rests on the
// screen. Those extra touches used to hit the tabs, the star jar, settings or the arrows, which
// all reacted the instant they were touched, and a different screen opened mid-letter.
//
// Two guards:
//  1. While a stroke is being written, and for a moment after, the buttons around the writing
//     card ignore touches (chromeLocked).
//  2. Those buttons fire on a clean tap only: a short press that stays put (useTap). A resting
//     palm is long and drifts, so it never counts.

import { useRef } from 'react'

let writing = false
let quietUntil = 0
/** After a stroke ends, how long the buttons stay quiet (the hand is still settling). */
const AFTER_STROKE_MS = 600
/** A tap is shorter than this... */
const TAP_MAX_MS = 700
/** ...and moves less than this (px). */
const TAP_SLOP = 16

export function setWriting(on: boolean) {
  writing = on
  if (!on) quietUntil = performance.now() + AFTER_STROKE_MS
}

export function chromeLocked(): boolean {
  return writing || performance.now() < quietUntil
}

type Start = { id: number; x: number; y: number; t: number }

/** Pointer handlers for a button that fires on a clean tap, and never while writing. */
export function useTap(onTap: () => void) {
  const start = useRef<Start | null>(null)
  const fire = useRef(onTap)
  fire.current = onTap
  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      start.current = chromeLocked() ? null : { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current
      start.current = null
      if (!s || s.id !== e.pointerId || chromeLocked()) return
      if (performance.now() - s.t > TAP_MAX_MS) return
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_SLOP) return
      fire.current()
    },
    onPointerCancel: () => {
      start.current = null
    },
  }
}
