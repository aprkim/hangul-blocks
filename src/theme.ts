// Background themes. A theme only sets --color-page and --color-card-shadow (see tokens.css);
// tile colors never change. The choice is remembered on this device.

export const THEMES = ['cream', 'sage', 'paper', 'butter', 'blush'] as const
export type ThemeId = (typeof THEMES)[number]
export const DEFAULT_THEME: ThemeId = 'cream'

const KEY = 'soriblocks.theme'

export function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(KEY)
    return THEMES.includes(saved as ThemeId) ? (saved as ThemeId) : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function saveTheme(id: ThemeId) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* storage unavailable: the theme still applies for this session */
  }
}

/** Switch the page to a theme and make the browser/OS chrome (meta theme-color) follow it. */
export function applyTheme(id: ThemeId) {
  const root = document.documentElement
  root.dataset.theme = id
  const page = getComputedStyle(root).getPropertyValue('--color-page').trim()
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  if (page) meta.content = page
}
