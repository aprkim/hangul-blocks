import { useState } from 'react'
import { tapFeedback } from '../native'
import { useTap } from '../touchGuard'
import { THEMES, applyTheme, loadTheme, saveTheme, type ThemeId } from '../theme'
import { ParentIcon, SettingsIcon } from './Icons'

/**
 * Top-right settings, the same on every child screen. Opens a small panel with:
 *  - the five background colors (a child may pick: applies at once and closes), and
 *  - the parents' recording screen (behind the grown-up question, handled by the app).
 * Tapping outside closes. No text on the child side.
 */
export function Settings({ onParent }: { onParent: () => void }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<ThemeId>(loadTheme)

  function choose(id: ThemeId) {
    tapFeedback()
    applyTheme(id)
    saveTheme(id)
    setCurrent(id)
    setOpen(false)
  }

  // Fires on a clean tap only, never while a letter is being written (touchGuard).
  const tapButton = useTap(() => {
    tapFeedback()
    setOpen((o) => !o)
  })

  return (
    <>
      <button
        type="button"
        className="settings-btn"
        aria-label="settings"
        aria-expanded={open}
        {...tapButton}
      >
        <SettingsIcon />
      </button>
      {open && (
        <>
          <div
            className="settings-backdrop"
            aria-hidden
            onPointerDown={(e) => {
              e.preventDefault()
              setOpen(false)
            }}
          />
          <div className="settings-panel" role="dialog" aria-label="settings">
            <div className="settings-swatches" role="listbox" aria-label="background colors">
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
            <div className="settings-divider" aria-hidden />
            <button
              type="button"
              className="settings-parent"
              aria-label="parents: record sounds"
              onPointerDown={(e) => {
                e.preventDefault()
                tapFeedback()
                setOpen(false)
                onParent()
              }}
            >
              <ParentIcon />
            </button>
          </div>
        </>
      )}
    </>
  )
}
