const { chromium } = require('playwright');
const fs = require('fs');
const S = process.argv[2];
const F = `${S}/fonts/node_modules`; // npm i the @kfonts/hakgyoansim-* and @fontsource/* packages there
const FONTS = {
  bareondotum: `${F}/@kfonts/hakgyoansim-bareondotum/HakgyoansimBareondotumR.woff2`,
  wooju: `${F}/@kfonts/hakgyoansim-wooju/HakgyoansimWoojuR.woff2`,
  santteut: `${F}/@kfonts/hakgyoansim-santteutdotum/HakgyoansimSantteutdotumM.woff2`,
  nanumgothic: `${F}/@fontsource/nanum-gothic/files/nanum-gothic-korean-400-normal.woff2`,
  gowundodum: `${F}/@fontsource/gowun-dodum/files/gowun-dodum-korean-400-normal.woff2`,
  notosans: `${F}/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff2`,
  pretendard: `${process.cwd()}/node_modules/pretendard/dist/web/static/woff2/Pretendard-Medium.woff2`,
  jua: `${F}/@fontsource/jua/files/jua-korean-400-normal.woff2`,
  ggooreogi: `${F}/@kfonts/hakgyoansim-ggooreogi/HakgyoansimGgooreogiR.woff2`,
};
const CHO = { ㄱ: 0, ㄴ: 2, ㄷ: 3, ㄹ: 5, ㅁ: 6, ㅂ: 7, ㅅ: 9, ㅇ: 11, ㅈ: 12, ㅊ: 14, ㅋ: 15, ㅌ: 16, ㅍ: 17, ㅎ: 18 }, CONS = Object.keys(CHO);
const VOW = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅣ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ'], JUNG = { ㅏ: 0, ㅑ: 2, ㅓ: 4, ㅕ: 6, ㅣ: 20, ㅗ: 8, ㅛ: 12, ㅜ: 13, ㅠ: 17, ㅡ: 18 };
const SYL = []; for (const c of CONS) for (const v of VOW) SYL.push({ c, v, ch: String.fromCharCode(0xac00 + (CHO[c] * 21 + JUNG[v]) * 28), side: 'ㅏㅑㅓㅕㅣ'.includes(v) });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1200 } });
  const css = Object.entries(FONTS).map(([n, f]) => `@font-face{font-family:"${n}";src:url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')})}`).join('\n');
  await p.setContent(`<style>${css} body{margin:0;background:#fff}</style><div id=o></div>`);
  const out = await p.evaluate(async ({ names, SYL }) => {
    const N = 300, PAD = 80, W = N + 2 * PAD;
    const res = {};
    for (const name of names) {
      await document.fonts.load(`${N}px "${name}"`, '가');
      const cv = document.createElement('canvas'); cv.width = cv.height = W; const g = cv.getContext('2d', { willReadFrequently: true });
      const per = {};
      for (const s of SYL) {
        g.fillStyle = '#fff'; g.fillRect(0, 0, W, W); g.fillStyle = '#000'; g.font = `${N}px "${name}"`; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
        g.fillText(s.ch, W / 2, PAD + N * 0.85);
        const d = g.getImageData(0, 0, W, W).data; const ink = new Uint8Array(W * W);
        for (let i = 0; i < W * W; i++) ink[i] = d[i * 4] < 128 ? 1 : 0;
        // connected components
        const lab = new Int32Array(W * W); const comps = [];
        for (let i = 0; i < W * W; i++) {
          if (!ink[i] || lab[i]) continue;
          const id = comps.length + 1; const st = [i]; lab[i] = id; let x0 = W, y0 = W, x1 = 0, y1 = 0, n = 0;
          while (st.length) { const k = st.pop(); const x = k % W, y = (k / W) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            for (const q of [k - 1, k + 1, k - W, k + W]) if (q >= 0 && q < W * W && ink[q] && !lab[q]) { lab[q] = id; st.push(q) } }
          if (n > 30) comps.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, n });
        }
        per[s.ch] = comps;
      }
      res[name] = per;
    }
    return res;
  }, { names: Object.keys(FONTS), SYL });
  fs.writeFileSync(`${S}/measure.json`, JSON.stringify({ SYL, out }));
  // contact sheet of the fonts
  await p.setContent(`<style>${css} body{margin:10px;background:#f6eedd;font-size:64px;line-height:1.25} div{white-space:nowrap} small{font:14px sans-serif;display:inline-block;width:110px}</style>` +
    Object.keys(FONTS).map(n => `<div><small>${n}</small><span style="font-family:'${n}'">가 거 기 고 구 그 나 노 다 도 라 로 마 모 바 보 사 소 아 오 자 조 차 초 카 코 타 토 파 포 하 호</span></div>`).join(''));
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${S}/fonts-sheet.png`, fullPage: true });
  for (const [n, per] of Object.entries(out)) console.log(n, 'separable:', Object.values(per).filter(c => c.length >= 2).length, '/', SYL.length);
  await b.close();
})();
