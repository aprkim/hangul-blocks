import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import App from './App'
import { installUnlock, preload } from './audio'
import { allSoundNames } from './jamo'

// Block browser gestures a 4-year-old will trigger by accident: pinch, double-tap zoom,
// rubber-band scroll, long-press menus.
const block = (e: Event) => e.preventDefault()
document.addEventListener('touchmove', block, { passive: false })
document.addEventListener('gesturestart', block)
document.addEventListener('contextmenu', block)
document.addEventListener('dblclick', block)

preload(allSoundNames())
installUnlock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
