import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { fullStrokes, decompose } = await vite.ssrLoadModule('/src/hangul.ts')
for (const ch of process.argv[2]) { console.log(ch, JSON.stringify(decompose(ch))); for (const s of fullStrokes(ch)) console.log(' ', s.part, s.stroke.map(p=>p.map(n=>+n.toFixed(1)).join(',')).join(' ')) }
await vite.close()
