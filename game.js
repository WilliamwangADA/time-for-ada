'use strict';
/* Ada的时间之旅 —— 会动的时间绘本（12个场景） */

const $ = s => document.querySelector(s);
const stage = $('#stage');
const NS = 'http://www.w3.org/2000/svg';

/* ================= 美术资源 ================= */
const BG_JPG = new Set(['cover_bg','map_bg','l1_bg','l2_noon','l2_dawn','l2_dusk','l2_night','l3_bg',
  'l4_seed','l4_sprout','l4_sapling','l4_tree','l4_bg','l5_bg','l5_blink','l5_brush','l5_sleep','l6_bg',
  'l7_morning','l7_noon','l7_dusk','l7_night','l7_bg','l8_bg','l9_spring','l9_summer','l9_autumn','l9_winter',
  'l10_bg','l11_bg','l12_bg']);
const STICKERS = ['girl_kid','l1_earth','l1_sun','l3_hourglass','l6_clock','l8_lantern',
  'l10_baby','l10_adult','l10_old','l11_egg','l11_egg_broken'];
function ART(k) { return 'assets/art/' + k + (BG_JPG.has(k) ? '.jpg' : '.png'); }
function preloadAll() {
  [...BG_JPG, ...STICKERS].forEach(k => { const im = new Image(); im.src = ART(k); });
}

/* ================= 语音 ================= */
const audioEl = new Audio();
let sayToken = 0;
function say(id, cb) {
  stopVoice();
  if (id && id.indexOf('cheer_') === 0) sfx('good');
  if (id === 'wrong_generic' || id === 'l4_wrong') sfx('no');
  sayToken++;
  const tk = sayToken;
  audioEl.src = 'audio/' + id + '.mp3';
  audioEl.onended = () => { if (tk === sayToken && cb) cb(); };
  audioEl.onerror = () => { if (tk === sayToken) speak(id, cb, tk); };
  audioEl.play().catch(() => { if (tk === sayToken) speak(id, cb, tk); });
}
function speak(id, cb, tk) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(VOICE_LINES[id] || '');
    u.lang = 'zh-CN'; u.rate = 0.9;
    u.onend = () => { if (tk === sayToken && cb) cb(); };
    speechSynthesis.speak(u);
  } catch (e) { if (cb) cb(); }
}
function stopVoice() {
  sayToken++;
  audioEl.onended = null; audioEl.onerror = null;
  try { audioEl.pause(); } catch (e) {}
  try { speechSynthesis.cancel(); } catch (e) {}
}
let cheerIdx = 0;
function cheer(cb) { cheerIdx = (cheerIdx % 3) + 1; say('cheer_' + cheerIdx, cb); }

/* ================= 音效（WebAudio 合成，无素材依赖） ================= */
let AC = null;
function sfx(type) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t0 = AC.currentTime;
    const tone = (f, st, dur, wave, g) => {
      const o = AC.createOscillator(), gn = AC.createGain();
      o.type = wave || 'sine'; o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, t0 + st);
      gn.gain.linearRampToValueAtTime(g || 0.1, t0 + st + 0.012);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + st + dur);
      o.connect(gn); gn.connect(AC.destination);
      o.start(t0 + st); o.stop(t0 + st + dur + 0.05);
    };
    if (type === 'good') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.085, 0.3, 'triangle', 0.09));
    else if (type === 'no') { tone(233, 0, 0.18, 'sine', 0.07); tone(207, 0.14, 0.24, 'sine', 0.07); }
    else if (type === 'pop') tone(740, 0, 0.09, 'triangle', 0.07);
    else if (type === 'tick') tone(1100, 0, 0.05, 'square', 0.03);
    else if (type === 'whoosh') {
      const len = Math.floor(AC.sampleRate * 0.35);
      const b = AC.createBuffer(1, len, AC.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const s = AC.createBufferSource(); s.buffer = b;
      const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
      const gn = AC.createGain(); gn.gain.value = 0.12;
      s.connect(f); f.connect(gn); gn.connect(AC.destination); s.start();
    }
  } catch (e) {}
}

/* ================= 触摸星光 & 发呆提示 ================= */
function spark(x, y, n) {
  for (let i = 0; i < (n || 6); i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const a = Math.random() * 6.283, d = 24 + Math.random() * 46;
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }
}
let hintTimer = null, hintPos = null;
function setHint(xPct, yPct) {
  hintPos = xPct == null ? null : [xPct, yPct];
  resetHint();
}
function resetHint() {
  clearTimeout(hintTimer);
  $('#hintHand').classList.remove('show');
  if (hintPos) hintTimer = setTimeout(() => {
    const h = $('#hintHand');
    h.style.left = hintPos[0] + 'vw'; h.style.top = hintPos[1] + 'vh';
    h.classList.add('show');
  }, 9000);
}
document.addEventListener('pointerdown', ev => { spark(ev.clientX, ev.clientY); resetHint(); });

/* ================= SVG 工具 ================= */
function S(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function IMG(parent, key, x, y, w, h, cover) {
  const im = S('image', { x, y, width: w, height: h }, parent);
  im.setAttribute('href', ART(key));
  im.setAttribute('preserveAspectRatio', cover ? 'xMidYMid slice' : 'xMidYMid meet');
  return im;
}
function TXT(parent, x, y, size, fill, text, anchor) {
  const t = S('text', {
    x, y, 'font-size': size, fill: fill || '#fff', 'text-anchor': anchor || 'middle',
    'font-weight': 'bold', style: 'filter:drop-shadow(0 2px 4px rgba(0,0,0,.75))'
  }, parent);
  t.textContent = text;
  return t;
}
/* 场景：底部插画层（可叠放淡入淡出）+ 顶层交互 SVG */
function scene(bgKeys, defs) {
  stage.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'artStack';
  stage.appendChild(wrap);
  const imgs = {};
  (Array.isArray(bgKeys) ? bgKeys : [bgKeys]).forEach((k, i) => {
    const im = document.createElement('img');
    im.src = ART(k); im.alt = '';
    im.style.opacity = i === 0 ? '1' : '0';
    wrap.appendChild(im);
    imgs[k] = im;
  });
  const svg = S('svg', { viewBox: '0 0 1000 600', preserveAspectRatio: 'xMidYMid slice' });
  if (defs) { const d = S('defs', null, svg); d.innerHTML = defs; }
  stage.appendChild(svg);
  return { svg, imgs };
}
function svgPoint(svg, ev) {
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function makeDrag(el, handlers) {
  el.classList.add('draggable');
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    try { el.setPointerCapture(ev.pointerId); } catch (e) {}
    if (handlers.down) handlers.down(ev);
    const mv = e2 => { if (handlers.move) handlers.move(e2); };
    const up = e2 => {
      el.removeEventListener('pointermove', mv);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      if (handlers.up) handlers.up(e2);
    };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
}
function rnd01(k) { const v = Math.sin(k) * 43758.5453; return v - Math.floor(v); }

/* ================= 帧循环 ================= */
let tickFns = [];
function onTick(fn) { tickFns.push(fn); }
let lastT = 0;
function mainLoop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000) || 0.016;
  lastT = t;
  for (const f of tickFns) { try { f(dt, t / 1000); } catch (e) {} }
  requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);

