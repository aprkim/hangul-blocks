// Small celebration effects drawn straight into the page (no React state): a star that flies
// into the star jar, and confetti in the app's colors.

import { STAR_PATH } from './components/Icons'

const SVG_NS = 'http://www.w3.org/2000/svg'

function starElement(size: number): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'fx-star'
  el.style.width = el.style.height = `${size}px`
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 48 48')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', STAR_PATH)
  svg.append(path)
  el.append(svg)
  return el
}

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** A star pops out of `from` and arcs into the star jar; `onLand` runs as it arrives. */
export function flyStar(from: DOMRect, onLand: () => void) {
  const jar = document.getElementById('star-jar')?.getBoundingClientRect()
  if (!jar || reduceMotion()) {
    onLand()
    return
  }
  const size = Math.max(56, Math.min(from.width, from.height) * 0.22)
  const el = starElement(size)
  document.body.append(el)
  const x0 = from.left + from.width / 2 - size / 2
  const y0 = from.top + from.height / 2 - size / 2
  const x1 = jar.left + jar.width / 2 - size / 2
  const y1 = jar.top + jar.height * 0.6 - size / 2
  const midY = Math.min(y0, y1) - 80
  const anim = el.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) scale(0.2) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${x0}px, ${y0}px) scale(1.25) rotate(20deg)`, opacity: 1, offset: 0.22 },
      { transform: `translate(${x0}px, ${y0}px) scale(1) rotate(0deg)`, opacity: 1, offset: 0.36 },
      { transform: `translate(${(x0 + x1) / 2}px, ${midY}px) scale(0.8) rotate(-120deg)`, opacity: 1, offset: 0.68 },
      { transform: `translate(${x1}px, ${y1}px) scale(0.35) rotate(-300deg)`, opacity: 1 },
    ],
    { duration: 1100, easing: 'cubic-bezier(.45,.05,.4,1)' },
  )
  anim.onfinish = () => {
    el.remove()
    onLand()
  }
}

const CONFETTI_COLORS = ['var(--color-consonant)', 'var(--color-vowel)', 'var(--color-star)']

/** A burst of confetti from a point (defaults to the top middle of the screen). */
export function confetti(at?: DOMRect) {
  if (reduceMotion()) return
  const cx = at ? at.left + at.width / 2 : window.innerWidth / 2
  const cy = at ? at.top + at.height / 2 : window.innerHeight * 0.3
  for (let i = 0; i < 46; i++) {
    const el = document.createElement('div')
    el.className = 'fx-confetti'
    const w = 10 + Math.random() * 10
    el.style.width = `${w}px`
    el.style.height = `${w * (Math.random() < 0.5 ? 0.5 : 1)}px`
    el.style.background = CONFETTI_COLORS[i % 3]
    if (i % 4 === 0) el.style.borderRadius = '50%'
    document.body.append(el)
    const angle = Math.random() * Math.PI * 2
    const speed = 160 + Math.random() * 260
    const dx = Math.cos(angle) * speed
    const dy = Math.sin(angle) * speed - 180
    const spin = (Math.random() - 0.5) * 900
    el.animate(
      [
        { transform: `translate(${cx}px, ${cy}px) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${cx + dx}px, ${cy + dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${cx + dx * 1.3}px, ${cy + dy + 420}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)' },
    ).onfinish = () => el.remove()
  }
}
