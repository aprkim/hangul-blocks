// How long the modules take to evaluate before the first screen can draw.
import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
for (const m of ['/src/strokes.ts', '/src/progress.ts', '/src/hangul.ts', '/src/puzzleWords.ts', '/src/components/WriteBoard.tsx']) {
  const t = performance.now(); await vite.ssrLoadModule(m); console.log(m, (performance.now() - t).toFixed(0), 'ms')
}
await vite.close()