/* ================= 场景框架 ================= */
const LEVELS = [
  { id: 'l1', name: '白天和黑夜', build: buildL1 },
  { id: 'l2', name: '天空的颜色', build: buildL2 },
  { id: 'l3', name: '拦不住的时间', build: buildL3 },
  { id: 'l4', name: '先和后', build: buildL4 },
  { id: 'l5', name: '时间的长短', build: buildL5 },
  { id: 'l6', name: '认识钟表', build: buildL6 },
  { id: 'l7', name: '我的一天', build: buildL7 },
  { id: 'l8', name: '一个星期', build: buildL8 },
  { id: 'l9', name: '四季', build: buildL9 },
  { id: 'l10', name: '时间的脚印', build: buildL10 },
  { id: 'l11', name: '时间不能倒流', build: buildL11 },
  { id: 'l12', name: '时间是什么', build: buildL12 },
];
const LEVEL_EMOJI = ['🌍', '🌅', '⏳', '🌱', '⏱', '⏰', '🏠', '🎠', '🍁', '👣', '💧', '✨'];
let currentLevel = 0;
let replayId = 'welcome';
let levelDone = false;
let unlocked = parseInt(localStorage.getItem('tfa_unlocked') || '1', 10);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}
function transition(build) {
  const f = $('#fadeOverlay');
  f.classList.add('show');
  sfx('whoosh');
  setTimeout(() => {
    build();
    setTimeout(() => f.classList.remove('show'), 120);
  }, 300);
}
function startLevel(i) {
  currentLevel = i;
  levelDone = false;
  stopVoice();
  transition(() => {
    tickFns = [];
    setHint(null);
    $('#doneOverlay').classList.remove('show');
    $('#levelTitle').textContent = LEVEL_EMOJI[i] + ' ' + LEVELS[i].name;
    showScreen('levelScreen');
    replayId = 'intro_' + LEVELS[i].id;
    LEVELS[i].build();
  });
}
function finishLevel() {
  if (levelDone) return;
  levelDone = true;
  setHint(null);
  if (currentLevel + 2 > unlocked) {
    unlocked = Math.min(LEVELS.length + 1, currentLevel + 2);
    localStorage.setItem('tfa_unlocked', String(unlocked));
  }
  $('#doneMsg').textContent = currentLevel === LEVELS.length - 1 ? '旅行完成，你太棒啦！' : '你太棒啦！';
  $('#nextBtn').textContent = currentLevel === LEVELS.length - 1 ? '回到星空 ✦' : '继续出发 →';
  $('#doneOverlay').classList.add('show');
  sfx('good');
  spark(window.innerWidth / 2, window.innerHeight / 2, 18);
}
function goMap() {
  stopVoice();
  transition(() => { tickFns = []; setHint(null); buildMap(); showScreen('mapScreen'); });
}
function goNext() {
  if (currentLevel < LEVELS.length - 1) startLevel(currentLevel + 1);
  else goMap();
}
/* 结尾讲解：先弹出星星（随时可点跳过），讲完稍等自动进入下一个场景 */
function endLevel(voiceId) {
  finishLevel();
  say(voiceId, () => {
    setTimeout(() => {
      if ($('#doneOverlay').classList.contains('show') && $('#levelScreen').classList.contains('active')) goNext();
    }, 1500);
  });
}
$('#doneOverlay').addEventListener('click', goNext);
$('#homeBtn').addEventListener('click', goMap);
$('#prevBtn').addEventListener('click', () => { if (currentLevel > 0) startLevel(currentLevel - 1); else goMap(); });
$('#nextLvlBtn').addEventListener('click', goNext);
$('#voiceBtn').addEventListener('click', () => say(replayId));

/* ================= 地图 ================= */
const NODE_POS = [
  [8, 80], [20, 64], [14, 42], [26, 25], [40, 20], [50, 38],
  [44, 62], [58, 78], [71, 64], [66, 40], [79, 24], [91, 45]
];
function buildMap() {
  const svg = $('#mapPath');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = '';
  let d = 'M ' + NODE_POS[0][0] + ' ' + NODE_POS[0][1];
  for (let i = 1; i < NODE_POS.length; i++) {
    const p0 = NODE_POS[i - 1], p1 = NODE_POS[i];
    d += ' Q ' + ((p0[0] + p1[0]) / 2 + (i % 2 ? 4 : -4)) + ' ' + ((p0[1] + p1[1]) / 2) + ' ' + p1[0] + ' ' + p1[1];
  }
  S('path', { d, fill: 'none', stroke: 'rgba(240,225,170,0.45)', 'stroke-width': '0.55', 'stroke-dasharray': '1.6 1.6', 'stroke-linecap': 'round' }, svg);

  document.querySelectorAll('.mapNode').forEach(n => n.remove());
  const mapScreen = $('#mapScreen');
  NODE_POS.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'mapNode ' + (i + 1 < unlocked ? 'done' : (i + 1 === unlocked ? 'open' : 'todo'));
    div.style.left = p[0] + '%';
    div.style.top = p[1] + '%';
    div.innerHTML = '<div class="num">' + LEVEL_EMOJI[i] + '</div><div class="lbl">' + LEVELS[i].name + '</div>';
    div.addEventListener('click', () => { sfx('pop'); startLevel(i); });
    mapScreen.appendChild(div);
  });
}

/* ================= 开始 ================= */
$('#startBtn').addEventListener('click', () => {
  sfx('good');
  preloadAll();
  buildMap();
  showScreen('mapScreen');
  say('welcome');
});

