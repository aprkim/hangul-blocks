// App Store product page header (3840 x 1646) and search results image (3840 x 2560).
// No words, so one image serves every language: ㄱ + ㅏ = 가 in the app's own blocks, inside
// the area Apple always shows (header: 1646 x 661 centered), with faint letter blocks around it.
//
//   node scripts/store-art/header.cjs <out dir>
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const OUT = process.argv[2]
const ROOT = path.resolve(__dirname, '../..')
const font = `@font-face{font-family:P;font-weight:800;src:url(data:font/otf;base64,${fs
  .readFileSync(`${ROOT}/node_modules/pretendard/dist/public/static/Pretendard-ExtraBold.otf`).toString('base64')})}`

const RED = '#D23B2E', RED_D = '#9E2A21', BLUE = '#2259B8', BLUE_D = '#173F85', INK = '#2A2520', CREAM = '#F6EEDD', CARD = '#FFFDF8'
const CONS = [...'ㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'], VOW = [...'ㅑㅓㅕㅗㅛㅜㅠㅡㅣ']

// 가 drawn the way the app and the icon draw it: a straight ㄱ in red, ㅏ in blue (100 grid).
const W = 16, C = [10.5, 21, 34, 46], V = [72.5, 12.5, 12.5, 75]
const X0 = C[0] - W / 2, X1 = V[0] + V[2] + W / 2, Y0 = V[1] - W / 2, Y1 = V[1] + V[3] + W / 2
const st = (c) => `stroke="${c}" stroke-width="${W}" fill="none" stroke-linecap="round" stroke-linejoin="round"`
function ga(size) {
  const k = size / Math.max(X1 - X0, Y1 - Y0)
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="translate(${size / 2 - ((X0 + X1) / 2) * k} ${size / 2 - ((Y0 + Y1) / 2) * k}) scale(${k})"><path d="M${C[0]} ${C[1]}H${C[0] + C[2]}V${C[1] + C[3]}" ${st(RED)}/><path d="M${V[0]} ${V[1]}V${V[1] + V[3]}M${V[0]} ${V[1] + V[3] / 2}H${V[0] + V[2]}" ${st(BLUE)}/></g></svg>`
}

// Deterministic scatter of faint blocks, kept out of the middle.
function scatter(w, h, safeW, safeH, n, size) {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const out = []
  for (let tries = 0; out.length < n && tries < 5000; tries++) {
    const x = rnd() * w, y = rnd() * h
    if (Math.abs(x - w / 2) < safeW / 2 + size * 0.9 && Math.abs(y - h / 2) < safeH / 2 + size * 0.9) continue
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < size * 1.7)) continue
    const vowel = out.length % 3 === 1
    const list = vowel ? VOW : CONS
    out.push({ x, y, ch: list[out.length % list.length], vowel, rot: (rnd() - 0.5) * 28, s: 0.7 + rnd() * 0.5 })
  }
  return out
}

function html(w, h, safeW, safeH) {
  // Block size: the whole row (3 blocks, 2 signs) fits inside the always-visible area.
  const t = Math.min(safeH * 0.62, (safeW * 0.94) / 5.05)
  const deco = scatter(w, h, safeW, safeH, 46, t * 0.8)
  const tile = (ch, bg, dk, size, extra = '') =>
    `<div class="tile" style="width:${size}px;height:${size}px;background:${bg};box-shadow:0 ${size * 0.09}px 0 ${dk};font-size:${size * 0.62}px;border-radius:${size * 0.2}px;${extra}">${ch}</div>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>${font}
  *{margin:0;box-sizing:border-box}
  body{width:${w}px;height:${h}px;overflow:hidden;font-family:P;
    background:radial-gradient(ellipse at 50% 50%, #FBF4E6 0%, ${CREAM} 45%, #EFE2C9 100%)}
  .tile{position:absolute;display:flex;align-items:center;justify-content:center;color:#fff;line-height:1}
  .deco{opacity:.22}
  .row{position:absolute;left:50%;top:50%;translate:-50% -50%;display:flex;align-items:center;gap:${t * 0.22}px}
  .row .tile{position:relative}
  .op{font-size:${t * 0.62}px;color:${INK};opacity:.75;line-height:1;margin-top:-${t * 0.06}px}
  .card{position:relative;display:flex;align-items:center;justify-content:center;width:${t * 1.25}px;height:${t * 1.25}px;
    background:${CARD};border-radius:${t * 0.26}px;box-shadow:0 ${t * 0.1}px 0 #E2D3B5, 0 ${t * 0.3}px ${t * 0.6}px rgba(0,0,0,.10);
    font-size:${t * 0.98}px;line-height:1;color:${INK}}
  </style></head><body>
  ${deco.map((d) => tile(d.ch, d.vowel ? BLUE : RED, d.vowel ? BLUE_D : RED_D, t * 0.8 * d.s, `left:${d.x}px;top:${d.y}px;translate:-50% -50%;rotate:${d.rot}deg`).replace('class="tile"', 'class="tile deco"')).join('')}
  <div class="row">
    ${tile('ㄱ', RED, RED_D, t)}
    <div class="op">+</div>
    ${tile('ㅏ', BLUE, BLUE_D, t)}
    <div class="op">=</div>
    <div class="card">${ga(t * 0.8)}</div>
  </div>
  </body></html>`
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch()
  const p = await b.newPage()
  for (const [name, w, h, sw, sh] of [
    ['header-3840x1646', 3840, 1646, 1646, 661],
    ['search-3840x2560', 3840, 2560, 2168, 1030],
  ]) {
    await p.setViewportSize({ width: w, height: h })
    await p.setContent(html(w, h, sw, sh))
    await p.evaluate(() => document.fonts.ready)
    await p.screenshot({ path: `${OUT}/${name}.png`, omitBackground: false })
    // A copy with the always-visible area outlined, for checking only.
    await p.evaluate(([sw, sh]) => {
      const d = document.createElement('div')
      d.style.cssText = `position:absolute;left:50%;top:50%;width:${sw}px;height:${sh}px;translate:-50% -50%;outline:8px dashed #0a0`
      document.body.appendChild(d)
    }, [sw, sh])
    await p.screenshot({ path: `${OUT}/${name}.safe-check.png` })
  }
  await b.close()
})()
