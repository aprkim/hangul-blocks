# Sourced by the Android scripts: find the JDK and SDK that Android Studio installed, so the
# command line builds with the same tools without opening Android Studio.
STUDIO_JDK="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
if [ -d "$STUDIO_JDK" ]; then
  export JAVA_HOME="$STUDIO_JDK"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if ! command -v java >/dev/null 2>&1; then
  echo "Java를 찾지 못했어요. Android Studio를 설치했는지 확인해 주세요 (그 안의 Java를 써요)." >&2
  exit 1
fi
: "${ANDROID_HOME:=$HOME/Library/Android/sdk}"
export ANDROID_HOME
# adb (phone install and logs) lives here; put it on PATH for anyone who sources this file.
export PATH="$ANDROID_HOME/platform-tools:$PATH"
if [ ! -d "$ANDROID_HOME" ]; then
  echo "Android SDK를 찾지 못했어요 ($ANDROID_HOME). Android Studio를 한 번 열어 SDK 설치를 끝내 주세요." >&2
  exit 1
fi
KEY_DIR="$HOME/keys"
KEYSTORE="$KEY_DIR/soriblocks-upload.jks"
KEY_PROPS="$KEY_DIR/soriblocks-upload.properties"
