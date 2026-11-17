import { useEffect, useRef } from 'react'
import { tapFeedback } from '../native'
import { layoutSyllable, strokePath } from '../strokes'

// A 1.3-second opening, once per launch: a red ㄱ and a blue ㅏ slide in from either side and
// click together into 가, the idea the whole app teaches. No sound (it would need a tap first),
// any tap skips it, and it is skipped entirely when the system asks for reduced motion.

const TOTAL_MS = 1300
const { cons: CONS, vowel: VOWEL } = layoutSyllable('ㄱ', 'ㅏ', 'side')

export function Intro({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const consRef = useRef<SVGGElement>(null)
  const vowelRef = useRef<SVGGElement>(null)
  const glyphRef = useRef<SVGSVGElement>(null)
  const done = useRef(false)

  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }
    const ease = 'cubic-bezier(.2,.8,.25,1)'
    consRef.current?.animate(
      [
        { transform: 'translateX(-70px)', opacity: 0 },
        { transform: 'translateX(4px)', opacity: 1, offset: 0.85 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 480, easing: ease, fill: 'both' },
    )
    vowelRef.current?.animate(
      [
        { transform: 'translateX(70px)', opacity: 0 },
        { transform: 'translateX(-4px)', opacity: 1, offset: 0.85 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 480, easing: ease, fill: 'both' },
    )
    // The click: a small squash and settle as the two pieces meet.
    const click = window.setTimeout(() => {
      tapFeedback()
      glyphRef.current?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.4 }, { transform: 'scale(1)' }],
        { duration: 260, easing: 'ease-out' },
      )
    }, 470)
    const fade = window.setTimeout(() => {
      const a = rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease-in', fill: 'forwards' })
      if (a) a.onfinish = finish
      else finish()
    }, TOTAL_MS - 250)
    return () => {
      window.clearTimeout(click)
      window.clearTimeout(fade)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={rootRef}
      className="intro"
      aria-hidden
      onPointerDown={(e) => {
        e.preventDefault()
        finish()
      }}
    >
      <svg ref={glyphRef} viewBox="0 0 100 100" className="intro-glyph">
        <g ref={consRef} style={{ opacity: 0 }}>
          {CONS!.map((s, i) => (
            <path key={i} d={strokePath(s)} className="intro-stroke" style={{ stroke: 'var(--color-consonant)' }} />
          ))}
        </g>
        <g ref={vowelRef} style={{ opacity: 0 }}>
          {VOWEL!.map((s, i) => (
            <path key={i} d={strokePath(s)} className="intro-stroke" style={{ stroke: 'var(--color-vowel)' }} />
          ))}
        </g>
      </svg>
    </div>
  )
}
