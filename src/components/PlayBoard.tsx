import { useState } from 'react'
import { tapFeedback } from '../native'
import { DailyMeter } from './Daily'
import { Fridge } from './Fridge'
import { CloseIcon, FridgeIcon } from './Icons'
import { ScenePlay } from './ScenePlay'

// The Play tab: sticker play, one tap from anywhere (it used to hide two levels down, behind the
// star jar). The fridge (the child's letters, and the pictures the camera keeps) opens from the
// button at the top right, where the photos fly to.

export function PlayBoard({ onWrite }: { onWrite: () => void }) {
  const [fridge, setFridge] = useState(false)
  return (
    <div className="play-tab">
      <DailyMeter />
      <button
        type="button"
        aria-label="my letters"
        className="play-fridge"
        onPointerDown={(e) => {
          e.preventDefault()
          tapFeedback()
          setFridge(true)
        }}
      >
        <FridgeIcon />
      </button>
      <ScenePlay onWrite={onWrite} />
      {fridge && (
        <div className="book-overlay" role="dialog" aria-label="my letters and pictures">
          <button
            type="button"
            className="book-close"
            aria-label="close"
            onPointerDown={(e) => {
              e.preventDefault()
              tapFeedback()
              setFridge(false)
            }}
          >
            <CloseIcon />
          </button>
          <div className="room-body">
            <Fridge />
          </div>
        </div>
      )}
    </div>
  )
}
