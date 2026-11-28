import { useEffect, useRef, useState } from 'react'
import { chime, hasSound, play, preload } from '../audio'
import {
  SCENES,
  clearScene,
  earnedStickers,
  moveSticker,
  placeSticker,
  removeSticker,
  resizeSticker,
  restoreScene,
  savePicture,
  STICKER_SIZES,
  stickerInfo,
  usePuzzle,
  useScenes,
  type Picture,
  type Placed,
  type SceneId,
  type StickerInfo,
} from '../keepsakes'
import { celebrateFeedback, tapFeedback } from '../native'
import { useProgress } from '../progress'
import { CameraIcon, PencilIcon, SizeIcon, StarShape, SweepIcon, UndoIcon } from './Icons'
import { SceneArt } from './SceneArt'
import { ScenePicture } from './ScenePicture'
import { StickerFace } from './StickerFace'

// Sticker play: tap an earned sticker in the tray to put it on the scene (or drag it there) (home, park, sea, space), move
// them around, drag them off to take them away. Tapping a sticker says its word, so playing is
// also hearing the words again. Positions are kept on the device.

const BOUNCE: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(1.25)', offset: 0.4 },
  { transform: 'scale(1)' },
]
const POP_IN: Keyframe[] = [
  { transform: 'scale(0.2)', opacity: 0 },
  { transform: 'scale(1.15)', opacity: 1, offset: 0.6 },
  { transform: 'scale(1)', opacity: 1 },
]
const TAP_SLOP = 8
/** How long "undo" stays after clearing a scene. */
const UNDO_MS = 6000

type Drag = {
  pointer: number
  info: StickerInfo
  /** Placed sticker being moved (its key), or null when it comes from the tray. */
  key: number | null
  x: number
  y: number
  startX: number
  startY: number
  moved: boolean
}

function say(info: StickerInfo) {
  // A treasure's name may not be recorded yet: then it chimes (its word still shows).
  if (info.sound && (info.kind !== 'treasure' || hasSound(info.sound))) play(info.sound)
  else chime('star')
}

