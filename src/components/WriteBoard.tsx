import { useEffect, useRef, useState } from 'react'
import { chime, play } from '../audio'
import { confetti, flyStar } from '../effects'
import { CONSONANTS, VOWELS, consonantSound, syllableSound, vowelSound } from '../jamo'
import { successFeedback, tapFeedback } from '../native'
import {
  JAMO_CHARS,
  SYLLABLES,
  addStar,
  allJamoWritten,
  openSyllables,
  timesWritten,
  useProgress,
  type Progress,
} from '../progress'
import { STROKES, strokePath, syllableStrokes, traceMatches, type Pt, type Stroke } from '../strokes'
import { cardFor, type Card } from '../words'
import { ArrowIcon, GiftIcon, MapIcon, StarShape } from './Icons'
import { Syllable } from './JamoStrokes'
import { GiftReveal, StarJar, StickerBook } from './Rewards'
import { Tile } from './Tile'

// The Write tab: a road of letters (jamo first; a gift box holds the syllables until every jamo
// has been written once). Tapping a stop opens tracing: the letter appears as a pale guide, the
// next stroke shows where to start and which way to go, and following it fills it in. There is
// no wrong answer: a trace that misses simply fades and the guide shows the stroke again.
// Every letter written to the end drops a star into the jar.

type Part = 'consonant' | 'vowel'
type Target = {
  char: string
  group: 'jamo' | 'syllable'
  strokes: { stroke: Stroke; part: Part }[]
  sound: string
  /** Syllables only: the picture word (or animal friend) that becomes its sticker. */
  card?: Card
}

const JAMO: Target[] = [
  ...CONSONANTS.map((c) => ({
    char: c.char,
    group: 'jamo' as const,
    strokes: STROKES[c.char].map((stroke) => ({ stroke, part: 'consonant' as Part })),
    sound: consonantSound(c),
  })),
  ...VOWELS.map((v) => ({
    char: v.char,
    group: 'jamo' as const,
    strokes: STROKES[v.char].map((stroke) => ({ stroke, part: 'vowel' as Part })),
    sound: vowelSound(v),
  })),
]

const SYLS: Target[] = SYLLABLES.map(({ char, cons, vowel }) => ({
  char,
  group: 'syllable',
  strokes: syllableStrokes(cons.char, vowel.char, vowel.layout),
  sound: syllableSound(cons, vowel),
  card: cardFor(cons, vowel),
}))

const COLOR: Record<Part, string> = { consonant: 'var(--color-consonant)', vowel: 'var(--color-vowel)' }

const POP: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.08)', offset: 0.4 },
  { transform: 'scale(1)' },
]
const WORD_POP: Keyframe[] = [
  { transform: 'scale(0.3) rotate(-8deg)', opacity: 0 },
  { transform: 'scale(1.08) rotate(2deg)', opacity: 1, offset: 0.6 },
  { transform: 'scale(1) rotate(0)', opacity: 1 },
]
const WIGGLE: Keyframe[] = [
  { transform: 'rotate(0)' },
  { transform: 'rotate(-6deg)', offset: 0.25 },
  { transform: 'rotate(5deg)', offset: 0.6 },
  { transform: 'rotate(0)' },
]

type View = { group: 'jamo' | 'syllable'; index: number }

export function WriteBoard() {
  const [view, setView] = useState<View | null>(null)
  const [lastChar, setLastChar] = useState<string | null>(null)
  const [book, setBook] = useState(false)

  const list = view?.group === 'syllable' ? SYLS : JAMO
  const target = view ? list[view.index] : null

  return (
    <>
      {target && view ? (
        <Tracer
          key={target.char}
          target={target}
          onNav={(d) => setView({ ...view, index: (view.index + d + list.length) % list.length })}
          onBack={() => {
            setLastChar(target.char)
            setView(null)
          }}
        />
      ) : (
        <Road
          focus={lastChar}
          onPick={(group, index) => {
            tapFeedback()
            setView({ group, index })
          }}
        />
      )}
      <StarJar onOpen={() => setBook(true)} />
      {book && <StickerBook onClose={() => setBook(false)} />}
      <GiftReveal />
    </>
  )
}

// ---------- the road ----------

function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n))
  return out
}

