#!/bin/bash
# Build the signed Android App Bundle for Google Play, without opening Android Studio.
set -e
cd "$(dirname "$0")/.."
. scripts/android-env.sh
if [ ! -f "$KEY_PROPS" ]; then
  echo "서명 설정이 없어요. 먼저 한 번만 실행해 주세요:  npm run android:setup" >&2
  exit 1
fi
npm run build:app
npx cap sync android
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && ./gradlew bundleRelease)
AAB="android/app/build/outputs/bundle/release/app-release.aab"
if ! jarsigner -verify "$AAB" >/dev/null 2>&1; then
  echo "AAB가 서명되지 않았어요: $AAB" >&2
  exit 1
fi
VERSION=$(grep -m1 'versionName' android/app/build.gradle | sed 's/[^0-9.]//g')
CODE=$(grep -m1 'versionCode' android/app/build.gradle | sed 's/[^0-9]//g')
echo
echo "완성: $AAB  (버전 $VERSION, 버전 코드 $CODE)"
echo "이 파일을 Play Console에 올리면 돼요."
open -R "$AAB" 2>/dev/null || true
