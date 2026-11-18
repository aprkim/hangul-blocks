// Captioned store screenshots: a headline and a line of copy over a colored backdrop, with the
// app's own screen below (or beside, on very wide phone canvases).
//
//   node scripts/store-shots/compose.cjs <raw dir> <out dir>
//
// <raw dir> holds plain app captures named <device>-<scene>.png (see README in this folder).
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const [RAW, OUT] = process.argv.slice(2)
const ROOT = path.resolve(__dirname, '../..')
const font = (w) =>
  `@font-face{font-family:P;font-weight:${w};src:url(data:font/otf;base64,${fs
    .readFileSync(`${ROOT}/node_modules/pretendard/dist/public/static/Pretendard-${w === 800 ? 'ExtraBold' : w === 700 ? 'Bold' : 'SemiBold'}.otf`)
    .toString('base64')})}`

// Canvas sizes the stores accept, and which raw capture goes in each.
const CANVASES = [
  { name: 'ipad-13', w: 2752, h: 2064, raw: 'ipad-13' },
  { name: 'iphone-6.9', w: 2868, h: 1320, raw: 'iphone-6.9' },
  { name: 'iphone-6.5', w: 2688, h: 1242, raw: 'iphone-6.5' },
  { name: 'iphone-6.3', w: 2622, h: 1206, raw: 'iphone-6.3' },
  { name: 'play-phone-1920x1080', w: 1920, h: 1080, raw: 'play-phone' },
  { name: 'play-tablet7-1920x1080', w: 1920, h: 1080, raw: 'play-tablet' },
  { name: 'play-tablet10-2560x1440', w: 2560, h: 1440, raw: 'play-tablet' },
]

const RED = '#D23B2E', BLUE = '#2259B8', GOLD = '#F4B400', GREEN = '#4E9E4A', INK = '#2A2520', CREAM = '#F6EEDD'

// The story, in the order a parent sees it.
const SLIDES = [
  { scene: 'build', bg: RED, fg: '#fff',
    ko: ['ㄱ + ㅏ = 가', '소리를 조립하면 글자가 돼요'],
    en: ['ㄱ + ㅏ = 가', 'Snap sounds together into letters'] },
  { scene: 'sound', bg: BLUE, fg: '#fff',
    ko: ['ㄱ은 ‘기역’이 아니라 ‘그’', '이름이 아니라 소리로 시작해요'],
    en: ['ㄱ says “g”', 'Sounds first, not letter names'] },
  { scene: 'write', bg: GOLD, fg: INK,
    ko: ['따라 쓰면 별이 쏙', '글자를 쓰면 그림 단어 스티커가 와요'],
    en: ['Trace it, earn a star', 'Every syllable written brings a picture sticker'] },
  { scene: 'play', bg: GREEN, fg: '#fff',
    ko: ['스티커로 꾸미며 다시 들어요', '붙인 스티커를 누르면 단어를 말해 줘요'],
    en: ['Play with every word', 'Tap a sticker to hear its word again'] },
  { scene: 'parent', bg: INK, fg: '#fff', perLang: true,
    ko: ['우리 가족 목소리로', '엄마, 아빠, 할머니 목소리로 바꿀 수 있어요'],
    en: ["In your family's voice", 'Record any sound as mom, dad or grandma'] },
  { scene: 'road', bg: RED, fg: '#fff',
    ko: ['광고 없음 · 결제 없음', '인터넷 없이, 아이 속도대로 140글자'],
    en: ['No ads. No purchases.', 'Works offline: 140 syllables at your child’s pace'] },
]

const dataUrl = (file) => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`

function html(c, slide, lang, img) {
  const side = c.w / c.h > 1.8 // very wide phone canvases: words left, screen right
  const [title, sub] = slide[lang]
  const u = Math.min(c.w, c.h * 1.33) / 100 // type unit
  // Wide canvases: the screen's right margin matches the space above and below it (82% tall).
  const edge = Math.round(c.h * 0.09)
  return `<!doctype html><html><head><meta charset="utf-8"><style>${font(800)}${font(600)}
  *{box-sizing:border-box;margin:0}
  body{width:${c.w}px;height:${c.h}px;overflow:hidden;background:${slide.bg};color:${slide.fg};font-family:P;word-break:keep-all}
  .wrap{position:absolute;inset:0;display:flex;${side ? 'flex-direction:row;align-items:center' : 'flex-direction:column;align-items:center'};
    padding:${side ? `0 ${edge}px` : `${u * 5}px ${u * 4}px 0`};gap:${u * (side ? 4 : 3.2)}px}
  .words{${side ? `flex:0 0 36%` : 'text-align:center'}}
  h1{font-weight:800;font-size:${u * (side ? 8 : 7.6)}px;line-height:1.15;letter-spacing:-0.02em}
  p{font-weight:600;font-size:${u * (side ? 3.8 : 3.8)}px;line-height:1.35;margin-top:${u * 1.4}px;opacity:.9}
  .shot{${side ? 'flex:1;height:82%' : 'flex:1;width:100%'};min-height:0;display:flex;align-items:${side ? 'center' : 'flex-start'};justify-content:center}
  .shot img{max-width:100%;max-height:${side ? '100%' : `calc(100% - ${u * 4}px)`};border-radius:${u * 2.2}px;
    box-shadow:0 ${u * 1.2}px ${u * 4}px rgba(0,0,0,.28);background:${CREAM}}
  </style></head><body><div class="wrap"><div class="words"><h1>${title}</h1><p>${sub}</p></div>
  <div class="shot"><img src="${img}"></div></div></body></html>`
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch()
  const p = await b.newPage()
  let n = 0
  for (const c of CANVASES) {
    await p.setViewportSize({ width: c.w, height: c.h })
    for (const lang of ['ko', 'en']) {
      for (const [i, slide] of SLIDES.entries()) {
        const raw = `${RAW}/${c.raw}-${slide.scene}${slide.perLang ? `-${lang}` : ''}.png`
        if (!fs.existsSync(raw)) continue
        await p.setContent(html(c, slide, lang, dataUrl(raw)))
        await p.evaluate(() => document.fonts.ready)
        await p.waitForTimeout(50)
        await p.screenshot({ path: `${OUT}/${lang}/${c.name}-${i + 1}-${slide.scene}.png`.replace(`${OUT}/${lang}/`, (fs.mkdirSync(`${OUT}/${lang}`, { recursive: true }), `${OUT}/${lang}/`)) })
        n++
      }
    }
  }
  await b.close()
  console.log('wrote', n, 'screenshots')
})()
