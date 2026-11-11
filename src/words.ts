// Picture words: when an assembled syllable starts a word a 4–6-year-old knows, the word
// pops up with a picture and is spoken. Syllables with no good word simply show none:
// every combination still plays its sound.
//
// Audio: w-{consonant}{vowel}.mp3 in public/audio/ (or recorded in the app), e.g. 가방 -> w-ga.mp3.

import {
  ASSEMBLE_CONSONANTS,
  CONSONANTS,
  VOWELS,
  composeSyllable,
  type Consonant,
  type RecordGroup,
  type Vowel,
} from './jamo'

export type Word = { word: string; emoji: string }

/** Keyed by the syllable the word starts with. The word must start with exactly that syllable. */
export const WORDS: Record<string, Word> = {
  가: { word: '가방', emoji: '🎒' },
  갸: { word: '갸우뚱', emoji: '🤔' },
  거: { word: '거북이', emoji: '🐢' },
  겨: { word: '겨울', emoji: '⛄' },
  고: { word: '고양이', emoji: '🐱' },
  교: { word: '교실', emoji: '🏫' },
  구: { word: '구름', emoji: '☁️' },
  그: { word: '그림', emoji: '🎨' },
  기: { word: '기차', emoji: '🚂' },
  나: { word: '나비', emoji: '🦋' },
  냐: { word: '냐옹', emoji: '🐈' },
  너: { word: '너구리', emoji: '🦝' },
  노: { word: '노래', emoji: '🎵' },
  누: { word: '누나', emoji: '👧' },
  뉴: { word: '뉴스', emoji: '📺' },
  느: { word: '느림보', emoji: '🐌' },
  마: { word: '마녀', emoji: '🧙' },
  머: { word: '머리', emoji: '💇' },
  모: { word: '모자', emoji: '👒' },
  묘: { word: '묘기', emoji: '🤹' },
  무: { word: '무지개', emoji: '🌈' },
  미: { word: '미끄럼틀', emoji: '🛝' },
  바: { word: '바나나', emoji: '🍌' },
  버: { word: '버스', emoji: '🚌' },
  벼: { word: '벼', emoji: '🌾' },
  보: { word: '보물', emoji: '💎' },
  부: { word: '부엉이', emoji: '🦉' },
  브: { word: '브로콜리', emoji: '🥦' },
  비: { word: '비행기', emoji: '✈️' },
}

export function wordFor(c: Consonant, v: Vowel): Word | undefined {
  return WORDS[composeSyllable(c, v)]
}

export const wordSound = (c: Consonant, v: Vowel) => `w-${c.roman}${v.roman}`

/** All word sounds for consonants currently on the assembly board. */
export function wordSoundNames(): string[] {
  return ASSEMBLE_CONSONANTS.flatMap((c) => VOWELS.filter((v) => wordFor(c, v)).map((v) => wordSound(c, v)))
}

/** Recording script for the words (4th set on the recording page). */
export const WORD_RECORD_GROUP: RecordGroup = {
  id: 'words',
  label: '4차 · 그림 단어',
  items: CONSONANTS.flatMap((c) =>
    VOWELS.flatMap((v) => {
      const w = wordFor(c, v)
      return w ? [{ name: wordSound(c, v), shown: w.word, say: w.word }] : []
    }),
  ),
}
