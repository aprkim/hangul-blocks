import { useEffect, useRef, useState } from 'react'
import { chime, play } from '../audio'
import {
  SCENES,
  clearScene,
  earnedStickers,
  moveSticker,
  placeSticker,
  removeSticker,
  resizeSticker,
  restoreScene,
  STICKER_SIZES,
  stickerInfo,
  useScenes,
  type Placed,
  type SceneId,
  type StickerInfo,
} from '../keepsakes'
import { tapFeedback } from '../native'
import { useProgress } from '../progress'
import { SizeIcon, SweepIcon, UndoIcon } from './Icons'
import { SceneArt } from './SceneArt'
import { StickerFace } from './StickerFace'

// Sticker play: drag earned stickers from the tray onto a scene (home, park, sea, space), move
// them around, drag them off to take them away. Tapping a sticker says its word, so playing is
// also hearing the words again. Positions are kept on the device.

const BOUNCE: Keyframe[] = [
  { transform: 'translate(-50%, -50%) scale(1)' },
  { transform: 'translate(-50%, -50%) scale(1.25)', offset: 0.4 },
  { transform: 'translate(-50%, -50%) scale(1)' },
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
  if (info.sound) play(info.sound)
  else chime('star')
}

export function ScenePlay() {
  const p = useProgress()
  const scenes = useScenes()
  const [scene, setScene] = useState<SceneId>('home')
  const [drag, setDrag] = useState<Drag | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const earned = earnedStickers(p)
  // Clearing is immediate (a confirm dialog means nothing to a child who can't read); for a
  // few seconds an undo button brings everything back.
  const [cleared, setCleared] = useState<{ scene: SceneId; placed: Placed[] } | null>(null)
  // The sticker last touched gets a dashed ring and the bigger / smaller buttons.
  const [selected, setSelected] = useState<number | null>(null)
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
      }
      return
    }
    const at = onScene(e.clientX, e.clientY)
    if (d.key === null) {
      if (at) {
        tapFeedback()
        setSelected(placeSticker(scene, d.info.id, at.fx, at.fy))
        say(d.info)
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
        {sel && (
          <div className="play-size" role="group" aria-label="sticker size">
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
          {earned.length === 0 && <span className="play-empty" aria-hidden />}
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

      {/* What the finger is carrying. */}
      {drag?.moved && (
        <div className="play-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <StickerFace info={drag.info} />
        </div>
      )}
    </div>
  )
}
