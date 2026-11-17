import type { StickerInfo } from '../keepsakes'

/** How a sticker looks anywhere: a jamo is a little red or blue tile, others are their picture. */
export function StickerFace({ info }: { info: StickerInfo }) {
  if (info.kind === 'jamo') {
    return <span className={`sticker-jamo is-${info.part}`}>{info.face}</span>
  }
  return <span className="sticker-pic">{info.face}</span>
}
