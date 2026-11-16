import {
  JAMO_CHARS,
  SYLLABLE_CHARS,
  TREASURES,
  jamoWrittenCount,
  letterStickers,
  openSyllables,
  resetProgress,
  timesWritten,
  useProgress,
} from '../progress'

/** Parents' view of the Write tab (behind the grown-up question): numbers live here, not on the child's screens. */
export function ParentProgress() {
  const p = useProgress()
  const sylDone = letterStickers(p).length
  const chip = (c: string) => {
    const n = timesWritten(p, c)
    return (
      <span
        key={c}
        title={`${n}번`}
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
      <div className="text-[18px] font-bold">아이의 쓰기 기록</div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
        <span>⭐ 별 {p.stars}개</span>
        <span>자모 {jamoWrittenCount(p)}/{JAMO_CHARS.length}</span>
        <span>음절 {sylDone}/{SYLLABLE_CHARS.length}</span>
        <span>보물 스티커 {p.treasures.length}/{TREASURES.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">{JAMO_CHARS.map(chip)}</div>
      {p.syllablesOpen && <div className="flex flex-wrap gap-1.5">{SYLLABLE_CHARS.map(chip)}</div>}
      <p className="text-[13px] leading-relaxed text-muted">
        글자를 끝까지 따라 쓰면 별 1개, 별 10개가 모이면 보물 스티커. 자모 24개를 한 번씩 다 쓰면 음절 쓰기가 열려요.
        기록은 이 기기에만 저장돼요.
      </p>
      <div className="flex flex-wrap gap-2">
        {!p.syllablesOpen && (
          <button type="button" onClick={openSyllables} className="rounded-full bg-page px-4 py-2 text-[15px] font-semibold">
            음절 쓰기 바로 열기
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm('쓰기 기록(별, 스티커)을 모두 지울까요?')) resetProgress()
          }}
          className="rounded-full bg-page px-4 py-2 text-[15px] font-semibold"
        >
          기록 지우기
        </button>
      </div>
    </section>
  )
}
