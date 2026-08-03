#!/usr/bin/env node
/* 批量生成美术素材（断点续跑：已存在自动跳过）。用法: node tools/batch.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate } from './gen.mjs';
import { STYLE_BG, STYLE_T, GLOBAL, ART } from './assets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'art');
fs.mkdirSync(OUT, { recursive: true });
const exists = f => fs.existsSync(f) && fs.statSync(f).size > 2000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, skip = 0, fail = 0;

async function withRetry(fn, label, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (e) { console.log(`  ⚠️ ${label} 第${i}次失败: ${String(e.message).slice(0, 120)}`); if (i === tries) { fail++; return null; } await sleep(3500 * i); }
  }
}

async function genOne(key, spec) {
  const out = path.join(OUT, key + '.png');
  if (exists(out)) { skip++; console.log(`  ⏭  ${key}`); return; }
  const refPath = spec.ref ? path.join(OUT, spec.ref + '.png') : null;
  const opts = refPath && fs.existsSync(refPath) ? { ref: path.relative(ROOT, refPath) } : {};
  if (spec.type === 't') {
    const tmp = path.join(OUT, key + '_raw.png');
    const r = await withRetry(() => generate(spec.prompt + '，' + STYLE_T, tmp, spec.size || '2048x2048', opts), key);
    if (!r) return;
    try {
      execFileSync('magick', [tmp, '-alpha', 'set', '-bordercolor', 'magenta', '-border', '1',
        '-fuzz', '40%', '-fill', 'none', '-draw', 'alpha 0,0 floodfill',
        '-fuzz', '15%', '-transparent', '#FF00FF', '-shave', '1x1', '-trim', '+repage', out]);
      fs.unlinkSync(tmp); ok++; console.log(`  ✅ ${key}`);
    } catch (e) { fail++; console.log(`  ❌ 抠图失败 ${key}`); }
  } else {
    const r = await withRetry(() => generate(spec.prompt + '，' + STYLE_BG, out, spec.size || '2560x1440', opts), key);
    if (r) { ok++; console.log(`  ✅ ${key}`); }
  }
}

const all = { ...GLOBAL, ...ART };
// 先生成锚点（被别人引用的），再生成其余
const anchors = new Set(Object.values(all).map(s => s.ref).filter(Boolean));
const order = [...Object.keys(all).filter(k => anchors.has(k)), ...Object.keys(all).filter(k => !anchors.has(k))];
for (const k of order) { await genOne(k, all[k]); await sleep(800); }
console.log(`\n完成: ✅${ok} ⏭${skip} ❌${fail}`);
