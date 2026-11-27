// Any Hangul syllable as strokes to trace: double consonants (ㄲ), compound vowels (ㅘ, ㅐ),
// and final consonants (받침), including two-consonant finals (ㄳ). Used for the child's own name,
// which can be any syllable at all.
//
// The 140 basic syllables (가..히) keep their own measured layouts (strokes.ts). Everything else
// is placed with per-vowel templates measured from school and screen fonts (fullBoxes.ts), then
// nudged apart wherever two parts would be too close for a finger to tell apart.

import { FULL_BOXES, type FullBoxes } from './fullBoxes'
import type { Box } from './syllableBoxes'
import { MIN_GAP, STROKES, centerBars, consonantIn, fit, gap, layoutSyllable, round, type Stroke } from './strokes'

export const CHO = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ']
export const JUNG = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ']
export const JONG = ['', ...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ']

export type Parts = { cho: string; jung: string; jong: string }

/** The pieces of a precomposed syllable (가 = ㄱ ㅏ, 각 = ㄱ ㅏ ㄱ), or null for anything else. */
export function decompose(ch: string): Parts | null {
  const code = ch.codePointAt(0)! - 0xac00
  if (ch.length !== 1 || code < 0 || code > 11171) return null
  return { cho: CHO[Math.floor(code / 588)], jung: JUNG[Math.floor((code % 588) / 28)], jong: JONG[code % 28] }
}

/** A syllable from its pieces (ㄱ ㅏ ㅁ = 감); the final may be empty. */
export function compose(cho: string, jung: string, jong = ''): string {
  return String.fromCharCode(0xac00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong))
}

const BASIC_CONS = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'
const BASIC_VOWELS = 'ㅏㅑㅓㅕㅣㅗㅛㅜㅠㅡ'
const SIDE = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅣ'
const FLAT = 'ㅗㅛㅜㅠㅡ'

// ---------- strokes for the jamo the basic 24 don't cover ----------

/** Two jamo side by side in one box (ㄲ, ㄳ): left, then right, with room between them. */
function pair(a: string, b: string): Stroke[] {
  const l = STROKES[a], r = STROKES[b]
  return [...fit(l, [10, 10, 34, 80]), ...fit(r, [56, 10, 34, 80])]
}
const DOUBLE: Record<string, [string, string]> = {
  ㄲ: ['ㄱ', 'ㄱ'], ㄸ: ['ㄷ', 'ㄷ'], ㅃ: ['ㅂ', 'ㅂ'], ㅆ: ['ㅅ', 'ㅅ'], ㅉ: ['ㅈ', 'ㅈ'],
  ㄳ: ['ㄱ', 'ㅅ'], ㄵ: ['ㄴ', 'ㅈ'], ㄶ: ['ㄴ', 'ㅎ'], ㄺ: ['ㄹ', 'ㄱ'], ㄻ: ['ㄹ', 'ㅁ'], ㄼ: ['ㄹ', 'ㅂ'],
  ㄽ: ['ㄹ', 'ㅅ'], ㄾ: ['ㄹ', 'ㅌ'], ㄿ: ['ㄹ', 'ㅍ'], ㅀ: ['ㄹ', 'ㅎ'], ㅄ: ['ㅂ', 'ㅅ'],
}

/** Vowels with two stems, in writing order (stem, bar, stem / bar, stem, stem). */
const MORE_VOWELS: Record<string, Stroke[]> = {
  ㅐ: [
    [[30, 10], [30, 90]],
    [[30, 50], [62, 50]],
    [[70, 10], [70, 90]],
  ],
  ㅒ: [
    [[30, 10], [30, 90]],
    [[30, 38], [62, 38]],
    [[30, 62], [62, 62]],
    [[70, 10], [70, 90]],
  ],
  ㅔ: [
    [[14, 50], [44, 50]],
    [[44, 10], [44, 90]],
    [[74, 10], [74, 90]],
  ],
  ㅖ: [
    [[14, 38], [44, 38]],
    [[14, 62], [44, 62]],
    [[44, 10], [44, 90]],
    [[74, 10], [74, 90]],
  ],
}
/** Compound vowels: the flat part under the consonant, then the tall part on the right. */
const MIXED: Record<string, [string, string]> = {
  ㅘ: ['ㅗ', 'ㅏ'], ㅙ: ['ㅗ', 'ㅐ'], ㅚ: ['ㅗ', 'ㅣ'], ㅝ: ['ㅜ', 'ㅓ'], ㅞ: ['ㅜ', 'ㅔ'], ㅟ: ['ㅜ', 'ㅣ'], ㅢ: ['ㅡ', 'ㅣ'],
}

