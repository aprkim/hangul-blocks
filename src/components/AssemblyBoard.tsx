import { useEffect, useRef, useState } from 'react'
import { play } from '../audio'
import {
  ASSEMBLE_CONSONANTS,
  VOWELS,
  composeSyllable,
  consonantSound,
  syllableSound,
  vowelSound,
  type Consonant,
  type Vowel,
  type VowelLayout,
} from '../jamo'
import { GridIcon, ResetIcon } from './Icons'
import { Tile } from './Tile'

/** How long the consonant takes to slide between the side and stack positions. */
const MOVE_MS = 420

type Box = { left: number; top: number; width: number; height: number; font: number }

// Percent of the frame. font is in cqmin (percent of the frame's shorter side).
const SLOTS: Record<VowelLayout, { cons: Box; vowel: Box }> = {
  side: {
    cons: { left: 6, top: 14, width: 48, height: 72, font: 58 },
    vowel: { left: 54, top: 8, width: 40, height: 84, font: 66 },
  },
  stack: {
    cons: { left: 16, top: 6, width: 68, height: 48, font: 50 },
    vowel: { left: 8, top: 54, width: 84, height: 40, font: 60 },
  },
}

const POP: Keyframe[] = [
  { transform: 'scale(0.7)', opacity: 0 },
  { transform: 'scale(1.12)', opacity: 1, offset: 0.55 },
  { transform: 'scale(1)', opacity: 1 },
]

const GLOW: Keyframe[] = [
  { boxShadow: '0 0 0 0 rgba(255, 205, 60, 0.9)' },
  { boxShadow: '0 0 0 28px rgba(255, 205, 60, 0)' },
]

function Slot({ box, kind, char, hidden }: { box: Box; kind: 'consonant' | 'vowel'; char?: string; hidden: boolean }) {
  return (
    <div
      className={`slot absolute flex items-center justify-center rounded-[6cqmin] ${
        char ? '' : 'border-[1.4cqmin] border-dashed border-slot'
      } ${kind === 'consonant' ? 'text-consonant' : 'text-vowel'}`}
      style={{
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
        fontSize: `${box.font}cqmin`,
        opacity: hidden ? 0 : 1,
        transitionDuration: `${MOVE_MS}ms`,
      }}
    >
      {char}
    </div>
  )
}

/** P1: tap a consonant and a vowel; the frame rearranges and plays the syllable. Every combo is valid. */
export function AssemblyBoard({ onBack }: { onBack: () => void }) {
  const [cons, setCons] = useState<Consonant | null>(null)
  const [vowel, setVowel] = useState<Vowel | null>(null)
  const [composed, setComposed] = useState(false)
  // Bumped on every completion so tapping the same jamo again replays the celebration.
  const [round, setRound] = useState(0)
  const timer = useRef<number | undefined>(undefined)
  const frameRef = useRef<HTMLDivElement>(null)
  const glyphRef = useRef<HTMLDivElement>(null)

  const layout: VowelLayout = vowel?.layout ?? 'side'
  const slots = SLOTS[layout]

  function place(nextCons: Consonant | null, nextVowel: Vowel | null) {
    window.clearTimeout(timer.current)
    setComposed(false)
    setCons(nextCons)
    setVowel(nextVowel)

    if (nextCons && nextVowel) {
      play(syllableSound(nextCons, nextVowel))
      // Let the consonant finish sliding before the real glyph replaces the parts.
      const moved = (vowel?.layout ?? 'side') !== nextVowel.layout
      timer.current = window.setTimeout(() => {
        setComposed(true)
        setRound((r) => r + 1)
      }, moved ? MOVE_MS : 160)
    } else if (nextCons) {
      play(consonantSound(nextCons))
    } else if (nextVowel) {
      play(vowelSound(nextVowel))
    }
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!composed) return
    glyphRef.current?.animate(POP, { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1.2)' })
    frameRef.current?.animate(GLOW, { duration: 480, easing: 'ease-out' })
  }, [composed, round])

  return (
    <div className="flex h-full flex-col gap-[2.5vh] p-[2.5vh]">
      {/* Frame row: back | frame | reset */}
      <div className="flex min-h-0 flex-1 items-stretch justify-between gap-[2vh]">
        <div className="flex w-(--tile) flex-col justify-start">
          <Tile kind="control" onTap={onBack} label="back" className="size-(--tile)">
            <GridIcon />
          </Tile>
        </div>

        <div className="frame-wrap flex min-w-0 flex-1 items-center justify-center">
          <div ref={frameRef} className="frame relative rounded-[8cqmin] bg-white">
            <Slot box={slots.cons} kind="consonant" char={cons?.char} hidden={composed} />
            <Slot box={slots.vowel} kind="vowel" char={vowel?.char} hidden={composed} />
            {cons && vowel && (
              <div
                ref={glyphRef}
                className="absolute inset-0 flex items-center justify-center font-bold text-ink leading-none"
                style={{ fontSize: '82cqmin', opacity: composed ? 1 : 0 }}
              >
                {composeSyllable(cons, vowel)}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-(--tile) flex-col justify-end">
          <Tile kind="control" onTap={() => place(null, null)} label="reset" className="size-(--tile)">
            <ResetIcon />
          </Tile>
        </div>
      </div>

      {/* Trays. Consonants not yet recorded are hidden, not greyed. */}
      <div className="flex flex-col items-center gap-[2vh]">
        <div className="tray">
          {ASSEMBLE_CONSONANTS.map((c) => (
            <Tile
              key={c.char}
              kind="consonant"
              selected={cons === c}
              onTap={() => place(c, vowel)}
              className="size-(--tile)"
            >
              {c.char}
            </Tile>
          ))}
        </div>
        {/* Two vowel rows: side-by-side vowels, then stacked vowels. */}
        {(['side', 'stack'] as const).map((row) => (
          <div key={row} className="tray">
            {VOWELS.filter((v) => v.layout === row).map((v) => (
              <Tile
                key={v.char}
                kind="vowel"
                selected={vowel === v}
                onTap={() => place(cons, v)}
                className="size-(--tile)"
              >
                {v.char}
              </Tile>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
