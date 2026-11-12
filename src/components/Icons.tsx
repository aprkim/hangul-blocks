// The app's own icon set. Every icon is drawn from the game itself: rounded jamo tiles in the
// consonant red and vowel blue, the white jamo strokes, and the tracing guide. One grid (48),
// one stroke weight, round caps. No text: the child screen has none besides jamo and syllables.

const box = {
  viewBox: '0 0 48 48',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'icon w-[58%] h-[58%]',
}

const RED = 'var(--color-consonant)'
const BLUE = 'var(--color-vowel)'
const INK = 'var(--color-ink)'
const GUIDE = '#e3d6c1'

/** Sound tab: a ㄱ tile that speaks (sound waves in vowel blue). */
export function SoundIcon() {
  return (
    <svg {...box}>
      <rect x="3" y="9" width="27" height="30" rx="8" fill={RED} />
      <path d="M10 17h12v14" stroke="white" strokeWidth={4.5} />
      <path d="M35 19.5a6.5 6.5 0 0 1 0 9" stroke={BLUE} strokeWidth={4} />
      <path d="M40 14.5a13 13 0 0 1 0 19" stroke={BLUE} strokeWidth={4} />
    </svg>
  )
}

/** Build tab: a ㄱ tile and a ㅏ tile snapped together into 가 (the app icon's idea). */
export function BuildIcon() {
  return (
    <svg {...box}>
      <rect x="2" y="7" width="25" height="34" rx="8" fill={RED} />
      <rect x="29" y="7" width="17" height="34" rx="7" fill={BLUE} />
      <path d="M9 15h11c0 9-4 15-11 18" stroke="white" strokeWidth={4.5} />
      <path d="M36 13v22M36 24h5" stroke="white" strokeWidth={4.5} />
    </svg>
  )
}

/** Write tab: the tracing card in miniature: a pale ㄱ guide on a card, traced in red from its start dot. */
export function PencilIcon() {
  return (
    <svg {...box}>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="var(--color-paper)" stroke="#d8c7a8" strokeWidth={2.5} />
      <path d="M14 15h20v20" stroke="#d8c7a8" strokeWidth={7} />
      <path d="M14 15h20v7" stroke={RED} strokeWidth={7} />
      <circle cx="14" cy="15" r="5.5" fill={RED} />
    </svg>
  )
}

/** Clear the frame: a sweep back to empty, with the frame's dashed slot inside. */
export function ResetIcon() {
  return (
    <svg {...box}>
      <rect x="16" y="16" width="16" height="16" rx="4" stroke={GUIDE} strokeWidth={3} strokeDasharray="3.5 3.5" />
      <path d="M40 24a16 16 0 1 1-4.7-11.3" stroke={INK} strokeWidth={4.5} />
      <path d="M38 6v8h-8" stroke={INK} strokeWidth={4.5} />
    </svg>
  )
}

/** Previous / next letter on the Write screen: a chunky rounded arrow. */
export function ArrowIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg {...box}>
      <path
        d={dir === 'left' ? 'M28 9 13 24l15 15' : 'M20 9l15 15-15 15'}
        stroke={INK}
        strokeWidth={6}
      />
    </svg>
  )
}
