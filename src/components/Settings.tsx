import { useState } from 'react'
import { chime } from '../audio'
import { sayName } from '../sayName'
import { chooseChild, useChildren, type Child } from '../children'
import { tapFeedback } from '../native'
import { useTap } from '../touchGuard'
import { THEMES, applyTheme, loadTheme, saveTheme, type ThemeId } from '../theme'
import { ParentIcon, SettingsIcon } from './Icons'

/**
 * Top-right settings, the same on every child screen. Opens a small panel with:
 *  - the five background colors (a child may pick: applies at once and closes), and
 *  - with more than one child on this device, their animals (switch who's playing), and
 *  - the parents' recording screen (behind the grown-up question, handled by the app).
 * Tapping outside closes. No text on the child side.
 */
export function Settings({ onParent, onSwitch }: { onParent: () => void; onSwitch: (c: Child) => void }) {
  const [open, setOpen] = useState(false)
  const kids = useChildren()
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
            {kids.list.length > 1 && (
              <>
                <div className="settings-divider" aria-hidden />
                <div className="settings-kids" role="listbox" aria-label="who is playing">
                  {kids.list.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={c.id === kids.current}
                      aria-label={c.name}
                      className={`settings-kid ${c.id === kids.current ? 'is-current' : ''}`}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        tapFeedback()
                        setOpen(false)
                        if (c.id === kids.current) return
                        if (!sayName(c)) chime('star')
                        chooseChild(c.id)
                        onSwitch(c)
                      }}
                    >
                      {c.animal}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="settings-divider" aria-hidden />
            <button
              type="button"
              className="settings-parent"
              aria-label="parents"
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
