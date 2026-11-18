import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { SYLLABLES, JAMO_CHARS } = await vite.ssrLoadModule('/src/progress.ts')
console.log(SYLLABLES.slice(0, 20).map((s) => s.char).join(''))
console.log(JAMO_CHARS.join(''))
await vite.close()
