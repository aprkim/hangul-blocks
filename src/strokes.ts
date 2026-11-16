// Stroke order for tracing the 24 basic jamo, on a 100 x 100 grid.
// Each stroke is the path a finger follows, in writing order and direction.

import type { VowelLayout } from './jamo'

export type Pt = readonly [number, number]
export type Stroke = Pt[]

/** A circle written the Korean way: start at the top, go left (counter-clockwise on screen). */
function circle(cx: number, cy: number, r: number): Stroke {
  const pts: Pt[] = []
  for (let i = 0; i <= 32; i++) {
    const t = (i / 32) * Math.PI * 2
    pts.push([cx - r * Math.sin(t), cy - r * Math.cos(t)])
  }
  return pts
}

export const STROKES: Record<string, Stroke[]> = {
  // Consonants
  ㄱ: [[[22, 22], [76, 22], [76, 82]]],
  ㄴ: [[[26, 18], [26, 78], [80, 78]]],
  ㄷ: [
    [[24, 22], [78, 22]],
    [[24, 22], [24, 78], [80, 78]],
  ],
  ㄹ: [
    [[24, 18], [76, 18], [76, 48]],
    [[24, 48], [76, 48]],
    [[24, 48], [24, 82], [80, 82]],
  ],
  ㅁ: [
    [[24, 20], [24, 80]],
    [[24, 20], [76, 20], [76, 80]],
    [[24, 80], [76, 80]],
  ],
  ㅂ: [
    [[26, 16], [26, 82]],
    [[74, 16], [74, 82]],
    [[26, 48], [74, 48]],
    [[26, 82], [74, 82]],
  ],
  ㅅ: [
    [[50, 16], [18, 82]],
    [[48, 46], [82, 82]],
  ],
  ㅇ: [circle(50, 50, 30)],
  ㅈ: [
    [[22, 20], [78, 20]],
    [[50, 20], [18, 84]],
    [[48, 50], [82, 84]],
  ],
  ㅊ: [
    [[50, 8], [50, 20]],
    [[22, 28], [78, 28]],
    [[50, 28], [18, 88]],
    [[48, 56], [82, 88]],
  ],
  ㅋ: [
    [[22, 18], [78, 18], [78, 84]],
    [[22, 50], [78, 50]],
  ],
  ㅌ: [
    [[24, 18], [78, 18]],
    [[24, 48], [78, 48]],
    [[24, 18], [24, 82], [80, 82]],
  ],
  ㅍ: [
    [[18, 20], [82, 20]],
    [[36, 20], [36, 80]],
    [[64, 20], [64, 80]],
    [[14, 80], [86, 80]],
  ],
  ㅎ: [
    [[50, 8], [50, 22]],
    [[22, 32], [78, 32]],
    circle(50, 64, 19),
  ],
  // Vowels
  ㅏ: [
    [[42, 10], [42, 90]],
    [[42, 50], [74, 50]],
  ],
  ㅑ: [
    [[40, 10], [40, 90]],
    [[40, 38], [72, 38]],
    [[40, 62], [72, 62]],
  ],
  ㅓ: [
    [[26, 50], [58, 50]],
    [[58, 10], [58, 90]],
  ],
  ㅕ: [
    [[26, 38], [58, 38]],
    [[26, 62], [58, 62]],
    [[58, 10], [58, 90]],
  ],
  ㅗ: [
    [[50, 30], [50, 62]],
    [[10, 62], [90, 62]],
  ],
  ㅛ: [
    [[38, 30], [38, 62]],
    [[62, 30], [62, 62]],
    [[10, 62], [90, 62]],
  ],
  ㅜ: [
    [[10, 38], [90, 38]],
    [[50, 38], [50, 72]],
  ],
  ㅠ: [
    [[10, 38], [90, 38]],
    [[38, 38], [38, 72]],
    [[62, 38], [62, 72]],
  ],
  ㅡ: [[[10, 50], [90, 50]]],
  ㅣ: [[[50, 10], [50, 90]]],
}

