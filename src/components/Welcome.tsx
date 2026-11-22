import { useState } from 'react'
import { ANIMALS, NAME_RE, addChild, type Animal, type Child } from '../children'
import { t } from '../i18n'

// The first thing a parent sees, once: "What's your child's name?" The app then opens as the
// child's own ("리하의 소리블록") and the first word they build and write is their name. It can be
// skipped, and added later on the parents' page.

const SEEN_KEY = 'soriblocks.welcome.v1'

export function welcomeDue(hasChild: boolean): boolean {
  if (hasChild) return false
  try {
    return localStorage.getItem(SEEN_KEY) !== '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* asks again next time */
  }
}

export function Welcome({ onDone }: { onDone: (child: Child | null) => void }) {
  const [name, setName] = useState('')
  const [animal, setAnimal] = useState<Animal>(ANIMALS[0])
  // Korean is typed in pieces: judge the name only once the parent has left the box.
  const [touched, setTouched] = useState(false)
  const value = name.replace(/\s/g, '')
  const valid = NAME_RE.test(value)
  return (
    <div className="welcome" role="dialog" aria-label={t('아이 이름', "Your child's name")}>
      <div className="welcome-card">
        <div className="welcome-animal" aria-hidden>
          {animal}
        </div>
        <h1>{t('아이 이름을 알려 주세요', "What's your child's name?")}</h1>
        <p>
          {t(
            '아이가 처음 읽고 쓰는 낱말이 자기 이름이 돼요. 이름은 이 기기에만 저장돼요.',
            'Their own name becomes the first word they read and write. It stays on this device.',
          )}
        </p>
        <input
          className="welcome-input"
          value={name}
          maxLength={8}
          lang="ko"
          placeholder={t('예: 리하', 'In Hangul, e.g. 리하')}
          aria-label={t('이름 (한글, 성 빼고)', 'Name (in Hangul, given name)')}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
        />
        {touched && name && !valid && <p className="welcome-warn">{t('한글 1~5글자로 적어 주세요.', 'Please type 1 to 5 Hangul syllables.')}</p>}
        <div className="welcome-animals" role="radiogroup" aria-label={t('동물', 'Animal')}>
          {ANIMALS.map((a) => (
            <button key={a} type="button" role="radio" aria-checked={a === animal} className={a === animal ? 'is-current' : ''} onClick={() => setAnimal(a)}>
              {a}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="welcome-go"
          disabled={!valid}
          onClick={() => {
            markSeen()
            onDone(addChild(value, animal))
          }}
        >
          {t('시작하기', 'Start')}
        </button>
        <button
          type="button"
          className="welcome-skip"
          onClick={() => {
            markSeen()
            onDone(null)
          }}
        >
          {t('나중에 할게요', 'Later')}
        </button>
      </div>
    </div>
  )
}
