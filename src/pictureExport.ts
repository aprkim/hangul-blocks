// A finished sticker picture as a PNG a parent can keep or send (Photos, Messages, KakaoTalk...).
// Drawn on a canvas from the picture's data: the scene art (the SVG already on the page, with
// its color tokens written out), then each sticker, framed like a photo with a caption.

import { pictureDate, stickerInfo, type Picture } from './keepsakes'
import { isNativeApp, shareFileNative } from './native'

const WIDTH = 2048

/** The scene's SVG as a standalone image: CSS color variables replaced by their values. */
function standaloneSvg(src: SVGSVGElement, w: number, h: number): string {
  const clone = src.cloneNode(true) as SVGSVGElement
  const from = [src, ...src.querySelectorAll('*')]
  const to = [clone, ...clone.querySelectorAll('*')]
  from.forEach((el, i) => {
    const cs = getComputedStyle(el)
    for (const attr of ['fill', 'stroke'] as const) {
      const v = to[i].getAttribute(attr)
      if (v && v.includes('var(')) to[i].setAttribute(attr, cs.getPropertyValue(attr))
    }
  })
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  clone.removeAttribute('class')
  return new XMLSerializer().serializeToString(clone)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = fail
    img.src = url
  })
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/**
 * The picture as a PNG file. `art` is the picture's scene SVG on the page (any size: it is
 * redrawn at full size), `caption` the line under the photo.
 */
export async function pictureFile(pic: Picture, art: SVGSVGElement, caption: string): Promise<File> {
  const W = WIDTH
  const H = Math.round(W / pic.aspect)
  const pad = Math.round(W * 0.035)
  const strip = Math.round(W * 0.1)
  const canvas = document.createElement('canvas')
  canvas.width = W + 2 * pad
  canvas.height = H + pad + strip
  const ctx = canvas.getContext('2d')!

  // The photo paper.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // The scene.
  const svgUrl = URL.createObjectURL(new Blob([standaloneSvg(art, W, H)], { type: 'image/svg+xml' }))
  try {
    const img = await loadImage(svgUrl)
    ctx.save()
    roundRect(ctx, pad, pad, W, H, W * 0.012)
    ctx.clip()
    ctx.drawImage(img, pad, pad, W, H)
    ctx.restore()
  } finally {
    URL.revokeObjectURL(svgUrl)
  }

  // The stickers, as they sat on the screen.
  const font = getComputedStyle(document.body).fontFamily
  const emojiFont = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
  const unit = pic.unit * Math.min(W, H)
  ctx.save()
  roundRect(ctx, pad, pad, W, H, W * 0.012)
  ctx.clip()
  for (const pl of pic.placed) {
    const info = stickerInfo(pl.id)
    if (!info) continue
    const size = unit * (pl.s ?? 1)
    const cx = pad + pl.x * W
    const cy = pad + pl.y * H
    ctx.shadowColor = 'rgba(0,0,0,0.12)'
    ctx.shadowOffsetY = size * 0.04
    if (info.kind === 'jamo') {
      const em = size * 0.55
      const side = em * 1.5
      const consonant = info.part === 'consonant'
      ctx.shadowColor = 'transparent'
      ctx.fillStyle = cssVar(consonant ? '--color-consonant-dark' : '--color-vowel-dark')
      roundRect(ctx, cx - side / 2, cy - side / 2 + em * 0.12, side, side, em * 0.32)
      ctx.fill()
      ctx.fillStyle = cssVar(consonant ? '--color-consonant' : '--color-vowel')
      roundRect(ctx, cx - side / 2, cy - side / 2, side, side, em * 0.32)
      ctx.fill()
      ctx.fillStyle = cssVar('--color-on-tile') || '#fff'
      ctx.font = `800 ${em}px ${font}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(info.face, cx, cy + em * 0.04)
    } else {
      ctx.font = `${size}px ${emojiFont}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(info.face, cx, cy)
    }
  }
  ctx.restore()

  // The caption on the white strip.
  ctx.fillStyle = cssVar('--color-ink') || '#2a2520'
  ctx.font = `700 ${strip * 0.34}px ${font}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${caption} · ${pictureDate(pic.at)}`, pad, H + pad + strip / 2)
  ctx.fillStyle = cssVar('--color-muted') || '#8a8075'
  ctx.font = `700 ${strip * 0.26}px ${font}`
  ctx.textAlign = 'right'
  ctx.fillText('소리블록', W + pad, H + pad + strip / 2)

  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('no image'))), 'image/png'))
  const d = new Date(pic.at)
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
  return new File([blob], `soriblocks-${stamp}.png`, { type: 'image/png' })
}

/** Hand the file to the system: the share sheet in the app and on phones, a download elsewhere. */
export async function shareOrSave(file: File) {
  if (isNativeApp) return shareFileNative(file)
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000)
}
