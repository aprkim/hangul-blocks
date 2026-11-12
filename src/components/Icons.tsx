// Icon-only controls: the child screen has no text besides jamo and syllables.

const common = {
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'w-[55%] h-[55%]',
}

/** Go to the assembly board: two blocks joining into one. */
export function BuildIcon() {
  return (
    <svg {...common}>
      <rect x="5" y="14" width="16" height="20" rx="4" fill="var(--color-consonant)" stroke="none" />
      <rect x="27" y="14" width="16" height="20" rx="4" fill="var(--color-vowel)" stroke="none" />
      <path d="M21 24h6" />
    </svg>
  )
}

/** Go back to the jamo board: a grid of tiles. */
export function GridIcon() {
  return (
    <svg {...common} stroke="none">
      {[6, 20, 34].flatMap((y, row) =>
        [6, 20, 34].map((x) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="10"
            height="10"
            rx="2.5"
            fill={row < 2 ? 'var(--color-consonant)' : 'var(--color-vowel)'}
          />
        )),
      )}
    </svg>
  )
}

/** Clear the frame. */
export function ResetIcon() {
  return (
    <svg {...common}>
      <path d="M38 24a14 14 0 1 1-4.1-9.9" />
      <path d="M38 8v8h-8" />
    </svg>
  )
}

/** Tab: the sound board. */
export function SoundIcon() {
  return (
    <svg {...common}>
      <path d="M8 19h7l10-8v26l-10-8H8z" fill="var(--color-consonant)" stroke="var(--color-consonant)" />
      <path d="M32 17a10 10 0 0 1 0 14" stroke="var(--color-vowel)" />
      <path d="M37 12a17 17 0 0 1 0 24" stroke="var(--color-vowel)" />
    </svg>
  )
}

/** Tab: tracing. */
export function PencilIcon() {
  return (
    <svg {...common}>
      <path d="M10 38l3-10L32 9l7 7-19 19z" fill="var(--color-sun-pencil, #f2c14e)" stroke="var(--color-ink)" />
      <path d="M13 28l7 7" stroke="var(--color-ink)" />
      <path d="M10 38l4-1" stroke="var(--color-consonant)" strokeWidth={5} />
    </svg>
  )
}
