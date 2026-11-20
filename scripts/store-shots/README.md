# Store screenshots and preview video

Run against the built web app:

```bash
npm run build && npx vite preview --port 4173 &
```

1. **Raw captures** (plain app screens, every device size):
   `node scripts/store-shots/capture.cjs <raw dir>`. It seeds a made-up child with some progress,
   then saves `<device>-<scene>.png` for scenes
   `sound, build, puzzle, road, write, play, parent-ko, parent-en`.
2. **Captioned screenshots**: `node scripts/store-shots/compose.cjs <raw dir> store/captioned`
   writes `ko/` and `en/` folders, seven slides per canvas size (App Store iPad 13", iPhone 6.9",
   6.5", 6.3", Google Play phone and tablets). Copy and order are in `SLIDES` at the top.
3. **Preview video**: `node scripts/store-shots/preview.cjs <work dir>` records about 20 seconds
   of real play at 1600 x 1200 (App Store iPad preview) and mixes the app's own sounds back in.

The child's screens have no text, so the same raw captures serve both languages; only the
parents' page is captured once per language.
