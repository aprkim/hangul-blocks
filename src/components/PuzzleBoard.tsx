import { useEffect, useMemo, useRef, useState } from 'react'
import { chime, play } from '../audio'
import { buddy } from '../buddy'
import { currentChild, useChildren, type Child } from '../children'
import { confetti } from '../effects'
import { countWord } from '../daily'
import { CHO, JONG, JUNG, compose, decompose, fullStrokes, type Parts } from '../hangul'
import { CONSONANTS, VOWELS, consonantSound, vowelSound } from '../jamo'
import { namePuzzleKey, solvePuzzle, usePuzzle } from '../keepsakes'
import { celebrateFeedback, successFeedback, tapFeedback } from '../native'
import { PUZZLE_WORDS, puzzleSound } from '../puzzleWords'
import { strokePath } from '../strokes'
import { useTap } from '../touchGuard'
import { DailyMeter } from './Daily'
import { ArrowIcon, BookIcon, PencilIcon } from './Icons'
import { sayName, syllableClip } from '../sayName'
import { StickerBook } from './Rewards'
import { Tile } from './Tile'

// The word puzzle: a picture and one box per syllable. The app says the word; the child builds
// each syllable from its pieces (the box shows it faintly, so a child who can't read yet
// matches shapes and hears what they made). A finished word becomes a sticker.
//
// The very first puzzle is the child's own name, with their animal as the picture: the first
// word they learn to read. A name can be any syllable, so the puzzle can build them all: a third
// row of pieces appears for a final consonant (김, 윤), and the pieces include whatever double
// consonants or compound vowels the name needs.
//
// Nothing is wrong here: a syllable that doesn't fit is said out loud and steps aside, the
// pieces that were right stay, and after a miss the pieces that fit start to wiggle.

const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.4 }, { transform: 'scale(1)' }]
const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-5%)', offset: 0.25 },
  { transform: 'translateX(5%)', offset: 0.6 },
  { transform: 'translateX(0)' },
]
const PRIZE: Keyframe[] = [
  { transform: 'scale(0.3) rotate(-10deg)', opacity: 0 },
  { transform: 'scale(1.15) rotate(3deg)', opacity: 1, offset: 0.6 },
  { transform: 'scale(1) rotate(0)', opacity: 1 },
]
/** After a word is built, the next puzzle comes by itself (unless the child touches the picture). */
const AUTO_NEXT_MS = 3800
const TRAY = 5
const COLOR = { consonant: 'var(--color-consonant)', vowel: 'var(--color-vowel)', final: 'var(--color-consonant)' } as const

type Part = Parts & { char: string }
type Item = { word: string; emoji: string; /** How it is remembered once built. */ key: string; /** The child's name. */ child?: Child }

const BASIC_CONS = CONSONANTS.map((c) => c.char)
const BASIC_VOWELS = VOWELS.map((v) => v.char)
/** Finals to mix in beside the ones a word needs: the common ones. */
const COMMON_FINALS = [...'ㄱㄴㄹㅁㅂㅅㅇ']

const partsOf = (word: string): Part[] => [...word].map((char) => ({ ...decompose(char)!, char }))

/** The pieces this word needs plus a few others, in dictionary order (so position gives nothing away). */
function trayFor(order: string[], needed: string[], others: string[], seed: number): string[] {
  const picked = new Set(needed)
  const rest = others.filter((x) => !picked.has(x))
  // Walk the others from a spot that differs per word; every step is a new piece, so this ends.
  for (let i = 0; i < rest.length && picked.size < TRAY; i++) picked.add(rest[(seed * 7 + i) % rest.length])
  return order.filter((x) => picked.has(x))
}

const pieceSound = (kind: 'cons' | 'vowel', char: string): string | null => {
  if (kind === 'cons') {
    const c = CONSONANTS.find((x) => x.char === char)
    return c ? consonantSound(c) : null
  }
  const v = VOWELS.find((x) => x.char === char)
  return v ? vowelSound(v) : null
}

/** The sound of a built syllable, when the app has one: the basic ones, or a family recording. */
/** A syllable's strokes in its box: every part in its color, or only some parts. */
function Glyph({ char, only }: { char: string; only?: { consonant: boolean; vowel: boolean; final: boolean } }) {
  return (
    <>
      {(fullStrokes(char) ?? [])
        .filter((s) => !only || only[s.part])
        .map((s, i) => (
          <path key={i} d={strokePath(s.stroke)} className="syl-stroke" style={{ stroke: COLOR[s.part], strokeWidth: 8 }} />
        ))}
    </>
  )
}

