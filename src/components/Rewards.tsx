import { useEffect, useRef, useState } from 'react'
import { chime, hasSound, play, preload } from '../audio'
import { confetti } from '../effects'
import { celebrateFeedback, tapFeedback } from '../native'
import { useTap } from '../touchGuard'
import { JAR_SIZE, TREASURES, TREASURE_NAMES, TREASURE_SOUNDS, openGift, reachableSyllables, timesWritten, useProgress } from '../progress'
import { cardFor } from '../words'
import { usePuzzle } from '../keepsakes'
import { PUZZLE_WORDS, puzzleSound } from '../puzzleWords'
import { CloseIcon, GiftIcon, STAR_PATH, StarShape } from './Icons'

// Rewards on the Write tab: the star jar (top right, beside settings), the gift that a full jar
// gives, and the sticker book (opened by tapping the jar). Pictures only, no numbers.

const POP: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.15)', offset: 0.4 },
  { transform: 'scale(1)' },
]
const WIGGLE: Keyframe[] = [
  { transform: 'rotate(0)' },
  { transform: 'rotate(-7deg)', offset: 0.25 },
  { transform: 'rotate(6deg)', offset: 0.6 },
  { transform: 'rotate(0)' },
]
const REVEAL: Keyframe[] = [
  { transform: 'scale(0.2) rotate(-12deg)', opacity: 0 },
  { transform: 'scale(1.12) rotate(4deg)', opacity: 1, offset: 0.6 },
  { transform: 'scale(1) rotate(0)', opacity: 1 },
]

// Star slots inside the jar (2 columns, filled from the bottom up), in the jar's 100 x 120 box.
const SLOTS = Array.from({ length: JAR_SIZE }, (_, i) => ({ x: 36 + (i % 2) * 28, y: 102 - Math.floor(i / 2) * 16 }))

/** The jar itself: a glass jar with a red lid; one gold star per slot. */
function Jar({ count }: { count: number }) {
  return (
    <svg viewBox="0 0 100 120" className="h-full w-full" aria-hidden>
      <rect x="12" y="24" width="76" height="90" rx="22" fill="var(--color-card)" stroke="var(--color-guide-strong)" strokeWidth={6} />
      <rect x="20" y="8" width="60" height="18" rx="6" fill="var(--color-consonant)" />
      {SLOTS.slice(0, count).map((s, i) => (
        <path key={i} d={STAR_PATH} transform={`translate(${s.x - 12} ${s.y - 12}) scale(0.5)`} fill="var(--color-star)" stroke="var(--color-star-dark)" strokeWidth={4} strokeLinejoin="round" />
      ))}
    </svg>
  )
}

export function StarJar({ onOpen }: { onOpen: () => void }) {
  const p = useProgress()
  const ref = useRef<HTMLButtonElement>(null)
  const shown = p.pendingGift ? JAR_SIZE : p.jar
  const last = useRef(shown)
  // Fires on a clean tap only, never while a letter is being written (touchGuard).
  const tapJar = useTap(() => {
    tapFeedback()
    onOpen()
  })

  // A star landed: the jar bumps and dings.
  useEffect(() => {
    if (shown > last.current) {
      chime(shown === JAR_SIZE ? 'fanfare' : 'star')
      ref.current?.animate(shown === JAR_SIZE ? WIGGLE : POP, { duration: shown === JAR_SIZE ? 600 : 320, iterations: shown === JAR_SIZE ? 2 : 1 })
    }
    last.current = shown
  }, [shown])

  return (
    <button
      ref={ref}
      id="star-jar"
      type="button"
      aria-label="stars and stickers"
      className={`star-jar ${p.pendingGift ? 'is-full' : ''}`}
      {...tapJar}
    >
      <Jar count={shown} />
    </button>
  )
}

