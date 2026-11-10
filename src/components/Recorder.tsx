import { useEffect, useMemo, useRef, useState } from 'react'
import { setLocalRecording, stop as stopGameAudio } from '../audio'
import { RECORD_GROUPS, type RecordItem } from '../jamo'
import {
  deleteRecording,
  encodeMp3,
  exportZip,
  loadRecordings,
  saveRecording,
  trimAndNormalize,
} from '../recordings'

// Adult-only recording page. Open with ?record, or hold the empty corner of the jamo
// board for 3 seconds. One sound per take: hold the button, say it, let go.

type Phase = 'idle' | 'recording' | 'processing'

/** Keep recording after the finger lifts: people let go while the vowel is still sounding,
    and Safari also drops the last moment of audio when a recording stops. */
const RELEASE_TAIL_MS = 600
/** Shorter than this (after trimming) is a mis-tap, not a sound. */
const MIN_TAKE_S = 0.2

export function Recorder({ onExit }: { onExit: () => void }) {
  const [groupId, setGroupId] = useState(RECORD_GROUPS[0].id)
  const [index, setIndex] = useState(0)
  const [takes, setTakes] = useState<Map<string, Blob>>(new Map())
  const [phase, setPhase] = useState<Phase>('idle')
  const [note, setNote] = useState('')

  const stream = useRef<MediaStream | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const ctx = useRef<AudioContext | null>(null)
  const player = useRef<HTMLAudioElement | null>(null)
  const stopTimer = useRef<number | undefined>(undefined)
  /** Finger is still on the button (it can lift before the mic finishes starting). */
  const pressed = useRef(false)

  const group = RECORD_GROUPS.find((g) => g.id === groupId)!
  const item: RecordItem = group.items[index]
  const doneCount = useMemo(() => group.items.filter((i) => takes.has(i.name)).length, [group, takes])

  useEffect(() => {
    stopGameAudio()
    loadRecordings().then(setTakes)
    // Plugging in or pairing a mic (e.g. Bluetooth) kills the current mic stream on iOS.
    const onDeviceChange = () => dropStream()
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
      stream.current?.getTracks().forEach((t) => t.stop())
      ctx.current?.close()
    }
  }, [])

  function playBlob(blob: Blob) {
    player.current?.pause()
    const url = URL.createObjectURL(blob)
    const el = new Audio(url)
    el.onended = () => URL.revokeObjectURL(url)
    player.current = el
    el.play().catch(() => {})
  }

  function goTo(i: number) {
    setIndex(i)
    setNote('')
    const take = takes.get(group.items[i].name)
    if (take) playBlob(take)
  }

  function nextUnrecorded(from: number, have: Map<string, Blob>) {
    for (let k = 1; k <= group.items.length; k++) {
      const j = (from + k) % group.items.length
      if (!have.has(group.items[j].name)) return j
    }
    return Math.min(from + 1, group.items.length - 1)
  }

  function dropStream() {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }

  /** A mic stream that is still alive; re-opens it if the device changed or the track died. */
  async function liveStream(): Promise<MediaStream> {
    const alive = stream.current?.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled)
    if (!alive) {
      dropStream()
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false },
      })
    }
    return stream.current!
  }

  async function startTake() {
    if (phase !== 'idle') return
    pressed.current = true
    window.clearTimeout(stopTimer.current)
    player.current?.pause()
    setNote('')
    const target = item
    let rec: MediaRecorder | null = null
    for (let attempt = 0; attempt < 2 && !rec; attempt++) {
      try {
        const s = await liveStream()
        ctx.current ??= new AudioContext()
        const r = new MediaRecorder(s)
        r.start()
        rec = r
      } catch (err) {
        console.warn('[recorder] could not start, attempt', attempt + 1, err)
        dropStream()
      }
    }
    if (!rec) {
      setNote('마이크를 쓸 수 없어요. 설정에서 마이크를 허용했는지 확인하고, 이 페이지를 다시 열어 주세요.')
      return
    }
    chunks.current = []
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
    rec.onstop = () => finishTake(target, rec.mimeType)
    recorder.current = rec
    setPhase('recording')
    // Finger already lifted while the mic was starting: still give it a short take.
    if (!pressed.current) endTake()
  }

  function endTake() {
    pressed.current = false
    const rec = recorder.current
    if (!rec || rec.state !== 'recording') return
    stopTimer.current = window.setTimeout(() => rec.stop(), RELEASE_TAIL_MS)
  }

  async function finishTake(target: RecordItem, mimeType: string) {
    setPhase('processing')
    try {
      if (!chunks.current.length) {
        // The mic delivered nothing: usually a dead stream after a device change.
        dropStream()
        setNote('녹음이 비어 있어요. 한 번 더 눌러 주세요.')
        return
      }
      const raw = new Blob(chunks.current, { type: mimeType })
      const decoded = await Promise.race([
        ctx.current!.decodeAudioData(await raw.arrayBuffer()),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('decode timeout')), 6000)),
      ])
      const samples = trimAndNormalize(decoded)
      if (!samples) {
        setNote('소리가 안 들렸어요. 버튼을 누른 채로 말해 주세요.')
        return
      }
      if (samples.length / decoded.sampleRate < MIN_TAKE_S) {
        // An accidental tap must never overwrite a good take.
        setNote('너무 짧아요. 버튼을 누른 채로 말해 주세요. (이전 녹음은 그대로 있어요)')
        return
      }
      const mp3 = encodeMp3(samples, decoded.sampleRate)
      await saveRecording(target.name, mp3)
      setLocalRecording(target.name, mp3)
      setTakes((prev) => new Map(prev).set(target.name, mp3))
      playBlob(mp3)
      setNote(`저장됨 · ${(samples.length / decoded.sampleRate).toFixed(2)}초 · 마음에 안 들면 다시 누르세요`)
    } catch (err) {
      console.warn('[recorder] take failed', err)
      dropStream()
      setNote('녹음을 처리하지 못했어요. 다시 해 주세요.')
    } finally {
      setPhase('idle')
    }
  }

  async function removeTake() {
    await deleteRecording(item.name)
    setLocalRecording(item.name, null)
    const next = new Map(takes)
    next.delete(item.name)
    setTakes(next)
    setNote('지웠어요')
  }

  async function download() {
    if (!takes.size) return
    const zip = await exportZip(takes)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(zip)
    a.download = 'hangul-audio.zip'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  }

  const hasTake = takes.has(item.name)

  return (
    <div data-scroll className="h-full overflow-y-auto bg-paper text-ink" style={{ touchAction: 'pan-y' }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-5 p-5">
        <header className="flex flex-wrap items-center gap-2">
          {RECORD_GROUPS.map((g) => {
            const done = g.items.filter((i) => takes.has(i.name)).length
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGroupId(g.id)
                  setIndex(Math.max(0, g.items.findIndex((i) => !takes.has(i.name))))
                  setNote('')
                }}
                className={`rounded-full px-4 py-2 text-[15px] font-semibold ${
                  g.id === groupId ? 'bg-ink text-white' : 'bg-white text-ink'
                }`}
              >
                {g.label} {done}/{g.items.length}
              </button>
            )
          })}
          <span className="flex-1" />
          <button type="button" onClick={download} disabled={!takes.size}
            className="rounded-full bg-white px-4 py-2 text-[15px] font-semibold disabled:opacity-40">
            zip 받기 ({takes.size})
          </button>
          <button type="button" onClick={onExit} className="rounded-full bg-white px-4 py-2 text-[15px] font-semibold">
            게임으로
          </button>
        </header>

        <section className="flex flex-col items-center gap-3 rounded-[28px] bg-white px-6 py-6 shadow-[0_16px_40px_-20px_rgba(42,58,74,0.4)]">
          <div className="text-[15px] text-[#8a7c6e]">
            {index + 1} / {group.items.length} · {item.name}.mp3
          </div>
          <div className="text-[120px] font-bold leading-none">{item.shown}</div>
          <div className="text-[22px]">
            「<b className="text-consonant">{item.say}</b>」 라고 말하기
          </div>
          <div className="text-[14px] text-[#8a7c6e]">평평한 톤, 또박또박. 자모는 살짝 길게. 끝을 올리지 않기.</div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              startTake()
            }}
            onPointerUp={endTake}
            onPointerCancel={endTake}
            disabled={phase === 'processing'}
            className={`mt-2 flex size-40 select-none items-center justify-center rounded-full text-[20px] font-bold text-white transition-transform ${
              phase === 'recording' ? 'scale-110 bg-consonant-dark' : 'bg-consonant'
            } disabled:opacity-50`}
            style={{ touchAction: 'none' }}
          >
            {phase === 'recording' ? '듣는 중…' : phase === 'processing' ? '저장 중…' : '누르고 말하기'}
          </button>

          <div className="min-h-6 text-center text-[15px]">{note}</div>

          <div className="flex flex-wrap justify-center gap-2 whitespace-nowrap">
            <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}
              className="rounded-full bg-paper px-4 py-3 text-[16px] font-semibold disabled:opacity-40">이전</button>
            <button type="button" disabled={!hasTake} onClick={() => playBlob(takes.get(item.name)!)}
              className="rounded-full bg-paper px-4 py-3 text-[16px] font-semibold disabled:opacity-40">들어보기</button>
            <button type="button" disabled={!hasTake} onClick={removeTake}
              className="rounded-full bg-paper px-4 py-3 text-[16px] font-semibold disabled:opacity-40">지우기</button>
            <button type="button" onClick={() => goTo(nextUnrecorded(index, takes))}
              className="rounded-full bg-vowel px-6 py-3 text-[16px] font-semibold text-white">다음</button>
          </div>
        </section>

        <section>
          <div className="mb-2 text-[15px] text-[#8a7c6e]">
            {group.label}: {doneCount}/{group.items.length} 완료 · 눌러서 이동
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2">
            {group.items.map((it, i) => (
              <button
                key={it.name}
                type="button"
                onClick={() => goTo(i)}
                className={`h-13 rounded-xl text-[24px] font-bold ${
                  takes.has(it.name) ? 'bg-vowel text-white' : 'bg-white text-ink'
                } ${i === index ? 'ring-[3px] ring-ink' : ''}`}
              >
                {it.shown}
              </button>
            ))}
          </div>
        </section>

        <p className="pb-6 text-[14px] leading-relaxed text-[#8a7c6e]">
          녹음은 이 기기에 저장되고 게임에서 바로 쓰입니다. 다른 기기나 배포에 넣으려면 zip을 받아서 Claude에게
          보내 주세요. 홈 화면 앱과 Safari는 저장소가 따로라서, 아이가 쓰는 쪽(홈 화면 앱)에서 녹음하세요.
        </p>
      </div>
    </div>
  )
}
