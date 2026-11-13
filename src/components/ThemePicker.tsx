import { useState } from 'react'
import { tapFeedback } from '../native'
import { THEMES, applyTheme, loadTheme, saveTheme, type ThemeId } from '../theme'
import { PaletteIcon } from './Icons'

/**
 * Background theme picker a 4-year-old can use: one icon button; tapping it spreads five color
 * circles, each painted in its own background color. Tapping a circle applies it at once and
 * closes. Tapping outside closes. No text, no confirmation.
 */
export function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<ThemeId>(loadTheme)

  function choose(id: ThemeId) {
    tapFeedback()
    applyTheme(id)
    saveTheme(id)
    setCurrent(id)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="theme-btn"
        aria-label="background color"
        aria-expanded={open}
        onPointerDown={(e) => {
          e.preventDefault()
          tapFeedback()
          setOpen((o) => !o)
        }}
      >
        <PaletteIcon />
      </button>
      {open && (
        <>
          <div
            className="theme-backdrop"
            aria-hidden
            onPointerDown={(e) => {
              e.preventDefault()
              setOpen(false)
            }}
          />
          <div className="theme-pop" role="listbox" aria-label="background colors">
            {THEMES.map((id) => (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={id === current}
                aria-label={id}
                className={`theme-swatch ${id === current ? 'is-current' : ''}`}
                style={{ background: `var(--theme-${id}-page)` }}
                onPointerDown={(e) => {
                  e.preventDefault()
                  choose(id)
                }}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
