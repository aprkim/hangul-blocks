// Draws the app's 가 (straight ㄱ in consonant red, ㅏ in vowel blue: the app's own syllable
// geometry, a little bolder and with a wider gap so it reads at 29px) and writes every icon,
// splash and store image that carries it.   usage: node scripts/icon/make.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const PAGE = '#F6EEDD', RED = '#D23B2E', BLUE = '#2259B8', INK = '#2A2520', MUTED = '#6B6252';
const W = 16;                                   // stroke weight on the 100 grid
const C = [10.5, 21, 34, 46], V = [72.5, 12.5, 12.5, 75]; // ㄱ and ㅏ centerline boxes (ㄱ moved 6 left of the app's)
const X0 = C[0] - W / 2, X1 = V[0] + V[2] + W / 2, Y0 = V[1] - W / 2, Y1 = V[1] + V[3] + W / 2;
const st = (c) => `stroke="${c}" stroke-width="${W}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
const PATHS = `<path d="M${C[0]} ${C[1]}H${C[0] + C[2]}V${C[1] + C[3]}" ${st(RED)}/><path d="M${V[0]} ${V[1]}V${V[1] + V[3]}M${V[0]} ${V[1] + V[3] / 2}H${V[0] + V[2]}" ${st(BLUE)}/>`;
/** The glyph as an SVG `size` px tall/wide box holding the inked 가, centered. */
const glyph = (size) => {
  const k = size / Math.max(X1 - X0, Y1 - Y0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="translate(${size / 2 - ((X0 + X1) / 2) * k} ${size / 2 - ((Y0 + Y1) / 2) * k}) scale(${k})">${PATHS}</g></svg>`;
};
/** A w x h image with the glyph centered, `fill` of the shorter side. */
const centered = (w, h, fill, bg = PAGE, shape = '') =>
  `<div style="width:${w}px;height:${h}px;background:${bg};display:flex;align-items:center;justify-content:center;${shape}">${glyph(Math.round(Math.min(w, h) * fill))}</div>`;
const A = 'android/app/src/main/res', I = 'ios/App/App/Assets.xcassets';
const jobs = [];
const add = (file, w, h, html, transparent = false) => jobs.push({ file, w, h, html, transparent });
// square icons
for (const [f, s] of [['resources/icon-1024.png', 1024], [`${I}/AppIcon.appiconset/AppIcon-512@2x.png`, 1024], ['store/android/play-icon-512.png', 512], ['public/apple-touch-icon.png', 180]]) add(f, s, s, centered(s, s, 0.62));
// The browser-tab icon: the same square with its corners rounded (browsers show it as it is).
add('public/favicon.png', 128, 128, `<div style="width:128px;height:128px;border-radius:24%;overflow:hidden">${centered(128, 128, 0.62)}</div>`, true);
// Android launcher: legacy square, round, adaptive foreground (108dp, art inside the middle 66dp)
for (const [d, s] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  add(`${A}/mipmap-${d}/ic_launcher.png`, s, s, centered(s, s, 0.62));
  add(`${A}/mipmap-${d}/ic_launcher_round.png`, s, s, centered(s, s, 0.6, PAGE, 'border-radius:50%'), true);
  const fg = Math.round(s * 2.25);
  add(`${A}/mipmap-${d}/ic_launcher_foreground.png`, fg, fg, centered(fg, fg, 0.46, 'transparent'), true);
}
// splash screens
for (const n of ['', '-1', '-2']) add(`${I}/Splash.imageset/splash-2732x2732${n}.png`, 2732, 2732, centered(2732, 2732, 0.2));
for (const [d, w, h] of [['land-mdpi', 480, 320], ['land-hdpi', 800, 480], ['land-xhdpi', 1280, 720], ['land-xxhdpi', 1600, 960], ['land-xxxhdpi', 1920, 1280],
  ['port-mdpi', 320, 480], ['port-hdpi', 480, 800], ['port-xhdpi', 720, 1280], ['port-xxhdpi', 960, 1600], ['port-xxxhdpi', 1280, 1920]]) add(`${A}/drawable-${d}/splash.png`, w, h, centered(w, h, 0.34));
add(`${A}/drawable/splash.png`, 480, 320, centered(480, 320, 0.34));
// wide images with the name: Play feature graphic, link preview
const font = (wght) => `@font-face{font-family:P${wght};src:url(data:font/otf;base64,${fs.readFileSync(`${ROOT}/node_modules/pretendard/dist/public/static/Pretendard-${wght}.otf`).toString('base64')})}`;
const wide = (w, h, title = '소리블록', sub = '소리로 조립하는 한글', size = 96) => {
  const g = Math.round(h * 0.7), u = h / 500;
  return `<style>${font('ExtraBold')}${font('SemiBold')}</style><div style="width:${w}px;height:${h}px;background:${PAGE};display:flex;align-items:center;justify-content:center;gap:${Math.round(70 * u)}px">${glyph(g)}<div><div style="font:${Math.round(size * u)}px PExtraBold;color:${INK};letter-spacing:-2px;line-height:1.15;white-space:nowrap">${title}</div><div style="font:${Math.round(40 * u)}px PSemiBold;color:${MUTED};margin-top:${Math.round(22 * u)}px;white-space:nowrap">${sub}</div></div></div>`;
};
// Play feature graphic, one per store language.
add('store/android/feature-1024x500.png', 1024, 500, wide(1024, 500, '소리블록', '소리로 배우는 유아 한글'));
add('store/android/feature-ko-1024x500.png', 1024, 500, wide(1024, 500, '소리블록', '소리로 배우는 유아 한글'));
add('store/android/feature-en-1024x500.png', 1024, 500, wide(1024, 500, 'Sori Blocks', 'Korean letters by sound', 88));
add('public/landing/og.png', 1200, 630, wide(1200, 630));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const j of jobs) {
    await p.setViewportSize({ width: j.w, height: j.h });
    await p.setContent(`<body style="margin:0;background:transparent">${j.html}</body>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(ROOT, j.file), omitBackground: j.transparent, clip: { x: 0, y: 0, width: j.w, height: j.h } });
  }
  await b.close();
  console.log('wrote', jobs.length, 'images');
})();