const NARROW = '(max-width: 700px)'
function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches)
  useEffect(() => {
    const mq = window.matchMedia(NARROW)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

function Road({ focus, onPick }: { focus: string | null; onPick: (g: View['group'], i: number) => void }) {
  const p = useProgress()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Coming back from a letter: keep it in view.
  useEffect(() => {
    if (!focus) return
    scrollRef.current?.querySelector(`[data-char="${focus}"]`)?.scrollIntoView({ block: 'center' })
  }, [focus])

  const narrow = useNarrow()
  const consonants = JAMO.slice(0, CONSONANTS.length)
  const vowels = JAMO.slice(CONSONANTS.length)

  const row = (targets: Target[], group: View['group'], offset: number, key: string) => (
    <div className="road-row" key={key}>
      {targets.map((t, i) => (
        <RoadStop key={t.char} target={t} done={timesWritten(p, t.char) > 0} onPick={() => onPick(group, offset + i)} />
      ))}
    </div>
  )

  return (
    <div ref={scrollRef} className="write-road" data-scroll>
      <div className="road-inner">
        {chunk(consonants, narrow ? 5 : 7).map((ts, r, a) => row(ts, 'jamo', r * a[0].length, `c${r}`))}
        {chunk(vowels, narrow ? 5 : VOWELS.length).map((ts, r, a) => row(ts, 'jamo', CONSONANTS.length + r * a[0].length, `v${r}`))}
        {p.syllablesOpen ? (
          chunk(SYLS, narrow ? 5 : VOWELS.length).map((ts, r, a) => row(ts, 'syllable', r * a[0].length, `s${r}`))
        ) : (
          <SyllableGift p={p} />
        )}
      </div>
    </div>
  )
}

function RoadStop({ target, done, onPick }: { target: Target; done: boolean; onPick: () => void }) {
  const kind = target.group === 'syllable' ? 'syllable' : target.strokes[0].part
  const syl = SYLLABLES.find((s) => s.char === target.char)
  return (
    <button
      type="button"
      data-char={target.char}
      aria-label={target.char}
      className={`road-stop is-${kind} ${done ? 'is-done' : ''}`}
      onClick={onPick}
    >
      {syl ? (
        <svg viewBox="0 0 100 100" className="road-syl" aria-hidden>
          <Syllable cons={syl.cons.char} vowel={syl.vowel.char} layout={syl.vowel.layout} />
        </svg>
      ) : (
        <span className="road-glyph">{target.char}</span>
      )}
      {done && (
        <span className="road-star">
          <StarShape />
        </span>
      )}
    </button>
  )
}

/** The syllables wait in a gift box. Dots below fill in as jamo are written; when all 24 are, the box wiggles. */
function SyllableGift({ p }: { p: Progress }) {
  const ready = allJamoWritten(p)
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <div className="road-gift">
      <button
        ref={ref}
        type="button"
        aria-label="syllables"
        className={`road-gift-box ${ready ? 'is-ready' : ''}`}
        onClick={() => {
          if (!ready) {
            chime('soft')
            ref.current?.animate(WIGGLE, { duration: 420 })
            return
          }
          successFeedback()
          chime('fanfare')
          confetti(ref.current?.getBoundingClientRect())
          openSyllables()
          window.setTimeout(() => {
            document.querySelector(`[data-char="${SYLS[0].char}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 120)
        }}
      >
        <GiftIcon />
      </button>
      <div className="road-dots" aria-hidden>
        {JAMO_CHARS.map((c, i) => (
          <i
            key={c}
            className={timesWritten(p, c) > 0 ? (i < CONSONANTS.length ? 'is-consonant' : 'is-vowel') : ''}
          />
        ))}
      </div>
    </div>
  )
}

// ---------- tracing ----------

function Tracer({ target, onNav, onBack }: { target: Target; onNav: (d: number) => void; onBack: () => void }) {
  const [done, setDone] = useState(0) // strokes finished
  const [ink, setInk] = useState<Pt[]>([])
  const [miss, setMiss] = useState(0) // bumps to restart the guide animation after a miss
  const [card, setCard] = useState<Card | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const stickerRef = useRef<HTMLButtonElement>(null)
  const drawing = useRef<{ id: number; pts: Pt[] } | null>(null)
  const timers = useRef<number[]>([])

  const strokes = target.strokes
  const complete = done >= strokes.length
  const isSyl = target.group === 'syllable'

  // Say the letter's sound when it appears.
  useEffect(() => {
    play(target.sound)
    const ts = timers.current
    return () => ts.forEach((t) => window.clearTimeout(t))
  }, [target.sound])

  useEffect(() => {
    if (card) stickerRef.current?.animate(WORD_POP, { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1.25)' })
  }, [card])

  function restart() {
    setDone(0)
    setInk([])
    setCard(null)
    drawing.current = null
    play(target.sound)
  }

  function toGrid(e: React.PointerEvent): Pt {
    const r = svgRef.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]
  }

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    e.preventDefault()
    if (drawing.current) return // ignore a second finger
    if (complete) {
      // Tapping a finished letter: write it again (another star to earn).
      restart()
      cardRef.current?.animate(POP, { duration: 360 })
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toGrid(e)
    drawing.current = { id: e.pointerId, pts: [p] }
    setInk([p])
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    const p = toGrid(e)
    const last = d.pts[d.pts.length - 1]
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.8) return
    d.pts.push(p)
    setInk([...d.pts])
  }

  function finish() {
    play(target.sound)
    successFeedback()
    cardRef.current?.animate(POP, { duration: 480, easing: 'cubic-bezier(.2,.8,.3,1.2)' })
    const rect = cardRef.current?.getBoundingClientRect()
    const char = target.char
    if (rect) flyStar(rect, () => addStar(char))
    else addStar(char)
    const sticker = target.card
    if (sticker) {
      // The syllable's picture word pops out and goes in the sticker book.
      timers.current.push(
        window.setTimeout(() => {
          setCard(sticker)
          play(sticker.sound)
        }, 750),
      )
    }
  }

  function onUp(e: React.PointerEvent<SVGSVGElement>) {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    drawing.current = null
    setInk([])
    if (traceMatches(strokes[done].stroke, d.pts)) {
      const next = done + 1
      setDone(next)
      if (next >= strokes.length) finish()
      else tapFeedback()
    } else {
      setMiss((m) => m + 1) // no "wrong": just show the stroke again
    }
  }

  const current = complete ? null : strokes[done]

  return (
    <div className="write-trace flex h-full items-center justify-between gap-[2vh] p-[2.5vh]">
      <button
        type="button"
        aria-label="letters"
        className="write-back"
        onPointerDown={(e) => {
          e.preventDefault()
          tapFeedback()
          onBack()
        }}
      >
        <MapIcon />
      </button>

      <Tile kind="control" onTap={() => onNav(-1)} label="previous" className="size-(--tile)">
        <ArrowIcon dir="left" />
      </Tile>

      <div className="write-wrap flex h-full min-w-0 flex-1 items-center justify-center">
        <div
          ref={cardRef}
          className={`write-card relative rounded-[8cqmin] bg-card ${complete ? 'is-complete' : ''} ${isSyl ? 'is-syllable' : ''}`}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            className="absolute inset-[6%] h-[88%] w-[88%] touch-none"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-label={target.char}
          >
            {/* Pale guide of the whole letter */}
            {strokes.map((s, i) => (
              <path key={`g${i}`} d={strokePath(s.stroke)} className="stroke-guide" />
            ))}
            {/* Finished strokes, in color */}
            {strokes.slice(0, done).map((s, i) => (
              <path key={`d${i}`} d={strokePath(s.stroke)} className="stroke-done" style={{ stroke: COLOR[s.part] }} />
            ))}
            {/* The stroke to write now: drawn along its direction, with a start dot */}
            {current && (
              <g key={`c${done}-${miss}`}>
                <path d={strokePath(current.stroke)} className="stroke-demo" pathLength={100} />
                <circle
                  cx={current.stroke[0][0]}
                  cy={current.stroke[0][1]}
                  r={isSyl ? 5 : 6.5}
                  className="stroke-start"
                  style={{ fill: COLOR[current.part] }}
                />
              </g>
            )}
            {/* The finger's trail */}
            {ink.length > 1 && (
              <path d={strokePath(ink)} className="stroke-ink" style={{ stroke: COLOR[current?.part ?? 'consonant'] }} />
            )}
          </svg>
          {card && (
            <button
              ref={stickerRef}
              type="button"
              className={`word-card write-sticker ${card.kind === 'friend' ? 'is-friend' : ''}`}
              aria-label={card.before + card.syllable + card.after}
              onPointerDown={(e) => {
                e.preventDefault()
                play(card.sound)
                stickerRef.current?.animate(WORD_POP, { duration: 420 })
              }}
            >
              <span className="word-emoji">{card.emoji}</span>
              <span className="word-text">
                {card.before}
                <b>{card.syllable}</b>
                {card.after}
              </span>
            </button>
          )}
        </div>
      </div>

      <Tile kind="control" onTap={() => onNav(1)} label="next" className={`size-(--tile) ${complete ? 'next-ready' : ''}`}>
        <ArrowIcon dir="right" />
      </Tile>
    </div>
  )
}
