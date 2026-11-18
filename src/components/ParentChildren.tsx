import { useState } from 'react'
import {
  ANIMALS,
  MAX_CHILDREN,
  NAME_RE,
  addChild,
  chooseChild,
  nameSound,
  removeChild,
  updateChild,
  useChildren,
  type Animal,
  type Child,
} from '../children'
import { setLocalRecording } from '../audio'
import { t } from '../i18n'
import { deleteRecording } from '../recordings'
import { HANDWRITING_KEY, SCENES_KEY } from '../keepsakes'
import { PROGRESS_KEY } from '../progress'

// "Our children" on the parents' page: each child's name (shown on the opening screen and
// practiced on the Write tab) and animal (how a child who can't read yet finds "me").

const clean = (s: string) => s.replace(/\s/g, '')

function Editor({
  child,
  taken,
  onDone,
}: {
  child: Child | null
  taken: Set<Animal>
  onDone: () => void
}) {
  const [name, setName] = useState(child?.name ?? '')
  const [animal, setAnimal] = useState<Animal>(child?.animal ?? ANIMALS.find((a) => !taken.has(a)) ?? ANIMALS[0])
  const value = clean(name)
  // Korean is typed in pieces (ㄹ, 리, 리ㅎ, 리하): judge the name once the parent is done typing.
  const [touched, setTouched] = useState(false)
  const valid = NAME_RE.test(value)
  return (
    <div className="kid-editor">
      <label className="kid-field">
        <span>{t('이름 (한글, 성 빼고)', 'Name (in Hangul, given name)')}</span>
        <input
          className="kid-input"
          value={name}
          maxLength={8}
          placeholder={t('예: 리하', 'e.g. 리하')}
          lang="ko"
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
        />
      </label>
      {touched && name && !valid && (
        <p className="parent-sub is-warn">{t('한글 1~5글자로 적어 주세요.', 'Please type 1 to 5 Hangul syllables.')}</p>
      )}
      <div className="kid-animals" role="radiogroup" aria-label={t('동물', 'Animal')}>
        {ANIMALS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={a === animal}
            disabled={taken.has(a) && a !== child?.animal}
            className={`kid-animal ${a === animal ? 'is-current' : ''}`}
            onClick={() => setAnimal(a)}
          >
            {a}
          </button>
        ))}
      </div>
      <div className="kid-actions">
        <button type="button" className="parent-btn" onClick={onDone}>
          {t('취소', 'Cancel')}
        </button>
        <button
          type="button"
          className="parent-btn is-primary"
          disabled={!valid}
          onClick={() => {
            if (child) updateChild(child.id, { name: value, animal })
            else addChild(value, animal)
            onDone()
          }}
        >
          {t('저장', 'Save')}
        </button>
      </div>
    </div>
  )
}

export function ParentChildren({ onRecordName }: { onRecordName: (c: Child) => void }) {
  const kids = useChildren()
  // 'new', a child's id being edited, or null.
  const [editing, setEditing] = useState<string | null>(null)
  const taken = new Set(kids.list.map((c) => c.animal))
  return (
    <section className="parent-card">
      <h2>{t('우리 아이', 'Your children')}</h2>
      <p className="parent-sub">
        {t(
          '이름은 앱이 켜질 때 보이고, 쓰기에서 내 이름 쓰기로 연습해요. 아이가 둘 이상이면 동물 그림으로 골라요. 별과 스티커는 아이마다 따로, 가족 녹음은 함께 써요.',
          "The name appears when the app opens and becomes a name-writing page. With more than one child, each picks their animal; stars and stickers are kept per child, family recordings are shared.",
        )}
      </p>
      {kids.list.map((c) =>
        editing === c.id ? (
          <Editor key={c.id} child={c} taken={taken} onDone={() => setEditing(null)} />
        ) : (
          <div key={c.id} className={`kid-row ${c.id === kids.current ? 'is-current' : ''}`}>
            <button
              type="button"
              className="kid-who"
              aria-pressed={c.id === kids.current}
              onClick={() => chooseChild(c.id)}
              title={t('이 아이의 기록 보기', "Show this child's progress")}
            >
              <span className="kid-who-animal">{c.animal}</span>
              <b>{c.name}</b>
              {kids.list.length > 1 && c.id === kids.current && <span className="parent-badge">{t('지금', 'Now')}</span>}
            </button>
            <div className="kid-row-actions">
              <button type="button" className="parent-btn" onClick={() => onRecordName(c)}>
                {t('이름 녹음', 'Record name')}
              </button>
              <button type="button" className="parent-btn" onClick={() => setEditing(c.id)}>
                {t('바꾸기', 'Edit')}
              </button>
              <button
                type="button"
                className="parent-btn is-danger"
                onClick={() => {
                  if (confirm(t(`${c.name}의 이름과 별, 스티커, 아이 글씨를 지울까요?`, `Remove ${c.name} with their stars, stickers and handwriting?`)))
                  {
                    removeChild(c.id, [PROGRESS_KEY, SCENES_KEY, HANDWRITING_KEY])
                    setLocalRecording(nameSound(c), null)
                    void deleteRecording(nameSound(c)).catch(() => {})
                  }
                }}
              >
                {t('지우기', 'Remove')}
              </button>
            </div>
          </div>
        ),
      )}
      {editing === 'new' ? (
        <Editor child={null} taken={taken} onDone={() => setEditing(null)} />
      ) : (
        kids.list.length < MAX_CHILDREN && (
          <button type="button" className="parent-btn kid-add" onClick={() => setEditing('new')}>
            {kids.list.length ? t('+ 아이 추가', '+ Add a child') : t('+ 아이 이름 등록', "+ Add your child's name")}
          </button>
        )
      )}
    </section>
  )
}
