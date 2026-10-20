"""Bake the two fixed shadow lobes once; Pillow is a tooling-only dependency."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parents[1] / 'assets' / 'streak-glow'
root.mkdir(parents=True, exist_ok=True)
palettes = {
    'dark': [(255, 167, 32, 255), (255, 224, 135, 255)],
    'light': [(232, 132, 0, 255), (190, 87, 0, 242)],
}
for theme, colors in palettes.items():
    for density in (1, 2, 3):
        # 28 pt core + 3.5 pt of bounded bloom on each side.
        scale = density * 4
        size, pad, core = 35 * scale, 3.5 * scale, 28 * scale
        result = Image.new('RGBA', (size, size))
        for color, blur in zip(colors, (5, 2)):
            alpha = Image.new('L', (size, size))
            ImageDraw.Draw(alpha).rounded_rectangle(
                (pad-scale, pad-scale, pad+core+scale, pad+core+scale),
                radius=4*scale, fill=color[3],
            )
            # Blur alpha only: blurring RGB against transparent black darkens
            # the halo a second time when the native image is composited.
            shape = Image.new('RGBA', (size, size), color)
            shape.putalpha(alpha.filter(ImageFilter.GaussianBlur(blur*scale/2)))
            result = Image.alpha_composite(result, shape)
        result = result.resize((35*density, 35*density), Image.Resampling.LANCZOS)
        suffix = '' if density == 1 else f'@{density}x'
        result.save(root / f'{theme}{suffix}.png', optimize=True)
