import { useRef, type ReactNode } from 'react'
import { tapFeedback } from '../native'

export type TileKind = 'consonant' | 'vowel' | 'control'

const KIND_CLASS: Record<TileKind, string> = {
  consonant: 'bg-consonant text-white shadow-[0_8px_0_var(--color-consonant-dark)]',
  vowel: 'bg-vowel text-white shadow-[0_8px_0_var(--color-vowel-dark)]',
  control: 'bg-white text-ink shadow-[0_8px_0_var(--color-wash)]',
}

const BOUNCE: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.18)', offset: 0.35 },
  { transform: 'scale(0.94)', offset: 0.7 },
  { transform: 'scale(1)' },
]

type Props = {
  kind: TileKind
  onTap: () => void
  children: ReactNode
  selected?: boolean
  className?: string
  label?: string
}

/** Large tap target. Fires on pointerdown, not click, so it responds the instant a finger lands. */
export function Tile({ kind, onTap, children, selected, className = '', label }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        ref.current?.animate(BOUNCE, { duration: 320, easing: 'ease-out' })
        tapFeedback()
        onTap()
      }}
      className={`tile ${KIND_CLASS[kind]} ${selected ? 'ring-[5px] ring-ink ring-offset-4 ring-offset-paper' : ''} ${className}`}
    >
      <span className="tile-glyph">{children}</span>
    </button>
  )
}
