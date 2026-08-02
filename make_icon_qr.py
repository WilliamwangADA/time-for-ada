#!/usr/bin/env python3
"""时间之旅：生成 App 图标(星空+钟表) + 扫码二维码。
依赖: pip install segno pillow
"""
from PIL import Image, ImageDraw
import segno, os, math

URL = "https://williamwangada.github.io/time-for-ada/index.html"
TOP, BOT = (23, 36, 84), (7, 10, 26)

os.makedirs("assets/icons", exist_ok=True)

def grad(w, h, top, bot):
    img = Image.new("RGB", (w, h))
    for y in range(h):
        t = y / (h - 1)
        img.paste(tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)), (0, y, w, y + 1))
    return img

S = 512
base = grad(S, S, TOP, BOT).convert("RGBA")
d = ImageDraw.Draw(base)
# 星星
import random
random.seed(7)
for _ in range(60):
    x, y = random.randint(8, S - 8), random.randint(8, S - 8)
    r = random.choice([1, 1, 2, 2, 3])
    d.ellipse([x - r, y - r, x + r, y + r], fill=(233, 237, 255, random.randint(90, 220)))
# 钟表
cx, cy, R = S // 2, S // 2, 168
d.ellipse([cx - R - 14, cy - R - 14, cx + R + 14, cy + R + 14], fill=(138, 115, 70, 255))
d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(253, 250, 240, 255))
for h in range(12):
    a = math.radians(h * 30 - 90)
    x1, y1 = cx + math.cos(a) * (R - 14), cy + math.sin(a) * (R - 14)
    x2, y2 = cx + math.cos(a) * (R - 36), cy + math.sin(a) * (R - 36)
    d.line([x1, y1, x2, y2], fill=(90, 77, 51, 255), width=10 if h % 3 == 0 else 6)
# 时针指7点方向、分针指12
a7 = math.radians(7 * 30 + 90)
d.line([cx, cy, cx - math.sin(math.radians(7 * 30)) * -0 + math.cos(math.radians(7 * 30 - 90)) * 88,
        cy + math.sin(math.radians(7 * 30 - 90)) * 88], fill=(40, 34, 22, 255), width=22)
d.line([cx, cy, cx, cy - R + 54], fill=(40, 34, 22, 255), width=14)
d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=(138, 115, 70, 255))
# 圆角
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=96, fill=255)
base.putalpha(mask)
base.save("assets/icons/icon-512.png")
base.resize((192, 192)).save("assets/icons/icon-192.png")
base.resize((180, 180)).convert("RGB").save("assets/icons/apple-touch-icon.png")
print("icons -> assets/icons/")

segno.make(URL, error='h').save("assets/qrcode_plain.png", scale=12, border=3, dark="#1a2258", light="#fff8e6")
q = Image.open("assets/qrcode_plain.png").convert("RGBA")
logo = Image.open("assets/icons/icon-192.png").convert("RGBA")
ls = q.width // 5
logo = logo.resize((ls, ls))
pad = Image.new("RGBA", (ls + 20, ls + 20), (255, 248, 230, 255))
q.alpha_composite(pad, ((q.width - pad.width) // 2, (q.height - pad.height) // 2))
q.alpha_composite(logo, ((q.width - ls) // 2, (q.height - ls) // 2))
q.save("assets/qrcode.png")
print("qrcode -> assets/qrcode.png |", URL)
