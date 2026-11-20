import { useEffect, useRef, useState } from 'react'
import { chime } from '../audio'
import type { BuddyMood } from '../buddy'
import { currentChild, useChildren } from '../children'
import { GOALS, dayOf, goalMet, markCheered, useDaily } from '../daily'
import { confetti } from '../effects'
import { celebrateFeedback, tapFeedback } from '../native'
import { useTap } from '../touchGuard'

const JUMP: Keyframe[] = [
  { transform: 'translateY(0) scale(1)' },
  { transform: 'translateY(-38%) scale(1.15) rotate(-8deg)', offset: 0.35 },
  { transform: 'translateY(0) scale(0.95)', offset: 0.7 },
  { transform: 'translateY(-12%) scale(1.03) rotate(6deg)', offset: 0.85 },
  { transform: 'translateY(0) scale(1)' },
]
const TILT: Keyframe[] = [
  { transform: 'rotate(0)' },
  { transform: 'rotate(-18deg)', offset: 0.3 },
  { transform: 'rotate(-18deg)', offset: 0.7 },
  { transform: 'rotate(0)' },
]

/**
 * The child's animal and today's goal, at the top left of every screen. The animal is the
 * child's friend in the app: it jumps when something is finished and tilts its head when a
 * piece doesn't fit (see buddy.ts); tapping it makes it jump. Beside it, one dot per thing to
 * do today: a letter written fills one red, a word built one gold, and when all are filled
 * they turn into a trophy.
 * `beside`: sits to the right of a button already at the top left (the tracing card's).
 */
export function DailyMeter({ beside = false }: { beside?: boolean }) {
  const s = useDaily()
  const child = currentChild(useChildren())
  const d = dayOf(s)
  const g = GOALS[s.goal]
  const done = goalMet(s)
  const animalRef = useRef<HTMLButtonElement>(null)
  const jump = () => animalRef.current?.animate(JUMP, { duration: 620, easing: 'ease-out' })

  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<BuddyMood>).detail === 'yay') jump()
      else animalRef.current?.animate(TILT, { duration: 700, easing: 'ease-in-out' })
    }
    window.addEventListener('buddy', on)
    return () => window.removeEventListener('buddy', on)
  }, [])

  const tap = useTap(() => {
    tapFeedback()
    chime('star')
    jump()
  })

  return (
    <div className={`daily-meter ${beside ? 'is-beside' : ''} ${g > 8 ? 'is-many' : ''} ${done ? 'is-done' : ''}`} aria-label={done ? 'done for today' : 'today'}>
      <button ref={animalRef} type="button" className="daily-buddy" aria-label="friend" {...tap}>
        {child?.animal ?? '🐻'}
      </button>
      {done ? (
        <span className="daily-trophy-small">🏆</span>
      ) : (
        <div className="daily-row">
          {Array.from({ length: g }, (_, i) => (
            <i key={i} className={i < d.letters ? 'is-letter is-on' : i < d.letters + d.words ? 'is-word is-on' : ''} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * "You did it today!": once the day's goal is reached, a trophy in a burst of sunshine, the
 * child's animal cheering beside it, and the day's dots all filled. A win, not bedtime (an
 * earlier night-sky version read as "time to sleep"). Shown once a day, a moment after the
 * letter's or word's own celebration; a tap puts it away and the child can keep playing.
 */
export function DailyDone() {
  const s = useDaily()
  const child = currentChild(useChildren())
  const due = goalMet(s) && !dayOf(s).cheered
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!due) return
    const t = window.setTimeout(() => {
      setShow(true)
      markCheered()
      chime('fanfare')
      celebrateFeedback()
      confetti()
    }, 2600)
    return () => window.clearTimeout(t)
  }, [due])

  if (!show) return null
  return (
    <div
      className="daily-done"
      role="dialog"
      aria-label="done for today"
      onPointerDown={(e) => {
        e.preventDefault()
        setShow(false)
      }}
    >
      <div className="daily-win">
        <div className="daily-rays" aria-hidden />
        <div className="daily-dots" aria-hidden>
          {Array.from({ length: GOALS[s.goal] }, (_, i) => (
            <i key={i} style={{ animationDelay: `${0.25 + i * 0.07}s` }} />
          ))}
        </div>
        <span className="daily-trophy">🏆</span>
        <span className="daily-animal">{child?.animal ?? '🐻'}</span>
        <span className="daily-spark s1">⭐</span>
        <span className="daily-spark s2">⭐</span>
        <span className="daily-spark s3">⭐</span>
      </div>
    </div>
  )
}
