import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const w = await vite.ssrLoadModule('/src/words.ts')
console.log(JSON.stringify(w.MORE_WORD_RECORD_GROUP.items.map((i) => [i.name, i.shown])))
await vite.close()
