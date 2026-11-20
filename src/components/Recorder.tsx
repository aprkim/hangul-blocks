import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { setLocalRecording, setRecordingSession, stop as stopGameAudio } from '../audio'
import { RECORD_GROUPS as JAMO_GROUPS, type RecordItem } from '../jamo'
import { MORE_WORD_RECORD_GROUP, WORD_RECORD_GROUP } from '../words'
import { isNativeApp, shareFileNative } from '../native'
import { ParentProgress, ParentSettings } from './ParentProgress'
import { ParentChildren } from './ParentChildren'
import { nameSound, useChildren } from '../children'
import { nameSyllableSound, unvoicedSyllables } from '../hangul'
import {
  deleteRecording,
  encodeMp3,
  exportZip,
  loudestDb,
  loadRecordings,
  saveRecording,
  trimAndNormalize,
} from '../recordings'
import { t } from '../i18n'

// The parents' page (behind the grown-up question): the child's writing record, the family's
// own voice for any sound (hold the button, say it, let go), settings, and a backup of the
// recordings. Open from settings (top right) or with ?record.

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

const RECORD_GROUPS = [...JAMO_GROUPS, WORD_RECORD_GROUP, MORE_WORD_RECORD_GROUP]

/** What parents see: three kinds of sound, not the production batches. */
type UiGroup = { id: string; label: string; items: RecordItem[] }
const UI_GROUPS: UiGroup[] = [
  { id: 'jamo', label: t('자음·모음', 'Letters'), items: JAMO_GROUPS[0].items },
  { id: 'syllables', label: t('글자', 'Syllables'), items: JAMO_GROUPS.slice(1).flatMap((g) => g.items) },
  { id: 'words', label: t('그림 단어', 'Picture words'), items: [...WORD_RECORD_GROUP.items, ...MORE_WORD_RECORD_GROUP.items] },
]

