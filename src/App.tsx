import { useState } from 'react'
import { stop } from './audio'
import { AssemblyBoard } from './components/AssemblyBoard'
import { JamoBoard } from './components/JamoBoard'
import { ParentGate, gatePassed } from './components/ParentGate'
import { Recorder } from './components/Recorder'

type Screen = 'jamo' | 'assemble' | 'record'

const initial: Screen = new URLSearchParams(location.search).has('record') ? 'record' : 'jamo'

export default function App() {
  const [screen, setScreen] = useState<Screen>(initial)
  const [unlocked, setUnlocked] = useState(gatePassed)
  const go = (next: Screen) => {
    stop()
    if (screen === 'record') history.replaceState(null, '', location.pathname)
    setScreen(next)
  }
  if (screen === 'record') {
    if (!unlocked) return <ParentGate onPass={() => setUnlocked(true)} onCancel={() => go('jamo')} />
    return <Recorder onExit={() => go('jamo')} />
  }
  return screen === 'jamo' ? (
    <JamoBoard onNext={() => go('assemble')} onRecord={() => go('record')} />
  ) : (
    <AssemblyBoard onBack={() => go('jamo')} />
  )
}