const strokesOf = (j: string): Stroke[] => STROKES[j] ?? MORE_VOWELS[j] ?? (DOUBLE[j] ? pair(...DOUBLE[j]) : [])

// ---------- templates ----------

// The fonts draw these with touching parts, so they could not be measured on their own; each
// is taken from its closest measured relative (ㅔ from ㅐ, ㅘ from ㅝ and ㅙ...). With a final,
// ㅗ ㅛ ㅜ ㅠ give the consonant above them a little more height than print does, so a ㅈ or ㅎ
// is still big enough to trace.
const DERIVED: Record<string, FullBoxes> = {
  'ㅔ': { cons: [17.5, 20.5, 24, 46.5], vowel: [54, 12.5, 25, 75] },
  'ㅔ+': { cons: [18, 17.5, 24, 32], vowel: [54, 12.5, 25, 42], final: [31, 64.5, 47.5, 23] },
  'ㅖ': { cons: [17.5, 22, 24, 46], vowel: [54, 12.5, 25, 75] },
  'ㅖ+': { cons: [18.5, 19.5, 24, 31], vowel: [54, 12.5, 25, 42], final: [31, 66.5, 47.5, 23] },
  'ㅗ+': { cons: [27, 11, 46, 20], vowel: [15, 44, 70, 11], final: [30, 70, 40, 18] },
  'ㅛ+': { cons: [27, 11, 46, 20], vowel: [15, 44, 70, 11], final: [30, 70, 40, 18] },
  'ㅜ+': { cons: [27, 11, 46, 21], vowel: [15, 46, 70, 10], final: [30, 70, 40, 18] },
  'ㅠ+': { cons: [27, 11, 46, 21], vowel: [15, 46, 70, 10], final: [30, 70, 40, 18] },
  'ㅘ': { cons: [22, 17, 32, 26], flat: [16, 54, 48, 14], tall: [72.5, 12.5, 12, 75] },
  'ㅘ+': { cons: [22.5, 15, 31, 20], flat: [16, 40, 46, 13], tall: [72.5, 12.5, 12, 47], final: [28, 69, 48, 19] },
  'ㅚ': { cons: [23.5, 17, 33, 26], flat: [16, 54, 50, 14], tall: [77, 12.5, 0, 75] },
  'ㅚ+': { cons: [23.5, 15, 33, 20], flat: [16, 40, 51, 13], tall: [77, 13.5, 0, 46], final: [30, 69.5, 47, 19.5] },
  'ㅙ': { cons: [19.5, 17, 27.5, 26], flat: [15.5, 54, 36, 14], tall: [61.5, 12.5, 17, 75] },
  'ㅙ+': { cons: [20, 15, 27, 20], flat: [16, 40, 36, 13], tall: [61.5, 12.5, 17, 47], final: [29.5, 69.5, 49, 19] },
  'ㅗ': { cons: [26, 19.5, 48.5, 32.5], vowel: [15, 57.5, 70, 17.5] },
}

function template(jung: string, hasFinal: boolean): FullBoxes {
  const key = jung + (hasFinal ? '+' : '')
  return DERIVED[key] ?? FULL_BOXES[key]
}

// ---------- layout ----------

export type FullPart = 'consonant' | 'vowel' | 'final'
export type FullStroke = { stroke: Stroke; part: FullPart }

const cache = new Map<string, FullStroke[]>()

/** Shrink a box toward its center by d on the given sides. */
const inset = ([x, y, w, h]: Box, l: number, t: number, r: number, b: number): Box => [x + l, y + t, Math.max(0, w - l - r), Math.max(0, h - t - b)]

