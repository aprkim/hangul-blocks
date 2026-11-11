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
  syllableSound,
} from './jamo'

export type Word = { word: string; emoji: string }

/** Keyed by the syllable. The word contains that syllable (usually first; it's highlighted wherever it is). */
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

// ---------- what pops up after a syllable is built ----------

/**
 * Animal friends for syllables with no word: they pop up and say the syllable back.
 * Each syllable has its own animal, none reused by a picture word, so a child can
 * remember "뮤 is the cow".
 */
const FRIEND_FOR: Record<string, string> = {
  규: '🐸',
  녀: '🐰',
  뇨: '🐥',
  니: '🦄',
  먀: '🐯',
  며: '🐻',
  뮤: '🐮',
  므: '🐑',
  뱌: '🐼',
  뵤: '🐷',
  뷰: '🐳',
}
/** For syllables of consonants enabled later that have no word and no assigned friend yet. */
const FRIENDS = ['🐶', '🦊', '🐨', '🐵', '🐧', '🦁', '🐹', '🐙', '🦒', '🐞']

export type Card = {
  emoji: string
  /** Text under the picture, split so the built syllable can be shown in red. */
  before: string
  syllable: string
  after: string
  /** Sound to play when the card appears or is tapped. */
  sound: string
  kind: 'word' | 'friend'
}

/** Every syllable gets a card: its picture word if it has one, otherwise an animal friend saying it. */
export function cardFor(c: Consonant, v: Vowel): Card {
  const syl = composeSyllable(c, v)
  const w = WORDS[syl]
  if (w) {
    const i = Math.max(0, w.word.indexOf(syl))
    return {
      emoji: w.emoji,
      before: w.word.slice(0, i),
      syllable: syl,
      after: w.word.slice(i + syl.length),
      sound: wordSound(c, v),
      kind: 'word',
    }
  }
  const friend = FRIEND_FOR[syl] ?? FRIENDS[(c.cho * 21 + v.jung) % FRIENDS.length]
  return { emoji: friend, before: '', syllable: syl, after: '!', sound: syllableSound(c, v), kind: 'friend' }
}
