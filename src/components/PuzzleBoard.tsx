import { useEffect, useMemo, useRef, useState } from 'react'
import { chime, play } from '../audio'
import { confetti } from '../effects'
import { countWord } from '../daily'
import { decompose } from '../hangul'
import { CONSONANTS, VOWELS, composeSyllable, consonantSound, syllableSound, vowelSound, type Consonant, type Vowel } from '../jamo'
import { solvePuzzle, usePuzzle } from '../keepsakes'
import { celebrateFeedback, successFeedback, tapFeedback } from '../native'
import { PUZZLE_WORDS, puzzleSound } from '../puzzleWords'
import { layoutSyllable, strokePath } from '../strokes'
import { useTap } from '../touchGuard'
import { DailyMeter } from './Daily'
import { ArrowIcon, BookIcon } from './Icons'
import { Syllable } from './JamoStrokes'
import { StickerBook } from './Rewards'
import { Tile } from './Tile'

// The word puzzle: a picture and one box per syllable. The app says the word; the child builds
// each syllable from a consonant and a vowel (the box shows it faintly, so a child who can't
// read yet matches shapes and hears what they made). A finished word becomes a sticker.
// Nothing is wrong here: a syllable that doesn't fit is said out loud and steps aside, the part
// that was right stays, and after a miss the pieces that fit start to wiggle.

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

type Part = { cons: Consonant; vowel: Vowel; char: string }

function partsOf(word: string): Part[] {
  return [...word].map((char) => {
    const d = decompose(char)!
    return { cons: CONSONANTS.find((c) => c.char === d.cho)!, vowel: VOWELS.find((v) => v.char === d.jung)!, char }
  })
}

/** The pieces this word needs plus a few others, in the usual order (so position gives nothing away). */
function trayFor<T extends { char: string }>(all: T[], needed: T[], seed: number): T[] {
  const picked = new Set(needed)
  const rest = all.filter((x) => !picked.has(x))
  // Walk the others from a spot that differs per word; every step is a new piece, so this ends.
  for (let i = 0; i < rest.length && picked.size < TRAY; i++) picked.add(rest[(seed * 7 + i) % rest.length])
  return all.filter((x) => picked.has(x))
}

/**
 * The pieces picked so far, drawn where they will sit in this box's syllable. A consonant alone
 * is placed as it sits beside this box's vowel (and a vowel as it sits by this box's consonant),
 * so the right piece lands exactly on its faint guide instead of a little off it.
 */
function Picked({ cons, vowel, target }: { cons: Consonant | null; vowel: Vowel | null; target: Part }) {
  const v = vowel ?? target.vowel
  const placed = layoutSyllable((cons ?? target.cons).char, v.char, v.layout)
  return (
    <>
      {cons && placed.cons?.map((st, i) => <path key={`c${i}`} d={strokePath(st)} className="syl-stroke" style={{ stroke: 'var(--color-consonant)', strokeWidth: 8 }} />)}
      {vowel && placed.vowel?.map((st, i) => <path key={`v${i}`} d={strokePath(st)} className="syl-stroke" style={{ stroke: 'var(--color-vowel)', strokeWidth: 8 }} />)}
    </>
  )
}

