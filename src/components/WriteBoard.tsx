import { useEffect, useRef, useState } from 'react'
import { chime, hasSound, play } from '../audio'
import { sayName } from '../sayName'
import { buddy } from '../buddy'
import { currentChild, useChildren, type Child } from '../children'
import { fullStrokes, nameSyllableSound } from '../hangul'
import { confetti, flyStar } from '../effects'
import { CHART_VOWELS, CONSONANTS, SET_COUNT, VOWELS, consonantSound, syllableSound, vowelSound, type Consonant, type Vowel } from '../jamo'
import { celebrateFeedback, tapFeedback } from '../native'
import {
  JAMO_CHARS,
  SET_GOAL,
  SYLLABLES,
  addStar,
  allJamoWritten,
  nextSetReady,
  openNextSet,
  openSyllables,
  reachableSyllables,
  timesWritten,
  useProgress,
  writtenInSet,
} from '../progress'
import { STROKES, strokePath, syllableStrokes, traceMatches, type Pt, type Stroke } from '../strokes'
import { recordWriting } from '../keepsakes'
import { setWriting, useTap } from '../touchGuard'
import { cardFor, type Card } from '../words'
import { DailyMeter } from './Daily'
import { ArrowIcon, GiftIcon, MapIcon, StarShape } from './Icons'
import { Syllable } from './JamoStrokes'
import { GiftReveal, StarJar, StickerBook } from './Rewards'
import { Tile } from './Tile'

// The Write tab: a road of letters (jamo first; a gift box holds the syllables until every jamo
// has been written once). Tapping a stop opens tracing: the letter appears as a pale guide, the
// next stroke shows where to start and which way to go, and following it fills it in. There is
// no wrong answer: a trace that misses simply fades and the guide shows the stroke again.
// Every letter written to the end drops a star into the jar.

type Part = 'consonant' | 'vowel' | 'final'
type Target = {
  char: string
  group: 'jamo' | 'syllable' | 'name'
  strokes: { stroke: Stroke; part: Part }[]
  sound: string
  /** Syllables only: its parts. Its sticker is the picture word (or animal friend) they make. */
  syl?: { cons: Consonant; vowel: Vowel }
  /** Name syllables only: whose name, and whether this is its last syllable. */
  name?: { child: Child; last: boolean }
}

const JAMO: Target[] = [
  ...CONSONANTS.map((c) => ({
    char: c.char,
    group: 'jamo' as const,
    strokes: STROKES[c.char].map((stroke) => ({ stroke, part: 'consonant' as Part })),
    sound: consonantSound(c),
  })),
  ...CHART_VOWELS.map((v) => ({
    char: v.char,
    group: 'jamo' as const,
    strokes: STROKES[v.char].map((stroke) => ({ stroke, part: 'vowel' as Part })),
    sound: vowelSound(v),
  })),
]

/**
 * All syllables, set by set (SYLLABLES is sorted that way), so the open ones are a prefix.
 * A syllable's strokes are worked out the first time they are needed: laying out all 140 as the
 * app starts held up the first screen (seconds on an older tablet).
 */
const SYLS: Target[] = SYLLABLES.map(({ char, cons, vowel }) => {
  let strokes: Target['strokes'] | null = null
  return {
    char,
    group: 'syllable',
    get strokes() {
      return (strokes ??= syllableStrokes(cons.char, vowel.char, vowel.layout))
    },
    sound: syllableSound(cons, vowel),
    syl: { cons, vowel },
  }
})

const COLOR: Record<Part, string> = { consonant: 'var(--color-consonant)', vowel: 'var(--color-vowel)', final: 'var(--color-consonant)' }

/**
 * The child's own name, one syllable per stop, always open (it's theirs). Any syllable can be
 * written (김, 윤, 예...); a basic one says its sound, and the last one says the whole name in
 * the family's voice when it was recorded.
 */
function nameTargets(child: Child | null): Target[] {
  if (!child) return []
  const chars = [...child.name]
  return chars.map((char, i) => {
    const syl = SYLS.find((t) => t.char === char)
    return {
      char,
      group: 'name' as const,
      strokes: fullStrokes(char) ?? [],
      // Basic syllables have their own sound; others (김, 윤) are heard once the family records them.
      sound: syl?.sound ?? nameSyllableSound(char),
      name: { child, last: i === chars.length - 1 },
    }
  })
}

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

type View = { group: 'jamo' | 'syllable' | 'name'; index: number }

