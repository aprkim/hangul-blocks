import type { CSSProperties } from 'react'
import type { VowelLayout } from '../jamo'
import { SLOT, STROKES, placeSyllable, strokePath } from '../strokes'

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
  const placed = placeSyllable(cons, vowel, layout)
  const slot = SLOT[layout]
  const c = placed.cons
  const v = placed.vowel
  return (
    <>
      {c ? (
        <g className="syl-cons" style={{ transform: `translate(${c.x}px, ${c.y}px) scale(${c.k})` }}>
          {c.strokes.map((s, i) => (
            <path key={i} d={strokePath(s)} className="syl-stroke" style={{ stroke: CONSONANT, strokeWidth: WEIGHT / c.k }} />
          ))}
        </g>
      ) : (
        <rect className="syl-slot" x={slot.cons[0]} y={slot.cons[1]} width={slot.cons[2]} height={slot.cons[3]} rx={6} />
      )}
      {v ? (
        <g key={vowel} style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.k})` }}>
          {v.strokes.map((s, i) => (
            <path key={i} d={strokePath(s)} className="syl-stroke" style={{ stroke: VOWEL, strokeWidth: WEIGHT / v.k }} />
          ))}
        </g>
      ) : (
        <rect className="syl-slot" x={slot.vowel[0]} y={slot.vowel[1]} width={slot.vowel[2]} height={slot.vowel[3]} rx={6} />
      )}
    </>
  )
}