export function ScenePlay({ onWrite }: { onWrite?: () => void }) {
  const p = useProgress()
  const scenes = useScenes()
  const [scene, setScene] = useState<SceneId>('home')
  const [drag, setDrag] = useState<Drag | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const earned = earnedStickers(p, usePuzzle().solved)
  // Find out which treasure names have a sound (loads them, so the first tap speaks at once).
  const treasureSounds = earned.filter((i) => i.kind === 'treasure' && i.sound).map((i) => i.sound!).join(' ')
  useEffect(() => {
    if (treasureSounds) preload(treasureSounds.split(' '))
  }, [treasureSounds])
  // Clearing is immediate (a confirm dialog means nothing to a child who can't read); for a
  // few seconds an undo button brings everything back.
  const [cleared, setCleared] = useState<{ scene: SceneId; placed: Placed[] } | null>(null)
  // The sticker last touched gets a dashed ring and the bigger / smaller buttons.
  const [selected, setSelected] = useState<number | null>(null)
  // The word of the sticker just tapped, shown at the top of the screen (never over the picture)
  // while it is said: "🚂 기차".
  const [word, setWord] = useState<{ text: string; face: string; n: number } | null>(null)
  useEffect(() => {
    if (!word) return
    const t = window.setTimeout(() => setWord(null), 1800)
    return () => window.clearTimeout(t)
  }, [word])
  const showWord = (info: StickerInfo, el: Element | null | undefined) => {
    // A sticker with no word to read (a treasure without a name) shows nothing.
    if (!el || info.label === info.face) return
    setWord({ text: info.label, face: info.kind === 'jamo' ? '' : info.face, n: (word?.n ?? 0) + 1 })
  }

  // The picture just taken: it pops up as a photo, then flies to the fridge.
  const [snap, setSnap] = useState<Picture | null>(null)
  const snapRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  /** "Done!": keep a copy of the picture on the fridge. */
  const takePicture = () => {
    const r = sceneRef.current?.getBoundingClientRect()
    if (!r || snap) return
    const min = Math.min(r.width, r.height)
    // The same sticker size as on the screen (see .play-placed), as a share of the shorter side.
    const unit = Math.min(110, Math.max(36, min * 0.15)) / min
    const pic = savePicture(scene, r.width / r.height, unit)
    if (!pic) return
    celebrateFeedback()
    chime('fanfare')
    setSelected(null)
    setWord(null)
    flashRef.current?.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' })
    setSnap(pic)
  }

  // The photo: pops in, holds, then flies to the fridge tab. The scene stays as it was, so the
  // child can keep changing it (and take another photo); the broom starts a new one.
  useEffect(() => {
    if (!snap) return
    const el = snapRef.current
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setSnap(null)
      const tab = document.querySelector<HTMLElement>('.play-fridge')
      tab?.animate(BOUNCE, { duration: 420 })
    }
    if (!el) {
      finish()
      return
    }
    el.animate(
      [
        { transform: 'scale(0.6) rotate(-8deg)', opacity: 0 },
        { transform: 'scale(1.04) rotate(-3deg)', opacity: 1, offset: 0.6 },
        { transform: 'scale(1) rotate(-3deg)', opacity: 1 },
      ],
      { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1.2)', fill: 'both' },
    )
    const t = window.setTimeout(() => {
      const from = el.getBoundingClientRect()
      const to = document.querySelector('.play-fridge')?.getBoundingClientRect()
      const dx = to ? to.left + to.width / 2 - (from.left + from.width / 2) : 0
      const dy = to ? to.top + to.height / 2 - (from.top + from.height / 2) : -from.bottom
      el.animate(
        [
          { transform: 'scale(1) rotate(-3deg)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.08) rotate(12deg)`, opacity: 0.7 },
        ],
        { duration: 650, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'both' },
      ).onfinish = finish
    }, 1300)
    // Safety: never leave the photo hanging (e.g. the room closed mid-animation).
    const safety = window.setTimeout(finish, 3000)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(safety)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap])

  useEffect(() => {
    if (!cleared) return
    const t = window.setTimeout(() => setCleared(null), UNDO_MS)
    return () => window.clearTimeout(t)
  }, [cleared])

  /** Where a point falls on the scene, as fractions, or null when it is off the scene. */
  const onScene = (x: number, y: number) => {
    const r = sceneRef.current?.getBoundingClientRect()
    if (!r || x < r.left || x > r.right || y < r.top || y > r.bottom) return null
    return { fx: (x - r.left) / r.width, fy: (y - r.top) / r.height }
  }

  const begin = (e: React.PointerEvent, info: StickerInfo, key: number | null) => {
    if (drag) return
    // Placed stickers follow the finger at once. In the tray the finger may be scrolling it
    // sideways, so a tray sticker is picked up only once the finger heads up (see move).
    if (key !== null) e.preventDefault()
    // Hold on to the finger even once it leaves the little sticker. (In the tray the browser may
    // still take a sideways move as scrolling, which ends with pointercancel.)
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDrag({ pointer: e.pointerId, info, key, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false })
  }

  const move = (e: React.PointerEvent) => {
    if (!drag || drag.pointer !== e.pointerId) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    let moved = drag.moved
    if (!moved && drag.key === null) {
      // From the tray: a nearly flat move scrolls the tray (when it has more than fits);
      // anything heading up towards the scene, even at a slant, picks the sticker up.
      const tray = (e.currentTarget as Element).closest('.play-tray')
      const scrolls = !!tray && tray.scrollWidth > tray.clientWidth + 2
      if (Math.hypot(dx, dy) > TAP_SLOP) {
        if (scrolls && Math.abs(dy) < Math.abs(dx) * 0.45) {
          ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
          setDrag(null) // scrolling the tray
          return
        }
        moved = true
      }
    } else if (!moved) {
      moved = Math.hypot(dx, dy) > TAP_SLOP
    }
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved })
  }

  const end = (e: React.PointerEvent, el: HTMLElement) => {
    if (!drag || drag.pointer !== e.pointerId) return
    const d = drag
    setDrag(null)
    if (e.type === 'pointercancel' && !d.moved) return
    if (!d.moved) {
      // A tap: say the word.
      tapFeedback()
      say(d.info)
      if (d.key !== null) {
        setSelected(d.key)
        el.animate(BOUNCE, { duration: 320 })
        showWord(d.info, el.firstElementChild ?? el)
      } else {
        // A tap in the tray puts the sticker on the scene (dragging all the way up is hard for
        // a small hand): near the middle, a little to one side each time so taps don't pile up,
        // and selected, so it can be made bigger or smaller and dragged where it goes.
        const n = scenes[scene].length
        const angle = n * 2.4
        const r = n ? 0.08 + (n % 4) * 0.05 : 0
        const key = placeSticker(scene, d.info.id, 0.5 + Math.cos(angle) * r, 0.5 + Math.sin(angle) * r * 1.3)
        setSelected(key)
        requestAnimationFrame(() => {
          const placedEl = sceneRef.current?.querySelector<HTMLElement>(`[data-key="${key}"]`)
          placedEl?.animate(POP_IN, { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1.3)' })
          showWord(d.info, placedEl?.firstElementChild ?? placedEl)
        })
      }
      return
    }
    const at = onScene(e.clientX, e.clientY)
    if (d.key === null) {
      if (at) {
        tapFeedback()
        const key = placeSticker(scene, d.info.id, at.fx, at.fy)
        setSelected(key)
        say(d.info)
        requestAnimationFrame(() => {
          const placedEl = sceneRef.current?.querySelector<HTMLElement>(`[data-key="${key}"]`)
          showWord(d.info, placedEl?.firstElementChild ?? placedEl)
        })
      }
    } else if (at) {
      moveSticker(scene, d.key, at.fx, at.fy)
      setSelected(d.key)
    } else {
      // Dragged off the scene: taken away.
      chime('soft')
      removeSticker(scene, d.key)
      if (selected === d.key) setSelected(null)
    }
  }

  const placed = scenes[scene]
  const canUndo = cleared?.scene === scene
  const sel = placed.find((pl) => pl.key === selected) ?? null
  const size = (step: 1 | -1) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!sel) return
    tapFeedback()
    resizeSticker(scene, sel.key, step)
  }

  return (
    <div className="play">
      <div
        ref={sceneRef}
        className="play-scene"
        onPointerDown={(e) => {
          // Touching the empty scene puts the size buttons away.
          if (e.target === e.currentTarget || (e.target as Element).closest('.play-art')) setSelected(null)
        }}
      >
        <SceneArt scene={scene} className="play-art" />
        <div ref={flashRef} className="play-flash" aria-hidden />
        {placed.length > 0 && (
          <button
            type="button"
            aria-label="done"
            className="play-done"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              tapFeedback()
              takePicture()
            }}
          >
            <CameraIcon />
          </button>
        )}
        {(placed.length > 0 || canUndo) && (
          <button
            type="button"
            aria-label={canUndo ? 'undo' : 'clear'}
            className={`play-clear ${canUndo ? 'is-undo' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              tapFeedback()
              if (canUndo && cleared) {
                restoreScene(scene, cleared.placed)
                setCleared(null)
                chime('star')
              } else {
                setCleared({ scene, placed: clearScene(scene) })
                chime('soft')
              }
            }}
          >
            {canUndo ? <UndoIcon /> : <SweepIcon />}
          </button>
        )}
        {placed.map((pl) => {
          const info = stickerInfo(pl.id)
          if (!info) return null
          const moving = drag?.key === pl.key && drag.moved
          return (
            <button
              key={pl.key}
              type="button"
              aria-label={info.label}
              data-key={pl.key}
              className={`play-placed ${moving ? 'is-moving' : ''} ${pl.key === selected ? 'is-selected' : ''}`}
              style={{ left: `${pl.x * 100}%`, top: `${pl.y * 100}%`, ['--s' as string]: pl.s ?? 1 }}
              onPointerDown={(e) => begin(e, info, pl.key)}
              onPointerMove={move}
              onPointerUp={(e) => end(e, e.currentTarget)}
              onPointerCancel={(e) => end(e, e.currentTarget)}
            >
              <StickerFace info={info} />
            </button>
          )
        })}
        {/* Smaller / bigger, right beside the sticker they change (below it, or above it near
            the bottom of the scene). Hidden while a sticker is being carried. */}
        {sel && !drag?.moved && (
          <div
            className={`play-size ${sel.y > 0.6 ? 'is-above' : ''}`}
            role="group"
            aria-label="sticker size"
            style={{ ['--x' as string]: `${sel.x * 100}%`, top: `${sel.y * 100}%`, ['--s' as string]: sel.s ?? 1 }}
          >
            <button
              type="button"
              aria-label="smaller"
              className="play-size-btn"
              disabled={(sel.s ?? 1) <= STICKER_SIZES[0]}
              onPointerDown={size(-1)}
            >
              <SizeIcon big={false} />
            </button>
            <button
              type="button"
              aria-label="bigger"
              className="play-size-btn"
              disabled={(sel.s ?? 1) >= STICKER_SIZES[STICKER_SIZES.length - 1]}
              onPointerDown={size(1)}
            >
              <SizeIcon big />
            </button>
          </div>
        )}
      </div>

      <div className="play-bar">
        <div className="play-scenes" role="tablist" aria-label="scenes">
          {SCENES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === scene}
              aria-label={s}
              className={`play-scene-pick ${s === scene ? 'is-current' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault()
                tapFeedback()
                setScene(s)
                setSelected(null)
              }}
            >
              <SceneArt scene={s} className="h-full w-full" />
            </button>
          ))}
        </div>
        <div className="play-tray" data-scroll>
          {/* Nothing to stick yet: stickers come from writing. The pencil goes there. */}
          {earned.length === 0 && (
            <button
              type="button"
              aria-label="write to earn stickers"
              className="play-empty"
              onPointerDown={(e) => {
                e.preventDefault()
                tapFeedback()
                onWrite?.()
              }}
            >
              <PencilIcon />
              <StarShape />
            </button>
          )}
          {earned.map((info) => (
            <button
              key={info.id}
              type="button"
              aria-label={info.label}
              className="play-tray-item"
              onPointerDown={(e) => begin(e, info, null)}
              onPointerMove={move}
              onPointerUp={(e) => end(e, e.currentTarget)}
              onPointerCancel={(e) => end(e, e.currentTarget)}
            >
              <StickerFace info={info} />
            </button>
          ))}
        </div>
      </div>

      {word && (
        <div className="play-word-bar" aria-live="polite">
          <div key={word.n} className="play-word">
            {word.face && <span className="play-word-face">{word.face}</span>}
            {word.text}
          </div>
        </div>
      )}

      {snap && (
        <div className="play-snap" aria-hidden>
          <div ref={snapRef} className="play-snap-photo">
            <ScenePicture pic={snap} />
          </div>
        </div>
      )}

      {/* What the finger is carrying. */}
      {drag?.moved && (
        <div className="play-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <StickerFace info={drag.info} />
        </div>
      )}
    </div>
  )
}
