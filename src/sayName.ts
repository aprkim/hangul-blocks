import { hasSound, play, playSequence } from './audio'
import { nameSound, type Child } from './children'
import { decompose, isBasicSyllable, nameSyllableSound } from './hangul'
import { CONSONANTS, VOWELS, syllableSound } from './jamo'

// A child's name out loud, wherever it appears (name puzzle, name card, fridge, picker).
// The family's recording of the whole name if there is one; otherwise the app reads it syllable
// by syllable from its own sounds (리, 하), plus any syllables the family recorded (김, 윤).
// So a name is never silent just because nobody has recorded it yet.

/** The sound for one syllable of a name, or null if the app has none yet. */
export function syllableClip(char: string): string | null {
  if (isBasicSyllable(char)) {
    const d = decompose(char)!
    return syllableSound(CONSONANTS.find((c) => c.char === d.cho)!, VOWELS.find((v) => v.char === d.jung)!)
  }
  return hasSound(nameSyllableSound(char)) ? nameSyllableSound(char) : null
}

/** Says the name. Returns false when there is nothing to say (no recording, no syllable sounds). */
export function sayName(child: Child): boolean {
  if (hasSound(nameSound(child))) {
    play(nameSound(child))
    return true
  }
  const clips = [...child.name].map(syllableClip).filter((c): c is string => !!c)
  if (!clips.length) return false
  playSequence(clips)
  return true
}
