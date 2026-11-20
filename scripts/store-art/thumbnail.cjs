// YouTube thumbnail for the app's intro video (1280 x 720): the app's idea in one glance,
// ㄱ + ㅏ = 가 in its own blocks, with the name. Big shapes, so it still reads when tiny.
//
//   node scripts/store-art/thumbnail.cjs <out dir>
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const OUT = process.argv[2]
const ROOT = path.resolve(__dirname, '../..')
const font = (w, f) => `@font-face{font-family:P;font-weight:${w};src:url(data:font/otf;base64,${fs.readFileSync(`${ROOT}/node_modules/pretendard/dist/public/static/Pretendard-${f}.otf`).toString('base64')})}`
const RED = '#D23B2E', RED_D = '#9E2A21', BLUE = '#2259B8', BLUE_D = '#173F85', INK = '#2A2520', CREAM = '#F6EEDD', CARD = '#FFFDF8', STAR = '#FFC93C', STAR_D = '#F0A20A'
const STAR_PATH = 'M19.8 10.2Q24.0 4.0 28.2 10.2L29.4 11.9Q31.4 14.8 34.8 15.8L36.8 16.4Q44.0 18.5 39.4 24.5L38.1 26.1Q36.0 28.9 36.1 32.4L36.1 34.5Q36.3 42.0 29.3 39.5L27.3 38.8Q24.0 37.6 20.7 38.8L18.7 39.5Q11.7 42.0 11.9 34.5L11.9 32.4Q12.0 28.9 9.9 26.1L8.6 24.5Q4.0 18.5 11.2 16.4L13.2 15.8Q16.6 14.8 18.6 11.9Z'

// 가 as the app draws it: a straight ㄱ in red, ㅏ in blue.
const W = 16, C = [10.5, 21, 34, 46], V = [72.5, 12.5, 12.5, 75]
const X0 = C[0] - W / 2, X1 = V[0] + V[2] + W / 2, Y0 = V[1] - W / 2, Y1 = V[1] + V[3] + W / 2
const st = (c) => `stroke="${c}" stroke-width="${W}" fill="none" stroke-linecap="round" stroke-linejoin="round"`
const ga = (size) => {
  const k = size / Math.max(X1 - X0, Y1 - Y0)
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="translate(${size / 2 - ((X0 + X1) / 2) * k} ${size / 2 - ((Y0 + Y1) / 2) * k}) scale(${k})"><path d="M${C[0]} ${C[1]}H${C[0] + C[2]}V${C[1] + C[3]}" ${st(RED)}/><path d="M${V[0]} ${V[1]}V${V[1] + V[3]}M${V[0]} ${V[1] + V[3] / 2}H${V[0] + V[2]}" ${st(BLUE)}/></g></svg>`
}
const star = (size, x, y, rot) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" style="position:absolute;left:${x}px;top:${y}px;rotate:${rot}deg"><path d="${STAR_PATH}" fill="${STAR}" stroke="${STAR_D}" stroke-width="2.5" stroke-linejoin="round"/></svg>`

const T = 230 // tile size
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${font(800, 'ExtraBold')}${font(700, 'Bold')}
*{margin:0;box-sizing:border-box}
body{width:1280px;height:720px;overflow:hidden;font-family:P;background:${CREAM};position:relative}
.blob{position:absolute;border-radius:50%;background:#E9DCC0;opacity:.55}
.row{position:absolute;left:0;right:0;top:92px;display:flex;align-items:center;justify-content:center;gap:34px}
.tile{width:${T}px;height:${T}px;border-radius:${T * 0.2}px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:${T * 0.62}px;line-height:1}
.op{font-weight:800;font-size:120px;color:${INK};line-height:1;margin-top:-10px}
.card{width:${T * 1.3}px;height:${T * 1.3}px;border-radius:${T * 0.28}px;background:${CARD};display:flex;align-items:center;justify-content:center;box-shadow:0 22px 0 #E2D3B5, 0 0 0 10px ${STAR}}
.name{position:absolute;left:0;right:0;bottom:64px;text-align:center}
.name b{display:block;font-weight:800;font-size:132px;letter-spacing:-3px;color:${INK};line-height:1}
.name span{display:inline-block;margin-top:18px;padding:10px 30px;border-radius:999px;background:${INK};color:#fff;font-weight:700;font-size:46px}
</style></head><body>
<div class="blob" style="width:300px;height:300px;left:-90px;top:-80px"></div>
<div class="blob" style="width:420px;height:420px;right:-150px;bottom:-170px"></div>
<div class="blob" style="width:150px;height:150px;left:70px;bottom:50px"></div>
<div class="row">
  <div class="tile" style="background:${RED};box-shadow:0 20px 0 ${RED_D}">ㄱ</div>
  <div class="op">+</div>
  <div class="tile" style="background:${BLUE};box-shadow:0 20px 0 ${BLUE_D}">ㅏ</div>
  <div class="op">=</div>
  <div class="card">${ga(T * 0.98)}</div>
</div>
${star(110, 1090, 40, 14)}${star(70, 1010, 20, -10)}${star(84, 250, 400, -14)}
<div class="name"><b>소리블록</b><span>유아 한글떼기 · Sori Blocks</span></div>
</body></html>`

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
  await p.setContent(html)
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${OUT}/youtube-thumbnail-1280x720.png` })
  await b.close()
  console.log('wrote', `${OUT}/youtube-thumbnail-1280x720.png`)
})()
