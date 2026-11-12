# 앱스토어 출시 가이드 (소리블록 · Sori Blocks)

웹앱을 Capacitor로 감싼 iOS 앱이다. 코드는 이 저장소의 `ios/` 폴더에 있다.
**빌드와 제출은 Mac + Xcode에서만 된다.** 아래 순서대로 하면 된다.

---

## 0. 한 번만 준비

1. **Apple Developer Program 가입** — developer.apple.com/programs ($99/년). 승인까지 하루~이틀 걸릴 수 있다.
2. **Mac에 Xcode 설치** — Mac App Store에서 "Xcode". 설치 후 한 번 실행해서 추가 구성요소 설치를 끝낸다.
3. **Node.js 설치** — nodejs.org 에서 LTS 버전.
4. **Xcode에 Apple 계정 연결** — Xcode → Settings → Accounts → `+` → Apple ID.

## 1. 프로젝트 받기 (Mac 터미널)

```bash
git clone https://github.com/aprkim/hangul-blocks.git
```

```bash
cd hangul-blocks && npm install
```

```bash
npm run ios
```

마지막 명령이 웹앱을 빌드하고(`dist/`), iOS 프로젝트에 복사한 뒤(`cap sync`), Xcode를 연다.

## 2. Xcode에서 서명 설정

1. 왼쪽 목록 맨 위 **App** → 가운데 **TARGETS: App** → **Signing & Capabilities** 탭
2. **Team**: 본인 개발자 계정 선택
3. **Bundle Identifier**: `com.lihallc.soriblocks` (**첫 업로드 후에는 못 바꾼다**)
4. **General** 탭 → **Version** `1.0`, **Build** `1`

## 3. 실제 기기에서 테스트

1. iPad를 Mac에 케이블로 연결 → iPad에서 "이 컴퓨터를 신뢰" 허용
2. iPad: 설정 → 개인정보 보호 및 보안 → **개발자 모드** 켜기 (재부팅)
3. Xcode 위쪽 기기 선택에서 iPad 선택 → ▶︎ (Run)

확인할 것:
- [ ] 타일을 누르면 바로 소리가 나고 손에 살짝 진동이 온다
- [ ] **무음 스위치를 켜도** 소리가 난다
- [ ] 비행기 모드에서도 전부 동작한다 (소리 파일이 앱 안에 들어 있음)
- [ ] 조립 → 그림 단어 / 동물 친구가 나온다
- [ ] 모음 왼쪽 빈칸 3초 → **어른 확인 문제** → 녹음 화면
- [ ] 녹음 → zip 받기 → **공유 창**이 열린다

## 4. App Store Connect에 앱 만들기

appstoreconnect.apple.com → 앱 → `+` → 신규 앱

| 항목 | 값 |
|---|---|
| 플랫폼 | iOS |
| 이름 | 소리블록 (영어 이름: Sori Blocks) |
| 부제 | 소리로 조립하는 한글 (영어: Build Korean letters by sound) |
| 기본 언어 | 한국어 |
| 번들 ID | `com.lihallc.soriblocks` |
| SKU | `soriblocks` (아무 문자열) |

### 앱 정보
- **카테고리**: 교육 (보조: 게임 > 교육)
- **키즈 카테고리**: 만 5세 이하 (또는 6–8세)
- **개인정보 처리방침 URL**: `https://hangul-blocks-blush.vercel.app/privacy.html`
- **이용약관 (EULA)**: 앱 정보 → 라이선스 계약 → 사용자 지정 EULA에 `https://hangul-blocks-blush.vercel.app/terms.html` 의 내용을 붙여넣거나, 앱 설명 맨 끝에 이 주소를 적는다 (안 하면 애플 기본 EULA가 적용되고, 그것도 괜찮다)
- **지원 URL**: `https://hangul-blocks-blush.vercel.app/privacy.html` (문의 이메일이 적혀 있음)
- **판매자**: Liha LLC

### 앱 개인정보 (App Privacy)
- "데이터를 수집합니까?" → **아니요** (Data Not Collected)

### 연령 등급
- 모든 질문 "없음" → 4+

### 가격
- 무료 (또는 원하는 가격)

## 5. 스크린샷

필수 크기 (가로 스크린샷 가능):
- **iPad 13"**: 2752 × 2064 (가로)
- **iPhone 6.9"**: 2868 × 1320 (가로)

Xcode 시뮬레이터에서 찍는 게 가장 정확하다 (이모지가 실제 앱과 같은 애플 이모지로 나옴).
시뮬레이터: Xcode → 위쪽 기기 선택 → "iPad Pro 13-inch" → ▶︎ → `⌘S` 로 스크린샷.

추천 3장: ① 자모판 ② 가 + 🎒 가방 ③ 고 + 🐱 고양이 (세로모임)

## 6. 업로드와 심사 제출

1. Xcode 위쪽 기기 선택 → **Any iOS Device (arm64)**
2. 메뉴 **Product → Archive**
3. 끝나면 Organizer 창 → **Distribute App** → **App Store Connect** → Upload
4. 10–30분 뒤 App Store Connect → TestFlight에 빌드가 보인다
   - 먼저 **TestFlight로 본인 iPad에 설치해서** 한 번 더 확인 추천
5. App Store 탭 → 빌드 선택 → **심사에 제출**

### 심사 메모 (App Review Information → Notes) 에 넣을 문장

> This is a Korean letter-sound app for young children. Tap consonant and vowel tiles to hear each sound, and build syllables on the second screen.
> A parents-only recording screen lets a parent record the sounds in their own voice. It opens by pressing and holding the empty space to the left of the vowel tiles for 3 seconds, followed by a multiplication question (parental gate). The microphone is used only there, and recordings stay on the device.
> The app collects no data and works fully offline.

## 7. 코드를 바꾼 뒤 다시 올릴 때

```bash
git pull && npm install && npm run ios
```

Xcode에서 **Build 번호를 1 올리고** (예: 1 → 2) 6번을 반복한다.

---

## 심사에서 자주 걸리는 것 (미리 대비해 둔 것)

| 위험 | 대비 |
|---|---|
| 4.2 최소 기능 ("웹사이트를 감싼 것") | 오프라인 동작, 햅틱, 무음 스위치 무시 재생, 네이티브 공유 |
| 키즈 카테고리 1.3 | 광고·분석·외부 링크·구매 없음, 어른 영역에 부모 확인 문제 |
| 마이크 사용 이유 | Info.plist `NSMicrophoneUsageDescription` 에 한/영 설명 |
| 개인정보 처리방침·이용약관 | `public/privacy.html`, `public/terms.html` |
| 암호화 질문 | Info.plist `ITSAppUsesNonExemptEncryption = NO` 로 자동 처리 |
