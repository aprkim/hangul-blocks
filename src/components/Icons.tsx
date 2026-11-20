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

/** Word puzzle tab: a picture (a gold star) and the boxes to build its word in, one filled. */
export function PuzzleIcon() {
  return (
    <svg {...box}>
      <path d="M24 3l3.6 7.4 8.1 1-5.9 5.6 1.5 8-7.3-4-7.3 4 1.5-8-5.9-5.600 8.100-1z" fill="var(--color-star)" stroke="var(--color-star-dark)" strokeWidth={2} />
      <rect x="5" y="29" width="17" height="16" rx="5" fill={RED} />
      <rect x="26.500" y="30.500" width="15" height="13" rx="4" stroke={GUIDE} strokeWidth={3} strokeDasharray="4 3.5" />
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
/** The grown-ups' page: a padlock (behind the grown-up question). */
export function ParentIcon() {
  return (
    <svg {...box}>
      <path d="M15 21v-6a9 9 0 0 1 18 0v6" stroke={INK} strokeWidth={4.5} />
      <rect x="9" y="20" width="30" height="23" rx="6" fill={INK} />
      <circle cx="24" cy="29.5" r="3.4" fill={ON_TILE} />
      <path d="M24 31v5.5" stroke={ON_TILE} strokeWidth={3.4} />
    </svg>
  )
}

const STAR = 'var(--color-star)'
const STAR_DARK = 'var(--color-star-dark)'
// A chubby star: wide between the points, every tip and inner corner rounded (48 x 48).
export const STAR_PATH =
  'M19.8 10.2Q24.0 4.0 28.2 10.2L29.4 11.9Q31.4 14.8 34.8 15.8L36.8 16.4Q44.0 18.5 39.4 24.5L38.1 26.1Q36.0 28.9 36.1 32.4L36.1 34.5Q36.3 42.0 29.3 39.5L27.3 38.8Q24.0 37.6 20.7 38.8L18.7 39.5Q11.7 42.0 11.9 34.5L11.9 32.4Q12.0 28.9 9.9 26.1L8.6 24.5Q4.0 18.5 11.2 16.4L13.2 15.8Q16.6 14.8 18.6 11.9Z'

/**
 * The day's trophy, drawn in the app's own flat style and colors (the emoji one clashed):
 * a yellow cup with a white star, on a blue base.
 */
export function TrophyArt({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* handles */}
      <path d="M56 58C18 56 20 112 66 112M144 58C182 56 180 112 134 112" stroke={STAR_DARK} strokeWidth={13} />
      {/* stem and base */}
      <path d="M100 128V160" stroke={STAR_DARK} strokeWidth={22} strokeLinecap="butt" />
      <rect x="56" y="154" width="88" height="28" rx="10" fill={BLUE} />
      <rect x="78" y="162" width="44" height="12" rx="6" fill={ON_TILE} opacity={0.9} />
      {/* cup */}
      <path d="M48 44H152V78C152 116 128 138 100 138C72 138 48 116 48 78Z" fill={STAR} />
      <path d="M64 56V80C64 96 70 108 80 116" stroke={ON_TILE} strokeWidth={9} opacity={0.55} />
      <rect x="40" y="30" width="120" height="22" rx="11" fill={STAR} stroke={STAR_DARK} strokeWidth={5} />
      {/* star */}
      <path d={STAR_PATH} transform="translate(69 53) scale(1.3)" fill={ON_TILE} />
    </svg>
  )
}

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

/** Sticker book: a little book with a star sticker on its cover. */
export function BookIcon() {
  return (
    <svg {...box}>
      <rect x="9" y="6" width="30" height="36" rx="5" fill={RED} />
      <path d="M15 6v36" stroke="var(--color-consonant-dark)" strokeWidth={3} />
      <path d="M27 14.5l2.3 4.8 5.2.6-3.9 3.6 1 5.2-4.6-2.6-4.6 2.6 1-5.2-3.9-3.6 5.2-.6z" fill={STAR} stroke={STAR_DARK} strokeWidth={1.2} />
    </svg>
  )
}

/** Play scenes: a hill under a sun, with a sticker on it. */
export function SceneIcon() {
  return (
    <svg {...box}>
      <rect x="4" y="8" width="40" height="32" rx="7" fill="var(--color-scene-sky)" />
      <circle cx="34" cy="17" r="5" fill="var(--color-scene-sun)" />
      <path d="M4 33c8-9 18-9 26-3 5-3 10-3 14 0v3a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7z" fill="var(--color-scene-grass)" />
      <rect x="13" y="20" width="10" height="10" rx="3" fill={BLUE} />
    </svg>
  )
}

/** The child's handwriting on the fridge: a paper with a red ㄱ held by a magnet. */
export function FridgeIcon() {
  return (
    <svg {...box}>
      <rect x="9" y="9" width="30" height="34" rx="3" fill="var(--color-card)" stroke={CARD_SHADOW} strokeWidth={2.5} transform="rotate(-5 24 26)" />
      <path d="M16 20h13v13" stroke={RED} strokeWidth={4.5} transform="rotate(-5 24 26)" />
      <circle cx="24" cy="8" r="5" fill={BLUE} />
    </svg>
  )
}

/** Clear a play scene: a little broom sweeping. */
export function SweepIcon() {
  return (
    <svg {...box}>
      <path d="M33 6 22 25" stroke={INK} strokeWidth={4.5} />
      <path d="M14 23l14 8-5 12c-5 1-12-3-15-7z" fill={STAR} stroke={STAR_DARK} strokeWidth={2} />
      <path d="M13 36l4 2M16 31l5 3" stroke={STAR_DARK} strokeWidth={2} />
    </svg>
  )
}

/** Undo: an arrow curling back. */
export function UndoIcon() {
  return (
    <svg {...box}>
      <path d="M14 20h16a10 10 0 0 1 0 20H20" stroke={INK} strokeWidth={5} />
      <path d="M21 11l-9 9 9 9" stroke={INK} strokeWidth={5} />
    </svg>
  )
}

/** Sticker size: a small dot beside a big circle, with the one meant filled in. */
export function SizeIcon({ big }: { big: boolean }) {
  return (
    <svg {...box}>
      {big ? (
        <>
          <circle cx="11" cy="31" r="4" stroke={GUIDE} strokeWidth={3} />
          <circle cx="30" cy="22" r="13" fill={BLUE} />
          <path d="M30 15v14M23 22h14" stroke={ON_TILE} strokeWidth={4} />
        </>
      ) : (
        <>
          <circle cx="15" cy="24" r="6" fill={RED} />
          <path d="M11 24h8" stroke={ON_TILE} strokeWidth={3} />
          <circle cx="33" cy="24" r="10" stroke={GUIDE} strokeWidth={3} />
        </>
      )}
    </svg>
  )
}
