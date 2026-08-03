#!/usr/bin/env node
/* =====================================================================
   Seedream 素材生成器（火山引擎方舟 / OpenAI 兼容图像接口）
   用法:
     node tools/gen.mjs "<prompt>" <输出文件.png> [尺寸]
   读取 ../.env.local:
     IMAGE_API_KEY / IMAGE_BASE_URL / IMAGE_MODEL
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---- 读取 .env.local ----
function loadEnv() {
  const p = path.join(ROOT, '.env.local');
  if (!fs.existsSync(p)) { console.error('❌ 缺少 .env.local，请先按说明写入 key'); process.exit(1); }
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const KEY = env.IMAGE_API_KEY;
const BASE = (env.IMAGE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
const MODEL = env.IMAGE_MODEL || 'doubao-seedream-4-0-250828';
if (!KEY) { console.error('❌ .env.local 缺少 IMAGE_API_KEY'); process.exit(1); }

// ---- 把本地图片转成 data URL（作参考图）----
function toDataUrl(p) {
  const b = fs.readFileSync(p);
  return 'data:image/png;base64,' + b.toString('base64');
}

// ---- 单张生成 ----
// opts.ref: 参考图路径（字符串）或路径数组，用于保持角色一致
export async function generate(prompt, outFile, size = '2048x2048', opts = {}) {
  const { ref, ...rest } = opts;
  const body = {
    model: MODEL,
    prompt,
    size,
    response_format: 'b64_json',
    watermark: false,
    ...rest,
  };
  if (ref) {
    const refs = Array.isArray(ref) ? ref : [ref];
    const urls = refs.map(r => r.startsWith('http') || r.startsWith('data:') ? r : toDataUrl(path.resolve(ROOT, r)));
    body.image = urls.length === 1 ? urls[0] : urls;
  }
  const res = await fetch(`${BASE}/images/generations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
  let json; try { json = JSON.parse(text); } catch { throw new Error('非 JSON 响应: ' + text.slice(0, 300)); }
  const d = json.data && json.data[0];
  if (!d) throw new Error('无图像数据: ' + text.slice(0, 300));
  let buf;
  if (d.b64_json) buf = Buffer.from(d.b64_json, 'base64');
  else if (d.url) buf = Buffer.from(await (await fetch(d.url)).arrayBuffer());
  else throw new Error('响应无 b64_json / url');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buf);
  return { outFile, bytes: buf.length, usage: json.usage };
}

// ---- CLI ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , prompt, out, size] = process.argv;
  if (!prompt || !out) { console.error('用法: node tools/gen.mjs "<prompt>" <out.png> [size]'); process.exit(1); }
  console.log(`🎨 模型 ${MODEL} | 尺寸 ${size || '1024x1024'}\n生成中...`);
  generate(prompt, path.resolve(ROOT, out), size)
    .then(r => console.log(`✅ 已保存 ${r.outFile} (${(r.bytes/1024).toFixed(0)} KB)`, r.usage || ''))
    .catch(e => { console.error('❌', e.message); process.exit(1); });
}
