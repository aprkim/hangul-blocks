// Landing page script (website only).
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './landing.css'

/** App Store "Apple ID" of 소리블록 (App Store Connect → App Information). Empty until set.
    The link has no country, so it opens in each visitor's own App Store (a /kr/ link told
    visitors with a US account the app was not available). */
const APP_STORE_ID = '6833827598'

// Opened from a Home Screen icon (the web app added before this page existed), or an old
// /?record link: go straight to the game, as before.
const standalone =
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches
if (standalone || new URLSearchParams(location.search).has('record')) {
  location.replace('/play/' + location.search)
}

/** 소리블록 is live on Google Play (since November 2026): show its badge. */
const PLAY_LIVE = true

document.querySelectorAll<HTMLAnchorElement>('[data-app-store]').forEach((a) => {
  if (APP_STORE_ID) a.href = `https://apps.apple.com/app/id${APP_STORE_ID}`
  else a.hidden = true
})
document.querySelectorAll<HTMLAnchorElement>('[data-play-store]').forEach((a) => {
  a.hidden = !PLAY_LIVE
  // On Android, the Play badge comes first.
  if (PLAY_LIVE && /android/i.test(navigator.userAgent)) a.parentElement?.prepend(a)
})

// The badge images are Apple's and Google's own artwork, loaded from their servers. If one
// can't load, try its second address; if that fails too, show a plain button of the same size
// instead of a broken image.
document.querySelectorAll<HTMLImageElement>('.store-badge img').forEach((img) => {
  const fail = () => {
    const alt = img.dataset.altSrc
    if (alt) {
      delete img.dataset.altSrc
      img.src = alt
      return
    }
    img.closest('.store-badge')?.classList.add('is-fallback')
  }
  if (img.complete && img.naturalWidth === 0) fail()
  img.addEventListener('error', fail)
})
