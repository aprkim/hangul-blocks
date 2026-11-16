// Landing page script (website only).
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './landing.css'

/** App Store "Apple ID" of 소리블록 (App Store Connect → App Information). Empty until set. */
const APP_STORE_ID = ''

// Opened from a Home Screen icon (the web app added before this page existed), or an old
// /?record link: go straight to the game, as before.
const standalone =
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches
if (standalone || new URLSearchParams(location.search).has('record')) {
  location.replace('/play/' + location.search)
}

const badge = document.querySelector<HTMLAnchorElement>('[data-app-store]')
if (badge) {
  if (APP_STORE_ID) badge.href = `https://apps.apple.com/kr/app/id${APP_STORE_ID}`
  else badge.hidden = true
}
