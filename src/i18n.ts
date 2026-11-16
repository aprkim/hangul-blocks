// The parents' screens (gate, recording, writing record) follow the device language:
// Korean on a Korean device, English everywhere else. The child's screens have no text.
// For testing: add ?lang=en or ?lang=ko to the URL.

function detect(): 'ko' | 'en' {
  try {
    const forced = new URLSearchParams(location.search).get('lang')
    if (forced === 'ko' || forced === 'en') return forced
  } catch {
    /* no location */
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
  return (langs[0] ?? 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

export const lang = detect()

/** Pick the string for the current language. */
export const t = (ko: string, en: string) => (lang === 'ko' ? ko : en)
