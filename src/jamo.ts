// Jamo data.
//
// Syllables (Build, syllable writing, stickers) come in four sets of consonants, opened one
// after another as the child writes (src/progress.ts). Each consonant's `set` says which.

import { t } from './i18n'

export type Consonant = {
  char: string
  /** Romanization used in file names (c-{roman}.mp3, syl-{roman}{v}.mp3). */
  roman: string
  /** Unicode choseong index (0..18) for syllable composition. */
  cho: number
  /** Which syllable set this consonant belongs to (1 is open from the start). */
  set: number
}

/** side = 가로모임 (consonant left, vowel right). stack = 세로모임 (consonant top, vowel bottom). */
export type VowelLayout = 'side' | 'stack'

export type Vowel = {
  char: string
  roman: string
  /** Unicode jungseong index (0..20). */
  jung: number
  layout: VowelLayout
}

export const CONSONANTS: Consonant[] = [
  { char: 'ㄱ', roman: 'g', cho: 0, set: 1 },
  { char: 'ㄴ', roman: 'n', cho: 2, set: 1 },
  { char: 'ㄷ', roman: 'd', cho: 3, set: 2 },
  { char: 'ㄹ', roman: 'r', cho: 5, set: 2 },
  { char: 'ㅁ', roman: 'm', cho: 6, set: 1 },
  { char: 'ㅂ', roman: 'b', cho: 7, set: 1 },
  { char: 'ㅅ', roman: 's', cho: 9, set: 2 },
  // ㅇ syllables reuse the vowel files (no recordings of their own).
  { char: 'ㅇ', roman: 'ng', cho: 11, set: 2 },
  { char: 'ㅈ', roman: 'j', cho: 12, set: 3 },
  { char: 'ㅊ', roman: 'ch', cho: 14, set: 3 },
  { char: 'ㅋ', roman: 'k', cho: 15, set: 3 },
  { char: 'ㅌ', roman: 't', cho: 16, set: 4 },
  { char: 'ㅍ', roman: 'p', cho: 17, set: 4 },
  { char: 'ㅎ', roman: 'h', cho: 18, set: 4 },
]

// Ordered so each row of five shares a layout: first row side-by-side, second row stacked.
export const VOWELS: Vowel[] = [
  { char: 'ㅏ', roman: 'a', jung: 0, layout: 'side' },
  { char: 'ㅑ', roman: 'ya', jung: 2, layout: 'side' },
  { char: 'ㅓ', roman: 'eo', jung: 4, layout: 'side' },
  { char: 'ㅕ', roman: 'yeo', jung: 6, layout: 'side' },
  { char: 'ㅣ', roman: 'i', jung: 20, layout: 'side' },
  { char: 'ㅗ', roman: 'o', jung: 8, layout: 'stack' },
  { char: 'ㅛ', roman: 'yo', jung: 12, layout: 'stack' },
  { char: 'ㅜ', roman: 'u', jung: 13, layout: 'stack' },
  { char: 'ㅠ', roman: 'yu', jung: 17, layout: 'stack' },
  { char: 'ㅡ', roman: 'eu', jung: 18, layout: 'stack' },
]

/**
 * The vowels in the order of the 가나다 chart children learn (가 갸 거 겨 고 교 구 규 그 기): ㅣ
 * comes last. Lists of letters use this order; the Sound and Build boards keep VOWELS, which
 * groups vowels by shape (beside the consonant, then under it).
 */
export const CHART_VOWELS: Vowel[] = [...VOWELS.filter((v) => v.char !== 'ㅣ'), VOWELS.find((v) => v.char === 'ㅣ')!]

/** The syllable sets, in the order they open: ㄱㄴㅁㅂ, ㄷㄹㅅㅇ, ㅈㅊㅋ, ㅌㅍㅎ. */
export const SETS: Consonant[][] = [1, 2, 3, 4].map((n) => CONSONANTS.filter((c) => c.set === n))
export const SET_COUNT = SETS.length

/** Precomposed syllable with no final consonant: 0xAC00 + (cho * 21 + jung) * 28. */
export function composeSyllable(c: Consonant, v: Vowel): string {
  return String.fromCharCode(0xac00 + (c.cho * 21 + v.jung) * 28)
}

export const consonantSound = (c: Consonant) => `c-${c.roman}`
export const vowelSound = (v: Vowel) => `v-${v.roman}`

/** Never concatenates jamo clips. ㅇ + vowel is the same sound as the vowel alone. */
export function syllableSound(c: Consonant, v: Vowel): string {
  return c.roman === 'ng' ? vowelSound(v) : `syl-${c.roman}${v.roman}`
}

export function allSoundNames(): string[] {
  const names = new Set<string>()
  CONSONANTS.forEach((c) => names.add(consonantSound(c)))
  VOWELS.forEach((v) => names.add(vowelSound(v)))
  CONSONANTS.forEach((c) => VOWELS.forEach((v) => names.add(syllableSound(c, v))))
  return [...names]
}

// ---------- recording script (docs/AUDIO.md) ----------

export type RecordItem = {
  /** File name without .mp3 */
  name: string
  /** What is shown big: the jamo or the syllable. */
  shown: string
  /** What to say out loud (consonants are said by their sound, not their name). */
  say: string
}

export type RecordGroup = { id: string; label: string; items: RecordItem[] }

const EU = VOWELS.find((v) => v.roman === 'eu')!
const IEUNG = CONSONANTS.find((c) => c.roman === 'ng')!

function syllableItems(cs: Consonant[]): RecordItem[] {
  return cs.flatMap((c) =>
    CHART_VOWELS.map((v) => {
      const s = composeSyllable(c, v)
      return { name: syllableSound(c, v), shown: s, say: s }
    }),
  )
}

export const RECORD_GROUPS: RecordGroup[] = [
  {
    id: 'jamo',
    label: t('1차 · 자모 소리', '1 · Letter sounds'),
    items: [
      ...CONSONANTS.map((c) => ({ name: consonantSound(c), shown: c.char, say: composeSyllable(c, EU) })),
      ...CHART_VOWELS.map((v) => ({ name: vowelSound(v), shown: v.char, say: composeSyllable(IEUNG, v) })),
    ],
  },
  {
    id: 'syl-p1',
    label: t('2차 · 음절', '2 · Syllables'),
    items: syllableItems(SETS[0]),
  },
  {
    id: 'syl-rest',
    label: t('3차 · 나머지 음절', '3 · More syllables'),
    // ㅇ row is skipped: it reuses the vowel files.
    items: syllableItems(CONSONANTS.filter((c) => c.set > 1 && c.roman !== 'ng')),
  },
]
