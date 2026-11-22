import { useState } from 'react'
import { currentChild, getChildren } from './children'
import { getPuzzle, namePuzzleKey } from './keepsakes'
import { Welcome, welcomeDue } from './components/Welcome'
import { ChildPicker } from './components/ChildPicker'
import { DailyDone } from './components/Daily'
import { stop } from './audio'
import { AssemblyBoard } from './components/AssemblyBoard'
import { JamoBoard } from './components/JamoBoard'
import { PuzzleBoard } from './components/PuzzleBoard'
import { ParentGate, gatePassed } from './components/ParentGate'
import { Recorder } from './components/Recorder'
import { Intro } from './components/Intro'
import { Settings } from './components/Settings'
import { TabBar, type Tab } from './components/TabBar'
import { WriteBoard } from './components/WriteBoard'

type Screen = Tab | 'record'

/** A child whose name is not built yet starts at their name puzzle: it is the first lesson. */
function nameFirst(): boolean {
  const c = currentChild()
  return !!c && !getPuzzle().solved.includes(namePuzzleKey(c.name))
}

const initial: Screen = new URLSearchParams(location.search).has('record') ? 'record' : nameFirst() ? 'puzzle' : 'jamo'

export default function App() {
  const [screen, setScreen] = useState<Screen>(initial)
  const [lastTab, setLastTab] = useState<Tab>(initial === 'record' ? 'jamo' : initial)
  const [unlocked, setUnlocked] = useState(gatePassed)
  // The opening animation plays once per launch, not when a parent opens the recorder link.
  const [intro, setIntro] = useState(initial !== 'record')
  // With more than one child on this device, "who's playing?" comes first, then the opening
  // shows that child's name.
  const [picking, setPicking] = useState(initial !== 'record' && getChildren().list.length > 1)
  const [name, setName] = useState(() => currentChild()?.name)
  // Once, before anything else: ask the parent for the child's name.
  const [welcome, setWelcome] = useState(() => initial !== 'record' && welcomeDue(getChildren().list.length > 0))
  // Tapping the Write tab again goes back to the road.
  const [writeKey, setWriteKey] = useState(0)
  // The name puzzle's pencil: open the Write tab on the first letter of the name.
  const [writeName, setWriteName] = useState(false)
  const go = (next: Screen) => {
    if (next === screen) {
      if (next === 'write') {
        setWriteName(false)
        setWriteKey((k) => k + 1)
      }
      return
    }
    stop()
    setWriteName(false)
    if (screen === 'record') history.replaceState(null, '', location.pathname)
    if (next !== 'record') setLastTab(next)
    setScreen(next)
  }

  if (screen === 'record') {
    if (!unlocked) return <ParentGate onPass={() => setUnlocked(true)} onCancel={() => go(lastTab)} />
    return <Recorder onExit={() => go(lastTab)} />
  }

  return (
    <div className="play-root flex h-full flex-col">
      <main className="min-h-0 flex-1">
        {screen === 'jamo' && <JamoBoard onRecord={() => go('record')} />}
        {screen === 'assemble' && <AssemblyBoard />}
        {screen === 'puzzle' && (
          <PuzzleBoard
            key={writeKey}
            onWriteName={() => {
              stop()
              setLastTab('write')
              setScreen('write')
              setWriteName(true)
              setWriteKey((k) => k + 1)
            }}
          />
        )}
        {screen === 'write' && <WriteBoard key={writeKey} startName={writeName} />}
      </main>
      <TabBar tab={screen} onTab={go} />
      <DailyDone />
      <Settings
        onParent={() => go('record')}
        onSwitch={(c) => {
          // Another child: their name opens the app again, and the Write road starts fresh.
          setName(c.name)
          setIntro(true)
          setWriteName(false)
          setWriteKey((k) => k + 1)
        }}
      />
      {welcome ? (
        <Welcome
          onDone={(c) => {
            setWelcome(false)
            if (!c) return
            // Their name opens the app, and their name puzzle is the first screen.
            setName(c.name)
            setLastTab('puzzle')
            setScreen('puzzle')
            setWriteKey((k) => k + 1)
          }}
        />
      ) : picking ? (
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
