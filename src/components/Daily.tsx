import { useEffect, useState } from 'react'
import { chime } from '../audio'
import { currentChild, useChildren } from '../children'
import { GOALS, dayOf, goalMet, markCheered, useDaily } from '../daily'
import { confetti } from '../effects'
import { celebrateFeedback } from '../native'

/**
 * Today's goal as dots (top left of the Write tab and the word puzzle). Each letter written
 * fills one red, each word built one gold; when every dot is filled it turns into a moon.
 * `beside`: sits to the right of a button already at the top left (the tracing card's).
 */
export function DailyMeter({ beside = false }: { beside?: boolean }) {
  const s = useDaily()
  const d = dayOf(s)
  const g = GOALS[s.goal]
  if (goalMet(s)) {
    return (
      <div className={`daily-meter is-done ${beside ? 'is-beside' : ''}`} aria-label="done for today">
        <span>🌙</span>
      </div>
    )
  }
  return (
    <div className={`daily-meter ${beside ? 'is-beside' : ''}`} aria-label="today">
      {Array.from({ length: g }, (_, i) => (
        <i key={i} className={i < d.letters ? 'is-letter is-on' : i < d.letters + d.words ? 'is-word is-on' : ''} />
      ))}
    </div>
  )
}

/**
 * "All done for today": once the day's goal is reached, night falls and the child's animal goes
 * to sleep. Shown once a day, a moment after the letter's or word's own celebration; a tap
 * puts it away and the child can keep playing.
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
      <div className="daily-night">
        <span className="daily-moon">🌙</span>
        <span className="daily-star s1">⭐</span>
        <span className="daily-star s2">⭐</span>
        <span className="daily-star s3">⭐</span>
        <span className="daily-animal">{child?.animal ?? '🐻'}</span>
        <span className="daily-zzz">💤</span>
      </div>
    </div>
  )
}
