import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const m = await vite.ssrLoadModule('/src/puzzleWords.ts')
console.log(JSON.stringify(m.PUZZLE_RECORD_GROUP.items.map((i) => [i.name, i.shown])))
await vite.close()
