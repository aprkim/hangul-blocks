import type { ComponentType } from 'react'
import { tapFeedback } from '../native'
import { BuildIcon, PencilIcon, SoundIcon } from './Icons'
import { ThemePicker } from './ThemePicker'

export type Tab = 'jamo' | 'assemble' | 'write'

const TABS: { id: Tab; icon: ComponentType; label: string }[] = [
  { id: 'jamo', icon: SoundIcon, label: 'sound' },
  { id: 'assemble', icon: BuildIcon, label: 'build' },
  { id: 'write', icon: PencilIcon, label: 'write' },
]

/** Icon-only tabs: the child screen has no text besides jamo and syllables. */
export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <div className="tabbar shrink-0 px-[2.5vh] pb-[1.5vh]">
      <span aria-hidden />
      <nav className="flex h-full min-h-0 items-stretch justify-center gap-[2vw]">
      {TABS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          aria-current={tab === id ? 'page' : undefined}
          onPointerDown={(e) => {
            e.preventDefault()
            if (tab === id) return
            tapFeedback()
            onTab(id)
          }}
          className={`tab flex flex-1 items-center justify-center rounded-[22px] ${
            tab === id ? 'is-active bg-card shadow-[0_6px_0_var(--color-card-shadow)]' : ''
          }`}
        >
          <Icon />
        </button>
      ))}
      </nav>
      <ThemePicker />
    </div>
  )
}
