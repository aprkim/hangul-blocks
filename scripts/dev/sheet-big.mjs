import { createServer } from 'vite'
import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
const [OUT, CHARS] = process.argv.slice(2)
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { fullStrokes } = await vite.ssrLoadModule('/src/hangul.ts')
const { strokePath } = await vite.ssrLoadModule('/src/strokes.ts')
const COL = { consonant: '#D23B2E', vowel: '#2259B8', final: '#D23B2E' }
const chars = [...CHARS]
const cells = chars.map((ch) => {
  const st = fullStrokes(ch) ?? []
  return `<div class=c><svg viewBox="0 0 100 100">${st.map((s) => `<path d="${strokePath(s.stroke)}" stroke="${COL[s.part]}"/>`).join('')}</svg><span>${ch}</span></div>`
}).join('')
const html = `<style>body{margin:12px;background:#F6EEDD;font-family:sans-serif}.g{display:grid;grid-template-columns:repeat(5,240px);gap:8px}.c{background:#fff;border-radius:10px;text-align:center}svg{width:230px;height:230px}path{fill:none;stroke-width:8;stroke-linecap:round;stroke-linejoin:round}span{font-size:28px;display:block;margin-top:-6px}</style><div class=g>${cells}</div>`
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 400 } })
await p.setContent(html); await p.screenshot({ path: OUT, fullPage: true }); await b.close(); await vite.close()
