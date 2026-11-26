import { useRef, useState } from 'react'
import { currentChild, useChildren } from '../children'
import { t } from '../i18n'
import { GALLERY_LIMIT, removePicture, useGallery, type Picture } from '../keepsakes'
import { pictureFile, shareOrSave } from '../pictureExport'
import { ScenePicture } from './ScenePicture'

// "Your child's pictures" on the parents' page: the sticker pictures the child finished with the
// camera button, to keep in Photos or send to family. Children can't send anything themselves;
// that stays behind the parents' gate.

function Item({ pic, caption }: { pic: Picture; caption: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const d = new Date(pic.at)
  return (
    <div className="parent-pic">
      <div ref={ref} className="parent-pic-frame">
        <ScenePicture pic={pic} />
      </div>
      <span className="parent-pic-date">{d.toLocaleDateString()}</span>
      <div className="parent-pic-actions">
        <button
          type="button"
          className="parent-btn is-primary"
          disabled={busy}
          onClick={async () => {
            const art = ref.current?.querySelector('svg')
            if (!art) return
            setBusy(true)
            setError('')
            try {
              await shareOrSave(await pictureFile(pic, art, caption))
            } catch (err) {
              console.warn('[pictures] share failed', err)
              setError(t('저장하지 못했어요. 다시 해 주세요.', "Couldn't save it. Please try again."))
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? t('준비 중…', 'Preparing…') : t('저장 · 보내기', 'Save · Send')}
        </button>
        <button
          type="button"
          className="parent-btn is-danger"
          onClick={() => {
            if (confirm(t('이 그림을 지울까요?', 'Remove this picture?'))) removePicture(pic.at)
          }}
        >
          {t('지우기', 'Remove')}
        </button>
      </div>
      {error && <p className="parent-sub is-warn">{error}</p>}
    </div>
  )
}

export function ParentPictures() {
  const { pictures } = useGallery()
  const child = currentChild(useChildren())
  const caption = child ? t(`${child.name}의 그림`, `${child.name}'s picture`) : t('우리 아이 그림', 'Our picture')
  return (
    <section className="parent-card">
      <h2>{t('아이가 만든 그림', 'Pictures your child made')}</h2>
      <p className="parent-sub">
        {t(
          `스티커 놀이에서 아이가 사진기 버튼을 누르면 그림이 냉장고에 붙고 여기에도 모여요 (최근 ${GALLERY_LIMIT}장). "저장 · 보내기"로 사진 앱에 저장하거나 가족에게 보낼 수 있어요.`,
          `When your child taps the camera in sticker play, the picture goes on their fridge and here (the latest ${GALLERY_LIMIT}). "Save · Send" keeps it in Photos or sends it to family.`,
        )}
      </p>
      {pictures.length === 0 ? (
        <p className="parent-sub">{t('아직 그림이 없어요.', 'No pictures yet.')}</p>
      ) : (
        <div className="parent-pics">
          {pictures.map((pic) => (
            <Item key={pic.at} pic={pic} caption={caption} />
          ))}
        </div>
      )}
    </section>
  )
}
