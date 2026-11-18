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

/** Flip to true once 소리블록 is live on Google Play (the link 404s until then). */
const PLAY_LIVE = false

const appStore = document.querySelector<HTMLAnchorElement>('[data-app-store]')
if (appStore) {
  if (APP_STORE_ID) appStore.href = `https://apps.apple.com/app/id${APP_STORE_ID}`
  else appStore.hidden = true
}
const play = document.querySelector<HTMLAnchorElement>('[data-play-store]')
if (play) {
  play.hidden = !PLAY_LIVE
  // On Android, the Play badge comes first.
  if (PLAY_LIVE && /android/i.test(navigator.userAgent)) play.parentElement?.prepend(play)
}

// The badge images come from Apple's and Google's own servers. If one can't load (blocked or
// offline), show a plain button instead of a broken image.
document.querySelectorAll<HTMLImageElement>('.store-badge img').forEach((img) => {
  const fail = () => img.closest('.store-badge')?.classList.add('is-fallback')
  if (img.complete && img.naturalWidth === 0) fail()
  else img.addEventListener('error', fail)
})
