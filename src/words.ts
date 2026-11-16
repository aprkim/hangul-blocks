// Picture words: when an assembled syllable starts a word a 4–6-year-old knows, the word
// pops up with a picture and is spoken. Syllables with no good word simply show none:
// every combination still plays its sound.
//
// Audio: w-{consonant}{vowel}.mp3 in public/audio/ (or recorded in the app), e.g. 가방 -> w-ga.mp3.

import { hasSound } from './audio'
import {
  CONSONANTS,
  VOWELS,
  composeSyllable,
  type Consonant,
  type RecordGroup,
  type Vowel,
  syllableSound,
} from './jamo'
import { t } from './i18n'

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

/**
 * Words for the later sets (ㄷㄹㅅㅇ, ㅈㅊㅋ, ㅌㅍㅎ). They have no bundled audio yet: a parent records
 * them on the recording page (5차). Until a word has a sound, its syllable shows an animal friend
 * instead, so nothing ever pops up silently.
 */
export const MORE_WORDS: Record<string, Word> = {
  다: { word: '다람쥐', emoji: '🐿️' },
  더: { word: '더하기', emoji: '➕' },
  도: { word: '도토리', emoji: '🌰' },
  드: { word: '드럼', emoji: '🥁' },
  라: { word: '라면', emoji: '🍜' },
  로: { word: '로봇', emoji: '🤖' },
  루: { word: '루돌프', emoji: '🦌' },
  리: { word: '리본', emoji: '🎀' },
  사: { word: '사과', emoji: '🍎' },
  샤: { word: '샤워', emoji: '🚿' },
  서: { word: '서커스', emoji: '🎪' },
  셔: { word: '셔츠', emoji: '👔' },
  소: { word: '소', emoji: '🐄' },
  쇼: { word: '쇼핑', emoji: '🛍️' },
  수: { word: '수영', emoji: '🏊' },
  슈: { word: '슈퍼맨', emoji: '🦸' },
  스: { word: '스키', emoji: '⛷️' },
  시: { word: '시계', emoji: '⏰' },
  아: { word: '아기', emoji: '👶' },
  야: { word: '야구', emoji: '⚾' },
  어: { word: '어머니', emoji: '👩' },
  여: { word: '여우', emoji: '🦊' },
  오: { word: '오리', emoji: '🦆' },
  요: { word: '요요', emoji: '🪀' },
  우: { word: '우유', emoji: '🥛' },
  유: { word: '유령', emoji: '👻' },
  이: { word: '이빨', emoji: '🦷' },
  자: { word: '자동차', emoji: '🚗' },
  저: { word: '저울', emoji: '⚖️' },
  조: { word: '조개', emoji: '🐚' },
  주: { word: '주스', emoji: '🧃' },
  지: { word: '지구', emoji: '🌍' },
  차: { word: '차', emoji: '🚙' },
  초: { word: '초콜릿', emoji: '🍫' },
  치: { word: '치즈', emoji: '🧀' },
  카: { word: '카메라', emoji: '📷' },
  커: { word: '커피', emoji: '☕' },
  코: { word: '코끼리', emoji: '🐘' },
  쿠: { word: '쿠키', emoji: '🍪' },
  크: { word: '크레파스', emoji: '🖍️' },
  키: { word: '키위', emoji: '🥝' },
  타: { word: '타이어', emoji: '🛞' },
  토: { word: '토마토', emoji: '🍅' },
  튜: { word: '튜브', emoji: '🛟' },
  트: { word: '트럭', emoji: '🚚' },
  티: { word: '티셔츠', emoji: '👕' },
  파: { word: '파도', emoji: '🌊' },
  퍼: { word: '퍼즐', emoji: '🧩' },
  포: { word: '포도', emoji: '🍇' },
  표: { word: '표범', emoji: '🐆' },
  푸: { word: '푸딩', emoji: '🍮' },
  프: { word: '프라이팬', emoji: '🍳' },
  피: { word: '피자', emoji: '🍕' },
  하: { word: '하마', emoji: '🦛' },
  혀: { word: '혀', emoji: '👅' },
  호: { word: '호박', emoji: '🎃' },
  휴: { word: '휴지', emoji: '🧻' },
}

export const wordSound = (c: Consonant, v: Vowel) => `w-${c.roman}${v.roman}`

/** The word to show for a syllable right now: bundled words always, later words once they have a sound. */
export function wordFor(c: Consonant, v: Vowel): Word | undefined {
  const syl = composeSyllable(c, v)
  return WORDS[syl] ?? (hasSound(wordSound(c, v)) ? MORE_WORDS[syl] : undefined)
}

const each = <T,>(words: Record<string, Word>, f: (c: Consonant, v: Vowel, w: Word) => T): T[] =>
  CONSONANTS.flatMap((c) =>
    VOWELS.flatMap((v) => {
      const w = words[composeSyllable(c, v)]
      return w ? [f(c, v, w)] : []
    }),
  )

/** Every word sound, bundled or still to be recorded (the player skips files that are missing). */
export function wordSoundNames(): string[] {
  return [...each(WORDS, wordSound), ...each(MORE_WORDS, wordSound)]
}

const recordItem = (c: Consonant, v: Vowel, w: Word) => ({ name: wordSound(c, v), shown: w.word, say: w.word })

/** Recording script for the words: the bundled ones (4차) and the later sets' words (5차). */
export const WORD_RECORD_GROUP: RecordGroup = {
  id: 'words',
  label: t('4차 · 그림 단어', '4 · Picture words'),
  items: each(WORDS, recordItem),
}
export const MORE_WORD_RECORD_GROUP: RecordGroup = {
  id: 'words-more',
  label: t('5차 · 새 그림 단어', '5 · New picture words'),
  items: each(MORE_WORDS, recordItem),
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
  const w = wordFor(c, v)
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
