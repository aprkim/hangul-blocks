import { useState } from 'react'
import { currentChild, getChildren } from './children'
import { ChildPicker } from './components/ChildPicker'
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
  // With more than one child on this device, "who's playing?" comes first, then the opening
  // shows that child's name.
  const [picking, setPicking] = useState(initial !== 'record' && getChildren().list.length > 1)
  const [name, setName] = useState(() => currentChild()?.name)
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
      <Settings
        onParent={() => go('record')}
        onSwitch={(c) => {
          // Another child: their name opens the app again, and the Write road starts fresh.
          setName(c.name)
          setIntro(true)
          setWriteKey((k) => k + 1)
        }}
      />
      {picking ? (
        <ChildPicker
          onDone={(c) => {
            setName(c.name)
            setPicking(false)
          }}
        />
      ) : (
        intro && <Intro name={name} onDone={() => setIntro(false)} />
      )}
    </div>
  )
}
