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
import { Capacitor } from '@capacitor/core'
import { isNativeApp, shareFileNative } from '../native'

/** Where to leave a rating: the store's review page for this platform (web: the App Store page). */
const REVIEW_URL =
  Capacitor.getPlatform() === 'android'
    ? 'market://details?id=com.lihallc.soriblocks'
    : Capacitor.getPlatform() === 'ios'
      ? 'itms-apps://itunes.apple.com/app/id6833827598?action=write-review'
      : 'https://apps.apple.com/app/id6833827598?action=write-review'

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
    <section className="parent-card">
      <h2>{t('아이의 기록', "Your child's progress")}</h2>
      <div className="parent-stats">
        <div><b>{p.stars}</b><span>{t('별', 'Stars')}</span></div>
        <div><b>{jamoWrittenCount(p)}<small>/{JAMO_CHARS.length}</small></b><span>{t('쓴 자음·모음', 'Letters written')}</span></div>
        <div><b>{sylDone}<small>/{SYLLABLE_CHARS.length}</small></b><span>{t('쓴 글자', 'Syllables written')}</span></div>
        <div><b>{p.treasures.length}<small>/{TREASURES.length}</small></b><span>{t('보물 스티커', 'Treasures')}</span></div>
      </div>
      <p className="parent-sub">{t('글자를 쓴 횟수 (파란색 = 써 봤어요)', 'Times each letter was written (blue = written)')}</p>
      <div className="flex flex-wrap gap-1.5">{JAMO_CHARS.map(chip)}</div>
      {p.syllablesOpen && <div className="flex flex-wrap gap-1.5">{reachableSyllables(p).map((s) => chip(s.char))}</div>}
      <p className="parent-sub">
        {t(
          '글자를 끝까지 따라 쓰면 별 1개, 별 10개마다 보물 스티커를 받아요. 기록은 이 기기에만 저장돼요.',
          'One star for each letter traced to the end, a treasure sticker for every 10 stars. This record stays on this device.',
        )}
      </p>
      {written.length > 0 && (
        <div>
          <button type="button" onClick={saveHandwriting} className="parent-btn">
            {t(`아이 글씨 그림으로 저장 (${written.length})`, `Save handwriting as a picture (${written.length})`)}
          </button>
        </div>
      )}
    </section>
  )
}

/** Settings that change the child's progress: open everything now, or start over. */
export function ParentSettings() {
  const p = useProgress()
  return (
    <section className="parent-card">
      <h2>{t('설정', 'Settings')}</h2>
      <div className="parent-row">
        <div>
          <b>{t('모든 글자 바로 열기', 'Open all letters now')}</b>
          <p className="parent-sub">
            {t(
              `원래는 아이가 써서 열어요: 자모 24개를 다 쓰면 글자 쓰기, 한 세트에서 ${SET_GOAL}개를 쓰면 다음 세트(지금 ${p.setsOpen}/${SET_COUNT}).`,
              `Normally the child opens them by writing: all 24 letters open syllables, ${SET_GOAL} syllables of a set open the next set (now ${p.setsOpen} of ${SET_COUNT}).`,
            )}
          </p>
        </div>
        <button
          type="button"
          className="parent-btn"
          disabled={p.syllablesOpen && p.setsOpen >= SET_COUNT}
          onClick={openAllSets}
        >
          {p.syllablesOpen && p.setsOpen >= SET_COUNT ? t('모두 열림', 'All open') : t('열기', 'Open')}
        </button>
      </div>
      <div className="parent-row">
        <div>
          <b>{t('앱 평가하기', 'Rate the app')}</b>
          <p className="parent-sub">
            {t('소리블록이 도움이 됐다면 별점과 한 줄 리뷰를 남겨 주세요. 다른 가족이 앱을 찾는 데 큰 도움이 돼요.', 'If Sori Blocks helps, a rating and a line of review help other families find it.')}
          </p>
        </div>
        <a className="parent-btn" href={REVIEW_URL} target="_blank" rel="noreferrer">
          {t('평가하기', 'Rate')}
        </a>
      </div>
      <div className="parent-row">
        <div>
          <b>{t('기록 지우기', 'Reset progress')}</b>
          <p className="parent-sub">{t('별, 스티커, 놀이판, 아이 글씨를 모두 지우고 처음부터 시작해요. 녹음은 그대로예요.', 'Erases stars, stickers, play scenes and handwriting. Recordings are kept.')}</p>
        </div>
        <button
          type="button"
          className="parent-btn is-danger"
          onClick={() => {
            if (confirm(t('쓰기 기록(별, 스티커, 놀이판, 아이 글씨)을 모두 지울까요?', 'Erase all writing progress (stars, stickers, play scenes, handwriting)?'))) {
              resetProgress()
              resetKeepsakes()
            }
          }}
        >
          {t('지우기', 'Reset')}
        </button>
      </div>
    </section>
  )
}
