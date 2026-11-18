// Every Hangul syllable: each stroke traced along itself is accepted, and how close parts come.
import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { fullStrokes } = await vite.ssrLoadModule('/src/hangul.ts')
const { traceMatches, sample, gap } = await vite.ssrLoadModule('/src/strokes.ts')
let bad = 0, n = 0, total = 0
const close = []
const t0 = Date.now()
for (let code = 0xac00; code <= 0xd7a3; code++) {
  const ch = String.fromCharCode(code)
  const st = fullStrokes(ch)
  if (!st || !st.length) { console.log('no strokes', ch); continue }
  n++
  for (const s of st) { total++; if (!traceMatches(s.stroke, sample(s.stroke, 1))) { bad++; if (bad < 10) console.log('trace fails', ch, s.part) } }
  const by = (p) => st.filter((s) => s.part === p).map((s) => s.stroke)
  const c = by('consonant'), v = by('vowel'), f = by('final')
  const g = Math.min(gap(c, v), f.length ? gap(v, f) : Infinity, f.length ? gap(c, f) : Infinity)
  close.push([g, ch])
}
close.sort((a, b) => a[0] - b[0])
console.log('syllables', n, 'strokes', total, 'bad traces', bad, 'secs', ((Date.now() - t0) / 1000).toFixed(1))
console.log('closest parts:', close.slice(0, 25).map(([g, ch]) => ch + g.toFixed(1)).join(' '))
const under = (x) => close.filter(([g]) => g < x).length
console.log('under 13:', under(13), 'under 11:', under(11), 'under 9:', under(9))
await vite.close()