/* ================================================================
   场景1 白天和黑夜 —— 推动地球自转
================================================================ */
function buildL1() {
  const { svg } = scene('l1_bg', `
    <linearGradient id="nightG1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#03060f" stop-opacity="0"/>
      <stop offset="18%" stop-color="#03060f" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#03060f" stop-opacity="0.93"/>
    </linearGradient>
    <clipPath id="earthClip1"><circle cx="590" cy="310" r="172"/></clipPath>
  `);
  IMG(svg, 'l1_sun', 40, 170, 280, 280);
  const CX = 590, CY = 310, R = 172;
  const clipG = S('g', { 'clip-path': 'url(#earthClip1)' }, svg);
  const spin = S('g', null, clipG);
  IMG(spin, 'l1_earth', CX - R - 6, CY - R - 6, (R + 6) * 2, (R + 6) * 2, true);
  const house = S('g', null, spin);
  house.innerHTML = `
    <g transform="translate(${CX - R + 84},${CY}) rotate(-90) scale(1.6)">
      <rect x="-15" y="-25" width="30" height="23" fill="#c9553d" rx="2" stroke="#7d2f1d" stroke-width="1.5"/>
      <path d="M -21 -25 L 0 -44 L 21 -25 Z" fill="#8a3324"/>
      <rect x="-5" y="-14" width="10" height="11" fill="#ffe9b0"/>
    </g>`;
  S('path', { d: `M ${CX} ${CY - R} A ${R} ${R} 0 0 1 ${CX} ${CY + R} L ${CX} ${CY - R} Z`, fill: 'url(#nightG1)', 'clip-path': 'url(#earthClip1)', 'pointer-events': 'none' }, svg);
  S('circle', { cx: CX, cy: CY, r: R + 4, fill: 'none', stroke: 'rgba(159,212,255,0.35)', 'stroke-width': 5, 'pointer-events': 'none' }, svg);

  const label = TXT(svg, CX, 78, 42, '#ffe9b0', '☀ 白天');
  label.setAttribute('letter-spacing', '6');
  const hint = TXT(svg, CX, 560, 26, '#e8ecfa', '👉 用小手推一推地球，让它转起来');

  let rot = 0, total = 0, lastX = null, state = 'day', finished = false;
  const hitArea = S('circle', { cx: CX, cy: CY, r: R + 24, fill: 'rgba(255,255,255,0.01)' }, svg);
  makeDrag(hitArea, {
    down: ev => { lastX = svgPoint(svg, ev).x; },
    move: ev => {
      const p = svgPoint(svg, ev);
      const dx = p.x - lastX; lastX = p.x;
      rot += dx * 0.35; total += Math.abs(dx * 0.35);
      spin.setAttribute('transform', `rotate(${rot} ${CX} ${CY})`);
      const world = ((180 + rot) % 360 + 360) % 360;
      const cosA = Math.cos(world * Math.PI / 180);
      let ns = state;
      if (cosA < -0.25) ns = 'day';
      else if (cosA > 0.25) ns = 'night';
      if (ns !== state) {
        state = ns;
        label.textContent = state === 'day' ? '☀ 白天' : '🌙 黑夜';
        label.setAttribute('fill', state === 'day' ? '#ffe9b0' : '#9fb4e8');
        if (!finished) say(state === 'day' ? 'l1_day' : 'l1_night');
      }
      if (!finished && total >= 360) {
        finished = true;
        hint.textContent = '';
        endLevel('l1_done');
      }
    }
  });
  setHint(56, 50);
  say('intro_l1');
}

/* ================================================================
   场景2 天空的颜色 —— 牵着太阳走一天（同景四时插画交叉淡化）
================================================================ */
function buildL2() {
  const KEYS = ['l2_dawn', 'l2_noon', 'l2_dusk', 'l2_night'];
  const { svg, imgs } = scene(KEYS, '');
  KEYS.forEach(k => { imgs[k].style.transition = 'none'; });
  const STOPS = [0.02, 0.5, 0.85, 1];
  let t = 0, finished = false;
  const fired = { dawn: false, noon: false, dusk: false };
  const sun = IMG(svg, 'l1_sun', 0, 0, 130, 130);
  const hint = TXT(svg, 500, 566, 26, '#fff', '👉 牵着太阳公公，从东边走到西边');
  function render() {
    const x = 150 + t * 700, y = 500 - Math.sin(t * Math.PI) * 380;
    sun.setAttribute('x', x - 65); sun.setAttribute('y', y - 65);
    const late = Math.max(0, (t - 0.9) / 0.1);
    sun.setAttribute('opacity', String(1 - late));
    let idx = 3, f = 1;
    if (t <= STOPS[0]) { idx = 0; f = 1; }
    else { for (let i = 1; i < 4; i++) { if (t <= STOPS[i]) { idx = i; f = (t - STOPS[i - 1]) / (STOPS[i] - STOPS[i - 1]); break; } } }
    KEYS.forEach((k, i) => {
      imgs[k].style.opacity = i < idx ? '1' : (i === idx ? (idx === 0 ? '1' : String(f)) : '0');
    });
  }
  render();
  const hit = S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'rgba(0,0,0,0.001)' }, svg);
  makeDrag(hit, {
    move: ev => {
      if (finished) return;
      const p = svgPoint(svg, ev);
      t = Math.min(1, Math.max(0, (p.x - 150) / 700));
      render();
      if (!fired.dawn && t > 0.05 && t < 0.3) { fired.dawn = true; say('l2_dawn'); }
      if (!fired.noon && t > 0.42 && t < 0.62) { fired.noon = true; say('l2_noon'); }
      if (!fired.dusk && t > 0.78 && t < 0.95) { fired.dusk = true; say('l2_dusk'); }
      if (t >= 0.99) { finished = true; hint.textContent = ''; endLevel('l2_done'); }
    }
  });
  setHint(24, 72);
  say('intro_l2');
}

