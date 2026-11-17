import type { ComponentType } from 'react'
import { tapFeedback } from '../native'
import { useTap } from '../touchGuard'
import { BuildIcon, PencilIcon, SoundIcon } from './Icons'

export type Tab = 'jamo' | 'assemble' | 'write'

const TABS: { id: Tab; icon: ComponentType; label: string }[] = [
  { id: 'jamo', icon: SoundIcon, label: 'sound' },
  { id: 'assemble', icon: BuildIcon, label: 'build' },
  { id: 'write', icon: PencilIcon, label: 'write' },
]

/** One tab. Fires on a clean tap, never while a letter is being written (touchGuard). */
function TabButton({ active, icon: Icon, label, onTap }: { active: boolean; icon: ComponentType; label: string; onTap: () => void }) {
  const tap = useTap(() => {
    tapFeedback()
    onTap()
  })
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      {...tap}
      className={`tab flex flex-1 items-center justify-center rounded-[22px] ${
        active ? 'is-active bg-card shadow-[0_6px_0_var(--color-card-shadow)]' : ''
      }`}
    >
      <Icon />
    </button>
  )
}

/** Icon-only tabs: the child screen has no text besides jamo and syllables. */
export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <div className="tabbar shrink-0 px-[2.5vh] pb-[1.5vh]">
      <nav className="flex h-full min-h-0 items-stretch justify-center gap-[2vw]">
      {TABS.map(({ id, icon, label }) => (
        <TabButton key={id} active={tab === id} icon={icon} label={label} onTap={() => onTab(id)} />
      ))}
      </nav>
    </div>
  )
}
