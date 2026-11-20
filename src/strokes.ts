// Stroke order for tracing the 24 basic jamo, on a 100 x 100 grid.
// Each stroke is the path a finger follows, in writing order and direction.

import type { VowelLayout } from './jamo'
import { SYLLABLE_BOXES, VOWEL_BOXES, type Box } from './syllableBoxes'

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
    [[40.5, 35.5], [82, 82]], // the right leg starts on the left stroke, a third of the way down (as in school print)
  ],
  ㅇ: [circle(50, 50, 30)],
  ㅈ: [
    [[22, 20], [78, 20]],
    [[50, 20], [18, 84]],
    [[40.5, 39], [82, 84]],
  ],
  ㅊ: [
    [[50, 8], [50, 20]],
    [[22, 28], [78, 28]],
    [[50, 28], [18, 88]],
    [[40.5, 46], [82, 88]],
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
// same jamo changes proportion with its partner (ㄱ is tall in 가, wide in 고). The spaces come
// from measurements of real fonts (src/syllableBoxes.ts).

/** Where each part goes: measured per syllable, else the per-vowel median. */
function boxesFor(cons: string | null, vowel: string | null, layout: VowelLayout): { cons: Box; vowel: Box } {
  const v = vowel ?? (layout === 'side' ? 'ㅏ' : 'ㅗ')
  return (cons && SYLLABLE_BOXES[cons + v]) || VOWEL_BOXES[v]
}

// Dashed placeholders for an empty slot, per layout (x, y, w, h).
export const SLOT: Record<VowelLayout, { cons: number[]; vowel: number[] }> = {
  side: { cons: [10, 14, 46, 60], vowel: [64, 6, 28, 88] },
  stack: { cons: [17, 8, 66, 40], vowel: [7, 54, 86, 38] },
}

/**
 * Consonants whose shape changes by position, in a unit box (0..1). Each variant has the same
 * number of points so one can morph into the other when the vowel changes.
 */
export const SHAPES: Record<string, { side: Stroke[]; stack: Stroke[] }> = {
  // Kept straight in every position, like the ㄱ the child traced alone (a curved 가 stem was
  // harder for 4-year-olds). Side: a tall stem; stack (고): wide with a short stem.
  ㄱ: {
    side: [[[0, 0], ...curve([1, 0], [1, 0.5], [1, 1])]],
    stack: [[[0, 0], ...curve([1, 0], [1, 0.5], [1, 1])]],
  },
}

/**
 * ㅎ above a vowel (호 효 후 휴 흐). Squeezed into a wide, low space as a whole, its circle went
 * flat and its three parts ran together; fonts get away with that with thin strokes, a child's
 * thick ones don't. So it is built part by part: it takes a little more room at the top, the
 * dot and bar keep a clear gap, and the circle stays nearly round. Same point counts as the
 * plain ㅎ, so it can morph between 하 and 호.
 */
export function hieutStack([x, y0, w, h0]: Box): Stroke[] {
  const top = Math.min(y0, 6)
  const y = top
  const h = h0 + (y0 - top)
  const cx = x + w / 2
  const dot = 4
  // Where room is short (화, 회), the parts sit a little closer so the circle keeps a hole.
  const roomy = (y + h - (y + dot + 19.5)) / 2 >= 8
  const barY = y + dot + (roomy ? 9.5 : 8.5)
  const ringTop = barY + (roomy ? 10 : 9)
  const ry = Math.max(5, (y + h - ringTop) / 2)
  const rx = Math.min(ry * 1.5, w * 0.4)
  const cy = ringTop + ry
  const ring: Pt[] = []
  for (let i = 0; i <= 32; i++) {
    const t = (i / 32) * Math.PI * 2
    ring.push([cx - rx * Math.sin(t), cy - ry * Math.cos(t)])
  }
  const half = Math.min(w / 2, rx * 1.45)
  return [
    [[cx, y], [cx, y + dot]],
    [[cx - half, barY], [cx + half, barY]],
    ring,
  ]
}

/** A consonant's strokes in its space; a few consonants are shaped by position (see above). */
export function consonantIn(cons: string, box: Box, layout: VowelLayout, strokes: Stroke[] = STROKES[cons] ?? []): Stroke[] {
  // Only in the wide, roomy space above ㅗ ㅛ ㅜ ㅠ ㅡ; in narrow or crowded spaces (화, 훈) the
  // usual fitted shape does better.
  if (cons === 'ㅎ' && layout === 'stack' && box[2] > box[3] * 1.15 && box[3] >= 24) return hieutStack(box)
  const shape = SHAPES[cons]?.[layout]
  return shape ? fit(shape, box, [0, 0, 1, 1]) : fit(strokes, box)
}

/** A quadratic curve as 13 points (same count for every shape, so shapes can morph). */
function curve(a: Pt, c: Pt, b: Pt): Pt[] {
  return Array.from({ length: 13 }, (_, i) => {
    const t = i / 12
    const u = 1 - t
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as Pt
  })
}

export function bbox(strokes: Stroke[]): Box {
  const xs = strokes.flat().map((p) => p[0])
  const ys = strokes.flat().map((p) => p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]
}

/** Stretch strokes so their bounding box fills `to` (a zero-size side stays centered). */
export function fit(strokes: Stroke[], to: Box, from: Box = bbox(strokes)): Stroke[] {
  const [fx, fy, fw, fh] = from
  const [tx, ty, tw, th] = to
  const mx = (x: number) => (fw ? tx + ((x - fx) / fw) * tw : tx + tw / 2)
  const my = (y: number) => (fh ? ty + ((y - fy) / fh) * th : ty + th / 2)
  return strokes.map((s) => s.map(([x, y]) => [mx(x), my(y)] as Pt))
}

/**
 * The two parts of a syllable never touch (two pieces joining is what the child is learning),
 * and a finger must be able to tell their strokes apart: at least this far, centerline to centerline.
 */
export const MIN_GAP = 13

export function gap(a: Stroke[], b: Stroke[]): number {
  let m = Infinity
  const pb = b.flatMap((s) => sample(s, 1.5))
  for (const s of a) for (const p of sample(s, 1.5)) for (const q of pb) m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1]))
  return m
}

