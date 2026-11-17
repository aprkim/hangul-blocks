// App Store preview video (iPad, 1600 x 1200, about 20 seconds), recorded from the web build:
// intro -> Sound -> Build 가, 고 -> Write 가 -> sticker play. The browser recording has no
// sound, so every sound the app plays is logged with its time and mixed back in afterwards
// from public/audio (the reward chimes are re-made as tones).
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/store-shots/preview.cjs <work dir>      -> <work dir>/preview-ipad.mp4
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const WORK = process.argv[2]
const ROOT = path.resolve(__dirname, '../..')
const W = 1600, H = 1200

;(async () => {
  fs.mkdirSync(WORK, { recursive: true })
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
  // Set up the progress first (a page that is not recorded).
  const setup = await b.newContext({ viewport: { width: W, height: H } })
  const sp = await setup.newPage()
  await sp.goto('http://localhost:4173/play/')
  const state = await sp.evaluate(() => {
    const CONS = [...'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'], VOW = [...'ㅏㅑㅓㅕㅣㅗㅛㅜㅠㅡ']
    const written = Object.fromEntries([...CONS, ...VOW, '고', '나', '무'].map((c) => [c, 1]))
    return {
      'soriblocks.progress.v1': JSON.stringify({ written, stars: 27, jar: 7, treasures: ['🦖', '🚀'], pendingGift: null, syllablesOpen: true, setsOpen: 1 }),
      'soriblocks.scenes.v1': JSON.stringify({ home: [], sea: [], space: [], park: [
        { key: 1, id: 's:고', x: 0.24, y: 0.72, s: 1.4 }, { key: 2, id: 's:나', x: 0.52, y: 0.3, s: 1 }, { key: 3, id: 't:🚀', x: 0.15, y: 0.26, s: 1 } ] }),
    }
  })
  await setup.close()

  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: WORK, size: { width: W, height: H } }, hasTouch: true })
  await ctx.addInitScript((st) => {
    if (!sessionStorage.getItem('seeded')) {
      for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v)
      sessionStorage.setItem('seeded', '1')
    }
    // Log every sound: <audio> fallbacks and Web Audio clips both start from a fetched URL.
    window.__sounds = []
    const t0 = performance.timeOrigin
    const origStart = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (...a) {
      if (this.buffer && this.buffer.__name) window.__sounds.push({ name: this.buffer.__name, at: Date.now() })
      else if (this.buffer && this.buffer.length > 1) window.__sounds.push({ name: '?', at: Date.now() })
      return origStart.apply(this, a)
    }
    const origDecode = BaseAudioContext.prototype.decodeAudioData
    const urlOf = new WeakMap()
    const origArrayBuffer = Response.prototype.arrayBuffer
    Response.prototype.arrayBuffer = async function () {
      const buf = await origArrayBuffer.call(this)
      urlOf.set(buf, this.url)
      return buf
    }
    BaseAudioContext.prototype.decodeAudioData = async function (buf, ...rest) {
      const url = urlOf.get(buf)
      const out = await origDecode.call(this, buf, ...rest)
      if (url) out.__name = url.split('/').pop().replace('.mp3', '')
      return out
    }
    // Reward chimes are synthesized: log them as such.
    const origOsc = BaseAudioContext.prototype.createOscillator
    let lastChime = 0
    BaseAudioContext.prototype.createOscillator = function () {
      if (Date.now() - lastChime > 150) { window.__sounds.push({ name: 'chime', at: Date.now() }); lastChime = Date.now() }
      return origOsc.call(this)
    }
    void t0
  }, state)

  const p = await ctx.newPage()
  const videoStart = Date.now()
  await p.goto('http://localhost:4173/play/')
  await p.waitForTimeout(400)
  const clickStart = Date.now()
  await p.mouse.click(W / 2, H / 2) // unlocks audio (a parent's first touch); also skips nothing: intro restarts below
  await p.reload()
  await p.waitForTimeout(1700) // the intro: ㄱ and ㅏ snap into 가

  const tap = async (sel, wait = 650) => {
    const bb = await p.locator(sel).first().boundingBox()
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 6 })
    await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up()
    await p.waitForTimeout(wait)
  }
  // Sound
  await tap('.board-grid .tile >> nth=0', 550)  // ㄱ
  await tap('.board-grid >> nth=1 >> .tile >> nth=0', 550) // ㅏ
  // Build: 가 then 고
  await tap('[aria-label=build]', 500)
  await tap('.tray button:has-text("ㄱ")', 450)
  await tap('.tray button:has-text("ㅏ")', 2100)
  await tap('.tray button:has-text("ㅗ")', 2100)
  // Write 가
  await tap('[aria-label=write]', 700)
  await tap('.road-stop[data-char="가"]', 700)
  const parse = (d) => d.match(/[ML][^ML]+/g).map((s) => s.slice(1).trim().split(/\s+/).map(Number))
  for (let i = 0; i < 6 && (await p.locator('.stroke-demo').count()); i++) {
    const pts = parse(await p.locator('.stroke-demo').getAttribute('d'))
    const bb = await p.locator('.write-card svg').boundingBox()
    const X = (x) => bb.x + (x / 100) * bb.width, Y = (y) => bb.y + (y / 100) * bb.height
    await p.mouse.move(X(pts[0][0]), Y(pts[0][1]), { steps: 4 }); await p.mouse.down()
    for (let j = 1; j < pts.length; j++) for (let k = 1; k <= 7; k++) {
      await p.mouse.move(X(pts[j - 1][0] + ((pts[j][0] - pts[j - 1][0]) * k) / 7), Y(pts[j - 1][1] + ((pts[j][1] - pts[j - 1][1]) * k) / 7))
    }
    await p.mouse.up(); await p.waitForTimeout(120)
  }
  await p.waitForTimeout(2300)
  // Sticker play: open the jar, the park scene, drag the new 가방 sticker in, tap it
  await tap('#star-jar', 600)
  await tap('[aria-label="sticker play"]', 400)
  await tap('[aria-label=park]', 500)
  const item = p.locator('.play-tray-item[aria-label="가방"]')
  await item.scrollIntoViewIfNeeded()
  await p.waitForTimeout(300)
  const ib = await item.boundingBox(), sc = await p.locator('.play-scene').boundingBox()
  await p.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 4 }); await p.mouse.down()
  await p.mouse.move(sc.x + sc.width * 0.66, sc.y + sc.height * 0.62, { steps: 22 }); await p.mouse.up()
  await p.waitForTimeout(1400)
  await tap('.play-placed[aria-label="고양이"]', 1300)

  const sounds = await p.evaluate(() => window.__sounds)
  const end = Date.now()
  await ctx.close() // writes the video
  await b.close()

  const webm = fs.readdirSync(WORK).filter((f) => f.endsWith('.webm')).map((f) => path.join(WORK, f)).sort((a, b2) => fs.statSync(b2).mtimeMs - fs.statSync(a).mtimeMs)[0]
  // Cut the loading and first reload; keep from the intro on.
  const cut = (clickStart - videoStart) / 1000 + 0.35
  const dur = (end - videoStart) / 1000 - cut
  const used = sounds.filter((s) => s.name !== '?' && (s.at - videoStart) / 1000 >= cut)
  const inputs = [], filters = []
  used.forEach((s, i) => {
    const file = s.name === 'chime' ? null : `${ROOT}/public/audio/${s.name}.mp3`
    if (file && !fs.existsSync(file)) return
    const delay = Math.max(0, Math.round(((s.at - videoStart) / 1000 - cut) * 1000))
    if (file) inputs.push('-i', file)
    else inputs.push('-f', 'lavfi', '-t', '0.45', '-i', 'sine=frequency=1318:sample_rate=48000')
    const k = inputs.filter((x) => x === '-i').length
    filters.push(`[${k}:a]aresample=48000,aformat=channel_layouts=stereo,${file ? '' : 'volume=0.18,afade=t=out:st=0.05:d=0.4,'}adelay=${delay}|${delay}[a${i}]`)
  })
  const labels = filters.map((f) => f.slice(f.lastIndexOf('[')))
  const mix = labels.length ? `${filters.join(';')};${labels.join('')}amix=inputs=${labels.length}:normalize=0,apad[aout]` : 'anullsrc=r=48000:cl=stereo[aout]'
  const out = path.join(WORK, 'preview-ipad.mp4')
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', cut.toFixed(2), '-i', webm, ...inputs,
    '-filter_complex', `[0:v]fps=30,scale=${W}:${H},format=yuv420p[v];${mix}`,
    '-map', '[v]', '-map', '[aout]', '-t', Math.min(29.5, dur).toFixed(2),
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '18', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', out])
  console.log('sounds:', used.map((s) => s.name).join(' '))
  console.log('wrote', out, `${Math.min(29.5, dur).toFixed(1)}s`)
})()
