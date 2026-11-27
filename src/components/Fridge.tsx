import { useEffect, useRef, useState } from 'react'
import { chime, play } from '../audio'
import { sayName } from '../sayName'
import { currentChild, useChildren } from '../children'
import { pictureDate, removePicture, restorePicture, soundOf, useGallery, useHandwriting, writtenOrder, type Picture, type Writing } from '../keepsakes'
import { tapFeedback } from '../native'
import { FridgeIcon, TrashIcon, UndoIcon } from './Icons'
import { ScenePicture } from './ScenePicture'

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
  const { pictures } = useGallery()
  const [open, setOpen] = useState<string | null>(null)
  const [openPic, setOpenPic] = useState<Picture | null>(null)
  // A picture just thrown away: an undo button brings it back for a few seconds.
  const [thrown, setThrown] = useState<Picture | null>(null)
  useEffect(() => {
    if (!thrown) return
    const t = window.setTimeout(() => setThrown(null), 5000)
    return () => window.clearTimeout(t)
  }, [thrown])
  const bigRef = useRef<HTMLDivElement>(null)

  const show = (c: string) => {
    tapFeedback()
    const s = soundOf(c)
    if (s) play(s)
    setOpen(c)
    requestAnimationFrame(() => bigRef.current?.animate(POP, { duration: 260, easing: 'cubic-bezier(.2,.8,.3,1.2)' }))
  }

  const showPic = (pic: Picture) => {
    tapFeedback()
    chime('star')
    setOpenPic(pic)
    requestAnimationFrame(() => bigRef.current?.animate(POP, { duration: 260, easing: 'cubic-bezier(.2,.8,.3,1.2)' }))
  }

  if (chars.length === 0 && !nameDone && pictures.length === 0 && !thrown) {
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
            if (!sayName(child)) chime('star')
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
      {/* Sticker pictures the child finished (the camera on the play scene), newest first. */}
      {pictures.length > 0 && (
        <div className="fridge-pics">
          {pictures.map((pic, i) => (
            <button
              key={pic.at}
              type="button"
              aria-label="picture"
              className="fridge-photo"
              style={{ rotate: `${((i * 53) % 9) - 4}deg` }}
              onClick={() => showPic(pic)}
            >
              <i className="fridge-magnet" style={{ background: MAGNETS[(i + 1) % 3] }} />
              <ScenePicture pic={pic} />
              <span className="fridge-photo-date">{pictureDate(pic.at)}</span>
            </button>
          ))}
        </div>
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

      {openPic && (
        <div
          className="fridge-zoom"
          onPointerDown={(e) => {
            e.preventDefault()
            setOpenPic(null)
          }}
        >
          <div ref={bigRef} className="fridge-zoom-photo" style={{ aspectRatio: openPic.aspect }}>
            <ScenePicture pic={openPic} />
            <span className="fridge-photo-date">{pictureDate(openPic.at)}</span>
            <button
              type="button"
              aria-label="throw away"
              className="fridge-trash"
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                tapFeedback()
                chime('soft')
                removePicture(openPic.at)
                setThrown(openPic)
                setOpenPic(null)
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      )}

      {thrown && (
        <button
          type="button"
          aria-label="undo"
          className="fridge-undo"
          onPointerDown={(e) => {
            e.preventDefault()
            tapFeedback()
            chime('star')
            restorePicture(thrown)
            setThrown(null)
          }}
        >
          <UndoIcon />
        </button>
      )}

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