/* ================================================================
   场景3 拦不住的时间 —— 沙漏 + 无效的暂停按钮
================================================================ */
function buildL3() {
  const { svg } = scene('l3_bg', '');
  const hgG = S('g', null, svg);
  IMG(hgG, 'l3_hourglass', 320, 48, 360, 430);
  hgG.style.transition = 'transform .7s ease';
  hgG.style.transformOrigin = '500px 263px';
  const grains = [];
  for (let i = 0; i < 5; i++) grains.push(S('circle', { cx: 498 + (i % 2) * 4, cy: 270 + i * 30, r: 3, fill: '#e8c26a', opacity: 0.9 }, svg));
  let flip = 0, cycle = 0;
  onTick((dt, t) => {
    cycle += dt;
    if (cycle > 12) { cycle = 0; flip += 180; hgG.style.transform = `rotate(${flip}deg)`; sfx('tick'); }
    grains.forEach((g, i) => {
      const yy = 268 + ((t * 200 + i * 32) % 150);
      g.setAttribute('cy', String(yy));
      g.setAttribute('opacity', String(yy > 400 ? 0.25 : 0.9));
    });
  });
  const btnG = S('g', { transform: 'translate(500,532)', cursor: 'pointer' }, svg);
  const btnDefs = S('defs', null, svg);
  btnDefs.innerHTML = `<radialGradient id="btnG3" cx="38%" cy="28%" r="85%">
    <stop offset="0%" stop-color="#ff8a7a"/><stop offset="100%" stop-color="#bd2415"/></radialGradient>`;
  S('ellipse', { cx: 0, cy: 14, rx: 62, ry: 13, fill: 'rgba(0,0,0,0.4)' }, btnG);
  const btnBody = S('g', null, btnG);
  S('circle', { cx: 0, cy: 0, r: 50, fill: 'url(#btnG3)', stroke: '#7d150b', 'stroke-width': 4 }, btnBody);
  S('rect', { x: -15, y: -19, width: 10, height: 38, rx: 4, fill: '#fff' }, btnBody);
  S('rect', { x: 6, y: -19, width: 10, height: 38, rx: 4, fill: '#fff' }, btnBody);
  const btnLbl = TXT(svg, 500, 462, 26, '#ffd9cf', '试试让时间停下来！');
  let presses = 0, busy = false;
  btnG.addEventListener('pointerdown', () => {
    if (busy) return;
    sfx('pop');
    btnBody.setAttribute('transform', 'translate(0,6)');
    setTimeout(() => btnBody.removeAttribute('transform'), 170);
    presses++;
    if (presses === 1) say('l3_try1');
    else if (presses === 2) say('l3_try2');
    else if (presses === 3) { busy = true; btnLbl.textContent = ''; endLevel('l3_done'); }
  });
  setHint(50, 86);
  say('intro_l3');
}

