// Plain app screens for the store screenshots, at every device size, from the web build.
// A made-up child (하늘, a rabbit) with some progress, so the screens look lived in.
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/store-shots/capture.cjs <raw dir>
//   node scripts/store-shots/compose.cjs <raw dir> store/captioned
const { chromium } = require('playwright')
const fs = require('fs')

const OUT = process.argv[2]
const URL = 'http://localhost:4173/play/'
// CSS size x device scale = the store's pixel size.
const DEVICES = [
  { name: 'ipad-13', w: 1376, h: 1032, dsf: 2 },
  { name: 'iphone-6.9', w: 956, h: 440, dsf: 3 },
  { name: 'iphone-6.5', w: 896, h: 414, dsf: 3 },
  { name: 'iphone-6.3', w: 874, h: 402, dsf: 3 },
  { name: 'play-phone', w: 960, h: 540, dsf: 2 },
  { name: 'play-tablet', w: 1280, h: 720, dsf: 2 },
]

const seed = () => {
  if (sessionStorage.getItem('seeded')) return
  sessionStorage.setItem('seeded', '1')
  localStorage.clear()
  sessionStorage.setItem('parent-gate-passed', '1')
  const written = {}
  for (const c of 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ가갸거고구나너노누마모무바보부') written[c] = 1
  localStorage.setItem('soriblocks.children.v1', JSON.stringify({ list: [{ id: 'c1', name: '하늘', animal: '🐰' }], current: 'c1' }))
  localStorage.setItem('soriblocks.progress.v1', JSON.stringify({ written, stars: 37, jar: 7, treasures: ['🦖', '🚀', '🍦'], pendingGift: null, syllablesOpen: true, setsOpen: 1 }))
  localStorage.setItem('soriblocks.puzzle.v1', JSON.stringify({ solved: ['코', '소', '비', '차'] }))
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  localStorage.setItem('soriblocks.daily.v1', JSON.stringify({ days: { [key]: { letters: 3, words: 2 } } }))
  localStorage.setItem(
    'soriblocks.scenes.v1',
    JSON.stringify({
      home: [], sea: [], space: [],
      park: [
        { key: 1, id: 'p:소', x: 0.3, y: 0.7, s: 1.9 },
        { key: 2, id: 't:🚀', x: 0.16, y: 0.24, s: 1.4 },
        { key: 3, id: 'p:차', x: 0.62, y: 0.72, s: 1.4 },
        { key: 4, id: 't:🦖', x: 0.84, y: 0.6, s: 1.9 },
        { key: 5, id: 's:나', x: 0.52, y: 0.3, s: 1 },
      ],
    }),
  )
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch()
  for (const dev of DEVICES) {
    const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.dsf, hasTouch: true, locale: 'ko-KR' })
    await ctx.addInitScript(seed)
    const p = await ctx.newPage()
    const shot = (scene) => p.screenshot({ path: `${OUT}/${dev.name}-${scene}.png` })
    const tab = async (label) => { await p.locator(`[aria-label=${label}]`).click({ force: true }); await p.waitForTimeout(600) }
    const tile = async (ch, wait = 350) => {
      const bb = await p.locator('.tray .tile', { hasText: ch }).first().boundingBox()
      await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(wait)
    }
    await p.goto(URL); await p.waitForTimeout(3000)
    await shot('sound')

    await tab('build'); await tile('ㄱ'); await tile('ㅏ', 2300); await shot('build')

    // The word puzzle: 나비 with 나 built and ㅂ picked.
    await tab('words'); await tile('ㄴ'); await tile('ㅏ', 1400); await tile('ㅂ', 500); await shot('puzzle')

    await tab('write'); await shot('road')

    // Tracing 가 to the end: the star, and its picture word.
    await p.locator('.road-stop[data-char="가"]').click(); await p.waitForTimeout(700)
    const parse = (d) => d.match(/[ML][^ML]+/g).map((s) => s.slice(1).trim().split(/\s+/).map(Number))
    for (let i = 0; i < 6 && (await p.locator('.stroke-demo').count()); i++) {
      const pts = parse(await p.locator('.stroke-demo').getAttribute('d'))
      const bb = await p.locator('.write-card svg').boundingBox()
      const X = (x) => bb.x + (x / 100) * bb.width, Y = (y) => bb.y + (y / 100) * bb.height
      await p.mouse.move(X(pts[0][0]), Y(pts[0][1])); await p.mouse.down()
      for (let j = 1; j < pts.length; j++) for (let k = 1; k <= 6; k++) await p.mouse.move(X(pts[j - 1][0] + ((pts[j][0] - pts[j - 1][0]) * k) / 6), Y(pts[j - 1][1] + ((pts[j][1] - pts[j - 1][1]) * k) / 6))
      await p.mouse.up(); await p.waitForTimeout(700)
    }
    await p.waitForTimeout(1500); await shot('write')

    // Sticker play on the park scene.
    await p.goto(URL); await p.waitForTimeout(3000)
    await tab('write')
    await p.locator('#star-jar').click({ force: true }); await p.waitForTimeout(700)
    await p.locator('[aria-label="sticker play"]').dispatchEvent('pointerdown'); await p.waitForTimeout(400)
    await p.locator('[aria-label=park]').dispatchEvent('pointerdown'); await p.waitForTimeout(600)
    await shot('play')
    await ctx.close()
  }

  // The parents' page (it has text): once per language, the family-voice card.
  for (const lang of ['ko', 'en']) {
    const ctx = await b.newContext({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 2 })
    await ctx.addInitScript(seed)
    const p = await ctx.newPage()
    await p.goto(`${URL}?record&lang=${lang}`); await p.waitForTimeout(900)
    const card = p.locator('.parent-card').filter({ has: p.locator('.rec-card') })
    await card.scrollIntoViewIfNeeded()
    const bb = await card.boundingBox()
    const file = `${OUT}/parent-${lang}.png`
    await p.screenshot({ path: file, clip: { x: bb.x, y: bb.y, width: bb.width, height: Math.min(bb.height, 620) } })
    for (const dev of DEVICES) fs.copyFileSync(file, `${OUT}/${dev.name}-parent-${lang}.png`)
    fs.unlinkSync(file)
    await ctx.close()
  }
  await b.close()
  console.log('captured', fs.readdirSync(OUT).length, 'files')
})()
