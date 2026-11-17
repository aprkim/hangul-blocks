import type { SceneId } from '../keepsakes'

// The four play-scene backgrounds: flat, soft shapes on a 160 x 100 canvas that fills its box
// (sliced, so it covers any shape of screen). Colors are tokens (src/tokens.css).

const C = (name: string) => `var(--color-scene-${name})`

function Home() {
  return (
    <>
      <rect width="160" height="100" fill={C('wall')} />
      <rect x="0" y="66" width="160" height="34" fill={C('floor')} />
      {[18, 46, 74, 102, 130].map((x) => (
        <path key={x} d={`M${x} 66v34`} stroke={C('floor-dark')} strokeWidth="0.8" />
      ))}
      <rect x="98" y="14" width="40" height="32" rx="3" fill={C('sky')} stroke={C('white')} strokeWidth="2.5" />
      <path d="M118 14v32M98 30h40" stroke={C('white')} strokeWidth="2" />
      <circle cx="129" cy="22" r="4" fill={C('sun')} />
      <ellipse cx="62" cy="84" rx="38" ry="9" fill={C('rug')} />
    </>
  )
}

function Park() {
  return (
    <>
      <rect width="160" height="100" fill={C('sky')} />
      <circle cx="134" cy="20" r="10" fill={C('sun')} />
      <path d="M0 70C30 56 60 58 90 66s50 6 70-4v38H0z" fill={C('grass-dark')} />
      <path d="M0 78c40-12 80-12 160 0v22H0z" fill={C('grass')} />
      <rect x="28" y="44" width="5" height="26" rx="2" fill={C('tree')} />
      <circle cx="30.5" cy="38" r="14" fill={C('grass-dark')} />
    </>
  )
}

function Sea() {
  return (
    <>
      <rect width="160" height="100" fill={C('sky')} />
      <circle cx="30" cy="20" r="9" fill={C('sun')} />
      <rect x="0" y="44" width="160" height="40" fill={C('sea')} />
      <path d="M0 52q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" fill="none" stroke={C('sea-dark')} strokeWidth="1.5" />
      <path d="M0 66q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" fill="none" stroke={C('sea-dark')} strokeWidth="1.5" />
      <path d="M0 84c40-6 120-6 160 0v16H0z" fill={C('sand')} />
    </>
  )
}

const STARS = [
  [12, 14], [34, 30], [58, 10], [82, 24], [104, 8], [126, 30], [148, 14],
  [20, 52], [46, 70], [70, 48], [96, 64], [118, 50], [142, 72], [28, 88], [86, 90], [130, 92],
]

function Space() {
  return (
    <>
      <rect width="160" height="100" fill={C('night')} />
      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.3 : 0.8} fill={C('white')} />
      ))}
      <circle cx="122" cy="62" r="16" fill={C('planet')} />
      <ellipse cx="122" cy="62" rx="26" ry="6" fill="none" stroke={C('sun')} strokeWidth="2" transform="rotate(-15 122 62)" />
      <circle cx="36" cy="80" r="26" fill={C('night-light')} />
    </>
  )
}

const ART: Record<SceneId, () => React.JSX.Element> = { home: Home, park: Park, sea: Sea, space: Space }

export function SceneArt({ scene, className }: { scene: SceneId; className?: string }) {
  const Art = ART[scene]
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <Art />
    </svg>
  )
}