/** A full jar's gift: the box wiggles; tap opens it (confetti, fanfare); tap again to keep it. */
export function GiftReveal() {
  const p = useProgress()
  const gift = p.pendingGift
  const [visible, setVisible] = useState(false)
  const [opened, setOpened] = useState(false)
  const boxRef = useRef<HTMLButtonElement>(null)
  const prizeRef = useRef<HTMLDivElement>(null)

  // Let the child see the jar fill up before the gift appears.
  useEffect(() => {
    if (!gift) {
      setVisible(false)
      setOpened(false)
      return
    }
    const t = window.setTimeout(() => setVisible(true), 1300)
    return () => window.clearTimeout(t)
  }, [gift])

  useEffect(() => {
    if (opened) prizeRef.current?.animate(REVEAL, { duration: 620, easing: 'cubic-bezier(.2,.8,.3,1.25)' })
  }, [opened])

  if (!gift || !visible) return null

  return (
    <div
      className="reward-overlay"
      onPointerDown={(e) => {
        e.preventDefault()
        if (!opened) {
          setOpened(true)
          chime('fanfare')
          celebrateFeedback()
          confetti(boxRef.current?.getBoundingClientRect())
        } else {
          tapFeedback()
          openGift()
        }
      }}
    >
      <div className="gift-stage">
        <button ref={boxRef} type="button" aria-label="gift" className={`gift-box ${opened ? 'is-open' : 'is-waiting'}`}>
          <GiftIcon open={opened} />
        </button>
        {opened && (
          <div ref={prizeRef} className="gift-prize" aria-label={gift}>
            {gift}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The sticker book: a letter sticker for every syllable the child has written (its picture
 * word, or its animal friend), and the treasures from full jars. Ones still to find show as a
 * faint silhouette: something to look forward to, not something missing.
 */

/** Opened by tapping the star jar (or the book on the Words tab): what has been collected. */
export function StickerBook({ onClose }: { onClose: () => void }) {
  return (
    <div className="book-overlay" role="dialog" aria-label="stickers">
      <button
        type="button"
        className="book-close"
        aria-label="close"
        onPointerDown={(e) => {
          e.preventDefault()
          tapFeedback()
          onClose()
        }}
      >
        <CloseIcon />
      </button>
      <BookPage />
    </div>
  )
}

function BookPage() {
  const p = useProgress()
  const { solved } = usePuzzle()
  const mine = p.treasures.join('')
  useEffect(() => {
    preload([...mine].map((t) => TREASURE_SOUNDS[t]).filter(Boolean))
  }, [mine])
  return (
    <div className="book-scroll" data-scroll>
      <div className="book-page">
        {/* Words built in the word puzzle: the stickers a child makes themselves. */}
        <div className="book-grid letters">
          {PUZZLE_WORDS.map((w) => {
            const have = solved.includes(w.word)
            return (
              <Sticker key={w.word} have={have} emoji={w.emoji} label={w.word} onTap={() => (have ? play(puzzleSound(w.word)) : chime('soft'))}>
                {have && (
                  <span className="sticker-word">
                    <b>{w.word}</b>
                  </span>
                )}
              </Sticker>
            )
          })}
        </div>
        <div className="book-divider" aria-hidden>
          <StarShape className="h-full" />
        </div>
        <div className="book-grid letters">
          {reachableSyllables(p).map(({ char, cons, vowel }) => {
            const card = cardFor(cons, vowel)
            const have = timesWritten(p, char) > 0
            return (
              <Sticker
                key={char}
                have={have}
                emoji={card.emoji}
                label={card.before + card.syllable + card.after}
                onTap={() => (have ? play(card.sound) : chime('soft'))}
              >
                {have && (
                  <span className="sticker-word">
                    {card.before}
                    <b>{card.syllable}</b>
                    {card.kind === 'word' ? card.after : ''}
                  </span>
                )}
              </Sticker>
            )
          })}
        </div>
        <div className="book-divider" aria-hidden>
          <StarShape className="h-full" />
        </div>
        <div className="book-grid treasures">
          {TREASURES.map((t) => {
            const have = p.treasures.includes(t)
            const name = TREASURE_NAMES[t] ?? t
            return (
              <Sticker key={t} have={have} emoji={t} label={name} onTap={() => (have && hasSound(TREASURE_SOUNDS[t]) ? play(TREASURE_SOUNDS[t]) : chime(have ? 'star' : 'soft'))}>
                {have && (
                  <span className="sticker-word">
                    <b>{name}</b>
                  </span>
                )}
              </Sticker>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Sticker({
  have,
  emoji,
  label,
  onTap,
  children,
}: {
  have: boolean
  emoji: string
  label: string
  onTap: () => void
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      type="button"
      aria-label={have ? label : 'not yet'}
      className={`sticker ${have ? 'is-have' : 'is-hidden'}`}
      onClick={() => {
        tapFeedback()
        ref.current?.animate(have ? POP : WIGGLE, { duration: 360 })
        onTap()
      }}
    >
      {emoji && <span className="sticker-emoji">{emoji}</span>}
      {children}
    </button>
  )
}
