import { useEffect, useRef, useState } from 'react'
import { play } from '../audio'
import { CONSONANTS, VOWELS, consonantSound, vowelSound } from '../jamo'
import { successFeedback, tapFeedback } from '../native'
import { STROKES, strokePath, traceMatches, type Pt } from '../strokes'
import { Tile } from './Tile'

// Tracing: the jamo appears as a pale guide; the next stroke shows where to start and which way
// to go. Following it with a finger fills it in. There is no wrong answer: a trace that misses
// simply fades and the guide shows the stroke again.

type Letter = { char: string; sound: string; kind: 'consonant' | 'vowel' }

const LETTERS: Letter[] = [
  ...CONSONANTS.map((c) => ({ char: c.char, sound: consonantSound(c), kind: 'consonant' as const })),
  ...VOWELS.map((v) => ({ char: v.char, sound: vowelSound(v), kind: 'vowel' as const })),
]

const POP: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.08)', offset: 0.4 },
  { transform: 'scale(1)' },
]

function ArrowIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 48 48" className="h-[55%] w-[55%]" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="M30 10 16 24l14 14" /> : <path d="M18 10l14 14-14 14" />}
    </svg>
  )
}

export function WriteBoard() {
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(0) // strokes finished for the current letter
  const [ink, setInk] = useState<Pt[]>([])
  const [miss, setMiss] = useState(0) // bumps to restart the guide animation after a miss
  const svgRef = useRef<SVGSVGElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const drawing = useRef<{ id: number; pts: Pt[] } | null>(null)

  const letter = LETTERS[index]
  const strokes = STROKES[letter.char]
  const complete = done >= strokes.length
  const color = letter.kind === 'consonant' ? 'var(--color-consonant)' : 'var(--color-vowel)'

  // Say the letter's sound whenever a new one appears.
  useEffect(() => {
    play(letter.sound)
  }, [letter.sound])

  function go(delta: number) {
    setIndex((i) => (i + delta + LETTERS.length) % LETTERS.length)
    setDone(0)
    setInk([])
    drawing.current = null
  }

  function toGrid(e: React.PointerEvent): Pt {
    const svg = svgRef.current!
    const r = svg.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]
  }

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    e.preventDefault()
    if (drawing.current) return // ignore a second finger
    if (complete) {
      // Tapping a finished letter says it again.
      play(letter.sound)
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

  function onUp(e: React.PointerEvent<SVGSVGElement>) {
    const d = drawing.current
    if (!d || d.id !== e.pointerId) return
    drawing.current = null
    setInk([])
    if (traceMatches(strokes[done], d.pts)) {
      const next = done + 1
      setDone(next)
      if (next >= strokes.length) {
        play(letter.sound)
        successFeedback()
        cardRef.current?.animate(POP, { duration: 480, easing: 'cubic-bezier(.2,.8,.3,1.2)' })
      } else {
        tapFeedback()
      }
    } else {
      setMiss((m) => m + 1) // no "wrong": just show the stroke again
    }
  }

  const current = complete ? null : strokes[done]

  return (
    <div className="flex h-full items-center justify-between gap-[2vh] p-[2.5vh]">
      <Tile kind="control" onTap={() => go(-1)} label="previous" className="size-(--tile)">
        <ArrowIcon dir="left" />
      </Tile>

      <div className="write-wrap flex h-full min-w-0 flex-1 items-center justify-center">
        <div ref={cardRef} className={`write-card relative rounded-[8cqmin] bg-white ${complete ? 'is-complete' : ''}`}>
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            className="absolute inset-[6%] h-[88%] w-[88%] touch-none"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-label={letter.char}
          >
            {/* Pale guide of the whole letter */}
            {strokes.map((s, i) => (
              <path key={`g${i}`} d={strokePath(s)} className="stroke-guide" />
            ))}
            {/* Finished strokes, in color */}
            {strokes.slice(0, done).map((s, i) => (
              <path key={`d${i}`} d={strokePath(s)} className="stroke-done" style={{ stroke: color }} />
            ))}
            {/* The stroke to write now: drawn along its direction, with a start dot */}
            {current && (
              <g key={`c${index}-${done}-${miss}`}>
                <path d={strokePath(current)} className="stroke-demo" pathLength={100} />
                <circle cx={current[0][0]} cy={current[0][1]} r={6.5} className="stroke-start" style={{ fill: color }} />
              </g>
            )}
            {/* The finger's trail */}
            {ink.length > 1 && (
              <path d={strokePath(ink)} className="stroke-ink" style={{ stroke: color }} />
            )}
          </svg>
        </div>
      </div>

      <Tile kind="control" onTap={() => go(1)} label="next" className={`size-(--tile) ${complete ? 'next-ready' : ''}`}>
        <ArrowIcon dir="right" />
      </Tile>
    </div>
  )
}
