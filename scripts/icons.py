from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
for size in (16, 48, 128, 192, 512):
    scale = 4
    image = Image.new('RGBA', (size * scale, size * scale), '#c5f48a')
    draw = ImageDraw.Draw(image)
    points = [(32, 10), (37, 25), (54, 32), (37, 39), (32, 54), (25, 39), (10, 32), (25, 25)]
    draw.polygon([(x * size * scale / 64, y * size * scale / 64) for x, y in points], fill='#25302a')
    draw.ellipse(tuple(n * size * scale / 64 for n in (28.5, 28.5, 35.5, 35.5)), fill='#c5f48a')
    image.resize((size, size), Image.Resampling.LANCZOS).save(root / 'public' / f'icon-{size}.png')
