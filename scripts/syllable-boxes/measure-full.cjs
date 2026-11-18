// Ink components of syllables with every vowel (compound ones too), with and without a final
// consonant, in the same fonts as measure.cjs. Initials and finals are one-piece consonants
// (ㄱ ㄴ ㅁ ㅇ) so each piece of ink can be told apart. Also measures the 140 basic syllables,
// which set each font's scale (as in derive.py).
//
//   node scripts/syllable-boxes/measure-full.cjs <dir with fonts/>   -> <dir>/measure-full.json
const { chromium } = require('playwright')
const fs = require('fs')
const S = process.argv[2]
const F = `${S}/fonts/node_modules`
const FONTS = {
  bareondotum: `${F}/@kfonts/hakgyoansim-bareondotum/HakgyoansimBareondotumR.woff2`,
  wooju: `${F}/@kfonts/hakgyoansim-wooju/HakgyoansimWoojuR.woff2`,
  santteut: `${F}/@kfonts/hakgyoansim-santteutdotum/HakgyoansimSantteutdotumM.woff2`,
  nanumgothic: `${F}/@fontsource/nanum-gothic/files/nanum-gothic-korean-400-normal.woff2`,
  gowundodum: `${F}/@fontsource/gowun-dodum/files/gowun-dodum-korean-400-normal.woff2`,
  notosans: `${F}/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff2`,
  pretendard: `${process.cwd()}/node_modules/pretendard/dist/web/static/woff2/Pretendard-Medium.woff2`,
}
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'
const ch = (c, v, f) => String.fromCharCode(0xac00 + (CHO.indexOf(c) * 21 + JUNG.indexOf(v)) * 28 + (f ? JONG.indexOf(f) : 0))
const SYL = []
for (const c of 'ㄱㄴㅁㅇ') for (const v of JUNG) for (const f of ['', 'ㄱ', 'ㄴ', 'ㅁ', 'ㅇ']) SYL.push({ c, v, f, ch: ch(c, v, f) })
// The basic set, for each font's scale.
for (const c of 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ') for (const v of 'ㅏㅑㅓㅕㅣㅗㅛㅜㅠㅡ') SYL.push({ c, v, f: '', ch: ch(c, v, ''), base: true })

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage()
  const css = Object.entries(FONTS).map(([n, f]) => `@font-face{font-family:"${n}";src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')})}`).join('\n')
  await p.setContent(`<style>${css}</style>`)
  const out = await p.evaluate(async ({ names, chars }) => {
    const N = 300, PAD = 80, W = N + 2 * PAD
    const res = {}
    for (const name of names) {
      await document.fonts.load(`${N}px "${name}"`, '가각')
      const cv = document.createElement('canvas'); cv.width = cv.height = W
      const g = cv.getContext('2d', { willReadFrequently: true })
      const per = {}
      for (const c of chars) {
        g.fillStyle = '#fff'; g.fillRect(0, 0, W, W); g.fillStyle = '#000'; g.font = `${N}px "${name}"`
        g.textBaseline = 'alphabetic'; g.textAlign = 'center'; g.fillText(c, W / 2, PAD + N * 0.85)
        const d = g.getImageData(0, 0, W, W).data; const ink = new Uint8Array(W * W)
        for (let i = 0; i < W * W; i++) ink[i] = d[i * 4] < 128 ? 1 : 0
        const lab = new Int32Array(W * W); const comps = []
        for (let i = 0; i < W * W; i++) {
          if (!ink[i] || lab[i]) continue
          const id = comps.length + 1; const st = [i]; lab[i] = id; let x0 = W, y0 = W, x1 = 0, y1 = 0, n = 0
          while (st.length) { const k = st.pop(); const x = k % W, y = (k / W) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
            for (const q of [k - 1, k + 1, k - W, k + W]) if (q >= 0 && q < W * W && ink[q] && !lab[q]) { lab[q] = id; st.push(q) } }
          if (n > 30) comps.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, n })
        }
        per[c] = comps
      }
      res[name] = per
    }
    return res
  }, { names: Object.keys(FONTS), chars: [...new Set(SYL.map((s) => s.ch))] })
  fs.writeFileSync(`${S}/measure-full.json`, JSON.stringify({ SYL, out }))
  await b.close()
  console.log('measured', SYL.length, 'syllables in', Object.keys(FONTS).length, 'fonts')
})()
