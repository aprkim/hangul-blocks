import { useRef } from 'react'
import { play } from '../audio'
import { CONSONANTS, VOWELS, consonantSound, vowelSound } from '../jamo'
import { BuildIcon } from './Icons'
import { Tile } from './Tile'

/** Adults open the recorder by holding the empty cell left of the vowels for 3 seconds. */
const HOLD_MS = 3000

/** P0: every jamo on one screen. Tap = sound + bounce. No order, no locks, no score. */
export function JamoBoard({ onNext, onRecord }: { onNext: () => void; onRecord: () => void }) {
  const hold = useRef<number | undefined>(undefined)
  const release = () => window.clearTimeout(hold.current)
  return (
    <div className="flex h-full flex-col justify-center gap-[3vh] p-[2.5vh]">
      <section className="board-grid grid grid-cols-7 grid-rows-2 gap-[2vh] flex-1 min-h-0">
        {CONSONANTS.map((c) => (
          <Tile key={c.char} kind="consonant" onTap={() => play(consonantSound(c))}>
            {c.char}
          </Tile>
        ))}
      </section>

      {/* Same 7 columns as above so tiles match in size. Vowels sit in columns 2-6:
          top row side-by-side vowels, bottom row stacked vowels. */}
      <section className="board-grid grid grid-cols-7 grid-rows-2 gap-[2vh] flex-1 min-h-0">
        {VOWELS.map((v, i) => (
          <Tile
            key={v.char}
            kind="vowel"
            onTap={() => play(vowelSound(v))}
            className={i % 5 === 0 ? 'col-start-2' : ''}
          >
            {v.char}
          </Tile>
        ))}
        <div
          aria-hidden
          className="col-start-1 row-span-2 row-start-1"
          onPointerDown={() => {
            release()
            hold.current = window.setTimeout(onRecord, HOLD_MS)
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
        />
        <Tile kind="control" onTap={onNext} className="col-start-7 row-start-2" label="build">
          <BuildIcon />
        </Tile>
      </section>
    </div>
  )
}
