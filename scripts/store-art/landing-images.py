"""Website images from the store art: the six colorful screenshots (Korean, iPad), the video
and its poster, sized for the landing page.

usage: python3 scripts/store-art/landing-images.py   (from the repository root)
"""
import shutil
from PIL import Image

SHOTS = ['1-build', '2-sound', '3-puzzle', '4-write', '5-play', '6-parent']
for name in SHOTS:
    im = Image.open(f'store/captioned/ko/ipad-13-{name}.png').convert('RGB').resize((1200, 900), Image.LANCZOS)
    im.save(f'public/landing/shot-{name}.webp', 'WEBP', quality=82, method=6)
Image.open('store/preview/youtube-thumbnail-1280x720.png').convert('RGB').save('public/landing/video-poster.webp', 'WEBP', quality=86, method=6)
shutil.copyfile('store/preview/preview-youtube-1920x1080.mp4', 'public/landing/preview.mp4')