// ---------- syllables ----------
// A syllable is drawn the way Korean type is: each part is refit to the space it gets, so the
// same jamo changes shape with its partner (ㄱ sweeps down-left in 가 but is wide and flat in 고).
// Boxes below are [x, y, w, h] on the 100 x 100 frame, tuned against a reference font.

type Box = [number, number, number, number]

/** 가로모임 (side): vowel to the right; 세로모임 (stack): vowel below. Per vowel, where each part goes. */
const BOXES: Record<string, { cons: Box; vowel: Box }> = {
  // side: the vowel's long vertical runs almost the full height; the consonant sits left, a bit above center
  ㅏ: { cons: [10, 24, 36, 50], vowel: [64, 8, 24, 84] },
  ㅑ: { cons: [10, 24, 36, 50], vowel: [64, 8, 24, 84] },
  ㅓ: { cons: [12, 24, 30, 50], vowel: [58, 8, 26, 84] },
  ㅕ: { cons: [12, 24, 30, 50], vowel: [58, 8, 26, 84] },
  ㅣ: { cons: [16, 22, 38, 54], vowel: [72, 8, 0, 84] },
  // stack: the consonant is wide and flat on top; the vowel's stub is short
  ㅗ: { cons: [22, 12, 56, 36], vowel: [10, 62, 80, 24] },
  ㅛ: { cons: [22, 12, 56, 36], vowel: [10, 62, 80, 24] },
  ㅜ: { cons: [22, 8, 56, 30], vowel: [10, 56, 80, 32] },
  ㅠ: { cons: [22, 8, 56, 30], vowel: [10, 56, 80, 32] },
  ㅡ: { cons: [22, 16, 56, 38], vowel: [10, 70, 80, 0] },
}
/** Before a vowel is chosen. */
const NO_VOWEL: Record<VowelLayout, { cons: Box; vowel: Box }> = { side: BOXES['ㅏ'], stack: BOXES['ㅗ'] }

// Dashed placeholders for an empty slot, per layout (x, y, w, h).
export const SLOT: Record<VowelLayout, { cons: number[]; vowel: number[] }> = {
  side: { cons: [6, 16, 52, 68], vowel: [60, 6, 32, 88] },
  stack: { cons: [14, 4, 72, 44], vowel: [6, 58, 88, 36] },
}

/**
 * Consonants whose shape changes by position, in a unit box (0..1). Each variant has the same
 * number of points so one can morph into the other when the vowel changes.
 */
const SHAPES: Record<string, { side: Stroke[]; stack: Stroke[] }> = {
  // Kept straight in every position, like the ㄱ the child traced alone (a curved 가 stem was
  // harder for 4-year-olds). Side: a tall stem; stack (고): wide with a short stem.
  ㄱ: {
    side: [[[0, 0], ...curve([1, 0], [1, 0.5], [1, 1])]],
    stack: [[[0, 0], ...curve([1, 0], [1, 0.5], [1, 1])]],
  },
}

/** A quadratic curve as 13 points (same count for every shape, so shapes can morph). */
function curve(a: Pt, c: Pt, b: Pt): Pt[] {
  return Array.from({ length: 13 }, (_, i) => {
    const t = i / 12
    const u = 1 - t
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as Pt
  })
}

function bbox(strokes: Stroke[]): Box {
  const xs = strokes.flat().map((p) => p[0])
  const ys = strokes.flat().map((p) => p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]
}

/** Stretch strokes so their bounding box fills `to` (a zero-size side stays centered). */
function fit(strokes: Stroke[], to: Box, from: Box = bbox(strokes)): Stroke[] {
  const [fx, fy, fw, fh] = from
  const [tx, ty, tw, th] = to
  const mx = (x: number) => (fw ? tx + ((x - fx) / fw) * tw : tx + tw / 2)
  const my = (y: number) => (fh ? ty + ((y - fy) / fh) * th : ty + th / 2)
  return strokes.map((s) => s.map(([x, y]) => [mx(x), my(y)] as Pt))
}

