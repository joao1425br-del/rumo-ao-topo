#!/usr/bin/env bash
# Gera app-debug.apk. Requer: Node 18+, JDK 17+ e Android SDK (ANDROID_HOME definido) ou Android Studio.
set -e
npm install
[ -d android ] || npx cap add android
# Trava em paisagem (opcional; remova se quiser girar livremente)
sed -i 's/<activity /<activity android:screenOrientation="sensorLandscape" /' android/app/src/main/AndroidManifest.xml 2>/dev/null || true
npx cap sync android
cd android && ./gradlew assembleDebug
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
