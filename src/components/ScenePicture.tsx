import { stickerInfo, type Picture } from '../keepsakes'
import { SceneArt } from './SceneArt'
import { StickerFace } from './StickerFace'

/** A finished sticker picture, drawn at any size (the fridge, the parents' page, the snapshot). */
export function ScenePicture({ pic, className = '' }: { pic: Picture; className?: string }) {
  return (
    <div className={`scene-pic ${className}`} style={{ aspectRatio: pic.aspect, ['--unit' as string]: pic.unit }}>
      <SceneArt scene={pic.scene} className="scene-pic-art" />
      {pic.placed.map((pl) => {
        const info = stickerInfo(pl.id)
        if (!info) return null
        return (
          <span key={pl.key} className="scene-pic-sticker" style={{ left: `${pl.x * 100}%`, top: `${pl.y * 100}%`, ['--s' as string]: pl.s ?? 1 }}>
            <StickerFace info={info} />
          </span>
        )
      })}
    </div>
  )
}
