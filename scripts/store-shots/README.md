# Store screenshots and preview video

Run against the built web app:

```bash
npm run build && npx vite preview --port 4173 &
```

1. **Raw captures** (plain app screens, every device size): `node <capture script> <raw dir>`.
   The capture script used for 1.2.1 lives with the release notes in the session; it seeds
   progress and sticker scenes, then saves `<device>-<scene>.png` for scenes
   `sound, build, road, write, play, parent-ko, parent-en`.
2. **Captioned screenshots**: `node scripts/store-shots/compose.cjs <raw dir> store/captioned`
   writes `ko/` and `en/` folders, six slides per canvas size (App Store iPad 13", iPhone 6.9",
   6.5", 6.3", Google Play phone and tablets). Copy and order are in `SLIDES` at the top.
3. **Preview video**: `node scripts/store-shots/preview.cjs <work dir>` records about 20 seconds
   of real play at 1600 x 1200 (App Store iPad preview) and mixes the app's own sounds back in.

The child's screens have no text, so the same raw captures serve both languages; only the
parents' page is captured once per language.