/** The consonant and vowel strokes of a syllable on the 100 x 100 frame (either may be missing). */
export function layoutSyllable(
  cons: string | null,
  vowel: string | null,
  layout: VowelLayout,
): { cons: Stroke[] | null; vowel: Stroke[] | null } {
  const box = (vowel && BOXES[vowel]) || NO_VOWEL[layout]
  let c: Stroke[] | null = null
  if (cons) {
    const shape = SHAPES[cons]?.[layout]
    c = shape ? fit(shape, box.cons, [0, 0, 1, 1]) : fit(STROKES[cons] ?? [], box.cons)
  }
  return { cons: c, vowel: vowel ? fit(STROKES[vowel] ?? [], box.vowel) : null }
}

/** Strokes of a syllable on the 100 x 100 frame: consonant strokes, then vowel strokes (Korean stroke order). */
export function syllableStrokes(cons: string, vowel: string, layout: VowelLayout): { stroke: Stroke; part: 'consonant' | 'vowel' }[] {
  const { cons: c, vowel: v } = layoutSyllable(cons, vowel, layout)
  return [
    ...(c ?? []).map((stroke) => ({ stroke, part: 'consonant' as const })),
    ...(v ?? []).map((stroke) => ({ stroke, part: 'vowel' as const })),
  ]
}

export function strokePath(s: Stroke): string {
  return s.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

/** Points every `step` units along a stroke. */
export function sample(s: Stroke, step = 2): Pt[] {
  const out: Pt[] = [s[0]]
  for (let i = 1; i < s.length; i++) {
    const [ax, ay] = s[i - 1]
    const [bx, by] = s[i]
    const len = Math.hypot(bx - ax, by - ay)
    const n = Math.max(1, Math.ceil(len / step))
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n])
  }
  return out
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Keep only points at least `gap` apart, so the result doesn't depend on touch sample rate. */
function thin(pts: Pt[], gap: number): Pt[] {
  const out: Pt[] = [pts[0]]
  for (const p of pts) if (dist(p, out[out.length - 1]) >= gap) out.push(p)
  if (out.length === 1 && pts.length > 1) out.push(pts[pts.length - 1])
  return out
}

/** Moving average over 7 points: removes finger shake, keeps the overall path. */
function smooth(pts: Pt[]): Pt[] {
  const k = 3
  return pts.map((_, i) => {
    let x = 0
    let y = 0
    let n = 0
    for (let j = Math.max(0, i - k); j <= Math.min(pts.length - 1, i + k); j++) {
      x += pts[j][0]
      y += pts[j][1]
      n++
    }
    return [x / n, y / n] as Pt
  })
}

/**
 * Lenient check for a 4-year-old's finger: did this trace follow the stroke?
 * - it starts nearer the stroke's start than its end (right direction),
 * - it covers most of the stroke,
 * - it mostly stays near the stroke and isn't far longer than it (not a scribble).
 */
export function traceMatches(stroke: Stroke, trace: Pt[]): boolean {
  if (trace.length < 3) return false
  const target = sample(stroke)
  const start = target[0]
  const end = target[target.length - 1]
  const closed = dist(start, end) < 5 // circles: direction can't be told from the endpoints

  const near = (p: Pt, pts: Pt[], r: number) => pts.some((q) => dist(p, q) <= r)
  const covered = target.filter((p) => near(p, trace, 13)).length / target.length
  const onStroke = trace.filter((p) => near(p, target, 16)).length / trace.length
  const rightWay = closed || dist(trace[0], start) < dist(trace[0], end)
  const startsNearStart = dist(trace[0], start) <= 24
  // A scribble can brush every part of a stroke; a real trace is about as long as the stroke.
  // Length is measured on a smoothed trace so a shaky little finger isn't penalized.
  const length = (pts: readonly Pt[]) => pts.slice(1).reduce((sum, p, i) => sum + dist(pts[i], p), 0)
  const notScribble = length(thin(smooth(trace), 4)) <= length(target) * 2 + 15

  return rightWay && startsNearStart && notScribble && covered >= 0.7 && onStroke >= 0.65
}
