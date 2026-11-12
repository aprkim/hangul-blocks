# 소리블록 · Sori Blocks (hangul-blocks)

Live: https://soriblocks.lihallc.com · Privacy: /privacy.html · Terms: /terms.html

A Hangul sound-to-letter game for a 4-year-old. iPad Safari, landscape. Specs: `docs/SPEC.md`, `docs/AUDIO.md`.

- **P0, the jamo board:** 14 consonants and 10 vowels. Tap a tile to hear its sound.
- **P1, the assembly board:** tap a consonant, then a vowel. The frame switches between the side-by-side layout (가로모임) and the stacked layout (세로모임) and plays the syllable.

## Run

    npm install
    npm run dev      # served on your LAN, so open it on the iPad by the Mac's IP
    npm run build    # static site in dist/ (deploy to Vercel or Netlify as is)

On the iPad, use Share → Add to Home Screen. It then opens full screen with no Safari address bar.

## Recording (no external tools)

Open the app with `?record`, or on the jamo board hold the empty space left of the vowels for 3 seconds.
Hold the button, say the sound, and let go. Each take is trimmed, its loudness evened out, saved as mp3 on this device, and used by the game right away.
`zip 받기` downloads every take with its AUDIO.md file name, ready to commit to `public/audio/`.
The mic needs HTTPS (the deployed URL, or localhost). On iPad, record inside the Home Screen app: it doesn't share storage with Safari.

## Audio

Put mp3 files in `public/audio/`, flat, using the file names from `docs/AUDIO.md` (`c-g.mp3`, `v-a.mp3`, `syl-ga.mp3`, ...).
A recording made on the device overrides the file with the same name. A missing file plays nothing and logs one console warning. To change the voice, overwrite a file with a new one of the same name.

## Enabling more consonants on the assembly board

In `src/jamo.ts`, set `assemble: true` on the consonant once its 10 `syl-*` files are in place.
Consonants that aren't enabled are hidden, not greyed out. ㅇ needs no recordings because it reuses the vowel files.
