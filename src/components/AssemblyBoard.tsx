import { useEffect, useRef, useState } from 'react'
import { play } from '../audio'
import {
  ASSEMBLE_CONSONANTS,
  VOWELS,
  composeSyllable,
  consonantSound,
  syllableSound,
  vowelSound,
  type Consonant,
  type Vowel,
  type VowelLayout,
} from '../jamo'
import { successFeedback } from '../native'
import { cardFor, type Card } from '../words'
import { ResetIcon } from './Icons'
import { Syllable } from './JamoStrokes'
import { Tile } from './Tile'

/** After the syllable glyph appears, wait for the syllable sound before the word pops up. */
const WORD_DELAY_MS = 650

/** How long the consonant takes to slide between the side and stack positions. */
const MOVE_MS = 420

const POP: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.1)', offset: 0.45 },
  { transform: 'scale(1)' },
]

const WORD_POP: Keyframe[] = [
  { transform: 'scale(0.3) rotate(-8deg)', opacity: 0 },
  { transform: 'scale(1.08) rotate(2deg)', opacity: 1, offset: 0.6 },
  { transform: 'scale(1) rotate(0)', opacity: 1 },
]

const GLOW: Keyframe[] = [
  { boxShadow: '0 0 0 0 var(--color-card-shadow)' },
  { boxShadow: '0 0 0 28px transparent' },
]

/** P1: tap a consonant and a vowel; the frame rearranges and plays the syllable. Every combo is valid. */
export function AssemblyBoard() {
  const [cons, setCons] = useState<Consonant | null>(null)
  const [vowel, setVowel] = useState<Vowel | null>(null)
  const [composed, setComposed] = useState(false)
  // Bumped on every completion so tapping the same jamo again replays the celebration.
  const [round, setRound] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  const wordTimer = useRef<number | undefined>(undefined)
  const [card, setCard] = useState<Card | null>(null)
  const wordRef = useRef<HTMLButtonElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const glyphRef = useRef<SVGSVGElement>(null)

  const layout: VowelLayout = vowel?.layout ?? 'side'

  function place(nextCons: Consonant | null, nextVowel: Vowel | null) {
    window.clearTimeout(timer.current)
    window.clearTimeout(wordTimer.current)
    setCard(null)
    setComposed(false)
    setCons(nextCons)
    setVowel(nextVowel)

    if (nextCons && nextVowel) {
      play(syllableSound(nextCons, nextVowel))
      // Let the consonant finish sliding before celebrating.
      const moved = (vowel?.layout ?? 'side') !== nextVowel.layout
      timer.current = window.setTimeout(() => {
        setComposed(true)
        setRound((r) => r + 1)
        // Every syllable gets something: its picture word, or an animal friend saying it.
        const next = cardFor(nextCons, nextVowel)
        wordTimer.current = window.setTimeout(() => {
          setCard(next)
          play(next.sound)
        }, WORD_DELAY_MS)
      }, moved ? MOVE_MS : 160)
    } else if (nextCons) {
      play(consonantSound(nextCons))
    } else if (nextVowel) {
      play(vowelSound(nextVowel))
    }
  }

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(wordTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (card) wordRef.current?.animate(WORD_POP, { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1.25)' })
  }, [card])

  useEffect(() => {
    if (!composed) return
    successFeedback()
    glyphRef.current?.animate(POP, { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1.2)' })
    frameRef.current?.animate(GLOW, { duration: 480, easing: 'ease-out' })
  }, [composed, round])

  return (
    <div className="assembly flex h-full flex-col gap-[2.5vh] p-[2.5vh]">
      {/* Frame row: the reset button is attached to the frame's lower-left, the word card to its right. */}
      <div className="flex min-h-0 flex-1 items-stretch justify-center">
        <div className="frame-wrap flex min-w-0 flex-1 items-center justify-center">
          <div ref={frameRef} className="frame relative rounded-[8cqmin] bg-card">
            <div className="frame-reset">
              <Tile kind="control" onTap={() => place(null, null)} label="reset" className="size-(--tile)">
                <ResetIcon />
              </Tile>
            </div>
            {/* The syllable in two colors: consonant red + vowel blue. */}
            <svg
              ref={glyphRef}
              viewBox="0 0 100 100"
              className="syllable absolute inset-0 h-full w-full"
              role="img"
              aria-label={cons && vowel ? composeSyllable(cons, vowel) : (cons?.char ?? vowel?.char ?? '')}
            >
              <Syllable cons={cons?.char ?? null} vowel={vowel?.char ?? null} layout={layout} />
            </svg>
            {card && (
              <button
                ref={wordRef}
                type="button"
                className={`word-card ${card.kind === 'friend' ? 'is-friend' : ''}`}
                aria-label={card.before + card.syllable + card.after}
                onPointerDown={(e) => {
                  e.preventDefault()
                  play(card.sound)
                  wordRef.current?.animate(WORD_POP, { duration: 420 })
                }}
              >
                <span className="word-emoji">{card.emoji}</span>
                <span className="word-text">
                  {/* The syllable just built: ink, bold, underlined, wherever it sits in the word. */}
                  {card.before}
                  <b>{card.syllable}</b>
                  {card.after}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trays. Consonants not yet recorded are hidden, not greyed. */}
      <div className="trays flex flex-col items-center gap-[2vh]">
        <div className="tray">
          {ASSEMBLE_CONSONANTS.map((c) => (
            <Tile
              key={c.char}
              kind="consonant"
              selected={cons === c}
              onTap={() => place(c, vowel)}
              className="size-(--tile)"
            >
              {c.char}
            </Tile>
          ))}
        </div>
        {/* Two vowel rows: side-by-side vowels, then stacked vowels. */}
        {(['side', 'stack'] as const).map((row) => (
          <div key={row} className="tray">
            {VOWELS.filter((v) => v.layout === row).map((v) => (
              <Tile
                key={v.char}
                kind="vowel"
                selected={vowel === v}
                onTap={() => place(cons, v)}
                className="size-(--tile)"
              >
                {v.char}
              </Tile>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
