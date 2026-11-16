import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { VowelLayout } from '../jamo'
import { SLOT, STROKES, layoutSyllable, strokePath, type Stroke } from '../strokes'

// One way of drawing jamo, shared by the Build frame and the Write screen: each jamo is its
// strokes (src/strokes.ts, 100 x 100 grid) as round-capped SVG paths. Because the consonant and
// the vowel are separate shapes, a syllable can show them in two colors.

const CONSONANT = 'var(--color-consonant)'
const VOWEL = 'var(--color-vowel)'

/** The strokes of one jamo as paths (first `count` strokes, or all). */
export function JamoStrokes({
  char,
  count,
  className,
  style,
}: {
  char: string
  count?: number
  className?: string
  style?: CSSProperties
}) {
  const strokes = STROKES[char] ?? []
  return (
    <>
      {strokes.slice(0, count ?? strokes.length).map((s, i) => (
        <path key={i} d={strokePath(s)} className={className} style={style} />
      ))}
    </>
  )
}

/** Visual stroke thickness inside the syllable, in frame units (out of 100). */
const WEIGHT = 8

/**
 * A syllable in two colors: initial consonant in consonant red, vowel in vowel blue.
 * Missing parts show as dashed slots. Only the consonant animates between the two layouts.
 */
export function Syllable({
  cons,
  vowel,
  layout,
}: {
  cons: string | null
  vowel: string | null
  layout: VowelLayout
}) {
  const placed = layoutSyllable(cons, vowel, layout)
  const consStrokes = useMorph(placed.cons, cons ?? '')
  const slot = SLOT[layout]
  return (
    <>
      {consStrokes ? (
        consStrokes.map((s, i) => (
          <path key={`c${i}`} d={strokePath(s)} className="syl-stroke" style={{ stroke: CONSONANT, strokeWidth: WEIGHT }} />
        ))
      ) : (
        <rect className="syl-slot" x={slot.cons[0]} y={slot.cons[1]} width={slot.cons[2]} height={slot.cons[3]} rx={6} />
      )}
      {placed.vowel ? (
        placed.vowel.map((s, i) => (
          <path key={`v${vowel}${i}`} d={strokePath(s)} className="syl-stroke" style={{ stroke: VOWEL, strokeWidth: WEIGHT }} />
        ))
      ) : (
        <rect className="syl-slot" x={slot.vowel[0]} y={slot.vowel[1]} width={slot.vowel[2]} height={slot.vowel[3]} rx={6} />
      )}
    </>
  )
}

/** How long the consonant takes to move and reshape when the vowel changes. */
const MORPH_MS = 420
const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2

/**
 * The consonant glides into its new place and shape when the vowel changes (가 -> 고).
 * A different consonant, or a change in point count, just appears.
 */
function useMorph(target: Stroke[] | null, id: string): Stroke[] | null {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)
  const idRef = useRef(id)
  const frame = useRef(0)
  const sig = JSON.stringify(target)

  useEffect(() => {
    cancelAnimationFrame(frame.current)
    const set = (s: Stroke[] | null) => {
      shownRef.current = s
      setShown(s)
    }
    const from = shownRef.current
    const same =
      from &&
      target &&
      idRef.current === id &&
      from.length === target.length &&
      from.every((s, i) => s.length === target[i].length)
    idRef.current = id
    if (!same || !from || !target || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      set(target)
      return
    }
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / MORPH_MS)
      const e = easeOutBack(t)
      set(target.map((s, i) => s.map(([x, y], j) => [from[i][j][0] + (x - from[i][j][0]) * e, from[i][j][1] + (y - from[i][j][1]) * e] as const)))
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, id])

  return shown
}
