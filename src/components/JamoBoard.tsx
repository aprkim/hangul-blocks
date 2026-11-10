import { play } from '../audio'
import { CONSONANTS, VOWELS, consonantSound, vowelSound } from '../jamo'
import { BuildIcon } from './Icons'
import { Tile } from './Tile'

/** P0: every jamo on one screen. Tap = sound + bounce. No order, no locks, no score. */
export function JamoBoard({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex h-full flex-col justify-center gap-[3vh] p-[2.5vh]">
      <section className="grid grid-cols-7 grid-rows-2 gap-[2vh] flex-1 min-h-0">
        {CONSONANTS.map((c) => (
          <Tile key={c.char} kind="consonant" onTap={() => play(consonantSound(c))}>
            {c.char}
          </Tile>
        ))}
      </section>

      {/* Same 7 columns as above so tiles match in size. Vowels sit in columns 2-6:
          top row side-by-side vowels, bottom row stacked vowels. */}
      <section className="grid grid-cols-7 grid-rows-2 gap-[2vh] flex-1 min-h-0">
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
        <Tile kind="control" onTap={onNext} className="col-start-7 row-start-2" label="build">
          <BuildIcon />
        </Tile>
      </section>
    </div>
  )
}