const laidOut = new Map<string, { cons: Stroke[] | null; vowel: Stroke[] | null }>()

/**
 * ㅇ keeps its roundness: fitted straight into a tall or wide box it turns into a long oval.
 * Printed type draws it a little tall beside a vowel (아) and a little wide above one (오), so its
 * width-to-height ratio is held to that range and it is centered in its box.
 */
const ROUND_RATIO: Record<VowelLayout, [number, number]> = { side: [0.78, 1], stack: [1, 1.6] }
export function round([x, y, w, h]: Box, layout: VowelLayout): Box {
  const [lo, hi] = ROUND_RATIO[layout]
  if (w / h < lo) {
    const nh = w / lo
    return [x, y + (h - nh) / 2, w, nh]
  }
  if (w / h > hi) {
    const nw = h * hi
    return [x + (w - nw) / 2, y, nw, h]
  }
  return [x, y, w, h]
}

/** The consonant and vowel strokes of a syllable on the 100 x 100 frame (either may be missing). */
export function layoutSyllable(
  cons: string | null,
  vowel: string | null,
  layout: VowelLayout,
): { cons: Stroke[] | null; vowel: Stroke[] | null } {
  const key = `${cons}${vowel}${layout}`
  const cached = laidOut.get(key)
  if (cached) return cached

  const box = boxesFor(cons, vowel, layout)
  const v = vowel ? fit(STROKES[vowel] ?? [], box.vowel) : null
  const consIn = (to: Box): Stroke[] => consonantIn(cons!, to, layout)
  let c: Stroke[] | null = null
  if (cons) {
    // Fonts let some pairs touch (머, 텨). Here the consonant gives way until the gap is clear,
    // trying the gentlest change first: slide away from the vowel, then get narrower or (beside
    // a vowel) a little taller so the vowel's arm clears its bottom stroke, or shorter above one.
    const [x, y, w, h] = cons === 'ㅇ' ? round(box.cons, layout) : box.cons
    const side = layout === 'side'
    const tries: { box: Box; cost: number }[] = []
    for (const d of [0, 2, 4, 6])
      for (let kw = 1; kw > 0.58; kw -= 0.04)
        for (const kh of side ? [1, 1.06, 1.12, 1.18] : [1, 0.94, 0.88, 0.82, 0.76])
          tries.push({
            box: side ? [Math.max(10, x - d), y, w * kw, h * kh] : [x + (w * (1 - kw)) / 2, Math.max(9, y - d), w * kw, h * kh],
            cost: d * 0.02 + (1 - kw) * (side ? 1 : 1.5) + Math.abs(1 - kh) * (side ? 1 : 1.2),
          })
    tries.sort((p, q) => p.cost - q.cost)
    let best = -1
    for (const t of tries) {
      const candidate = consIn(t.box)
      const g = v ? gap(candidate, v) : Infinity
      if (g > best) {
        best = g
        c = candidate
      }
      if (g >= MIN_GAP) break
    }
  }
  const result = { cons: c, vowel: v }
  laidOut.set(key, result)
  return result
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
