// Words for the word puzzle (1.4): a picture and empty boxes, the child builds the word syllable
// by syllable and gets its sticker. Only syllables the app teaches (no final consonants), in the
// order they are offered: one syllable, then two (easy consonants first), then three.

import { CONSONANTS, VOWELS, composeSyllable, type RecordGroup } from './jamo'
import { t } from './i18n'
import { MORE_WORDS, WORDS, wordSound } from './words'

export type PuzzleWord = { word: string; emoji: string }

export const PUZZLE_WORDS: PuzzleWord[] = [
  // One syllable: the first stickers, earned in the first minutes.
  { word: '코', emoji: '👃' },
  { word: '소', emoji: '🐄' },
  { word: '비', emoji: '🌧️' },
  { word: '차', emoji: '🚗' },
  // Two syllables.
  { word: '나비', emoji: '🦋' },
  { word: '나무', emoji: '🌳' },
  { word: '모기', emoji: '🦟' },
  { word: '거미', emoji: '🕷️' },
  { word: '고기', emoji: '🍖' },
  { word: '바지', emoji: '👖' },
  { word: '버스', emoji: '🚌' },
  { word: '모자', emoji: '👒' },
  { word: '아기', emoji: '👶' },
  { word: '오이', emoji: '🥒' },
  { word: '오리', emoji: '🦆' },
  { word: '우유', emoji: '🥛' },
  { word: '여우', emoji: '🦊' },
  { word: '사자', emoji: '🦁' },
  { word: '하마', emoji: '🦛' },
  { word: '기차', emoji: '🚂' },
  { word: '가지', emoji: '🍆' },
  { word: '지도', emoji: '🗺️' },
  { word: '치마', emoji: '👗' },
  { word: '주스', emoji: '🧃' },
  { word: '포도', emoji: '🍇' },
  { word: '피자', emoji: '🍕' },
  { word: '커피', emoji: '☕' },
  { word: '기타', emoji: '🎸' },
  { word: '소파', emoji: '🛋️' },
  { word: '부츠', emoji: '👢' },
  { word: '휴지', emoji: '🧻' },
  // Three syllables.
  { word: '바나나', emoji: '🍌' },
  { word: '고구마', emoji: '🍠' },
  { word: '토마토', emoji: '🍅' },
  { word: '도토리', emoji: '🌰' },
  { word: '라디오', emoji: '📻' },
  { word: '피아노', emoji: '🎹' },
]

/** A picture word already recorded for the Build tab (하마 is 하's word): reuse its sound. */
const RECORDED = new Map<string, string>()
for (const c of CONSONANTS)
  for (const v of VOWELS) {
    const w = (WORDS[composeSyllable(c, v)] ?? MORE_WORDS[composeSyllable(c, v)])?.word
    if (w && !RECORDED.has(w)) RECORDED.set(w, wordSound(c, v))
  }

/** File name for a word's sound: an existing picture word's, else pz-<romanized> (나비 -> pz-nabi). */
export function puzzleSound(word: string): string {
  const known = RECORDED.get(word)
  if (known) return known
  const roman = [...word]
    .map((ch) => {
      const c = CONSONANTS.find((x) => VOWELS.some((v) => composeSyllable(x, v) === ch))!
      const v = VOWELS.find((x) => composeSyllable(c, x) === ch)!
      return (c.roman === 'ng' ? '' : c.roman) + v.roman
    })
    .join('')
  return `pz-${roman}`
}

/** Recording script: the puzzle words that don't have a sound from the picture words yet. */
export const PUZZLE_RECORD_GROUP: RecordGroup = {
  id: 'puzzle',
  label: t('6차 · 낱말 퍼즐', '6 · Word puzzle'),
  items: PUZZLE_WORDS.filter((w) => !RECORDED.has(w.word)).map((w) => ({ name: puzzleSound(w.word), shown: w.word, say: w.word })),
}
