// Jamo data. This file is the only place to touch when new audio arrives.
//
// To enable a consonant on the assembly board once its 10 syllable files
// (syl-{roman}{vowel}.mp3) are in public/audio/, flip `assemble` to true.

export type Consonant = {
  char: string
  /** Romanization used in file names (c-{roman}.mp3, syl-{roman}{v}.mp3). */
  roman: string
  /** Unicode choseong index (0..18) for syllable composition. */
  cho: number
  /** Shown on the assembly board. Hidden (not greyed out) when false. */
  assemble: boolean
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
  { char: 'ㄱ', roman: 'g', cho: 0, assemble: true },
  { char: 'ㄴ', roman: 'n', cho: 2, assemble: true },
  { char: 'ㄷ', roman: 'd', cho: 3, assemble: false },
  { char: 'ㄹ', roman: 'r', cho: 5, assemble: false },
  { char: 'ㅁ', roman: 'm', cho: 6, assemble: true },
  { char: 'ㅂ', roman: 'b', cho: 7, assemble: true },
  { char: 'ㅅ', roman: 's', cho: 9, assemble: false },
  // ㅇ syllables reuse the vowel files, so this can be flipped on with no new recordings.
  { char: 'ㅇ', roman: 'ng', cho: 11, assemble: false },
  { char: 'ㅈ', roman: 'j', cho: 12, assemble: false },
  { char: 'ㅊ', roman: 'ch', cho: 14, assemble: false },
  { char: 'ㅋ', roman: 'k', cho: 15, assemble: false },
  { char: 'ㅌ', roman: 't', cho: 16, assemble: false },
  { char: 'ㅍ', roman: 'p', cho: 17, assemble: false },
  { char: 'ㅎ', roman: 'h', cho: 18, assemble: false },
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

export const ASSEMBLE_CONSONANTS = CONSONANTS.filter((c) => c.assemble)

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
  ASSEMBLE_CONSONANTS.forEach((c) => VOWELS.forEach((v) => names.add(syllableSound(c, v))))
  return [...names]
}