/** Names of takes whose deployed file is byte-for-byte the same size, i.e. already uploaded. */
async function serverCopies(takes: Map<string, Blob>): Promise<Set<string>> {
  const same = new Set<string>()
  const names = [...takes.keys()]
  const worker = async () => {
    for (let name = names.pop(); name; name = names.pop()) {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}audio/${name}.mp3`, { method: 'HEAD', cache: 'no-store' })
        const len = Number(res.headers.get('content-length'))
        if ((res.ok || res.status === 0) && len === takes.get(name)!.size) same.add(name)
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
        // Inside the iOS app, bundled files answer with status 0 instead of 200.
        const type = res.headers.get('content-type') ?? ''
        if ((res.ok || res.status === 0) && !/html/.test(type)) found.add(name)
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
  // The children's names come first once there are any: a name said in the family's voice is
  // what the child hears when picking "me" and after writing their name.
  const kids = useChildren()
  const uiGroups = useMemo<UiGroup[]>(
    () =>
      kids.list.length
        ? [
            {
              id: 'names',
              label: t('아이 이름', 'Names'),
              // Each name, then any of its syllables the app has no sound for (김, 윤): heard
              // one by one while the child traces them, and the whole name at the end.
              items: (() => {
                const seen = new Set<string>()
                return kids.list.flatMap((c) => [
                  { name: nameSound(c), shown: c.name, say: c.name },
                  ...unvoicedSyllables(c.name)
                    .filter((ch) => !seen.has(ch) && (seen.add(ch), true))
                    .map((ch) => ({ name: nameSyllableSound(ch), shown: ch, say: ch })),
                ])
              })(),
            },
            ...UI_GROUPS,
          ]
        : UI_GROUPS,
    [kids.list],
  )
  const voiceRef = useRef<HTMLElement>(null)
  const [groupId, setGroupId] = useState(UI_GROUPS[0].id)
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
  const stuckTimer = useRef<number | undefined>(undefined)
  const meterRaf = useRef<number | undefined>(undefined)
  const [level, setLevel] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  const group = uiGroups.find((g) => g.id === groupId) ?? uiGroups[0]
  const item: RecordItem = group.items[Math.min(index, group.items.length - 1)]
  // Recorded on this device, or already uploaded to the site from any device.
  const [onSiteAll, setOnSiteAll] = useState<Set<string>>(new Set())
  useEffect(() => {
    siteFiles(RECORD_GROUPS.flatMap((g) => g.items.map((i) => i.name))).then(setOnSiteAll)
  }, [])
  const isDone = (name: string) => takes.has(name) || onSiteAll.has(name)

  useEffect(() => {
    stopGameAudio()
    setRecordingSession(true)
    loadRecordings().then(setTakes)
    // Plugging in or pairing a mic (e.g. Bluetooth) kills the current mic stream on iOS.
    const onDeviceChange = () => dropStream()
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange)
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
      stream.current?.getTracks().forEach((t) => t.stop())
      ctx.current?.close()
      setRecordingSession(false)
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
      setRecordingSession(true) // iOS: the mic is refused while the session is playback-only
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
    // Opening the mic can wait on the browser's permission question, which is easy to miss
    // (Safari shows it small, by the address bar): say so at once, instead of seeming dead.
    setNote(t('마이크 켜는 중…', 'Turning on the microphone…'))
    const waiting = window.setTimeout(
      () =>
        setNote(
          t(
            '마이크 허용을 기다리고 있어요. 화면 위쪽(주소창 근처)에 "마이크 허용" 창이 떴는지 확인하고 허용을 눌러 주세요. 그다음 다시 누른 채로 말해 주세요.',
            'Waiting for microphone permission. Look for an "Allow microphone" prompt near the address bar, allow it, then hold and speak again.',
          ),
        ),
      2500,
    )
    const target = item
    let rec: MediaRecorder | null = null
    let source: MediaStream | null = null
    let failure: unknown = null
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
        failure = err
        dropStream()
      }
    }
    window.clearTimeout(waiting)
    if (!rec || !source) {
      holding.current = false
      // Say what the browser said: blocked, busy, missing and "not here at all" need different fixes.
      const name = failure instanceof Error ? failure.name : ''
      if (name === 'NotReadableError' || name === 'AbortError') {
        setNote(t(`다른 앱이 마이크를 쓰고 있어요 (통화, 음성 메모, 다른 탭 등). 그 앱을 닫고 다시 눌러 주세요. [${errText(failure)}]`, `Another app is using the microphone (a call, Voice Memos, another tab). Close it and try again. [${errText(failure)}]`))
        return
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setNote(t(`마이크를 찾지 못했어요. 이어폰이나 블루투스 기기를 뺐다가 다시 해 주세요. [${errText(failure)}]`, `No microphone found. Unplug earphones or Bluetooth devices and try again. [${errText(failure)}]`))
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setNote(t('이 브라우저에서는 녹음할 수 없어요. 카카오톡·인스타그램 안의 브라우저라면 Safari나 Chrome으로 열어 주세요.', "This browser can't record. If this opened inside KakaoTalk or Instagram, open it in Safari or Chrome."))
        return
      }
      setNote(t('마이크를 쓸 수 없어요. 앱: 설정 → 소리블록 → 마이크 켜기. iPhone·iPad Safari: 주소창 옆 아이콘 → 웹사이트 설정 → 마이크 허용 (또는 설정 → 앱 → Safari → 마이크 → 허용). Mac Safari: Safari → 설정 → 웹사이트 → 마이크 → soriblocks.lihallc.com 허용. Chrome: 주소창 왼쪽 아이콘 → 마이크 허용. 그다음 페이지를 새로고침해 주세요. [' + errText(failure) + ']', 'The microphone is not available. App: Settings → Sori Blocks → Microphone on. iPhone/iPad Safari: the icon by the address → Website Settings → Microphone → Allow (or Settings → Apps → Safari → Microphone → Allow). Mac Safari: Safari → Settings → Websites → Microphone → allow soriblocks.lihallc.com. Chrome: the icon left of the address → allow microphone. Then reload the page. [' + errText(failure) + ']'))
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
    setNote('')
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
    // Some browsers never report the end of a recording (the mic was taken away): don't leave
    // the button dead. If nothing has come back in a few seconds, start fresh.
    window.clearTimeout(stuckTimer.current)
    stuckTimer.current = window.setTimeout(() => {
      dropStream()
      setPhase('idle')
      setNote(t('녹음이 끝나지 않았어요. 한 번 더 눌러 주세요.', "The recording didn't finish. Please try again."))
    }, RELEASE_TAIL_MS + 4000)
  }

  async function finishTake(target: RecordItem, mimeType: string) {
    window.clearTimeout(stuckTimer.current)
    setPhase('processing')
    try {
      if (discard.current) {
        setNote(t('너무 짧게 눌렀어요. 버튼을 누른 채로 말해 주세요. (이전 녹음은 그대로 있어요)', 'That was too short. Hold the button while you speak. (The previous take is kept.)'))
        return
      }
      if (!chunks.current.length) {
        // The mic delivered nothing: usually a dead stream after a device change.
        dropStream()
        setNote(t('녹음이 비어 있어요. 한 번 더 눌러 주세요.', 'Nothing was recorded. Please try again.'))
        return
      }
      let stage = t('디코딩', 'decode')
      try {
        const raw = new Blob(chunks.current, { type: mimeType })
        const decoded = await decodeTake(await raw.arrayBuffer())
        stage = t('다듬기', 'trim')
        const samples = trimAndNormalize(decoded, PRESS_NOISE_S)
        if (!samples) {
          const db = loudestDb(decoded)
          setNote(
            db < -80
              ? t(`마이크에서 아무 소리도 안 들어와요 (${db}dB). 마이크 권한과, 어떤 마이크가 선택돼 있는지 확인해 주세요.`, `No sound from the microphone (${db}dB). Check the microphone permission and which microphone is selected.`)
              : t(`소리가 너무 작아요 (${db}dB). 마이크에 더 가까이 대고 조금 크게 말해 주세요.`, `Too quiet (${db}dB). Move closer to the microphone and speak a little louder.`),
          )
          return
        }
        if (samples.length / decoded.sampleRate < MIN_TAKE_S) {
          // An accidental tap must never overwrite a good take.
          setNote(t('너무 짧아요. 버튼을 누른 채로 말해 주세요. (이전 녹음은 그대로 있어요)', 'Too short. Hold the button while you speak. (The previous take is kept.)'))
          return
        }
        stage = t('mp3 변환', 'mp3')
        const mp3 = encodeMp3(samples, decoded.sampleRate)
        // Use the take even if on-device storage fails (e.g. Safari private browsing).
        setLocalRecording(target.name, mp3)
        setTakes((prev) => new Map(prev).set(target.name, mp3))
        playBlob(mp3)
        const secs = (samples.length / decoded.sampleRate).toFixed(2)
        stage = t('기기에 저장', 'save')
        try {
          await saveRecording(target.name, mp3)
          setNote(t(`저장됨 · ${secs}초 · 마음에 안 들면 다시 녹음하세요`, `Saved · ${secs}s · Record again if you don't like it`))
        } catch (err) {
          console.warn('[recorder] storage failed', err)
          setNote(
            t(`녹음됨 · ${secs}초 · 단, 이 브라우저에 저장이 안 돼요 (개인정보 보호 모드?). 끝나면 꼭 zip 받기를 누르세요. [${errText(err)}]`, `Recorded · ${secs}s · but this browser can't save it (private mode?). Download the zip when you're done. [${errText(err)}]`),
          )
        }
      } catch (err) {
        console.warn('[recorder] take failed at', stage, err)
        dropStream()
        setNote(t(`녹음을 처리하지 못했어요 (${stage}: ${errText(err)}). 다시 해 주세요. 계속되면 이 문구를 hello@lihallc.com 으로 보내 주세요.`, `Couldn't process the recording (${stage}: ${errText(err)}). Please try again. If it keeps happening, send this message to hello@lihallc.com.`))
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
    setNote(t('지웠어요', 'Deleted'))
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
    // Inside the iOS app: write the zip to the app's cache and open the native share sheet.
    if (isNativeApp) {
      shareFileNative(zipFile).catch((err) => {
        console.warn('[recorder] native share failed', err)
        setNote(t(`zip을 공유하지 못했어요 (${errText(err)})`, `Couldn't share the zip (${errText(err)})`))
      })
      return
    }
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
    if (!takes.size) return t('zip 받기 (0)', 'Download zip (0)')
    if (!zipAll && !unsent) return t('확인 중…', 'Checking…')
    const n = zipAll ? takes.size : unsent!.size
    if (n === 0) return t('새 녹음 없음 ✓', 'Nothing new ✓')
    return zipFile
      ? t(`${zipAll ? '전체' : '새 녹음'} zip 받기 (${n})`, `Download ${zipAll ? 'all' : 'new'} as zip (${n})`)
      : t('zip 준비 중…', 'Preparing zip…')
  }

  const hasTake = takes.has(item.name)
  const canListen = hasTake || onSiteAll.has(item.name)
  const mineCount = (g: UiGroup) => g.items.filter((i) => takes.has(i.name)).length
  const missingCount = (g: UiGroup) => g.items.filter((i) => !isDone(i.name)).length

  return (
    <div data-scroll className="parent h-full overflow-y-auto bg-page text-ink" style={{ touchAction: 'pan-y' }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 pt-4 pb-10">
        <header className="parent-header">
          <button type="button" onClick={onExit} className="parent-back">
            <span aria-hidden>←</span> {t('아이 화면으로', 'Back')}
          </button>
          <h1>{t('부모님', 'Parents')}</h1>
        </header>

        <ParentChildren
          onRecordName={(c) => {
            setGroupId('names')
            const names = uiGroups.find((g) => g.id === 'names')?.items ?? []
            setIndex(Math.max(0, names.findIndex((i) => i.name === nameSound(c))))
            setNote('')
            voiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />

        <ParentProgress />

        {/* ---------- family voice (optional) ---------- */}
        <section className="parent-card" ref={voiceRef}>
          <h2>{t('우리 가족 목소리', "Your family's voice")}</h2>
          <p className="parent-sub">
            {t(
              '녹음하면 앱 속 소리가 그 목소리로 바뀌어요. 원하는 소리만 골라서 녹음해도 돼요.',
              'Record a sound and the app plays it in your voice. Record as many or as few as you like.',
            )}
          </p>

          <div className="parent-tabs" role="tablist">
            {uiGroups.map((g) => {
              const missing = missingCount(g)
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={g.id === groupId}
                  className={`parent-tab ${g.id === groupId ? 'is-current' : ''}`}
                  onClick={() => {
                    setGroupId(g.id)
                    setIndex(Math.max(0, g.items.findIndex((i) => !isDone(i.name))))
                    setNote('')
                  }}
                >
                  {g.label}
                  {missing > 0 && <span className="parent-badge">{t(`녹음 필요 ${missing}`, `${missing} to record`)}</span>}
                </button>
              )
            })}
          </div>

          <div className="rec-card">
            <div className="rec-shown">{item.shown}</div>
            <div className="rec-say">
              {t('「', '“')}
              <b>{item.say}</b>
              {t('」 라고 말해 주세요', '”, please')}
            </div>
            {!isDone(item.name) && (
              <div className="rec-need">{t('아직 소리가 없어요. 녹음하면 앱에 나와요.', 'No sound yet: record it and it appears in the app.')}</div>
            )}

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault()
                startTake()
              }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={phase === 'processing'}
              aria-label="record"
              style={
                {
                  touchAction: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  '--level': phase === 'recording' ? level : 0,
                  '--progress': phase === 'recording' ? Math.min(1, elapsed / (MAX_TAKE_MS / 1000)) : 0,
                } as CSSProperties
              }
              className={`rec-btn is-${phase}`}
            >
              <svg viewBox="0 0 100 100" className="rec-ring" aria-hidden>
                <circle cx="50" cy="50" r="47" pathLength={100} className="rec-ring-track" />
                <circle cx="50" cy="50" r="47" pathLength={100} className="rec-ring-fill" />
              </svg>
              <svg viewBox="0 0 48 48" className="rec-mic" aria-hidden>
                <rect x="17" y="6" width="14" height="23" rx="7" fill="currentColor" />
                <path d="M11 22a13 13 0 0 0 26 0M24 35v7M17 42h14" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" fill="none" />
              </svg>
            </button>
            <div className="rec-hint">
              {phase === 'recording'
                ? t('말하는 중… 다 말하면 손을 떼세요', 'Listening… let go when you are done')
                : phase === 'processing'
                  ? t('저장 중…', 'Saving…')
                  : t('누른 채로 말하기', 'Hold and speak')}
            </div>
            <div className="rec-note">{note}</div>

            <fieldset disabled={phase !== 'idle'} className="rec-actions">
              <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}>
                {t('이전', 'Back')}
              </button>
              <button type="button" disabled={!canListen} onClick={() => listen(item.name)}>
                {t('들어보기', 'Listen')}
              </button>
              {hasTake && (
                <button type="button" onClick={removeTake}>
                  {onSiteAll.has(item.name) ? t('원래 소리로', 'Use original') : t('녹음 지우기', 'Delete')}
                </button>
              )}
              <button type="button" className="is-primary" onClick={() => goTo(nextUnrecorded(index))}>
                {t('다음', 'Next')}
              </button>
            </fieldset>
          </div>

          <div className="rec-legend">
            <span><i className="is-mine" />{t('내 목소리', 'My voice')} {mineCount(group)}</span>
            <span><i className="is-built" />{t('기본 소리', 'Built-in')}</span>
            {missingCount(group) > 0 && <span><i className="is-missing" />{t('녹음 필요', 'To record')}</span>}
          </div>
          <div className="rec-grid">
            {group.items.map((it, i) => (
              <button
                key={it.name}
                type="button"
                onClick={() => goTo(i)}
                className={`${takes.has(it.name) ? 'is-mine' : onSiteAll.has(it.name) ? 'is-built' : 'is-missing'} ${
                  i === index ? 'is-current' : ''
                } ${it.shown.length > 1 ? 'is-word' : ''}`}
              >
                {it.shown}
              </button>
            ))}
          </div>
        </section>

        <ParentSettings />

        {/* ---------- backup (rarely needed) ---------- */}
        <details className="parent-card parent-backup">
          <summary>{t('녹음 백업', 'Back up recordings')}</summary>
          <p className="parent-sub">
            {t(
              '녹음은 이 기기에만 저장돼요. 다른 기기로 옮기거나 보관하려면 zip 파일로 받아 두세요.',
              'Recordings are saved on this device only. Download them as a zip to keep them or move them to another device.',
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={download} disabled={!zipFile} className="parent-btn">
              {zipLabel()}
            </button>
            {takes.size > 0 && (
              <label className="flex items-center gap-1 text-[14px] text-muted">
                <input type="checkbox" checked={zipAll} onChange={(e) => setZipAll(e.target.checked)} />
                {t('전체', 'All')}
              </label>
            )}
          </div>
        </details>
        <p className="parent-sub text-center">{t('버전', 'Build')} {__BUILD__}</p>
      </div>
    </div>
  )
}
