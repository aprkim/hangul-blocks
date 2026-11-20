// Every sound the app can ask for has a file in public/audio, and no file is unused.
import { createServer } from 'vite'
import fs from 'fs'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { allSoundNames } = await vite.ssrLoadModule('/src/jamo.ts')
const { wordSoundNames } = await vite.ssrLoadModule('/src/words.ts')
const need = new Set([...allSoundNames(), ...wordSoundNames()])
const have = new Set(fs.readdirSync('public/audio').filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)))
const small = [...have].filter((n) => fs.statSync(`public/audio/${n}.mp3`).size < 2000)
console.log('needed', need.size, 'files', have.size)
console.log('missing:', [...need].filter((n) => !have.has(n)).join(' ') || 'none')
console.log('unused:', [...have].filter((n) => !need.has(n)).join(' ') || 'none')
console.log('suspiciously small:', small.join(' ') || 'none')
await vite.close()