/** Strokes of any Hangul syllable on the 100 x 100 frame, in writing order, or null. */
export function fullStrokes(ch: string): FullStroke[] | null {
  const hit = cache.get(ch)
  if (hit) return hit
  const p = decompose(ch)
  if (!p) return null
  const { cho, jung, jong } = p

  // The 140 basic syllables: their own measured layouts.
  if (!jong && BASIC_CONS.includes(cho) && BASIC_VOWELS.includes(jung)) {
    const { cons, vowel } = layoutSyllable(cho, jung, SIDE.includes(jung) ? 'side' : 'stack')
    const out = [...(cons ?? []).map((stroke) => ({ stroke, part: 'consonant' as const })), ...(vowel ?? []).map((stroke) => ({ stroke, part: 'vowel' as const }))]
    cache.set(ch, out)
    return out
  }

  const t = template(jung, !!jong)
  const layout = SIDE.includes(jung) ? 'side' : 'stack'
  let consBox: Box = cho === 'ㅇ' ? round(t.cons, layout) : t.cons
  // Above a flat vowel with a final, print squeezes the consonant very wide and low; drawn with
  // a child's thick stroke a ㅈ or ㅎ then stops looking like itself. Keep it at most 1.6 times as
  // wide as it is tall (centered), as the narrower fonts do.
  if (layout === 'stack' && consBox[2] > consBox[3] * 1.6) {
    const nw = consBox[3] * 1.6
    consBox = [consBox[0] + (consBox[2] - nw) / 2, consBox[1], nw, consBox[3]]
  }
  let finalBox: Box | undefined = t.final && (jong === 'ㅇ' ? round(t.final, 'stack') : t.final)
  let vowelBox = t.vowel, flatBox = t.flat, tallBox = t.tall

  const consShape = (b: Box) => consonantIn(cho, b, layout, strokesOf(cho))
  const vowelStrokes = (): Stroke[] =>
    MIXED[jung] ? [...fit(strokesOf(MIXED[jung][0]), flatBox!), ...fit(strokesOf(MIXED[jung][1]), tallBox!)] : fit(strokesOf(jung), vowelBox!)
  const finalStrokes = () => (jong ? fit(strokesOf(jong), finalBox!) : [])

  // Thick strokes need more room than a font's thin ones: step the parts apart until every
  // pair is at least MIN_GAP apart (consonant gives way first, then the vowel's tail, then the
  // final drops a little), within a few steps.
  let c = consShape(consBox), v = vowelStrokes(), f = finalStrokes()
  for (let i = 0; i < 12; i++) {
    let moved = false
    if (gap(c, v) < MIN_GAP) {
      consBox = FLAT.includes(jung) ? inset(consBox, 0, 0, 0, 1.5) : inset(consBox, 0, 0, 1.5, 0)
      if (MIXED[jung]) consBox = inset(consBox, 0, 0, 1, 1)
      moved = true
    }
    if (f.length && gap(v, f) < MIN_GAP) {
      if (vowelBox) vowelBox = SIDE.includes(jung) ? inset(vowelBox, 0, 0, 0, 1.5) : vowelBox
      if (tallBox) tallBox = inset(tallBox, 0, 0, 0, 1.5)
      finalBox = [finalBox![0], finalBox![1] + 1, finalBox![2], Math.max(8, finalBox![3] - 0.5)]
      moved = true
    }
    if (f.length && gap(c, f) < MIN_GAP) {
      consBox = inset(consBox, 0, 0, 0, 1.5)
      moved = true
    }
    if (!moved) break
    c = consShape(consBox)
    v = vowelStrokes()
    f = finalStrokes()
  }

  if (layout === 'side') v = centerBars(c, v, f)

  const out: FullStroke[] = [
    ...c.map((stroke) => ({ stroke, part: 'consonant' as const })),
    ...v.map((stroke) => ({ stroke, part: 'vowel' as const })),
    ...f.map((stroke) => ({ stroke, part: 'final' as const })),
  ]
  cache.set(ch, out)
  return out
}

/** One of the 140 basic syllables (가..히), which come with their own sound. */
export function isBasicSyllable(ch: string): boolean {
  const p = decompose(ch)
  return !!p && !p.jong && BASIC_CONS.includes(p.cho) && BASIC_VOWELS.includes(p.jung)
}

/**
 * The family's recording of a name syllable the app has no sound for (김, 윤...), shared by
 * every child whose name has it.
 */
export const nameSyllableSound = (ch: string) => `name-syl-${ch}`

/** A name's syllables that need a family recording to be heard, in order, without repeats. */
export const unvoicedSyllables = (name: string) => [...new Set([...name].filter((ch) => !isBasicSyllable(ch)))]

/** A name the app can write: 1 to 5 Hangul syllables. */
export const writableName = (name: string) => /^[가-힣]{1,5}$/.test(name)