export function PuzzleBoard({ onWriteName }: { onWriteName: () => void }) {
  const { solved } = usePuzzle()
  const child = currentChild(useChildren())
  // My name first, then the words.
  const items = useMemo<Item[]>(
    () => [
      ...(child ? [{ word: child.name, emoji: child.animal, key: namePuzzleKey(child.name), child }] : []),
      ...PUZZLE_WORDS.map((w) => ({ ...w, key: w.word })),
    ],
    [child],
  )
  // Puzzles open one at a time: everything built so far, and the next one.
  const firstNew = items.findIndex((it) => !solved.includes(it.key))
  const open = firstNew < 0 ? items.length - 1 : firstNew
  const [index, setIndex] = useState(open)
  const [filled, setFilled] = useState(0)
  const [cons, setCons] = useState<string | null>(null)
  const [vowel, setVowel] = useState<string | null>(null)
  const [final, setFinal] = useState<string | null>(null)
  const [misses, setMisses] = useState(0)
  const [won, setWon] = useState(false)
  const [book, setBook] = useState(false)
  const timers = useRef<number[]>([])
  const slotRef = useRef<HTMLDivElement>(null)
  const prizeRef = useRef<HTMLButtonElement>(null)

  const item = items[Math.min(index, items.length - 1)]
  const parts = useMemo(() => partsOf(item.word), [item.word])
  const done = filled >= parts.length
  const target = done ? null : parts[filled]
  const consTray = useMemo(() => trayFor(CHO, parts.map((p) => p.cho), BASIC_CONS, index), [parts, index])
  const vowelTray = useMemo(() => trayFor(JUNG, parts.map((p) => p.jung), BASIC_VOWELS, index + 3), [parts, index])
  const finalTray = useMemo(() => trayFor(JONG, parts.map((p) => p.jong).filter(Boolean), COMMON_FINALS, index + 5), [parts, index])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms))

  /** Say the whole word: its recording, or for a name nobody recorded, the syllables it has sounds for. */
  function sayWord() {
    if (!item.child) return play(puzzleSound(item.word))
    sayName(item.child)
  }

  // A new puzzle: say its word.
  useEffect(() => {
    setFilled(0)
    setCons(null)
    setVowel(null)
    setFinal(null)
    setMisses(0)
    setWon(false)
    sayWord()
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.key])

  const go = (d: number) => {
    const next = index + d
    if (next < 0 || next > open) return
    clearTimers()
    setIndex(next)
  }

  function place(kind: 'cons' | 'vowel' | 'final', char: string) {
    if (!target || won) return
    clearTimers()
    const c = kind === 'cons' ? char : cons
    const v = kind === 'vowel' ? char : vowel
    const f = kind === 'final' ? char : final
    setCons(c)
    setVowel(v)
    setFinal(f)
    const complete = !!c && !!v && (!target.jong || !!f)
    if (!complete) {
      const clip = kind === 'final' ? null : pieceSound(kind, char)
      if (clip) play(clip)
      return
    }
    // Every piece is in: the child hears what they built, whatever it is.
    const built = compose(c!, v!, target.jong ? f! : '')
    const clip = syllableClip(built)
    if (clip) play(clip)
    if (built === target.char) {
      later(() => {
        slotRef.current?.animate(POP, { duration: 320 })
        successFeedback()
        buddy('yay')
        const next = filled + 1
        setFilled(next)
        setCons(null)
        setVowel(null)
        setFinal(null)
        setMisses(0)
        if (next >= parts.length) finish()
      }, 520)
    } else {
      later(() => {
        slotRef.current?.animate(SHAKE, { duration: 380 })
        buddy('hmm')
        // The pieces that fit stay; the others step aside.
        setCons(c === target.cho ? c : null)
        setVowel(v === target.jung ? v : null)
        setFinal(f === target.jong ? f : null)
        setMisses((m) => m + 1)
      }, 750)
    }
  }

  function finish() {
    const firstTime = !solved.includes(item.key)
    later(() => {
      setWon(true)
      buddy('yay')
      countWord()
      celebrateFeedback()
      sayWord()
      if (firstTime) {
        solvePuzzle(item.key)
        chime('fanfare')
        confetti(slotRef.current?.getBoundingClientRect())
      }
      requestAnimationFrame(() => prizeRef.current?.animate(PRIZE, { duration: 560, easing: 'cubic-bezier(.2,.8,.3,1.25)' }))
      // After my name, the pencil invites writing it; other words move on by themselves.
      if (!item.child && index < items.length - 1) later(() => setIndex((i) => i + 1), AUTO_NEXT_MS)
    }, 650)
  }

  const tapBook = useTap(() => {
    tapFeedback()
    setBook(true)
  })
  const tapWrite = useTap(() => {
    tapFeedback()
    onWriteName()
  })

  // After a miss, the pieces that fit wiggle.
  const hint = misses > 0 && !!target
  const cells = parts.length + 1
  const tile = (kind: 'cons' | 'vowel' | 'final', char: string, picked: string | null, want: string | undefined) => (
    <Tile
      key={char}
      kind={kind === 'vowel' ? 'vowel' : 'consonant'}
      selected={picked === char}
      onTap={() => place(kind, char)}
      className={`size-(--tile) ${hint && want === char && picked !== char ? 'is-hint' : ''}`}
    >
      {char}
    </Tile>
  )

  return (
    <div
      className={`assembly puzzle flex h-full flex-col gap-[2.5vh] p-[2.5vh] ${target?.jong ? 'has-final' : ''}`}
      style={{ ['--cells' as string]: cells }}
    >
      <div className="puzzle-top flex min-h-0 flex-1 items-center justify-center">
        <Tile kind="control" onTap={() => go(-1)} label="previous word" className={`size-(--tile) puzzle-arrow ${index === 0 ? 'is-off' : ''}`}>
          <ArrowIcon dir="left" />
        </Tile>

        <div className="puzzle-row">
          {/* The picture: tap to hear the word again. Once built, it is the sticker. */}
          <button
            ref={prizeRef}
            type="button"
            aria-label={item.word}
            className={`puzzle-pic ${won ? 'is-won' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault()
              clearTimers() // staying here: no moving on by itself
              tapFeedback()
              sayWord()
              prizeRef.current?.animate(POP, { duration: 320 })
            }}
          >
            <span>{item.emoji}</span>
          </button>

          {parts.map((p, i) => {
            const state = i < filled ? 'is-done' : i === filled ? 'is-now' : ''
            return (
              <div key={i} ref={i === filled ? slotRef : undefined} className={`puzzle-slot ${state}`} aria-label={i < filled ? p.char : 'empty'}>
                <svg viewBox="0 0 100 100" className="syllable h-full w-full">
                  {/* The syllable to build, faintly. */}
                  {i >= filled && (
                    <g className="puzzle-guide">
                      <Glyph char={p.char} />
                    </g>
                  )}
                  {i < filled && <Glyph char={p.char} />}
                  {/* The pieces picked so far, each where it sits in the syllable being built
                      (so the right piece lands exactly on its faint guide). */}
                  {i === filled && (cons || vowel || final) && (
                    <g className="puzzle-pick">
                      <Glyph
                        char={compose(cons ?? p.cho, vowel ?? p.jung, p.jong ? (final ?? p.jong) : '')}
                        only={{ consonant: !!cons, vowel: !!vowel, final: !!final }}
                      />
                    </g>
                  )}
                </svg>
              </div>
            )
          })}
        </div>

        {won && item.child ? (
          /* My name is built: now write it. */
          <button type="button" aria-label="write my name" className="tile puzzle-write size-(--tile) next-ready" {...tapWrite}>
            <PencilIcon />
          </button>
        ) : (
          <Tile
            kind="control"
            onTap={() => go(1)}
            label="next word"
            className={`size-(--tile) puzzle-arrow ${index >= open ? 'is-off' : ''} ${won && index < open ? 'next-ready' : ''}`}
          >
            <ArrowIcon dir="right" />
          </Tile>
        )}
      </div>

      <div className="trays flex flex-col items-center gap-[2vh]">
        <div className="tray">{consTray.map((c) => tile('cons', c, cons, target?.cho))}</div>
        <div className="tray">{vowelTray.map((v) => tile('vowel', v, vowel, target?.jung))}</div>
        {/* A third row while the syllable being built ends in a consonant (김, 윤). */}
        {target?.jong && <div className="tray tray-final">{finalTray.map((f) => tile('final', f, final, target.jong))}</div>}
      </div>

      <DailyMeter />
      {/* The sticker book and play scenes, where built words go. */}
      <button type="button" aria-label="stickers" className="puzzle-book" {...tapBook}>
        <BookIcon />
      </button>
      {book && <StickerBook onClose={() => setBook(false)} />}
    </div>
  )
}
