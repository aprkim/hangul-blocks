import { useState } from 'react'
import { stop } from './audio'
import { AssemblyBoard } from './components/AssemblyBoard'
import { JamoBoard } from './components/JamoBoard'
import { ParentGate, gatePassed } from './components/ParentGate'
import { Recorder } from './components/Recorder'
import { Intro } from './components/Intro'
import { Settings } from './components/Settings'
import { TabBar, type Tab } from './components/TabBar'
import { WriteBoard } from './components/WriteBoard'

type Screen = Tab | 'record'

const initial: Screen = new URLSearchParams(location.search).has('record') ? 'record' : 'jamo'

export default function App() {
  const [screen, setScreen] = useState<Screen>(initial)
  const [lastTab, setLastTab] = useState<Tab>('jamo')
  const [unlocked, setUnlocked] = useState(gatePassed)
  // The opening animation plays once per launch, not when a parent opens the recorder link.
  const [intro, setIntro] = useState(initial !== 'record')
  // Tapping the Write tab again goes back to the road.
  const [writeKey, setWriteKey] = useState(0)
  const go = (next: Screen) => {
    if (next === screen) {
      if (next === 'write') setWriteKey((k) => k + 1)
      return
    }
    stop()
    if (screen === 'record') history.replaceState(null, '', location.pathname)
    if (next !== 'record') setLastTab(next)
    setScreen(next)
  }

  if (screen === 'record') {
    if (!unlocked) return <ParentGate onPass={() => setUnlocked(true)} onCancel={() => go(lastTab)} />
    return <Recorder onExit={() => go(lastTab)} />
  }

  return (
    <div className="flex h-full flex-col">
      <main className="min-h-0 flex-1">
        {screen === 'jamo' && <JamoBoard onRecord={() => go('record')} />}
        {screen === 'assemble' && <AssemblyBoard />}
        {screen === 'write' && <WriteBoard key={writeKey} />}
      </main>
      <TabBar tab={screen} onTab={go} />
      <Settings onParent={() => go('record')} />
      {intro && <Intro onDone={() => setIntro(false)} />}
    </div>
  )
}