export function PuzzleBoard() {
  const { solved } = usePuzzle()
  // Puzzles open one at a time: everything built so far, and the next one.
  const open = Math.min(solved.length, PUZZLE_WORDS.length - 1)
  const [index, setIndex] = useState(open)
  const [filled, setFilled] = useState(0)
  const [cons, setCons] = useState<Consonant | null>(null)
  const [vowel, setVowel] = useState<Vowel | null>(null)
  const [misses, setMisses] = useState(0)
  const [won, setWon] = useState(false)
  const [book, setBook] = useState(false)
  const timers = useRef<number[]>([])
  const slotRef = useRef<HTMLDivElement>(null)
  const prizeRef = useRef<HTMLButtonElement>(null)

  const item = PUZZLE_WORDS[index]
  const parts = useMemo(() => partsOf(item.word), [item.word])
  const done = filled >= parts.length
  const target = done ? null : parts[filled]
  const consTray = useMemo(() => trayFor(CONSONANTS, parts.map((p) => p.cons), index), [parts, index])
  const vowelTray = useMemo(() => trayFor(VOWELS, parts.map((p) => p.vowel), index + 3), [parts, index])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms))

  // A new puzzle: say its word.
  useEffect(() => {
    setFilled(0)
    setCons(null)
    setVowel(null)
    setMisses(0)
    setWon(false)
    play(puzzleSound(item.word))
    return clearTimers
  }, [item.word])

  const go = (d: number) => {
    const next = index + d
    if (next < 0 || next > open) return
    clearTimers()
    setIndex(next)
  }

  function place(c: Consonant | null, v: Vowel | null) {
    if (!target || won) return
    clearTimers()
    setCons(c)
    setVowel(v)
    if (!c || !v) {
      play(c ? consonantSound(c) : vowelSound(v!))
      return
    }
    // Both pieces: the child hears what they built, whatever it is.
    play(syllableSound(c, v))
    if (composeSyllable(c, v) === target.char) {
      later(() => {
        slotRef.current?.animate(POP, { duration: 320 })
        successFeedback()
        const next = filled + 1
        setFilled(next)
        setCons(null)
        setVowel(null)
        setMisses(0)
        if (next >= parts.length) finish()
      }, 520)
    } else {
      later(() => {
        slotRef.current?.animate(SHAKE, { duration: 380 })
        // The piece that fits stays; the other steps aside.
        setCons(c === target.cons ? c : null)
        setVowel(v === target.vowel ? v : null)
        setMisses((m) => m + 1)
      }, 750)
    }
  }

  function finish() {
    const firstTime = !solved.includes(item.word)
    later(() => {
      setWon(true)
      countWord()
      celebrateFeedback()
      play(puzzleSound(item.word))
      if (firstTime) {
        solvePuzzle(item.word)
        chime('fanfare')
        confetti(slotRef.current?.getBoundingClientRect())
      }
      requestAnimationFrame(() => prizeRef.current?.animate(PRIZE, { duration: 560, easing: 'cubic-bezier(.2,.8,.3,1.25)' }))
      if (index < PUZZLE_WORDS.length - 1) later(() => setIndex((i) => i + 1), AUTO_NEXT_MS)
    }, 650)
  }

  const tapBook = useTap(() => {
    tapFeedback()
    setBook(true)
  })

  // After a miss, the pieces that fit wiggle.
  const hint = misses > 0 && !!target
  const cells = parts.length + 1

  return (
    <div className="assembly puzzle flex h-full flex-col gap-[2.5vh] p-[2.5vh]" style={{ ['--cells' as string]: cells }}>
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
              play(puzzleSound(item.word))
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
                      <Syllable cons={p.cons.char} vowel={p.vowel.char} layout={p.vowel.layout} />
                    </g>
                  )}
                  {i < filled && <Syllable cons={p.cons.char} vowel={p.vowel.char} layout={p.vowel.layout} />}
                  {i === filled && (cons || vowel) && (
                    <g className="puzzle-pick">
                      <Picked cons={cons} vowel={vowel} target={p} />
                    </g>
                  )}
                </svg>
              </div>
            )
          })}
        </div>

        <Tile
          kind="control"
          onTap={() => go(1)}
          label="next word"
          className={`size-(--tile) puzzle-arrow ${index >= open ? 'is-off' : ''} ${won && index < open ? 'next-ready' : ''}`}
        >
          <ArrowIcon dir="right" />
        </Tile>
      </div>

      <div className="trays flex flex-col items-center gap-[2vh]">
        <div className="tray">
          {consTray.map((c) => (
            <Tile
              key={c.char}
              kind="consonant"
              selected={cons === c}
              onTap={() => place(c, vowel)}
              className={`size-(--tile) ${hint && target!.cons === c && cons !== c ? 'is-hint' : ''}`}
            >
              {c.char}
            </Tile>
          ))}
        </div>
        <div className="tray">
          {vowelTray.map((v) => (
            <Tile
              key={v.char}
              kind="vowel"
              selected={vowel === v}
              onTap={() => place(cons, v)}
              className={`size-(--tile) ${hint && target!.vowel === v && vowel !== v ? 'is-hint' : ''}`}
            >
              {v.char}
            </Tile>
          ))}
        </div>
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