/* ================================================================
   场景4 先和后 —— 种子→大树 排序（插画卡片）
================================================================ */
function buildL4() {
  const { svg } = scene('l4_bg', '');
  const CARD_KEYS = ['l4_seed', 'l4_sprout', 'l4_sapling', 'l4_tree'];
  const SLOT_X = [200, 360, 520, 680], SLOT_Y = 118, CW = 132, CH = 124;
  const slots = SLOT_X.map((x, i) => {
    S('rect', { x, y: SLOT_Y, width: CW, height: CH, rx: 14, fill: 'rgba(255,255,255,0.18)', stroke: '#fff', 'stroke-width': 2.5, 'stroke-dasharray': '8 6', 'stroke-opacity': 0.8 }, svg);
    TXT(svg, x + CW / 2, SLOT_Y + CH / 2 + 15, 46, 'rgba(255,255,255,0.6)', String(i + 1));
    return { x, y: SLOT_Y };
  });
  SLOT_X.slice(0, 3).forEach(x => {
    S('path', { d: `M ${x + CW + 6} ${SLOT_Y + CH / 2} l 15 0 m -6 -7 l 7 7 l -7 7`, stroke: '#fff', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round', opacity: 0.85 }, svg);
  });
  const hint = TXT(svg, 500, 88, 27, '#fff', '按先后顺序，把图片拖进格子');

  const startPos = [[168, 390], [340, 390], [512, 390], [684, 390]];
  const shuffled = [2, 0, 3, 1];
  let placed = 0;
  shuffled.forEach((artIdx, si) => {
    const [sx, sy] = startPos[si];
    const gC = S('g', { transform: `translate(${sx},${sy})` }, svg);
    const cp = S('clipPath', { id: 'l4clip' + si }, svg);
    S('rect', { x: 4, y: 4, width: CW - 8, height: CH - 8, rx: 10 }, cp);
    S('rect', { x: 0, y: 0, width: CW, height: CH, rx: 14, fill: '#fdf8ec', stroke: '#8a744a', 'stroke-width': 3, style: 'filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))' }, gC);
    const im = IMG(gC, CARD_KEYS[artIdx], 4, 4, CW - 8, CH - 8, true);
    im.setAttribute('clip-path', `url(#l4clip${si})`);
    let px = sx, py = sy, offX = 0, offY = 0, homeX = sx, homeY = sy, done = false;
    makeDrag(gC, {
      down: ev => {
        if (done) return;
        const p = svgPoint(svg, ev);
        offX = p.x - px; offY = p.y - py;
        svg.appendChild(gC);
      },
      move: ev => {
        if (done) return;
        const p = svgPoint(svg, ev);
        px = p.x - offX; py = p.y - offY;
        gC.setAttribute('transform', `translate(${px},${py})`);
      },
      up: () => {
        if (done) return;
        const slot = slots[artIdx];
        const cx = px + CW / 2, cy = py + CH / 2;
        if (artIdx === placed && Math.abs(cx - (slot.x + CW / 2)) < 90 && Math.abs(cy - (slot.y + CH / 2)) < 90) {
          done = true; placed++;
          px = slot.x; py = slot.y;
          gC.setAttribute('transform', `translate(${px},${py})`);
          gC.classList.remove('draggable');
          sfx('pop');
          if (placed === 4) { hint.textContent = ''; endLevel('l4_done'); }
          else cheer();
        } else {
          px = homeX; py = homeY;
          gC.setAttribute('transform', `translate(${px},${py})`);
          if (Math.abs(cy - (SLOT_Y + CH / 2)) < 110) say('l4_wrong');
        }
      }
    });
  });
  setHint(30, 66);
  say('intro_l4');
}

/* ================================================================
   场景5 时间的长短 —— 三选一（插画卡片）
================================================================ */
function buildL5() {
  const { svg } = scene('l5_bg', '');
  const CARDS = [
    { key: 'l5_blink', label: '眨眼睛', x: 118 },
    { key: 'l5_brush', label: '刷牙', x: 402 },
    { key: 'l5_sleep', label: '睡一晚', x: 686 }
  ];
  const CY0 = 168, CW = 196, CH = 230;
  const hint = TXT(svg, 500, 108, 30, '#fff', '哪件事用的时间最长？');
  let phase = 0;
  CARDS.forEach((c, i) => {
    const g = S('g', { transform: `translate(${c.x},${CY0})`, cursor: 'pointer' }, svg);
    const cp = S('clipPath', { id: 'l5clip' + i }, svg);
    S('rect', { x: 5, y: 5, width: CW - 10, height: CH - 44, rx: 10 }, cp);
    const frame = S('rect', { x: 0, y: 0, width: CW, height: CH, rx: 16, fill: '#fdf8ec', stroke: '#8a744a', 'stroke-width': 3, style: 'filter:drop-shadow(0 5px 10px rgba(0,0,0,.4))' }, g);
    const im = IMG(g, c.key, 5, 5, CW - 10, CH - 44, true);
    im.setAttribute('clip-path', `url(#l5clip${i})`);
    const tl = S('text', { x: CW / 2, y: CH - 13, 'text-anchor': 'middle', 'font-size': 27, fill: '#4a3a20', 'font-weight': 'bold' }, g);
    tl.textContent = c.label;
    g.addEventListener('pointerdown', () => {
      const glow = () => { frame.setAttribute('stroke', '#e8b45a'); frame.setAttribute('stroke-width', '6'); };
      const shake = () => { const tr = g.getAttribute('transform'); g.setAttribute('transform', tr + ' rotate(3)'); setTimeout(() => g.setAttribute('transform', tr), 200); };
      if (phase === 0) {
        if (c.key === 'l5_sleep') { glow(); phase = 1; hint.textContent = '哪件事用的时间最短？'; cheer(() => { say('l5_q2'); replayId = 'l5_q2'; }); }
        else { shake(); say('wrong_generic'); }
      } else if (phase === 1) {
        if (c.key === 'l5_blink') { glow(); phase = 2; hint.textContent = ''; showBars(); cheer(() => endLevel('l5_done')); }
        else { shake(); say('wrong_generic'); }
      }
    });
  });
  function showBars() {
    S('rect', { x: 90, y: 428, width: 700, height: 150, rx: 16, fill: 'rgba(10,16,38,0.62)' }, svg);
    const data = [['眨眼睛', 8, '不到 1 秒', '#9fd8ff'], ['刷牙', 90, '3 分钟', '#e8c26a'], ['睡一晚', 560, '一整夜', '#c98fd9']];
    data.forEach((d, i) => {
      const y = 446 + i * 42;
      TXT(svg, 195, y + 20, 22, '#dfe6ff', d[0], 'end');
      const bar = S('rect', { x: 210, y, width: 0, height: 26, rx: 13, fill: d[3] }, svg);
      let w = 0;
      onTick(dt => { if (w < d[1]) { w = Math.min(d[1], w + dt * 480); bar.setAttribute('width', String(w)); } });
      TXT(svg, 224 + d[1], y + 20, 20, '#cfd6ea', d[2], 'start');
    });
  }
  setHint(50, 50);
  say('intro_l5', () => { say('l5_q1'); replayId = 'l5_q1'; });
}

/* ================================================================
   场景6 认识钟表 —— 转动时针（插画表盘 + 指针）
================================================================ */
function buildL6() {
  const { svg } = scene('l6_bg', '');
  const CX = 500, CY = 322, FR = 232;
  IMG(svg, 'l6_clock', CX - FR, CY - FR, FR * 2, FR * 2);
  const R = 195;
  S('line', { x1: CX, y1: CY + 22, x2: CX, y2: CY - (R - 52), stroke: '#2a2118', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.9, style: 'filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))' }, svg);
  const hourHand = S('line', { x1: CX, y1: CY + 18, x2: CX, y2: CY - (R - 100), stroke: '#1f1a10', 'stroke-width': 14, 'stroke-linecap': 'round', style: 'filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))' }, svg);
  S('circle', { cx: CX, cy: CY, r: 12, fill: '#8a7346', stroke: '#3a3122', 'stroke-width': 3 }, svg);
  const targetGlow = S('circle', { r: 30, fill: 'none', stroke: '#ffb347', 'stroke-width': 5, opacity: 0.9 }, svg);
  S('animate', { attributeName: 'stroke-width', values: '4;8;4', dur: '1.2s', repeatCount: 'indefinite' }, targetGlow);
  const hint = TXT(svg, 500, 62, 30, '#fff', '把时针转到 7 点（起床）');

  const goals = [
    { h: 7, voice: 'l6_goal2', next: '把时针转到 12 点（午饭）' },
    { h: 12, voice: 'l6_goal3', next: '把时针转到 9 点（睡觉）' },
    { h: 9, voice: 'l6_done', next: '' }
  ];
  let gi = 0, hourAngle = 300, finished = false, busyVoice = false;
  function placeGlow() {
    if (!goals[gi]) { targetGlow.setAttribute('opacity', '0'); return; }
    const a = (goals[gi].h * 30 - 90) * Math.PI / 180;
    targetGlow.setAttribute('cx', String(CX + Math.cos(a) * (R - 40)));
    targetGlow.setAttribute('cy', String(CY + Math.sin(a) * (R - 40)));
  }
  function renderHand() { hourHand.setAttribute('transform', `rotate(${hourAngle} ${CX} ${CY})`); }
  renderHand(); placeGlow();

  const hit = S('circle', { cx: CX, cy: CY, r: FR + 10, fill: 'rgba(255,255,255,0.01)' }, svg);
  makeDrag(hit, {
    move: ev => {
      if (finished || busyVoice) return;
      const p = svgPoint(svg, ev);
      hourAngle = ((Math.atan2(p.y - CY, p.x - CX) * 180 / Math.PI + 90) + 360) % 360;
      renderHand();
    },
    up: () => {
      if (finished || busyVoice) return;
      let h = Math.round(hourAngle / 30);
      hourAngle = (h * 30) % 360;
      if (h === 0) h = 12;
      renderHand();
      sfx('tick');
      const goal = goals[gi];
      if (h === goal.h) {
        busyVoice = true;
        sfx('good');
        if (gi === goals.length - 1) { finished = true; hint.textContent = ''; targetGlow.setAttribute('opacity', '0'); endLevel(goal.voice); }
        else {
          say(goal.voice, () => { busyVoice = false; });
          hint.textContent = goal.next;
          gi++;
          placeGlow();
        }
      }
    }
  });
  setHint(50, 54);
  say('intro_l6');
}

/* ================================================================
   场景7 我的一天 —— 认四个时段（同一座小房子的四张插画）
================================================================ */
function buildL7() {
  const { svg } = scene('l7_bg', '');
  const W = 340, H = 205, GX = 148, GY = 118, GAP = 26;
  const types = ['l7_noon', 'l7_morning', 'l7_night', 'l7_dusk'];
  const panels = {};
  types.forEach((tp, i) => {
    const x = GX + (i % 2) * (W + GAP), y = GY + Math.floor(i / 2) * (H + GAP);
    const g = S('g', { transform: `translate(${x},${y})`, cursor: 'pointer' }, svg);
    const cp = S('clipPath', { id: 'l7clip' + i }, svg);
    S('rect', { x: 0, y: 0, width: W, height: H, rx: 16 }, cp);
    const im = IMG(g, tp, 0, 0, W, H, true);
    im.setAttribute('clip-path', `url(#l7clip${i})`);
    const frame = S('rect', { x: 0, y: 0, width: W, height: H, rx: 16, fill: 'none', stroke: '#f2e6c8', 'stroke-width': 3.5, style: 'filter:drop-shadow(0 4px 10px rgba(0,0,0,.5))' }, g);
    panels[tp] = { g, frame };
  });
  const hint = TXT(svg, 500, 82, 28, '#fff', '听一听，点出对的天空');
  const seq = [
    { tp: 'l7_morning', q: 'l7_q_morning' }, { tp: 'l7_noon', q: 'l7_q_noon' },
    { tp: 'l7_dusk', q: 'l7_q_dusk' }, { tp: 'l7_night', q: 'l7_q_night' }
  ];
  let qi = 0;
  Object.keys(panels).forEach(tp => {
    panels[tp].g.addEventListener('pointerdown', () => {
      if (qi >= seq.length) return;
      if (tp === seq[qi].tp) {
        panels[tp].frame.setAttribute('stroke', '#ffb347');
        panels[tp].frame.setAttribute('stroke-width', '7');
        qi++;
        if (qi < seq.length) cheer(() => { say(seq[qi].q); replayId = seq[qi].q; });
        else { hint.textContent = ''; cheer(() => endLevel('l7_done')); }
      } else {
        const tr = panels[tp].g.getAttribute('transform');
        panels[tp].g.setAttribute('transform', tr + ' translate(6,0)');
        setTimeout(() => panels[tp].g.setAttribute('transform', tr), 180);
        say('wrong_generic');
      }
    });
  });
  setHint(50, 50);
  say('intro_l7', () => { say(seq[0].q); replayId = seq[0].q; });
}

/* ================================================================
   场景8 一个星期 —— 按顺序点亮七盏灯笼
================================================================ */
function buildL8() {
  const { svg } = scene('l8_bg', '');
  const hint = TXT(svg, 500, 82, 28, '#fff', '从星期一开始，按顺序点亮灯笼');
  const NAMES = ['一', '二', '三', '四', '五', '六', '日'];
  let next = 0;
  for (let i = 0; i < 7; i++) {
    const x = 150 + i * 116;
    const y = 300 + Math.sin(i / 6 * Math.PI) * -70;
    const g = S('g', { transform: `translate(${x},${y})`, cursor: 'pointer' }, svg);
    const halo = S('circle', { cx: 0, cy: 0, r: 62, fill: '#ffd977', opacity: 0 }, g);
    const im = IMG(g, 'l8_lantern', -50, -55, 100, 110);
    im.style.filter = 'grayscale(0.5) brightness(0.62) opacity(0.9)';
    im.style.transition = 'filter .5s ease';
    TXT(g, 0, 92, 24, '#e8ecfa', '星期' + NAMES[i]);
    g.addEventListener('pointerdown', () => {
      if (next >= 7) return;
      if (i === next) {
        im.style.filter = 'none';
        halo.setAttribute('opacity', '0.28');
        sfx('pop');
        next++;
        if (next < 7) say('l8_d' + (i + 1));
        else {
          hint.textContent = '';
          say('l8_d7', () => {
            S('path', { d: 'M 846 330 Q 920 470 500 492 Q 90 470 148 340', fill: 'none', stroke: '#ffe9b0', 'stroke-width': 4, 'stroke-dasharray': '10 8', 'stroke-linecap': 'round', opacity: 0.85 }, svg);
            S('path', { d: 'M 148 340 l -12 26 m 12 -26 l 26 12', stroke: '#ffe9b0', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round', opacity: 0.85 }, svg);
            endLevel('l8_done');
          });
        }
      } else say('wrong_generic');
    });
  }
  TXT(svg, 500, 566, 23, '#cfd6ea', '前五天上幼儿园 · 后两天休息');
  setHint(15, 50);
  say('intro_l8');
}

/* ================================================================
   场景9 四季 —— 同一棵大树的春夏秋冬（四张插画交叉淡化）
================================================================ */
function buildL9() {
  const KEYS = ['l9_spring', 'l9_summer', 'l9_autumn', 'l9_winter'];
  const { svg, imgs } = scene(KEYS, `
    <radialGradient id="sun9" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff6d8"/><stop offset="100%" stop-color="#ffcf5e"/>
    </radialGradient>
  `);
  const orbitG = S('g', { transform: 'translate(770,110)' }, svg);
  S('rect', { x: -150, y: -80, width: 300, height: 210, rx: 18, fill: 'rgba(10,16,38,0.55)' }, orbitG);
  S('ellipse', { cx: 0, cy: 10, rx: 112, ry: 56, fill: 'none', stroke: 'rgba(255,255,255,0.5)', 'stroke-width': 2, 'stroke-dasharray': '6 6' }, orbitG);
  S('circle', { cx: 0, cy: 10, r: 24, fill: 'url(#sun9)' }, orbitG);
  const earthDot = S('circle', { cx: -112, cy: 10, r: 11, fill: '#3f7fbf', stroke: '#bfe0ff', 'stroke-width': 2.5 }, orbitG);
  TXT(orbitG, 0, 108, 19, '#e8ecfa', '地球绕太阳跑一圈 = 一年');

  const seasonLbl = TXT(svg, 210, 88, 46, '#fff', '');
  seasonLbl.setAttribute('letter-spacing', '8');

  const btn = S('g', { transform: 'translate(830,470)', cursor: 'pointer' }, svg);
  S('circle', { cx: 0, cy: 0, r: 54, fill: '#e8b45a', stroke: '#9a6f1e', 'stroke-width': 4, style: 'filter:drop-shadow(0 4px 8px rgba(0,0,0,.4))' }, btn);
  S('path', { d: 'M -12 -20 L 18 0 L -12 20 Z', fill: '#3a2703' }, btn);
  TXT(btn, 0, 84, 22, '#fff', '下一季');

  const SEASONS = [
    { name: '春 天', voice: 'l9_spring', angle: 180, pc: '#f8c8d8', pn: 14 },
    { name: '夏 天', voice: 'l9_summer', angle: 270, pc: null, pn: 0 },
    { name: '秋 天', voice: 'l9_autumn', angle: 0, pc: '#d9822b', pn: 16 },
    { name: '冬 天', voice: 'l9_winter', angle: 90, pc: '#ffffff', pn: 40 }
  ];
  let si = -1, busy = false, particles = [];
  const partG = S('g', { 'pointer-events': 'none' }, svg);
  function setSeason(i, cb) {
    const s = SEASONS[i];
    KEYS.forEach((k, j) => { imgs[k].style.opacity = j === i ? '1' : '0'; });
    seasonLbl.textContent = s.name;
    earthDot.setAttribute('cx', String(Math.cos(s.angle * Math.PI / 180) * 112));
    earthDot.setAttribute('cy', String(10 + Math.sin(s.angle * Math.PI / 180) * 56));
    partG.innerHTML = ''; particles = [];
    if (s.pc) {
      for (let k = 0; k < s.pn; k++) {
        const el = S('circle', { r: i === 3 ? 2.6 : 4, fill: s.pc, opacity: 0.9 }, partG);
        particles.push({ el, x: 100 + Math.random() * 800, y: -20 - Math.random() * 500, vy: (i === 3 ? 26 : 34) + Math.random() * 26, vx: (Math.random() - 0.5) * 24, ph: Math.random() * 6 });
      }
    }
    say(s.voice, cb);
  }
  onTick((dt, t) => {
    for (const p of particles) {
      p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(t * 2 + p.ph) * 0.6;
      if (p.y > 610) { p.y = -20; p.x = 100 + Math.random() * 800; }
      p.el.setAttribute('cx', p.x.toFixed(1)); p.el.setAttribute('cy', p.y.toFixed(1));
    }
  });
  btn.addEventListener('pointerdown', () => {
    if (busy || si >= 3) return;
    busy = true; sfx('pop');
    si++;
    if (si === 3) { btn.setAttribute('opacity', '0.35'); setSeason(3, () => endLevel('l9_done')); }
    else setSeason(si, () => { busy = false; });
  });
  setHint(80, 76);
  say('intro_l9', () => { si = 0; busy = true; setSeason(0, () => { busy = false; }); });
}

/* ================================================================
   场景10 时间的脚印 —— 成长时间条（同一个人的四个年龄）
================================================================ */
function buildL10() {
  const { svg } = scene('l10_bg', '');
  const FIG_KEYS = ['l10_baby', 'girl_kid', 'l10_adult', 'l10_old'];
  const BOXES = [
    [320, 300, 260, 165], [345, 190, 210, 275], [330, 95, 240, 370], [335, 125, 230, 340]
  ];
  const figs = FIG_KEYS.map((k, i) => {
    const im = IMG(svg, k, BOXES[i][0], BOXES[i][1], BOXES[i][2], BOXES[i][3]);
    im.style.transition = 'opacity .45s ease';
    im.style.opacity = '0';
    return im;
  });
  const AGES = ['0 岁 · 小婴儿', '5 岁 · 现在的你', '30 岁 · 大人', '80 岁 · 老爷爷老奶奶'];
  const ageLbl = TXT(svg, 445, 512, 28, '#fff', '');
  const hint = TXT(svg, 500, 64, 28, '#fff', '拖动时间条，看看时间的脚印');

  const TX = 150, TW = 700, TY = 556;
  S('rect', { x: TX, y: TY - 8, width: TW, height: 16, rx: 8, fill: 'rgba(10,14,28,0.6)', stroke: 'rgba(255,255,255,0.4)', 'stroke-width': 2 }, svg);
  const fillBar = S('rect', { x: TX, y: TY - 8, width: 0, height: 16, rx: 8, fill: '#e8b45a' }, svg);
  [0, 1, 2, 3].forEach(i => S('circle', { cx: TX + (i / 3) * TW, cy: TY, r: 5, fill: '#d9dff0' }, svg));
  const knob = S('circle', { cx: TX, cy: TY, r: 25, fill: '#ffe2a0', stroke: '#9a6f1e', 'stroke-width': 4, style: 'filter:drop-shadow(0 3px 6px rgba(0,0,0,.4))' }, svg);

  let t = 0, zone = -1, finished = false, oldHeard = false;
  const visited = new Set();
  const VOICES = ['l10_baby', 'l10_kid', 'l10_adult', 'l10_old'];
  function maybeFinish() {
    if (!finished && visited.size === 4 && oldHeard && t > 0.9) {
      finished = true; hint.textContent = '';
      endLevel('l10_done');
    }
  }
  function update() {
    knob.setAttribute('cx', String(TX + t * TW));
    fillBar.setAttribute('width', String(t * TW));
    let z = t < 0.18 ? 0 : t < 0.45 ? 1 : t < 0.75 ? 2 : 3;
    if (z !== zone) {
      zone = z;
      figs.forEach((f, i) => { f.style.opacity = i === z ? '1' : '0'; });
      ageLbl.textContent = AGES[z];
      visited.add(z);
      if (!finished) say(VOICES[z], () => { if (z === 3) oldHeard = true; maybeFinish(); });
    }
    maybeFinish();
  }
  update();
  makeDrag(knob, {
    move: ev => {
      if (finished) return;
      const p = svgPoint(svg, ev);
      t = Math.min(1, Math.max(0, (p.x - TX) / TW));
      update();
    }
  });
  setHint(18, 90);
  say('intro_l10');
}

/* ================================================================
   场景11 时间不能倒流 —— 洒了的水 + 碎鸡蛋
================================================================ */
function buildL11() {
  const { svg } = scene('l11_bg', '');
  const q = TXT(svg, 500, 86, 30, '#fff', '洒出来的水，能自己飞回杯子里吗？');
  function bigBtn(x, color, stroke, text) {
    const g = S('g', { transform: `translate(${x},516)`, cursor: 'pointer' }, svg);
    S('rect', { x: -112, y: -40, width: 224, height: 80, rx: 40, fill: color, stroke, 'stroke-width': 4, style: 'filter:drop-shadow(0 5px 10px rgba(0,0,0,.4))' }, g);
    TXT(g, 0, 11, 31, '#fff', text);
    return g;
  }
  const btnYes = bigBtn(310, '#3d7fc1', '#1d4d7a', '能，回得去');
  const btnNo = bigBtn(690, '#c05a3c', '#7d3018', '不能，回不去');
  let answered = false;

  function eggPhase() {
    btnYes.setAttribute('opacity', '0.25'); btnNo.setAttribute('opacity', '0.25');
    q.textContent = '看，鸡蛋碎了，还能变回去吗？';
    const eggG = S('g', null, svg);
    const egg = IMG(eggG, 'l11_egg', 680, 90, 90, 110);
    let vy = 0, y = 90, cracked = false;
    onTick(dt => {
      if (cracked) return;
      vy += dt * 900; y += vy * dt;
      if (y >= 330) {
        cracked = true;
        eggG.innerHTML = '';
        IMG(eggG, 'l11_egg_broken', 640, 340, 180, 110);
        sfx('no');
        for (let i = 0; i < 8; i++) {
          const a = Math.PI + Math.random() * Math.PI, d = 30 + Math.random() * 50;
          const p = S('circle', { cx: 725, cy: 400, r: 3.5, fill: '#f2b93c' }, svg);
          let tt = 0;
          onTick(dt2 => {
            tt += dt2;
            if (tt > 0.6) { p.remove(); return; }
            p.setAttribute('cx', String(725 + Math.cos(a) * d * tt * 2.4));
            p.setAttribute('cy', String(400 - 60 * tt + 160 * tt * tt));
          });
        }
        say('l11_egg', () => endLevel('l11_done'));
      } else egg.setAttribute('y', String(y));
    });
  }
  btnYes.addEventListener('pointerdown', () => {
    if (answered) return; answered = true;
    const drops = [];
    for (let i = 0; i < 8; i++) drops.push(S('circle', { cx: 480 + i * 18, cy: 424, r: 5, fill: '#bfe4f5' }, svg));
    let tt = 0;
    onTick(dt => {
      tt += dt;
      if (tt > 1.6) { drops.forEach(d => d.remove()); return; }
      drops.forEach((d, i) => {
        const ph = Math.min(1, tt / 1.4);
        d.setAttribute('cy', String(424 - Math.sin(ph * Math.PI) * (36 + i * 4)));
        d.setAttribute('opacity', String(1 - ph * 0.4));
      });
    });
    say('l11_yes_wrong', eggPhase);
  });
  btnNo.addEventListener('pointerdown', () => {
    if (answered) return; answered = true;
    sfx('good');
    say('l11_no_right', eggPhase);
  });
  setHint(31, 86);
  say('intro_l11');
}

/* ================================================================
   场景12 时间是什么 —— 三颗星星的秘密
================================================================ */
function buildL12() {
  const { svg } = scene('l12_bg', `
    <radialGradient id="starBig12" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#fff8dd"/><stop offset="100%" stop-color="#e8b45a"/>
    </radialGradient>
  `);
  const hint = TXT(svg, 500, 572, 26, '#dfe6ff', '点亮三颗大星星，听听时间的秘密');
  const POS = [[260, 200], [520, 110], [760, 250]];
  const LABELS = ['拦不住', '不回头', '在现在'];
  const VOICES = ['l12_s1', 'l12_s2', 'l12_s3'];
  const lit = [false, false, false];
  let busy = false;
  POS.forEach((p, i) => {
    const g = S('g', { transform: `translate(${p[0]},${p[1]})`, cursor: 'pointer' }, svg);
    const halo = S('circle', { cx: 0, cy: 0, r: 55, fill: 'url(#starBig12)', opacity: 0.1 }, g);
    const star = S('path', {
      d: 'M 0 -34 L 9 -11 L 34 -10 L 14 5 L 21 30 L 0 16 L -21 30 L -14 5 L -34 -10 L -9 -11 Z',
      fill: 'rgba(90,100,140,0.55)', stroke: 'rgba(190,200,235,0.8)', 'stroke-width': 2, 'stroke-linejoin': 'round'
    }, g);
    const lbl = TXT(g, 0, 62, 22, '#aab6d8', LABELS[i]);
    g.addEventListener('pointerdown', () => {
      if (lit[i] || busy) return;
      busy = true;
      lit[i] = true;
      sfx('pop');
      star.setAttribute('fill', 'url(#starBig12)');
      star.setAttribute('stroke', '#ffe9b0');
      star.setAttribute('style', 'filter:drop-shadow(0 0 18px rgba(255,225,150,0.95))');
      halo.setAttribute('opacity', '0.4');
      lbl.setAttribute('fill', '#ffe9b0');
      say(VOICES[i], () => {
        busy = false;
        if (lit.every(Boolean)) {
          hint.textContent = '';
          for (let k = 0; k < 3; k++) {
            const a = POS[k], b = POS[(k + 1) % 3];
            const line = S('line', { x1: a[0], y1: a[1], x2: a[0], y2: a[1], stroke: 'rgba(255,233,176,0.65)', 'stroke-width': 2.5, 'stroke-dasharray': '4 6' }, svg);
            let pr = 0;
            onTick(dt => {
              if (pr < 1) {
                pr = Math.min(1, pr + dt * 0.8);
                line.setAttribute('x2', String(a[0] + (b[0] - a[0]) * pr));
                line.setAttribute('y2', String(a[1] + (b[1] - a[1]) * pr));
              }
            });
          }
          for (let m = 0; m < 3; m++) {
            const sx = 200 + m * 260, sy = 40 + m * 30;
            const met = S('line', { x1: sx, y1: sy, x2: sx - 60, y2: sy + 30, stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0 }, svg);
            let mt = -m * 1.2;
            onTick(dt => {
              mt += dt;
              if (mt < 0) return;
              const k = (mt % 3) / 3;
              const ox = sx + 500 * k, oy = sy + 250 * k;
              met.setAttribute('x1', ox); met.setAttribute('y1', oy);
              met.setAttribute('x2', ox - 70); met.setAttribute('y2', oy - 35);
              met.setAttribute('opacity', String(k < 0.5 ? k * 1.6 : (1 - k) * 1.6));
            });
          }
          endLevel('l12_done');
        }
      });
    });
  });
  setHint(52, 20);
  say('intro_l12');
}
