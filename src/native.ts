// Native-app touches when running inside the iOS app (Capacitor). On the web every
// function here is a no-op, so the same code serves both.

import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'

export const isNativeApp = Capacitor.isNativePlatform()

/** A light tap felt in the hand when a tile is pressed. */
export function tapFeedback() {
  if (isNativeApp) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

/** A slightly stronger bump when a syllable is completed. */
export function successFeedback() {
  if (isNativeApp) void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
}

/**
 * Something was finished (a letter written to the end, a word built, a gift opened): the
 * "success" pattern, a quick double beat, felt on phones. iPads have no vibration motor.
 */
export function celebrateFeedback() {
  if (isNativeApp) void Haptics.notification({ type: NotificationType.Success }).catch(() => {})
}

export async function initNative() {
  if (!isNativeApp) return
  await StatusBar.hide().catch(() => {})
  await SplashScreen.hide().catch(() => {})
}

/** Save a file to the app's cache and open the iOS share sheet (Save to Files, AirDrop, ...). */
export async function shareFileNative(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  const { uri } = await Filesystem.writeFile({
    path: file.name,
    data: btoa(binary),
    directory: Directory.Cache,
  })
  await Share.share({ files: [uri], title: file.name })
}
