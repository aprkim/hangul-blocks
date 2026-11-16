// Builds the folder the iOS/Android apps ship (dist-app): the website build minus the landing
// page, with the game as the start page. The apps never show the landing page.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

if (!existsSync('dist/play/index.html')) throw new Error('Run the web build first (dist/play/index.html missing)')
rmSync('dist-app', { recursive: true, force: true })
cpSync('dist', 'dist-app', { recursive: true })
writeFileSync('dist-app/index.html', readFileSync('dist/play/index.html'))
rmSync('dist-app/play', { recursive: true, force: true })
// Website-only files the apps don't need.
for (const f of ['landing', 'privacy.html', 'terms.html', 'robots.txt', 'sitemap.xml']) rmSync(`dist-app/${f}`, { recursive: true, force: true })
for (const f of readdirSync('dist-app')) if (/^naver[0-9a-f]+\.html$/.test(f)) rmSync(`dist-app/${f}`, { force: true })
console.log('dist-app ready (game as start page)')
