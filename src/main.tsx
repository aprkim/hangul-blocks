import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import App from './App'
import { installUnlock, preload, setLocalRecording } from './audio'
import { allSoundNames } from './jamo'
import { loadRecordings } from './recordings'

// Block browser gestures a 4-year-old will trigger by accident: pinch, double-tap zoom,
// rubber-band scroll, long-press menus.
const block = (e: Event) => e.preventDefault()
// The adult recording page scrolls; everything else is locked.
const inScrollArea = (e: Event) => (e.target as Element | null)?.closest?.('[data-scroll]')
document.addEventListener('touchmove', (e) => inScrollArea(e) || e.preventDefault(), { passive: false })
document.addEventListener('gesturestart', block)
document.addEventListener('contextmenu', block)
document.addEventListener('dblclick', block)

// On-device recordings (from the recorder page) take priority over public/audio/.
loadRecordings().then((takes) => {
  takes.forEach((mp3, name) => setLocalRecording(name, mp3))
  preload(allSoundNames())
})
installUnlock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
