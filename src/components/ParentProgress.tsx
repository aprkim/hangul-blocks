import {
  JAMO_CHARS,
  SYLLABLE_CHARS,
  TREASURES,
  SET_GOAL,
  jamoWrittenCount,
  letterStickers,
  openAllSets,
  reachableSyllables,
  resetProgress,
  timesWritten,
  useProgress,
} from '../progress'
import { t } from '../i18n'
import { SET_COUNT } from '../jamo'
import { resetKeepsakes, useHandwriting, writtenOrder, type Writing } from '../keepsakes'
import { isNativeApp, shareFileNative } from '../native'

/** The child's latest handwriting of every letter, as one picture on the page color (for grandma). */
async function handwritingImage(h: Record<string, { latest: Writing }>, chars: string[]): Promise<File | null> {
  const cols = Math.min(6, chars.length)
  const rows = Math.ceil(chars.length / cols)
  const cell = 220
  const pad = 24
  const canvas = document.createElement('canvas')
  canvas.width = cols * cell + pad * 2
  canvas.height = rows * cell + pad * 2
  const g = canvas.getContext('2d')
  if (!g) return null
  const css = getComputedStyle(document.documentElement)
  const color = (v: string) => css.getPropertyValue(v).trim()
  g.fillStyle = color('--color-page')
  g.fillRect(0, 0, canvas.width, canvas.height)
  chars.forEach((c, i) => {
    const x0 = pad + (i % cols) * cell
    const y0 = pad + Math.floor(i / cols) * cell
    g.fillStyle = color('--color-card')
    g.beginPath()
    g.roundRect(x0 + 10, y0 + 10, cell - 20, cell - 20, 14)
    g.fill()
    const w = h[c].latest
    const k = (cell - 60) / 100
    g.lineWidth = 7 * k
    g.lineCap = 'round'
    g.lineJoin = 'round'
    w.strokes.forEach((flat, si) => {
      g.strokeStyle = color(w.parts[si] === 'c' ? '--color-consonant' : '--color-vowel')
      g.beginPath()
      for (let j = 0; j < flat.length; j += 2) {
        const px = x0 + 30 + flat[j] * k
        const py = y0 + 30 + flat[j + 1] * k
        if (j) g.lineTo(px, py)
        else g.moveTo(px, py)
      }
      g.stroke()
    })
  })
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  return blob ? new File([blob], 'soriblocks-handwriting.png', { type: 'image/png' }) : null
}

/** Parents' view of the Write tab (behind the grown-up question): numbers live here, not on the child's screens. */
export function ParentProgress() {
  const p = useProgress()
  const h = useHandwriting()
  const written = writtenOrder(h)
  const saveHandwriting = async () => {
    const file = await handwritingImage(h, written)
    if (!file) return
    if (isNativeApp) {
      await shareFileNative(file).catch(() => {})
      return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  const sylDone = letterStickers(p).length
  const chip = (c: string) => {
    const n = timesWritten(p, c)
    return (
      <span
        key={c}
        title={t(`${n}번`, `${n}×`)}
        className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-1 text-[18px] font-bold ${
          n > 0 ? 'bg-vowel text-on-tile' : 'bg-page text-muted'
        }`}
      >
        {c}
        {n > 1 && <sup className="ml-0.5 text-[11px]">{n}</sup>}
      </span>
    )
  }
  return (
    <section className="flex flex-col gap-3 rounded-[28px] bg-card px-6 py-5">
      <div className="text-[18px] font-bold">{t('아이의 쓰기 기록', "Your child's writing")}</div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
        <span>⭐ {t(`별 ${p.stars}개`, `${p.stars} stars`)}</span>
        <span>{t('자모', 'Letters')} {jamoWrittenCount(p)}/{JAMO_CHARS.length}</span>
        <span>{t('음절', 'Syllables')} {sylDone}/{SYLLABLE_CHARS.length}</span>
        <span>{t('보물 스티커', 'Treasure stickers')} {p.treasures.length}/{TREASURES.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">{JAMO_CHARS.map(chip)}</div>
      {p.syllablesOpen && <div className="flex flex-wrap gap-1.5">{reachableSyllables(p).map((s) => chip(s.char))}</div>}
      <p className="text-[13px] leading-relaxed text-muted">
        {t(
          `글자를 끝까지 따라 쓰면 별 1개, 별 10개가 모이면 보물 스티커. 자모 24개를 한 번씩 다 쓰면 음절 쓰기(ㄱㄴㅁㅂ)가 열리고, 한 세트에서 글자 ${SET_GOAL}개를 쓰면 다음 세트(ㄷㄹㅅㅇ → ㅈㅊㅋ → ㅌㅍㅎ)가 열려요. 만들기에서는 처음부터 자음 14개를 모두 쓸 수 있어요. 지금 ${p.setsOpen}/${SET_COUNT}세트. 기록은 이 기기에만 저장돼요.`,
          `One star for each letter traced to the end; 10 stars give a treasure sticker. Writing all 24 letters once opens syllable writing (ㄱㄴㅁㅂ); writing ${SET_GOAL} syllables of a set opens the next one (ㄷㄹㅅㅇ → ㅈㅊㅋ → ㅌㅍㅎ). Build has all 14 consonants from the start. Now ${p.setsOpen} of ${SET_COUNT} sets. This record stays on this device.`,
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {(!p.syllablesOpen || p.setsOpen < SET_COUNT) && (
          <button type="button" onClick={openAllSets} className="rounded-full bg-page px-4 py-2 text-[15px] font-semibold">
            {t('모든 글자 바로 열기', 'Open all letters now')}
          </button>
        )}
        {written.length > 0 && (
          <button type="button" onClick={saveHandwriting} className="rounded-full bg-page px-4 py-2 text-[15px] font-semibold">
            {t(`아이 글씨 그림으로 저장 (${written.length})`, `Save handwriting as a picture (${written.length})`)}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm(t('쓰기 기록(별, 스티커, 놀이판, 아이 글씨)을 모두 지울까요?', 'Erase all writing progress (stars, stickers, play scenes, handwriting)?'))) {
              resetProgress()
              resetKeepsakes()
            }
          }}
          className="rounded-full bg-page px-4 py-2 text-[15px] font-semibold"
        >
          {t('기록 지우기', 'Reset progress')}
        </button>
      </div>
    </section>
  )
}
