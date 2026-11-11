import { useMemo, useState } from 'react'

// Parental gate (App Store Kids category): the adult area (recorder) opens only after a
// question a young child can't answer. Asked once per app session.

const PASSED_KEY = 'parent-gate-passed'

export function gatePassed(): boolean {
  try {
    return sessionStorage.getItem(PASSED_KEY) === '1'
  } catch {
    return false
  }
}

function rememberPassed() {
  try {
    sessionStorage.setItem(PASSED_KEY, '1')
  } catch {
    /* storage unavailable: ask again next time */
  }
}

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [a, b] = useMemo(() => [6 + Math.floor(Math.random() * 4), 6 + Math.floor(Math.random() * 4)], [])
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(false)

  function check() {
    if (Number(answer) === a * b) {
      rememberPassed()
      onPass()
    } else {
      setWrong(true)
      setAnswer('')
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-paper p-6 text-ink">
      <form
        className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[28px] bg-white p-8 shadow-[0_16px_40px_-20px_rgba(42,58,74,0.4)]"
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <div className="text-[17px] font-semibold">어른 확인 · For grown-ups</div>
        <div className="text-center text-[15px] text-[#8a7c6e]">
          녹음 화면은 부모님용이에요. 답을 입력해 주세요.
          <br />
          This area is for parents. Please answer:
        </div>
        <div className="text-[44px] font-bold tabular-nums">
          {a} × {b} = ?
        </div>
        <input
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value.replace(/\D/g, '').slice(0, 3))
            setWrong(false)
          }}
          className="h-14 w-40 rounded-2xl border-2 border-wash text-center text-[28px] font-bold outline-none focus:border-vowel"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          aria-label="answer"
        />
        <div className="min-h-5 text-[14px] text-consonant">{wrong ? '다시 해 보세요 · Try again' : ''}</div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="rounded-full bg-paper px-6 py-3 text-[16px] font-semibold">
            돌아가기
          </button>
          <button type="submit" disabled={!answer} className="rounded-full bg-vowel px-6 py-3 text-[16px] font-semibold text-white disabled:opacity-40">
            확인
          </button>
        </div>
      </form>
    </div>
  )
}
