#!/bin/bash
# Put the current app on the Android phone/tablet connected by USB (debug build, no keystore
# needed), then open it. Android Studio does not need to be open.
set -e
cd "$(dirname "$0")/.."
. scripts/android-env.sh
ADB="$ANDROID_HOME/platform-tools/adb"
if ! "$ADB" get-state >/dev/null 2>&1; then
  echo "연결된 안드로이드 기기가 없어요. USB를 꽂고, 기기 화면에 'USB 디버깅 허용'이 뜨면 허용해 주세요." >&2
  "$ADB" devices
  exit 1
fi
npm run build:app
npx cap sync android
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && ./gradlew installDebug)
"$ADB" shell monkey -p com.lihallc.soriblocks -c android.intent.category.LAUNCHER 1 >/dev/null
echo
echo "설치하고 열었어요. 기기 화면을 확인하세요."
