#!/usr/bin/env python3
"""从 voice_lines.js 批量生成真人感语音 (edge-tts / 微软神经语音)。
用法: python3 gen_voice.py [voice] [rate]
默认: zh-CN-XiaoxiaoNeural -10%  (温暖讲故事女声，适合儿童产品)
备选: zh-CN-XiaoyiNeural (更活泼卡通), zh-CN-YunxiaNeural (可爱男童声)
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).parent
VOICE = sys.argv[1] if len(sys.argv) > 1 else "zh-CN-XiaoxiaoNeural"
RATE = sys.argv[2] if len(sys.argv) > 2 else "-10%"

src = (ROOT / "voice_lines.js").read_text(encoding="utf-8")
lines = json.loads(re.search(r"\{.*\}", src, re.S).group(0))

outdir = ROOT / "audio"
outdir.mkdir(exist_ok=True)

for key, text in lines.items():
    out = outdir / f"{key}.mp3"
    if out.exists():
        continue
    subprocess.run(
        ["python3", "-m", "edge_tts", "--voice", VOICE, f"--rate={RATE}",
         "--text", text, "--write-media", str(out)],
        check=True, capture_output=True,
    )
    print(f"✓ {key}.mp3")

print(f"\n完成：{len(lines)} 条语音 → {outdir}/ (voice={VOICE}, rate={RATE})")
