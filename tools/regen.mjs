#!/usr/bin/env node
/* 定向重生成: node tools/regen.mjs key1 key2 ... */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate } from './gen.mjs';
import { STYLE_BG, STYLE_T, GLOBAL, ART } from './assets.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'art');
const all = { ...GLOBAL, ...ART };
for (const key of process.argv.slice(2)) {
  const spec = all[key];
  if (!spec) { console.log('未知key:', key); continue; }
  const refJpg = spec.ref ? ['png','jpg'].map(e=>path.join(OUT, spec.ref + '.' + e)).find(f=>fs.existsSync(f)) : null;
  const opts = refJpg ? { ref: path.relative(ROOT, refJpg) } : {};
  try {
    if (spec.type === 't') {
      const tmp = path.join(OUT, key + '_raw.png');
      await generate(spec.prompt + '，' + STYLE_T, tmp, spec.size || '2048x2048', opts);
      execFileSync('magick', [tmp, '-alpha','set','-bordercolor','magenta','-border','1',
        '-fuzz','40%','-fill','none','-draw','alpha 0,0 floodfill',
        '-fuzz','15%','-transparent','#FF00FF','-shave','1x1','-trim','+repage',
        '-resize','900x900>', path.join(OUT, key + '.png')]);
      fs.unlinkSync(tmp);
    } else {
      const tmp = path.join(OUT, key + '_raw.png');
      await generate(spec.prompt + '，' + STYLE_BG, tmp, spec.size || '2560x1440', opts);
      execFileSync('magick', [tmp, '-resize','1920x1920>','-quality','80', path.join(OUT, key + '.jpg')]);
      fs.unlinkSync(tmp);
    }
    console.log('✅', key);
  } catch (e) { console.log('❌', key, String(e.message).slice(0,120)); }
}
