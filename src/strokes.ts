// Stroke order for tracing the 24 basic jamo, on a 100 x 100 grid.
// Each stroke is the path a finger follows, in writing order and direction.

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
