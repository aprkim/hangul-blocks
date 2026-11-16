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
const GUIDE = 'var(--color-guide-strong)'
const ON_TILE = 'var(--color-on-tile)'
const CARD_SHADOW = 'var(--color-card-shadow)'

/** Sound tab: a ㄱ tile that speaks (sound waves in vowel blue). */
export function SoundIcon() {
  return (
    <svg {...box}>
      <rect x="3" y="9" width="27" height="30" rx="8" fill={RED} />
      <path d="M10 17h12v14" stroke={ON_TILE} strokeWidth={4.5} />
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
      <path d="M9 15h11c0 9-4 15-11 18" stroke={ON_TILE} strokeWidth={4.5} />
      <path d="M36 13v22M36 24h5" stroke={ON_TILE} strokeWidth={4.5} />
    </svg>
  )
}

/** Write tab: the tracing card in miniature: a pale ㄱ guide on a card, traced in red from its start dot. */
export function PencilIcon() {
  return (
    <svg {...box}>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="var(--color-page)" stroke={CARD_SHADOW} strokeWidth={2.5} />
      <path d="M14 15h20v20" stroke={GUIDE} strokeWidth={7} />
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

/** Settings: three sliders whose knobs are the app's colors (consonant, vowel, ink). */
export function SettingsIcon() {
  return (
    <svg {...box}>
      <path d="M8 13h32M8 24h32M8 35h32" stroke="var(--color-guide-strong)" strokeWidth={4} />
      <circle cx="30" cy="13" r="5.5" fill={RED} />
      <circle cx="16" cy="24" r="5.5" fill={BLUE} />
      <circle cx="27" cy="35" r="5.5" fill={INK} />
    </svg>
  )
}

/** Parents' recording: a microphone with a small lock (the grown-up question follows). */
export function ParentIcon() {
  return (
    <svg {...box}>
      <rect x="11" y="5" width="14" height="22" rx="7" fill={INK} />
      <path d="M6 20a12 12 0 0 0 24 0M18 32v8M12 40h12" stroke={INK} strokeWidth={4} />
      <rect x="29" y="27" width="15" height="13" rx="3" fill={RED} />
      <path d="M32.5 27v-3a4 4 0 0 1 8 0v3" stroke={RED} strokeWidth={3} />
    </svg>
  )
}

const STAR = 'var(--color-star)'
const STAR_DARK = 'var(--color-star-dark)'
export const STAR_PATH = 'M24 4.5L29.6 17.8L44 19L33 28.4L36.3 42.5L24 35L11.7 42.5L15 28.4L4 19L18.4 17.8Z'

/** A reward star: gold with a darker rim, round corners. */
export function StarShape({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d={STAR_PATH} fill={STAR} stroke={STAR_DARK} strokeWidth={3} strokeLinejoin="round" />
    </svg>
  )
}

/** Back to the writing road: three letter stops (red, blue, gold) joined by a winding path. */
export function MapIcon() {
  return (
    <svg {...box}>
      <path d="M11 37c8 0 8-13 13-13s5-13 13-13" stroke={GUIDE} strokeWidth={5} />
      <circle cx="11" cy="37" r="7" fill={RED} />
      <circle cx="24" cy="24" r="7" fill={BLUE} />
      <path d="M37 4.5l2.6 5.6 6 .7-4.4 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.4-4.2 6-.7z" fill={STAR} stroke={STAR_DARK} strokeWidth={1.5} />
    </svg>
  )
}

/** Close an overlay. */
export function CloseIcon() {
  return (
    <svg {...box}>
      <path d="M13 13l22 22M35 13 13 35" stroke={INK} strokeWidth={6} />
    </svg>
  )
}

/** The gift box that holds the syllable road (and full-jar treasures). `open` lifts the lid. */
export function GiftIcon({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      <rect x="14" y="44" width="72" height="48" rx="8" fill={RED} />
      <rect x="44" y="44" width="12" height="48" fill={STAR} />
      <g className="gift-lid" style={{ transform: open ? 'translate(-6px,-26px) rotate(-18deg)' : undefined }}>
        <rect x="8" y="30" width="84" height="18" rx="6" fill="var(--color-consonant-dark)" />
        <rect x="44" y="30" width="12" height="18" fill={STAR_DARK} />
        <path d="M50 30c-6-14-26-18-24-6 1 6 14 6 24 6zM50 30c6-14 26-18 24-6-1 6-14 6-24 6z" fill={BLUE} />
      </g>
    </svg>
  )
}
