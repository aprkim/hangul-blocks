#!/bin/bash
# One-time: create the upload keystore and the properties file the release build reads.
# Both stay in ~/keys, outside the repository. The password is typed here, on this Mac only.
set -e
cd "$(dirname "$0")/.."
. scripts/android-env.sh
mkdir -p "$KEY_DIR"

if [ -f "$KEYSTORE" ]; then
  echo "키스토어가 이미 있어요: $KEYSTORE (새로 만들지 않아요)"
else
  echo "업로드 키스토어를 만들어요. 새 비밀번호를 정해 주세요 (6자 이상)."
  keytool -genkeypair -keystore "$KEYSTORE" -alias upload -keyalg RSA -keysize 2048 -validity 9125 \
    -dname "CN=Liha LLC, O=Liha LLC"
fi

printf "키스토어 비밀번호를 한 번 더 입력해 주세요 (화면에 보이지 않아요): "
read -r -s PASS
echo
if ! keytool -list -keystore "$KEYSTORE" -storepass "$PASS" -alias upload >/dev/null 2>&1; then
  echo "비밀번호가 맞지 않아요. 다시 실행해 주세요." >&2
  exit 1
fi
umask 077
{
  echo "storeFile=$KEYSTORE"
  echo "storePassword=$PASS"
  echo "keyAlias=upload"
  echo "keyPassword=$PASS"
} > "$KEY_PROPS"
echo
echo "준비 끝. 아래 두 파일과 비밀번호를 안전한 곳(1Password 등)에 꼭 따로 보관하세요."
echo "  $KEYSTORE"
echo "  $KEY_PROPS"
echo "이제 'npm run android:aab' 로 출시용 파일을 만들 수 있어요."
