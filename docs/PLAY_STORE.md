# 구글 플레이 출시 가이드 (소리블록 · Sori Blocks)

iOS와 같은 웹앱을 Capacitor로 감싼 안드로이드 앱이다. 코드는 `android/` 폴더.
**빌드는 Mac의 Android Studio에서** 한다. 등록 문구와 그림은 `store/android/` 와 아래 표에 있다.

---

## 0. 한 번만 준비

1. **Google Play Console 개발자 계정** — play.google.com/console ($25, 한 번만)
   - **조직(Liha LLC)으로 가입하는 것을 추천.** D-U-N-S 번호가 필요하다.
   - ⚠️ **개인 계정**으로 만들면, 정식 출시 전에 **테스터 12명이 14일 동안** 비공개 테스트를 해야 한다 (2023년 이후 신규 개인 계정 규칙). 조직 계정은 이 조건이 없다.
2. **Android Studio 설치** — developer.android.com/studio (Mac용). 처음 실행할 때 SDK 설치를 끝까지 진행한다.

## 1. 프로젝트 열기 (Mac 터미널)

```bash
cd ~/hangul-blocks && git pull && npm install && npm run android
```

`npm run android` 가 웹앱을 빌드하고, 안드로이드 프로젝트에 복사한 뒤 Android Studio를 연다.
처음 열면 Gradle 동기화에 몇 분 걸린다 (오른쪽 아래 진행 표시가 끝날 때까지 기다린다).

## 2. 기기에서 테스트

- **에뮬레이터**: Android Studio → Device Manager → `+` → 태블릿(예: Pixel Tablet) 추가 → ▶︎ Run
- **실제 안드로이드 폰/태블릿**: 설정 → 휴대전화 정보 → 빌드번호 7번 탭 → 개발자 옵션 → USB 디버깅 켜기 → USB 연결 → ▶︎ Run

확인할 것:
- [ ] 타일을 누르면 바로 소리 + 진동
- [ ] 조립 → 그림 단어 / 동물 친구
- [ ] 비행기 모드에서도 동작
- [ ] 모음 왼쪽 빈칸 3초 → 어른 확인 문제 → 녹음 → 마이크 권한 허용 → 녹음됨

## 3. 서명된 앱 번들(AAB) 만들기

1. Android Studio 메뉴 **Build → Generate Signed App Bundle or APK…** → **Android App Bundle** → Next
2. **Key store path → Create new…**
   - 저장 위치: `~/keys/soriblocks-upload.jks` (**저장소 폴더 밖**에 둘 것)
   - 비밀번호, Alias(`upload`), 이름에 `Liha LLC`
   - ⚠️ **이 파일과 비밀번호를 잃어버리면 앱을 업데이트할 수 없다.** 비밀번호 관리자와 백업 드라이브에 꼭 보관. 절대 git에 올리지 말 것.
3. **release** 선택 → Create
4. 결과물: `android/app/release/app-release.aab`

## 4. Play Console에 앱 만들기

play.google.com/console → **앱 만들기**

| 항목 | 값 |
|---|---|
| 앱 이름 | 소리블록 |
| 기본 언어 | 한국어 |
| 앱 또는 게임 | 앱 |
| 무료 또는 유료 | 무료 |

### 대시보드의 "앱 설정" 항목들 (전부 채워야 출시 가능)

| 항목 | 답 |
|---|---|
| 개인정보처리방침 | `https://soriblocks.lihallc.com/privacy.html` |
| 앱 액세스 권한 | 모든 기능을 제한 없이 사용 가능 (로그인 없음) |
| 광고 | 광고 없음 |
| 콘텐츠 등급 | 설문 작성 → 카테고리 "기타 앱" 또는 "교육" → 폭력·성·도박 등 전부 "아니요" → 전체이용가 |
| 타겟층 | **만 5세 이하** (원하면 6–8세도 함께) → 아동 대상이므로 **가족 정책** 적용 |
| 뉴스 앱 | 아니요 |
| 데이터 보안 | 데이터 수집 **없음**, 공유 **없음** |
| 정부 앱 | 아니요 |
| 금융 기능 | 없음 |
| 건강 | 없음 |

### 가족 정책 (아동 대상 앱)
- 광고·분석 SDK 없음 ✅
- 앱 밖으로 나가는 링크·구매 없음 ✅
- 어른 영역(녹음)에 부모 확인 문제 ✅
- 마이크(RECORD_AUDIO) 권한: "부모님이 아이를 위해 소리를 녹음할 때만 사용, 녹음은 기기에만 저장" 이라고 설명

## 5. 스토어 등록정보 (기본 스토어 등록정보)

| 항목 | 내용 |
|---|---|
| 앱 이름 | 소리블록 |
| 간단한 설명 (80자) | 자음과 모음을 눌러 소리를 듣고, 조립해서 글자를 만드는 유아 한글 앱 |
| 자세한 설명 | `store/LISTING.md` 의 한국어 **설명** 그대로 |
| 앱 아이콘 (512×512) | `store/android/play-icon-512.png` |
| 그래픽 이미지 (1024×500) | `store/android/feature-1024x500.png` |
| 휴대전화 스크린샷 | `store/android/phone-1920x1080-1…4.png` |
| 태블릿 스크린샷 (7인치, 10인치) | `store/screenshots/ipad-13-1…4.png` |
| 카테고리 | 교육 |
| 이메일 | hello@lihallc.com |
| 웹사이트 | https://soriblocks.lihallc.com |

## 6. 출시

- 조직 계정: **프로덕션 → 새 버전 만들기** → `app-release.aab` 업로드 → 출시 노트 "첫 출시" → 검토 → **프로덕션으로 출시 시작**
- 개인 계정: 먼저 **비공개 테스트** 트랙에 올리고 테스터 12명을 14일간 유지 → 그 뒤 프로덕션 신청
- 처음엔 **Play App Signing** 사용에 동의 (기본값). 구글이 배포 키를 관리하고, 위에서 만든 건 업로드 키가 된다.

## 7. 코드를 바꾼 뒤 다시 올릴 때

```bash
cd ~/hangul-blocks && git pull && npm run android
```

`android/app/build.gradle` 의 `versionCode` 를 1 올리고 (1 → 2), `versionName` 을 맞춘 뒤 3번(서명된 번들)부터 반복한다.
