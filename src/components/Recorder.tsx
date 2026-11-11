import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { setLocalRecording, stop as stopGameAudio } from '../audio'
import { RECORD_GROUPS as JAMO_GROUPS, type RecordItem } from '../jamo'
import { WORD_RECORD_GROUP } from '../words'
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
/** Safety stop if the lift is never reported. */
const MAX_TAKE_MS = 5000
/** Ignore the start of each take: the finger landing on the glass is audible. */
const PRESS_NOISE_S = 0.12
/** A press shorter than this is a mis-tap. */
const MIN_PRESS_MS = 300
/** Shorter than this (after trimming) is a mis-tap, not a sound. */
const MIN_TAKE_S = 0.2

const RECORD_GROUPS = [...JAMO_GROUPS, WORD_RECORD_GROUP]

/** Names of takes whose deployed file is byte-for-byte the same size, i.e. already uploaded. */
async function serverCopies(takes: Map<string, Blob>): Promise<Set<string>> {
  const same = new Set<string>()
  const names = [...takes.keys()]
  const worker = async () => {
    for (let name = names.pop(); name; name = names.pop()) {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}audio/${name}.mp3`, { method: 'HEAD', cache: 'no-store' })
        const len = Number(res.headers.get('content-length'))
        if (res.ok && len === takes.get(name)!.size) same.add(name)
      } catch {
        /* offline or blocked: treat as not uploaded */
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  return same
}

const SITE_AUDIO = `${import.meta.env.BASE_URL}audio/`

/** Which of these sounds are already deployed on the site (recorded on any device and uploaded). */
async function siteFiles(names: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  const queue = [...names]
  const worker = async () => {
    for (let name = queue.pop(); name; name = queue.pop()) {
      try {
        const res = await fetch(`${SITE_AUDIO}${name}.mp3`, { method: 'HEAD', cache: 'no-store' })
        // A dev server may answer a missing file with index.html, so check it is audio.
        if (res.ok && /audio|mpeg/.test(res.headers.get('content-type') ?? '')) found.add(name)
      } catch {
        /* offline: unknown */
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  return found
}

function errText(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 140)
  return String(err).slice(0, 140)
}

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
  const autoStop = useRef<number | undefined>(undefined)
  const meterRaf = useRef<number | undefined>(undefined)
  const [level, setLevel] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  const group = RECORD_GROUPS.find((g) => g.id === groupId)!
  const item: RecordItem = group.items[index]
  // Recorded on this device, or already uploaded to the site from any device.
  const [onSiteAll, setOnSiteAll] = useState<Set<string>>(new Set())
  useEffect(() => {
    siteFiles(RECORD_GROUPS.flatMap((g) => g.items.map((i) => i.name))).then(setOnSiteAll)
  }, [])
  const isDone = (name: string) => takes.has(name) || onSiteAll.has(name)
  const doneCount = group.items.filter((i) => isDone(i.name)).length

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

  /** Play this device's take, or else the uploaded one. */
  function listen(name: string) {
    const take = takes.get(name)
    if (take) return playBlob(take)
    if (!onSiteAll.has(name)) return
    player.current?.pause()
    const el = new Audio(`${SITE_AUDIO}${name}.mp3`)
    player.current = el
    el.play().catch(() => {})
  }

  function goTo(i: number) {
    setIndex(i)
    setNote('')
    listen(group.items[i].name)
  }

  function nextUnrecorded(from: number) {
    for (let k = 1; k <= group.items.length; k++) {
      const j = (from + k) % group.items.length
      if (!isDone(group.items[j].name)) return j
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

  /** Live mic level, so it's obvious the page is hearing you. */
  function startMeter(source: MediaStream) {
    const ac = ctx.current!
    const analyser = ac.createAnalyser()
    analyser.fftSize = 1024
    const node = ac.createMediaStreamSource(source)
    node.connect(analyser)
    const data = new Float32Array(analyser.fftSize)
    const t0 = performance.now()
    const tick = () => {
      analyser.getFloatTimeDomainData(data)
      let sum = 0
      for (const v of data) sum += v * v
      setLevel(Math.min(1, Math.sqrt(sum / data.length) * 6))
      setElapsed((performance.now() - t0) / 1000)
      meterRaf.current = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(meterRaf.current!)
      node.disconnect()
      setLevel(0)
    }
  }

  const stopMeter = useRef<() => void>(() => {})

  /** Finger is on the record button. Only a real lift clears it (not a Safari pointercancel). */
  const holding = useRef(false)
  const startedAt = useRef(0)
  /** Set when a take should be thrown away (a press too short to be a sound). */
  const discard = useRef(false)

  // Listen for the lift on the whole window: iOS can cancel the button's own pointer
  // stream mid-hold, but still reports the finger leaving the screen.
  useEffect(() => {
    const lift = () => {
      if (!holding.current) return
      holding.current = false
      stopTake()
    }
    window.addEventListener('pointerup', lift)
    window.addEventListener('touchend', lift)
    return () => {
      window.removeEventListener('pointerup', lift)
      window.removeEventListener('touchend', lift)
    }
  }, [])

  async function startTake() {
    if (phase !== 'idle') return
    holding.current = true
    window.clearTimeout(stopTimer.current)
    player.current?.pause()
    setNote('')
    const target = item
    let rec: MediaRecorder | null = null
    let source: MediaStream | null = null
    for (let attempt = 0; attempt < 2 && !rec; attempt++) {
      try {
        source = await liveStream()
        ctx.current ??= new AudioContext()
        await ctx.current.resume()
        const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) =>
          MediaRecorder.isTypeSupported?.(t),
        )
        const r = type ? new MediaRecorder(source, { mimeType: type }) : new MediaRecorder(source)
        r.start()
        rec = r
      } catch (err) {
        console.warn('[recorder] could not start, attempt', attempt + 1, err)
        dropStream()
      }
    }
    if (!rec || !source) {
      setNote('마이크를 쓸 수 없어요. 설정 → Safari(또는 앱) → 마이크를 허용하고, 이 페이지를 다시 열어 주세요.')
      return
    }
    chunks.current = []
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
    rec.onstop = () => {
      stopMeter.current()
      finishTake(target, rec.mimeType)
    }
    recorder.current = rec
    try {
      stopMeter.current = startMeter(source)
    } catch {
      stopMeter.current = () => {}
    }
    setElapsed(0)
    setPhase('recording')
    startedAt.current = performance.now()
    discard.current = false
    autoStop.current = window.setTimeout(stopTake, MAX_TAKE_MS)
    // Finger lifted while the mic was still starting.
    if (!holding.current) stopTake()
  }

  function stopTake() {
    window.clearTimeout(autoStop.current)
    const rec = recorder.current
    if (!rec || rec.state !== 'recording') return
    // A brush or quick tap is not a take: never let it overwrite a good recording.
    if (performance.now() - startedAt.current < MIN_PRESS_MS) discard.current = true
    setPhase('processing')
    stopTimer.current = window.setTimeout(() => rec.stop(), RELEASE_TAIL_MS)
  }

  async function finishTake(target: RecordItem, mimeType: string) {
    setPhase('processing')
    try {
      if (discard.current) {
        setNote('너무 짧게 눌렀어요. 버튼을 누른 채로 말해 주세요. (이전 녹음은 그대로 있어요)')
        return
      }
      if (!chunks.current.length) {
        // The mic delivered nothing: usually a dead stream after a device change.
        dropStream()
        setNote('녹음이 비어 있어요. 한 번 더 눌러 주세요.')
        return
      }
      let stage = '디코딩'
      try {
        const raw = new Blob(chunks.current, { type: mimeType })
        const decoded = await decodeTake(await raw.arrayBuffer())
        stage = '다듬기'
        const samples = trimAndNormalize(decoded, PRESS_NOISE_S)
        if (!samples) {
          setNote('소리가 안 들렸어요. 버튼을 누른 채로 말하고, 다 말한 뒤 손을 떼세요.')
          return
        }
        if (samples.length / decoded.sampleRate < MIN_TAKE_S) {
          // An accidental tap must never overwrite a good take.
          setNote('너무 짧아요. 버튼을 누른 채로 말해 주세요. (이전 녹음은 그대로 있어요)')
          return
        }
        stage = 'mp3 변환'
        const mp3 = encodeMp3(samples, decoded.sampleRate)
        // Use the take even if on-device storage fails (e.g. Safari private browsing).
        setLocalRecording(target.name, mp3)
        setTakes((prev) => new Map(prev).set(target.name, mp3))
        playBlob(mp3)
        const secs = (samples.length / decoded.sampleRate).toFixed(2)
        stage = '기기에 저장'
        try {
          await saveRecording(target.name, mp3)
          setNote(`저장됨 · ${secs}초 · 마음에 안 들면 다시 녹음하세요`)
        } catch (err) {
          console.warn('[recorder] storage failed', err)
          setNote(
            `녹음됨 · ${secs}초 · 단, 이 브라우저에 저장이 안 돼요 (개인정보 보호 모드?). 끝나면 꼭 zip 받기를 누르세요. [${errText(err)}]`,
          )
        }
      } catch (err) {
        console.warn('[recorder] take failed at', stage, err)
        dropStream()
        setNote(`녹음을 처리하지 못했어요 (${stage} 단계: ${errText(err)}). 다시 해 주세요. 계속 나오면 이 문구를 Claude에게 보내 주세요.`)
      }
    } finally {
      setPhase('idle')
    }
  }

  /** Decode the recorder's output. Falls back to a fresh offline context if the live one refuses. */
  async function decodeTake(bytes: ArrayBuffer): Promise<AudioBuffer> {
    const withTimeout = (p: Promise<AudioBuffer>) =>
      Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))])
    try {
      return await withTimeout(ctx.current!.decodeAudioData(bytes.slice(0)))
    } catch (err) {
      console.warn('[recorder] live decode failed, trying offline context', err)
      const Offline = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext
      const off = new Offline(1, 1, 44100)
      return await withTimeout(off.decodeAudioData(bytes.slice(0)))
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

  // The zip is built ahead of time: iOS only allows a download or share sheet that starts
  // synchronously inside the tap, so nothing may be awaited between the tap and the share.
  // Only takes the site doesn't already have go in the zip. A take counts as already on the
  // site when the deployed file of that name has exactly the same size (same take = same bytes).
  const [onSite, setOnSite] = useState<Set<string> | null>(null)
  useEffect(() => {
    let live = true
    setOnSite(null)
    serverCopies(takes).then((same) => live && setOnSite(same))
    return () => {
      live = false
    }
  }, [takes])

  const unsent = useMemo(() => {
    if (!onSite) return null
    return new Map([...takes].filter(([name]) => !onSite.has(name)))
  }, [takes, onSite])

  // The zip is built ahead of time: iOS only allows a download or share sheet that starts
  // synchronously inside the tap, so nothing may be awaited between the tap and the share.
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [zipAll, setZipAll] = useState(false)
  useEffect(() => {
    let live = true
    setZipFile(null)
    const pick = zipAll ? takes : unsent
    if (pick?.size) {
      exportZip(pick).then((zip) => {
        if (live) setZipFile(new File([zip], 'hangul-audio.zip', { type: 'application/zip' }))
      })
    }
    return () => {
      live = false
    }
  }, [takes, unsent, zipAll])

  function download() {
    if (!zipFile) return
    // iPhone/iPad: the share sheet (Save to Files, AirDrop, Messages, ...).
    if (navigator.canShare?.({ files: [zipFile] })) {
      navigator.share({ files: [zipFile], title: 'hangul-audio.zip' }).catch((err: DOMException) => {
        if (err.name !== 'AbortError') {
          console.warn('[recorder] share failed', err)
          saveAs(zipFile)
        }
      })
      return
    }
    saveAs(zipFile)
  }

  function saveAs(file: File) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000)
  }

  function zipLabel() {
    if (!takes.size) return 'zip 받기 (0)'
    if (!zipAll && !unsent) return '확인 중…'
    const n = zipAll ? takes.size : unsent!.size
    if (n === 0) return '모두 올라가 있어요 ✓'
    return zipFile ? `${zipAll ? '전체' : '새 녹음'} zip 받기 (${n})` : 'zip 준비 중…'
  }

  const hasTake = takes.has(item.name)
  const canListen = hasTake || onSiteAll.has(item.name)

  return (
    <div data-scroll className="h-full overflow-y-auto bg-paper text-ink" style={{ touchAction: 'pan-y' }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-5 p-5">
        <header className="flex flex-wrap items-center gap-2">
          {RECORD_GROUPS.map((g) => {
            const done = g.items.filter((i) => isDone(i.name)).length
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGroupId(g.id)
                  setIndex(Math.max(0, g.items.findIndex((i) => !isDone(i.name))))
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
          <button type="button" onClick={download} disabled={!zipFile}
            className="rounded-full bg-white px-4 py-2 text-[15px] font-semibold disabled:opacity-40">
            {zipLabel()}
          </button>
          {takes.size > 0 && (
            <label className="flex items-center gap-1 text-[13px] text-[#8a7c6e]">
              <input type="checkbox" checked={zipAll} onChange={(e) => setZipAll(e.target.checked)} />
              전체
            </label>
          )}
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
          <div className="text-[14px] text-[#8a7c6e]">버튼을 누른 채로, 한 박자 쉬고 말한 다음 손 떼기. 평평한 톤, 자모는 살짝 길게.</div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault()
              startTake()
            }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={phase === 'processing'}
            aria-label="record"
            style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as CSSProperties}
            className={`mt-2 flex size-40 flex-col items-center justify-center gap-2 rounded-full text-[22px] font-bold text-white active:translate-y-1 ${
              phase === 'recording'
                ? 'scale-105 bg-ink shadow-[0_10px_0_#16212c]'
                : 'bg-consonant shadow-[0_10px_0_var(--color-consonant-dark)]'
            } disabled:opacity-60`}
          >
            {phase === 'recording' ? (
              <>
                <span className="block size-10 animate-pulse rounded-full bg-consonant" />
                <span className="text-[18px]">말하세요</span>
              </>
            ) : phase === 'processing' ? (
              '저장 중…'
            ) : (
              <>
                <span className="block size-10 rounded-full bg-white" />
                <span className="text-[18px]">누르고 있기</span>
              </>
            )}
          </button>

          {/* Mic level: moves when the mic hears you. */}
          <div className="flex h-6 w-64 items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-vowel transition-[width] duration-75"
                style={{ width: `${phase === 'recording' ? Math.max(4, level * 100) : 0}%` }}
              />
            </div>
            <span className="w-10 text-right text-[15px] tabular-nums text-[#8a7c6e]">
              {phase === 'recording' ? `${elapsed.toFixed(1)}s` : ''}
            </span>
          </div>

          <div className="min-h-6 text-center text-[15px]">{note}</div>

          <fieldset disabled={phase !== 'idle'} className="flex flex-wrap justify-center gap-2 whitespace-nowrap">
            <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}
              className="rounded-full bg-paper px-4 py-3 text-[16px] font-semibold disabled:opacity-40">이전</button>
            <button type="button" disabled={!canListen} onClick={() => listen(item.name)}
              className="rounded-full bg-paper px-4 py-3 text-[16px] font-semibold disabled:opacity-40">들어보기</button>
            <button type="button" disabled={!hasTake} onClick={removeTake}
              className="rounded-full bg-paper px-4 py-3 text-[16px] font-semibold disabled:opacity-40">지우기</button>
            <button type="button" onClick={() => goTo(nextUnrecorded(index))}
              className="rounded-full bg-vowel px-6 py-3 text-[16px] font-semibold text-white disabled:opacity-40">다음</button>
          </fieldset>
        </section>

        <section>
          <div className="mb-2 text-[15px] text-[#8a7c6e]">
            {group.label}: {doneCount}/{group.items.length} 완료 · 눌러서 이동
          </div>
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#8a7c6e]">
            <span><i className="mr-1 inline-block size-3 rounded bg-vowel align-middle" />이 기기에서 녹음</span>
            <span><i className="mr-1 inline-block size-3 rounded bg-[#b9c8d8] align-middle" />사이트에 올라가 있음</span>
            <span><i className="mr-1 inline-block size-3 rounded border border-[#d8c7a8] bg-white align-middle" />아직 없음</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.items.map((it, i) => (
              <button
                key={it.name}
                type="button"
                onClick={() => goTo(i)}
                className={`h-13 min-w-13 whitespace-nowrap rounded-xl px-2 font-bold ${
                  it.shown.length > 1 ? 'text-[18px]' : 'text-[24px]'
                } ${
                  takes.has(it.name)
                    ? 'bg-vowel text-white'
                    : onSiteAll.has(it.name)
                      ? 'bg-[#b9c8d8] text-white'
                      : 'bg-white text-ink'
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