/** `startName`: open straight on the first letter of the child's name (from the name puzzle). */
export function WriteBoard({ startName = false }: { startName?: boolean }) {
  const [view, setView] = useState<View | null>(() => (startName && currentChild() ? { group: 'name', index: 0 } : null))
  const [lastChar, setLastChar] = useState<string | null>(null)
  const [book, setBook] = useState(false)

  const p = useProgress()
  const child = currentChild(useChildren())
  const names = nameTargets(child)
  // Arrows move within what is open: the name, the jamo, or the syllables of the open sets.
  const list = view?.group === 'name' ? names : view?.group === 'syllable' ? SYLS.slice(0, reachableSyllables(p).length) : JAMO
  const target = view ? list[view.index] : null

  return (
    <>
      {target && view ? (
        <Tracer
          key={`${view.group}${target.char}`}
          target={target}
          // Not past the end of what is open (the arrow would wrap around to the start).
          autoNext={view.index < list.length - 1}
          hold={book}
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
  const child = currentChild(useChildren())
  const names = nameTargets(child)
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
      <DailyMeter />
      <div className="road-inner">
        {/* My name first: the child's animal, then their name to write. */}
        {child && names.length > 0 && (
          <div className="road-row road-name" key="name">
            <span className="road-name-animal" aria-hidden>
              {child.animal}
            </span>
            {names.map((t, i) => (
              <RoadStop key={`n${i}`} target={t} done={timesWritten(p, t.char) > 0} onPick={() => onPick('name', i)} />
            ))}
          </div>
        )}
        {chunk(consonants, narrow ? 5 : 7).map((ts, r, a) => row(ts, 'jamo', r * a[0].length, `c${r}`))}
        {chunk(vowels, narrow ? 5 : VOWELS.length).map((ts, r, a) => row(ts, 'jamo', CONSONANTS.length + r * a[0].length, `v${r}`))}
        {p.syllablesOpen ? (
          <>
            {chunk(SYLS.slice(0, reachableSyllables(p).length), narrow ? 5 : VOWELS.length).map((ts, r, a) =>
              row(ts, 'syllable', r * a[0].length, `s${r}`),
            )}
            {/* The next set of consonants waits in its own gift box: one dot per syllable written, 20 to open. */}
            {p.setsOpen < SET_COUNT && (
              <GiftGate
                key={p.setsOpen}
                ready={nextSetReady(p)}
                dots={Array.from({ length: SET_GOAL }, (_, i) => (i < writtenInSet(p, p.setsOpen) ? 'is-star' : ''))}
                onOpen={() => {
                  const first = SYLS[reachableSyllables(p).length]?.char
                  openNextSet()
                  return first
                }}
              />
            )}
          </>
        ) : (
          /* The syllables wait in a gift box: one dot per jamo written, all 24 to open. */
          <GiftGate
            ready={allJamoWritten(p)}
            dots={JAMO_CHARS.map((c, i) => (timesWritten(p, c) > 0 ? (i < CONSONANTS.length ? 'is-consonant' : 'is-vowel') : ''))}
            onOpen={() => {
              openSyllables()
              return SYLS[0].char
            }}
          />
        )}
      </div>
    </div>
  )
}

function RoadStop({ target, done, onPick }: { target: Target; done: boolean; onPick: () => void }) {
  const kind = target.group === 'name' ? 'name' : target.group === 'syllable' ? 'syllable' : target.strokes[0].part
  const syl = target.group === 'name' ? null : SYLLABLES.find((s) => s.char === target.char)
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
      ) : target.group === 'name' ? (
        <svg viewBox="0 0 100 100" className="road-syl" aria-hidden>
          {target.strokes.map((s, i) => (
            <path key={i} d={strokePath(s.stroke)} className="syl-stroke" strokeWidth={8} style={{ stroke: COLOR[s.part] }} />
          ))}
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

/**
 * A gift box on the road. Dots below fill in as the child writes; when all are filled the box
 * wiggles, and a tap opens it. `onOpen` returns the first letter of what it opened, to scroll to.
 */
function GiftGate({ ready, dots, onOpen }: { ready: boolean; dots: string[]; onOpen: () => string | undefined }) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <div className="road-gift">
      <button
        ref={ref}
        type="button"
        aria-label="gift"
        className={`road-gift-box ${ready ? 'is-ready' : ''}`}
        onClick={() => {
          if (!ready) {
            chime('soft')
            ref.current?.animate(WIGGLE, { duration: 420 })
            return
          }
          celebrateFeedback()
          chime('fanfare')
          confetti(ref.current?.getBoundingClientRect())
          const first = onOpen()
          window.setTimeout(() => {
            if (first) document.querySelector(`[data-char="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 120)
        }}
      >
        <GiftIcon />
      </button>
      <div className="road-dots" aria-hidden>
        {dots.map((cls, i) => (
          <i key={i} className={cls} />
        ))}
      </div>
    </div>
  )
}

// ---------- tracing ----------

/**
 * Every letter is written twice: first over the guide with the moving demo, then once more
 * "on your own" (a faint guide and only the start dot; the demo comes back after a miss). Two
 * dots under the card show which time it is. This long after the first, the second begins.
 */
const SECOND_TRY_MS = 1500
/** After a letter's celebration, the next letter comes by itself after this long... */
const AUTO_NEXT_MS = 2500
/** ...or this long when a picture word popped out (time to see it and hear the word). */
const AUTO_NEXT_WORD_MS = 4200

function Tracer({
  target,
  autoNext,
  hold,
  onNav,
  onBack,
}: {
  target: Target
  autoNext: boolean
  /** The sticker book is open over the card: stay on this letter, quietly. */
  hold: boolean
  onNav: (d: number) => void
  onBack: () => void
}) {
  const [done, setDone] = useState(0) // strokes finished
  const [ink, setInk] = useState<Pt[]>([])
  const [miss, setMiss] = useState(0) // bumps to restart the guide animation after a miss
  const [card, setCard] = useState<Card | null>(null)
  // 0: the first time, with the guide. 1: once more, on your own.
  const [round, setRound] = useState<0 | 1>(0)
  // The stroke a miss happened on in the second round: the demo shows again for it.
  const [helpAt, setHelpAt] = useState(-1)
  const svgRef = useRef<SVGSVGElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const stickerRef = useRef<HTMLButtonElement>(null)
  const drawing = useRef<{ id: number; pts: Pt[] } | null>(null)
  const timers = useRef<number[]>([])
  // Moving on by itself once a letter is done. Any touch on the letter or its sticker means the
  // child wants to stay (hear it again, write it again), so it is called off.
  const autoTimer = useRef<number | undefined>(undefined)
  const cancelAuto = () => window.clearTimeout(autoTimer.current)
  useEffect(() => cancelAuto, [])
  useEffect(() => {
    if (hold) cancelAuto()
  }, [hold])
  /** The child's own accepted strokes, kept for the handwriting fridge. */
  const accepted = useRef<Pt[][]>([])
  // Back to the road on a clean tap only, never while writing (touchGuard).
  const tapBack = useTap(() => {
    tapFeedback()
    onBack()
  })
  // Leaving mid-stroke must not leave the other buttons locked.
  useEffect(() => () => setWriting(false), [])

  const strokes = target.strokes
  const complete = done >= strokes.length
  const isSyl = target.group !== 'jamo'
  const [nameCard, setNameCard] = useState(false)
  const sayIt = () => {
    // A name syllable nobody has recorded yet stays quiet (the star's chime still plays).
    if (target.sound && (!target.sound.startsWith('name-syl-') || hasSound(target.sound))) play(target.sound)
  }

  // Say the letter's sound when it appears.
  useEffect(() => {
    sayIt()
    const ts = timers.current
    return () => ts.forEach((t) => window.clearTimeout(t))
  }, [target.sound])

  useEffect(() => {
    if (card) stickerRef.current?.animate(WORD_POP, { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1.25)' })
  }, [card])

  function restart(nextRound: 0 | 1 = 0) {
    cancelAuto()
    setRound(nextRound)
    setHelpAt(-1)
    accepted.current = []
    setDone(0)
    setInk([])
    setCard(null)
    setNameCard(false)
    drawing.current = null
    sayIt()
  }

  function toGrid(e: React.PointerEvent): Pt {
    const r = svgRef.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]
  }

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    e.preventDefault()
    if (drawing.current) return // ignore a second finger
    if (complete) {
      // Tapping a finished letter: write it again (another star to earn). Right after the first
      // time, that is the second time, a little early.
      restart(round === 0 ? 1 : 0)
      cardRef.current?.animate(POP, { duration: 360 })
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setWriting(true)
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
    recordWriting(target.char, strokes.map((s) => s.part), accepted.current)
    sayIt()
    buddy('yay')
    celebrateFeedback()
    cardRef.current?.animate(POP, { duration: 480, easing: 'cubic-bezier(.2,.8,.3,1.2)' })
    const rect = cardRef.current?.getBoundingClientRect()
    const char = target.char
    const first = round === 0
    if (rect) flyStar(rect, () => addStar(char, first))
    else addStar(char, first)
    if (first) {
      // Once more, on your own.
      autoTimer.current = window.setTimeout(() => {
        restart(1)
        cardRef.current?.animate(POP, { duration: 360 })
      }, SECOND_TRY_MS)
      return
    }
    // Worked out now, not at startup: a word shows only once it has a sound (see words.ts).
    // The last syllable of my name: the whole name, in the family's voice if recorded.
    if (target.name?.last) {
      const who = target.name.child
      timers.current.push(
        window.setTimeout(() => {
          setNameCard(true)
          if (!sayName(who)) chime('fanfare')
          confetti(cardRef.current?.getBoundingClientRect())
        }, 650),
      )
    }
    const sticker = target.syl ? cardFor(target.syl.cons, target.syl.vowel) : null
    // The last syllable of a name keeps its moment (the name card and the family's voice).
    if (autoNext && !target.name?.last) {
      autoTimer.current = window.setTimeout(() => onNav(1), sticker?.kind === 'word' ? AUTO_NEXT_WORD_MS : AUTO_NEXT_MS)
    }
    if (sticker) {
      // The syllable's picture word pops out and goes in the sticker book.
      timers.current.push(
        window.setTimeout(() => {
          setCard(sticker)
          // A picture word is said (가 → 가방); an animal friend would only repeat the syllable.
          if (sticker.kind === 'word') play(sticker.sound)
        }, 750),
      )
    }
  }

  function onUp(e: React.PointerEvent<SVGSVGElement>) {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    drawing.current = null
    setWriting(false)
    setInk([])
    if (traceMatches(strokes[done].stroke, d.pts)) {
      accepted.current[done] = d.pts
      const next = done + 1
      setDone(next)
      if (next >= strokes.length) finish()
      else tapFeedback()
    } else {
      setMiss((m) => m + 1) // no "wrong": just show the stroke again
      if (round === 1) setHelpAt(done)
    }
  }

  const current = complete ? null : strokes[done]
  // On your own: no moving demo, unless this stroke was just missed.
  const showDemo = round === 0 || helpAt === done

  return (
    <div className="write-trace flex h-full items-center justify-between gap-[2vh] p-[2.5vh]">
      <DailyMeter beside />
      <button type="button" aria-label="letters" className="write-back" {...tapBack}>
        <MapIcon />
      </button>

      <Tile kind="control" onTap={() => onNav(-1)} label="previous" className="size-(--tile)">
        <ArrowIcon dir="left" />
      </Tile>

      <div className="write-wrap flex h-full min-w-0 flex-1 items-center justify-center">
        <div
          ref={cardRef}
          className={`write-card relative rounded-[8cqmin] bg-card ${complete ? 'is-complete' : ''} ${isSyl ? 'is-syllable' : ''} ${round === 1 ? 'is-alone' : ''}`}
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
            {/* 십자 보조선: the cross every Korean writing workbook prints in the square, for judging place and size */}
            <path d="M50 3V97M3 50H97" className="write-cross" />
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
                {showDemo && <path d={strokePath(current.stroke)} className="stroke-demo" pathLength={100} />}
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
          {/* First time, second time. */}
          <div className="write-rounds" aria-hidden>
            <i className={round === 1 || complete ? 'is-on' : ''} />
            <i className={round === 1 && complete ? 'is-on' : ''} />
          </div>
          {nameCard && target.name && (
            <button
              type="button"
              className="word-card write-sticker name-card"
              aria-label={target.name.child.name}
              onPointerDown={(e) => {
                e.preventDefault()
                const who = target.name!.child
                if (!sayName(who)) chime('star')
              }}
            >
              <span className="word-emoji">{target.name.child.animal}</span>
              <span className="word-text">
                <b>{target.name.child.name}</b>
              </span>
            </button>
          )}
          {card && (
            <button
              ref={stickerRef}
              type="button"
              className={`word-card write-sticker ${card.kind === 'friend' ? 'is-friend' : ''}`}
              aria-label={card.before + card.syllable + card.after}
              onPointerDown={(e) => {
                e.preventDefault()
                cancelAuto()
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
