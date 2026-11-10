import { useState } from 'react'
import { stop } from './audio'
import { AssemblyBoard } from './components/AssemblyBoard'
import { JamoBoard } from './components/JamoBoard'

type Screen = 'jamo' | 'assemble'

export default function App() {
  const [screen, setScreen] = useState<Screen>('jamo')
  const go = (next: Screen) => {
    stop()
    setScreen(next)
  }
  return screen === 'jamo' ? (
    <JamoBoard onNext={() => go('assemble')} />
  ) : (
    <AssemblyBoard onBack={() => go('jamo')} />
  )
}
