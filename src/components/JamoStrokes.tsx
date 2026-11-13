import type { CSSProperties } from 'react'
import type { VowelLayout } from '../jamo'
import { STROKES, strokePath } from '../strokes'

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

// Where each part sits in the 100 x 100 frame. Each part keeps its own uniform scale in both
// layouts, so the consonant only translates when it slides (and its strokes keep their weight).
const CONS_SCALE = 0.5
const VOWEL_SCALE = 0.88
const PLACE: Record<VowelLayout, { cons: [number, number]; vowel: [number, number] }> = {
  // 가로모임: consonant left, vowel right
  side: { cons: [3, 25], vowel: [29, 6] },
  // 세로모임: consonant top, vowel below
  stack: { cons: [25, 3], vowel: [6, 29] },
}
// Dashed placeholders for an empty slot, per layout (x, y, w, h).
const SLOT: Record<VowelLayout, { cons: number[]; vowel: number[] }> = {
  side: { cons: [6, 20, 44, 60], vowel: [56, 8, 36, 84] },
  stack: { cons: [20, 4, 60, 46], vowel: [8, 54, 84, 40] },
}

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
  const [cx, cy] = PLACE[layout].cons
  const [vx, vy] = PLACE[layout].vowel
  const slot = SLOT[layout]
  return (
    <>
      {cons ? (
        <g
          className="syl-cons"
          style={{ transform: `translate(${cx}px, ${cy}px) scale(${CONS_SCALE})` }}
        >
          <JamoStrokes
            char={cons}
            className="syl-stroke"
            style={{ stroke: CONSONANT, strokeWidth: WEIGHT / CONS_SCALE }}
          />
        </g>
      ) : (
        <rect className="syl-slot" x={slot.cons[0]} y={slot.cons[1]} width={slot.cons[2]} height={slot.cons[3]} rx={6} />
      )}
      {vowel ? (
        <g key={vowel} style={{ transform: `translate(${vx}px, ${vy}px) scale(${VOWEL_SCALE})` }}>
          <JamoStrokes
            char={vowel}
            className="syl-stroke"
            style={{ stroke: VOWEL, strokeWidth: WEIGHT / VOWEL_SCALE }}
          />
        </g>
      ) : (
        <rect className="syl-slot" x={slot.vowel[0]} y={slot.vowel[1]} width={slot.vowel[2]} height={slot.vowel[3]} rx={6} />
      )}
    </>
  )
}
