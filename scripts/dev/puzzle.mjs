import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const m = await vite.ssrLoadModule('/src/puzzleWords.ts')
const need = m.PUZZLE_RECORD_GROUP.items
console.log('total', m.PUZZLE_WORDS.length, 'to record', need.length)
console.log(need.map((i) => `${i.shown}(${i.name})`).join(' '))
console.log('reused:', m.PUZZLE_WORDS.filter((w) => !need.some((i) => i.shown === w.word)).map((w) => `${w.word}(${m.puzzleSound(w.word)})`).join(' '))
const names = m.PUZZLE_WORDS.map((w) => m.puzzleSound(w.word)); console.log('unique names', new Set(names).size === names.length)
await vite.close()
