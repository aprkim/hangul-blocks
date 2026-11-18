import { useRef, useState } from 'react'
import { chime, hasSound, play } from '../audio'
import { currentChild, nameSound, useChildren } from '../children'
import { soundOf, useHandwriting, writtenOrder, type Writing } from '../keepsakes'
import { tapFeedback } from '../native'
import { FridgeIcon } from './Icons'

// The fridge: every letter the child has written, in the child's own strokes, on a paper held
// by a magnet. Tapping one shows it big, with the very first try beside it, and says it.
// Nothing to earn here: what the child made is the point.

const MAGNETS = ['var(--color-consonant)', 'var(--color-vowel)', 'var(--color-star)']
const POP: Keyframe[] = [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }]

/** The child's strokes as paths, in consonant red / vowel blue. */
export function Handwriting({ w, weight = 7 }: { w: Writing; weight?: number }) {
  return (
    <>
      {w.strokes.map((flat, i) => {
        let d = ''
        for (let k = 0; k < flat.length; k += 2) d += `${k ? 'L' : 'M'}${flat[k]} ${flat[k + 1]}`
        return (
          <path
            key={i}
            d={d}
            fill="none"
            strokeWidth={weight}
            strokeLinecap="round"
            strokeLinejoin="round"
            stroke={w.parts[i] === 'c' ? 'var(--color-consonant)' : 'var(--color-vowel)'}
          />
        )
      })}
    </>
  )
}

export function Fridge() {
  const h = useHandwriting()
  const chars = writtenOrder(h)
  const child = currentChild(useChildren())
  // Once every syllable of the child's name has been written: their name, in their own hand,
  // on its own long paper at the top.
  const nameChars = child ? [...child.name] : []
  const nameDone = nameChars.length > 0 && nameChars.every((c) => h[c])
  const [open, setOpen] = useState<string | null>(null)
  const bigRef = useRef<HTMLDivElement>(null)

  const show = (c: string) => {
    tapFeedback()
    const s = soundOf(c)
    if (s) play(s)
    setOpen(c)
    requestAnimationFrame(() => bigRef.current?.animate(POP, { duration: 260, easing: 'cubic-bezier(.2,.8,.3,1.2)' }))
  }

  if (chars.length === 0 && !nameDone) {
    return (
      <div className="fridge-empty" aria-hidden>
        <FridgeIcon />
      </div>
    )
  }

  const item = open ? h[open] : null

  return (
    <div className="fridge" data-scroll>
      {nameDone && child && (
        <button
          type="button"
          aria-label={child.name}
          className="fridge-paper fridge-name"
          onClick={() => {
            tapFeedback()
            if (hasSound(nameSound(child))) play(nameSound(child))
            else chime('star')
          }}
        >
          <i className="fridge-name-animal">{child.animal}</i>
          {nameChars.map((c, i) => (
            <svg key={i} viewBox="0 0 100 100" aria-hidden>
              <Handwriting w={h[c].latest} />
            </svg>
          ))}
        </button>
      )}
      <div className="fridge-grid">
        {chars.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            className="fridge-paper"
            style={{ rotate: `${((i * 37) % 7) - 3}deg` }}
            onClick={() => show(c)}
          >
            <i className="fridge-magnet" style={{ background: MAGNETS[i % 3] }} />
            <svg viewBox="0 0 100 100" aria-hidden>
              <Handwriting w={h[c].latest} />
            </svg>
          </button>
        ))}
      </div>

      {item && open && (
        <div
          className="fridge-zoom"
          onPointerDown={(e) => {
            e.preventDefault()
            setOpen(null)
          }}
        >
          <div ref={bigRef} className="fridge-zoom-card">
            <svg viewBox="0 0 100 100" className="fridge-zoom-latest" aria-label={open}>
              <Handwriting w={item.latest} weight={6} />
            </svg>
            {/* The very first try, small in the corner, when it was a different day's writing. */}
            {item.first.at !== item.latest.at && (
              <svg viewBox="0 0 100 100" className="fridge-zoom-first" aria-hidden>
                <Handwriting w={item.first} weight={8} />
              </svg>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
