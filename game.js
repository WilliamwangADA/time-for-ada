'use strict';
/* Ada的时间之旅 —— 12 关时间科普小游戏 */

const $ = s => document.querySelector(s);
const stage = $('#stage');
const NS = 'http://www.w3.org/2000/svg';

/* ================= 语音 ================= */
const audioEl = new Audio();
let sayToken = 0;
function say(id, cb) {
  stopVoice();
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

/* ================= SVG 工具 ================= */
function S(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function newScene(defs) {
  stage.innerHTML = '';
  const svg = S('svg', { viewBox: '0 0 1000 600', preserveAspectRatio: 'xMidYMid slice' });
  svg.style.width = '100%'; svg.style.height = '100%';
  if (defs) { const d = S('defs', null, svg); d.innerHTML = defs; }
  stage.appendChild(svg);
  return svg;
}
function svgPoint(svg, ev) {
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function rnd01(k) { const v = Math.sin(k) * 43758.5453; return v - Math.floor(v); }
function addStars(svg, n, x0, y0, x1, y1, seedBase) {
  const g = S('g', null, svg);
  for (let i = 0; i < n; i++) {
    // 伪随机（固定种子，避免每次布局跳动）
    const x = x0 + rnd01(i * 12.9898 + (seedBase || 7)) * (x1 - x0);
    const y = y0 + rnd01(i * 78.233 + (seedBase || 7) * 7.13) * (y1 - y0);
    const r = 0.7 + (Math.abs(Math.sin(i * 12.9)) * 1.6);
    const c = S('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(2), fill: '#e9edff', opacity: (0.25 + Math.abs(Math.sin(i * 5.1)) * 0.7).toFixed(2) }, g);
    if (i % 4 === 0) {
      const a = S('animate', { attributeName: 'opacity', values: '0.2;0.9;0.2', dur: (2 + i % 5) + 's', repeatCount: 'indefinite' }, c);
    }
  }
  return g;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mixColor(c1, c2, t) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return 'rgb(' + Math.round(lerp(a[0], b[0], t)) + ',' + Math.round(lerp(a[1], b[1], t)) + ',' + Math.round(lerp(a[2], b[2], t)) + ')';
}
function multiMix(stops, t) { // stops: [[t,color],...]
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const k = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return mixColor(stops[i - 1][1], stops[i][1], k);
    }
  }
  return stops[stops.length - 1][1];
}

/* 拖拽助手（Pointer Events） */
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

/* ================= 关卡框架 ================= */
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
let currentLevel = 0;
let replayId = 'welcome';
let levelDone = false;
let unlocked = parseInt(localStorage.getItem('tfa_unlocked') || '1', 10);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}

function startLevel(i) {
  currentLevel = i;
  levelDone = false;
  tickFns = [];
  stopVoice();
  $('#doneOverlay').classList.remove('show');
  $('#levelTitle').textContent = LEVEL_EMOJI[i] + ' ' + LEVELS[i].name;
  showScreen('levelScreen');
  replayId = 'intro_' + LEVELS[i].id;
  LEVELS[i].build();
}

function finishLevel() {
  if (levelDone) return;
  levelDone = true;
  if (currentLevel + 2 > unlocked) {
    unlocked = Math.min(LEVELS.length + 1, currentLevel + 2);
    localStorage.setItem('tfa_unlocked', String(unlocked));
  }
  $('#doneMsg').textContent = currentLevel === LEVELS.length - 1 ? '旅行完成，你太棒啦！' : '你太棒啦！';
  $('#nextBtn').textContent = currentLevel === LEVELS.length - 1 ? '回到星空 ✦' : '继续出发 →';
  $('#doneOverlay').classList.add('show');
}

function goMap() { stopVoice(); tickFns = []; buildMap(); showScreen('mapScreen'); }
function goNext() {
  if (currentLevel < LEVELS.length - 1) startLevel(currentLevel + 1);
  else goMap();
}
/* 结尾讲解：先弹出星星和按钮（随时可跳过），讲完稍等自动进入下一关 */
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
const LEVEL_EMOJI = ['🌍', '🌅', '⏳', '🌱', '⏱', '⏰', '🏠', '🎠', '🍁', '👣', '💧', '✨'];
const NODE_POS = [
  [8, 80], [20, 64], [14, 42], [26, 25], [40, 20], [50, 38],
  [44, 62], [58, 78], [71, 64], [66, 40], [79, 24], [91, 45]
];
function buildMap() {
  const svg = $('#mapPath');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = '';
  // 星空
  const gs = S('g', null, svg);
  for (let i = 0; i < 70; i++) {
    const x = (Math.sin(i * 47.7) * 0.5 + 0.5) * 100;
    const y = (Math.sin(i * 91.1) * 0.5 + 0.5) * 100;
    S('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (0.1 + Math.abs(Math.sin(i * 3.3)) * 0.25).toFixed(2), fill: '#dfe6ff', opacity: (0.2 + Math.abs(Math.sin(i * 5.9)) * 0.6).toFixed(2) }, gs);
  }
  // 路径
  let d = 'M ' + NODE_POS[0][0] + ' ' + NODE_POS[0][1];
  for (let i = 1; i < NODE_POS.length; i++) {
    const p0 = NODE_POS[i - 1], p1 = NODE_POS[i];
    d += ' Q ' + ((p0[0] + p1[0]) / 2 + (i % 2 ? 4 : -4)) + ' ' + ((p0[1] + p1[1]) / 2) + ' ' + p1[0] + ' ' + p1[1];
  }
  S('path', { d, fill: 'none', stroke: 'rgba(230,215,160,0.3)', 'stroke-width': '0.6', 'stroke-dasharray': '1.6 1.6', 'stroke-linecap': 'round' }, svg);

  document.querySelectorAll('.mapNode').forEach(n => n.remove());
  const mapScreen = $('#mapScreen');
  NODE_POS.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'mapNode ' + (i + 1 < unlocked ? 'done' : (i + 1 === unlocked ? 'open' : 'todo'));
    div.style.left = p[0] + '%';
    div.style.top = p[1] + '%';
    div.innerHTML = '<div class="num">' + LEVEL_EMOJI[i] + '</div><div class="lbl">' + LEVELS[i].name + '</div>';
    div.addEventListener('click', () => startLevel(i));
    mapScreen.appendChild(div);
  });
}

/* ================= 开始 ================= */
$('#startBtn').addEventListener('click', () => {
  buildMap();
  showScreen('mapScreen');
  say('welcome');
});

/* ================================================================
   第 1 关 白天和黑夜 —— 拖动地球自转
================================================================ */
function buildL1() {
  const svg = newScene(`
    <radialGradient id="sunG1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffbe8"/><stop offset="55%" stop-color="#ffd977"/><stop offset="100%" stop-color="#f5a623" stop-opacity="0.9"/>
    </radialGradient>
    <radialGradient id="sunHalo1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffdf8e" stop-opacity="0.55"/><stop offset="100%" stop-color="#ffdf8e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="earthG1" cx="38%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#7fc4ee"/><stop offset="60%" stop-color="#2f7db8"/><stop offset="100%" stop-color="#12466f"/>
    </radialGradient>
    <linearGradient id="nightG1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#03060f" stop-opacity="0"/>
      <stop offset="18%" stop-color="#03060f" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#03060f" stop-opacity="0.94"/>
    </linearGradient>
    <clipPath id="earthClip1"><circle cx="590" cy="310" r="175"/></clipPath>
  `);
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: '#070b18' }, svg);
  addStars(svg, 60, -150, 0, 1150, 600, 3);
  // 太阳
  S('circle', { cx: 170, cy: 310, r: 185, fill: 'url(#sunHalo1)' }, svg);
  S('circle', { cx: 170, cy: 310, r: 92, fill: 'url(#sunG1)' }, svg);
  // 阳光射线
  for (let i = -2; i <= 2; i++) {
    S('line', { x1: 278, y1: 310 + i * 52, x2: 400, y2: 310 + i * 46, stroke: '#ffe9a8', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.35 }, svg);
  }
  // 地球
  const CX = 590, CY = 310, R = 175;
  const earthWrap = S('g', null, svg);
  S('circle', { cx: CX, cy: CY, r: R + 10, fill: 'none', stroke: '#9fd4ff', 'stroke-width': 3, opacity: 0.25 }, earthWrap); // 大气
  S('circle', { cx: CX, cy: CY, r: R, fill: 'url(#earthG1)' }, earthWrap);
  const rotG = S('g', { 'clip-path': 'url(#earthClip1)' }, earthWrap);
  const spin = S('g', null, rotG);
  // 大陆（跟着转）
  const landC = '#4f9455', landC2 = '#6aa860';
  const lands = [
    'M 470 240 q 40 -34 86 -20 q 30 8 22 40 q -10 34 -56 30 q -52 -6 -52 -50 z',
    'M 640 200 q 52 -12 76 22 q 16 26 -12 44 q -40 22 -70 -6 q -22 -30 6 -60 z',
    'M 520 380 q 30 -20 66 -6 q 34 14 20 44 q -16 30 -60 20 q -44 -12 -26 -58 z',
    'M 680 340 q 36 -8 50 20 q 10 24 -14 36 q -34 14 -50 -10 q -14 -26 14 -46 z',
    'M 560 130 q 40 -16 70 6 q 20 18 -4 34 q -36 20 -66 2 q -22 -18 0 -42 z'
  ];
  lands.forEach((d, i) => S('path', { d, fill: i % 2 ? landC2 : landC, opacity: 0.95 }, spin));
  // 小房子（贴在地球左边缘，一开始正对太阳）
  const house = S('g', null, spin);
  house.innerHTML = `
    <g transform="translate(${CX - R + 26},${CY}) rotate(-90)">
      <rect x="-16" y="-26" width="32" height="24" fill="#c9553d" rx="2"/>
      <path d="M -22 -26 L 0 -46 L 22 -26 Z" fill="#8a3324"/>
      <rect x="-6" y="-14" width="12" height="12" fill="#ffe9b0"/>
    </g>`;
  // 夜半球（固定，不转：背对太阳的一侧）
  S('path', { d: `M ${CX} ${CY - R} A ${R} ${R} 0 0 1 ${CX} ${CY + R} L ${CX} ${CY - R} Z`, fill: 'url(#nightG1)', 'clip-path': 'url(#earthClip1)', 'pointer-events': 'none' }, earthWrap);
  S('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: '#0a1a2e', 'stroke-width': 2, opacity: .6, 'pointer-events': 'none' }, earthWrap);

  // 状态标签
  const label = S('text', { x: CX, y: 80, 'text-anchor': 'middle', 'font-size': 42, fill: '#ffe9b0', 'font-weight': 'bold', 'letter-spacing': 6 }, svg);
  label.textContent = '☀ 白天';
  // 提示手势
  const hint = S('text', { x: CX, y: 555, 'text-anchor': 'middle', 'font-size': 26, fill: '#aab6d4' }, svg);
  hint.textContent = '👉 用手指拖一拖地球，让它转起来';

  let rot = 0, total = 0, lastX = null, state = 'day', finished = false;
  const hitArea = S('circle', { cx: CX, cy: CY, r: R + 20, fill: 'rgba(255,255,255,0.01)' }, svg);
  makeDrag(hitArea, {
    down: ev => { lastX = svgPoint(svg, ev).x; },
    move: ev => {
      const p = svgPoint(svg, ev);
      const dx = p.x - lastX; lastX = p.x;
      rot += dx * 0.35; total += Math.abs(dx * 0.35);
      spin.setAttribute('transform', `rotate(${rot} ${CX} ${CY})`);
      // 房子初始在角度180°（朝太阳）。世界角 = 180 + rot
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
  say('intro_l1');
}

/* ================================================================
   第 2 关 天空的颜色 —— 拖动太阳走一天
================================================================ */
function buildL2() {
  const svg = newScene(`
    <linearGradient id="skyG2" x1="0" y1="0" x2="0" y2="1">
      <stop id="skyTop2" offset="0%" stop-color="#6b7fb3"/>
      <stop id="skyBot2" offset="100%" stop-color="#f6b98a"/>
    </linearGradient>
    <radialGradient id="sunG2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff8dd"/><stop offset="60%" stop-color="#ffd977"/><stop offset="100%" stop-color="#ffb347" stop-opacity="0.85"/>
    </radialGradient>
    <radialGradient id="moonG2" cx="42%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#fdfcf5"/><stop offset="100%" stop-color="#c9c9bd"/>
    </radialGradient>
  `);
  const sky = S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'url(#skyG2)' }, svg);
  const starsG = addStars(svg, 50, -150, 0, 1150, 380, 5);
  starsG.setAttribute('opacity', '0');
  // 远山近山（剪影）
  S('path', { d: 'M -200 470 L 80 360 L 260 450 L 430 340 L 620 460 L 800 370 L 1000 450 L 1200 400 L 1200 600 L -200 600 Z', fill: '#22304f', opacity: 0.75 }, svg);
  S('path', { d: 'M -200 520 Q 150 430 400 505 T 1200 500 L 1200 600 L -200 600 Z', fill: '#131c33' }, svg);
  // 月亮（夜晚出现）
  const moon = S('circle', { cx: 780, cy: 140, r: 38, fill: 'url(#moonG2)', opacity: 0 }, svg);
  // 太阳
  const sunHalo = S('circle', { cx: 150, cy: 520, r: 95, fill: 'url(#sunG2)', opacity: 0.35 }, svg);
  const sun = S('circle', { cx: 150, cy: 520, r: 52, fill: 'url(#sunG2)' }, svg);
  const hint = S('text', { x: 500, y: 560, 'text-anchor': 'middle', 'font-size': 26, fill: '#f7ead0' }, svg);
  hint.textContent = '👉 拖着太阳，从东边走到西边';

  const TOPS = [[0, '#5d6f9e'], [0.5, '#3f8fe0'], [0.85, '#453a66'], [1, '#0a1030']];
  const BOTS = [[0, '#f6b98a'], [0.5, '#bfe3ff'], [0.85, '#ff8c4a'], [1, '#1c2a55']];
  let t = 0, finished = false;
  const fired = { dawn: false, noon: false, dusk: false };
  function render() {
    const x = 150 + t * 700;
    const y = 520 - Math.sin(t * Math.PI) * 400;
    sun.setAttribute('cx', x); sun.setAttribute('cy', y);
    sunHalo.setAttribute('cx', x); sunHalo.setAttribute('cy', y);
    const late = Math.max(0, (t - 0.9) / 0.1);
    sun.setAttribute('opacity', String(1 - late));
    sunHalo.setAttribute('opacity', String(0.35 * (1 - late)));
    document.getElementById('skyTop2').setAttribute('stop-color', multiMix(TOPS, t));
    document.getElementById('skyBot2').setAttribute('stop-color', multiMix(BOTS, t));
    starsG.setAttribute('opacity', String(Math.max(0, (t - 0.88) / 0.12)));
    moon.setAttribute('opacity', String(Math.max(0, (t - 0.9) / 0.1)));
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
      if (t >= 0.99) {
        finished = true;
        hint.textContent = '';
        endLevel('l2_done');
      }
    }
  });
  say('intro_l2');
}

/* ================================================================
   第 3 关 拦不住的时间 —— 沙漏 + 无效的暂停按钮
================================================================ */
function buildL3() {
  const svg = newScene(`
    <linearGradient id="woodG3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8a5a33"/><stop offset="50%" stop-color="#6b421f"/><stop offset="100%" stop-color="#4e2f14"/>
    </linearGradient>
    <linearGradient id="glassG3" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="50%" stop-color="#ffffff" stop-opacity="0.05"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0.22"/>
    </linearGradient>
    <radialGradient id="btnG3" cx="40%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#ff7a6b"/><stop offset="100%" stop-color="#c02a1c"/>
    </radialGradient>
  `);
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: '#101627' }, svg);
  addStars(svg, 35, -150, 0, 1150, 250, 9);
  S('ellipse', { cx: 500, cy: 585, rx: 480, ry: 55, fill: '#0a0f1e' }, svg);

  const CX = 500, TOPY = 80, BOTY = 440, MIDY = 260;
  const g = S('g', null, svg);
  // 木框
  S('rect', { x: CX - 130, y: TOPY - 26, width: 260, height: 26, rx: 8, fill: 'url(#woodG3)' }, g);
  S('rect', { x: CX - 130, y: BOTY, width: 260, height: 26, rx: 8, fill: 'url(#woodG3)' }, g);
  S('rect', { x: CX - 122, y: TOPY, width: 14, height: BOTY - TOPY, rx: 6, fill: 'url(#woodG3)' }, g);
  S('rect', { x: CX + 108, y: TOPY, width: 14, height: BOTY - TOPY, rx: 6, fill: 'url(#woodG3)' }, g);
  // 玻璃轮廓
  const glassPath = `M ${CX - 90} ${TOPY + 8} Q ${CX - 90} ${MIDY - 30} ${CX - 12} ${MIDY} Q ${CX - 90} ${MIDY + 30} ${CX - 90} ${BOTY - 8} L ${CX + 90} ${BOTY - 8} Q ${CX + 90} ${MIDY + 30} ${CX + 12} ${MIDY} Q ${CX + 90} ${MIDY - 30} ${CX + 90} ${TOPY + 8} Z`;
  // 上沙（随时间变矮）
  const sandTopClip = S('clipPath', { id: 'sandTopC' }, svg);
  const sandTopRect = S('rect', { x: CX - 90, y: TOPY + 40, width: 180, height: MIDY - TOPY - 40 }, sandTopClip);
  S('path', { d: `M ${CX - 88} ${TOPY + 10} Q ${CX - 88} ${MIDY - 30} ${CX - 12} ${MIDY - 2} L ${CX + 12} ${MIDY - 2} Q ${CX + 88} ${MIDY - 30} ${CX + 88} ${TOPY + 10} Z`, fill: '#e8c26a', 'clip-path': 'url(#sandTopC)' }, g);
  // 落沙流
  const streamG = S('g', null, g);
  const streamDots = [];
  for (let i = 0; i < 6; i++) streamDots.push(S('circle', { cx: CX, cy: MIDY + i * 30, r: 3.4, fill: '#e8c26a' }, streamG));
  // 下沙堆
  const pile = S('path', { d: '', fill: '#e8c26a' }, g);
  // 玻璃面
  S('path', { d: glassPath, fill: 'url(#glassG3)', stroke: '#cfe3f5', 'stroke-width': 3, 'stroke-opacity': 0.5 }, g);

  // 暂停按钮
  const btnG = S('g', { transform: 'translate(500,555)', cursor: 'pointer' }, svg);
  S('ellipse', { cx: 0, cy: 12, rx: 62, ry: 14, fill: 'rgba(0,0,0,0.45)' }, btnG);
  const btnBody = S('circle', { cx: 0, cy: 0, r: 52, fill: 'url(#btnG3)', stroke: '#7d150b', 'stroke-width': 4 }, btnG);
  S('rect', { x: -16, y: -20, width: 11, height: 40, rx: 4, fill: '#fff' }, btnG);
  S('rect', { x: 6, y: -20, width: 11, height: 40, rx: 4, fill: '#fff' }, btnG);
  const btnLbl = S('text', { x: 0, y: -64, 'text-anchor': 'middle', 'font-size': 25, fill: '#ffb1a6', 'font-weight': 'bold' }, btnG);
  btnLbl.textContent = '让时间停下来';

  let prog = 0; // 0..1 一轮沙漏
  onTick((dt, t) => {
    prog += dt / 14;
    if (prog >= 1) prog = 0;
    const topFull = MIDY - TOPY - 40;
    sandTopRect.setAttribute('y', String(TOPY + 40 + topFull * prog * 0.92));
    const ph = 8 + prog * 96;
    pile.setAttribute('d', `M ${CX - 86} ${BOTY - 10} Q ${CX} ${BOTY - 10 - ph * 2} ${CX + 86} ${BOTY - 10} Z`);
    streamDots.forEach((d0, i) => {
      const yy = MIDY + ((t * 220 + i * 30) % (BOTY - 18 - ph - MIDY));
      d0.setAttribute('cy', String(yy));
    });
  });

  let presses = 0, busy = false;
  btnG.addEventListener('pointerdown', () => {
    if (busy) return;
    btnBody.setAttribute('transform', 'translate(0,5)');
    setTimeout(() => btnBody.removeAttribute('transform'), 180);
    presses++;
    if (presses === 1) say('l3_try1');
    else if (presses === 2) say('l3_try2');
    else if (presses === 3) {
      busy = true;
      btnLbl.textContent = '';
      endLevel('l3_done');
    }
  });
  say('intro_l3');
}

/* ================================================================
   第 4 关 先和后 —— 种子→大树 排序
================================================================ */
function buildL4() {
  const svg = newScene(`
    <linearGradient id="skyG4" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#25355e"/><stop offset="100%" stop-color="#3c517f"/>
    </linearGradient>
    <linearGradient id="cardG4" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fdf8ec"/><stop offset="100%" stop-color="#e4d9bd"/>
    </linearGradient>
  `);
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'url(#skyG4)' }, svg);
  addStars(svg, 30, -150, 0, 1150, 200, 11);

  // 卡片内容（写实小场景）
  const CARD_ART = [
    // 0 种子
    `<rect x="10" y="86" width="110" height="34" fill="#6b4a2b" rx="6"/>
     <ellipse cx="65" cy="88" rx="12" ry="16" fill="#a9742f" stroke="#7c521c" stroke-width="2"/>
     <rect x="10" y="14" width="110" height="60" fill="#bcd8ee" opacity="0.35" rx="6"/>`,
    // 1 发芽
    `<rect x="10" y="86" width="110" height="34" fill="#6b4a2b" rx="6"/>
     <path d="M 65 90 L 65 58" stroke="#4f8f3d" stroke-width="5" stroke-linecap="round"/>
     <path d="M 65 62 q -22 -18 -26 -34 q 24 2 26 26 z" fill="#5aa344"/>
     <path d="M 65 58 q 22 -18 26 -34 q -24 2 -26 26 z" fill="#6cb551"/>`,
    // 2 小树
    `<rect x="10" y="92" width="110" height="28" fill="#5f7c46" rx="6"/>
     <rect x="61" y="52" width="8" height="42" fill="#7a5230" rx="3"/>
     <circle cx="65" cy="40" r="24" fill="#4f8f3d"/>
     <circle cx="48" cy="52" r="15" fill="#5aa344"/>
     <circle cx="82" cy="52" r="15" fill="#5aa344"/>`,
    // 3 大树
    `<rect x="10" y="96" width="110" height="24" fill="#5f7c46" rx="6"/>
     <path d="M 60 100 L 58 62 Q 50 54 46 44 M 70 100 L 70 60 Q 80 52 84 42" stroke="#6e4a28" stroke-width="9" fill="none" stroke-linecap="round"/>
     <circle cx="44" cy="38" r="20" fill="#3f7c33"/>
     <circle cx="66" cy="24" r="24" fill="#4f8f3d"/>
     <circle cx="88" cy="38" r="19" fill="#5aa344"/>
     <circle cx="65" cy="44" r="22" fill="#478739"/>`
  ];
  // 槽位
  const SLOT_X = [200, 360, 520, 680], SLOT_Y = 120, CW = 130, CH = 120;
  const slots = SLOT_X.map((x, i) => {
    const gS = S('g', null, svg);
    S('rect', { x, y: SLOT_Y, width: CW, height: CH, rx: 12, fill: 'rgba(255,255,255,0.06)', stroke: '#c9b98a', 'stroke-width': 2.5, 'stroke-dasharray': '8 6' }, gS);
    const tN = S('text', { x: x + CW / 2, y: SLOT_Y + CH / 2 + 14, 'text-anchor': 'middle', 'font-size': 44, fill: 'rgba(255,255,255,0.25)', 'font-weight': 'bold' }, gS);
    tN.textContent = String(i + 1);
    return { x, y: SLOT_Y };
  });
  SLOT_X.slice(0, 3).forEach((x, i) => {
    S('path', { d: `M ${x + CW + 6} ${SLOT_Y + CH / 2} l 16 0 m -6 -7 l 7 7 l -7 7`, stroke: '#c9b98a', 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }, svg);
  });

  const hint = S('text', { x: 500, y: 90, 'text-anchor': 'middle', 'font-size': 27, fill: '#f2e6c8' }, svg);
  hint.textContent = '按先后顺序，把图片拖进格子';

  const order = [0, 1, 2, 3];
  const startPos = [[170, 380], [340, 380], [510, 380], [680, 380]];
  const shuffled = [2, 0, 3, 1]; // 固定打乱顺序
  let placed = 0;
  shuffled.forEach((artIdx, si) => {
    const [sx, sy] = startPos[si];
    const gC = S('g', { transform: `translate(${sx},${sy})` }, svg);
    S('rect', { x: 0, y: 0, width: CW, height: CH, rx: 12, fill: 'url(#cardG4)', stroke: '#8a744a', 'stroke-width': 3 }, gC);
    const inner = S('g', { transform: 'translate(0,0)' }, gC);
    inner.innerHTML = CARD_ART[artIdx];
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
          if (placed === 4) { hint.textContent = ''; endLevel('l4_done'); }
          else cheer();
        } else {
          px = homeX; py = homeY;
          gC.setAttribute('transform', `translate(${px},${py})`);
          const cxOK = Math.abs(cy - (SLOT_Y + CH / 2)) < 110; // 只有确实想放进格子才提示
          if (cxOK) say('l4_wrong');
        }
      }
    });
  });
  say('intro_l4');
}

/* ================================================================
   第 5 关 时间的长短 —— 三选一
================================================================ */
function buildL5() {
  const svg = newScene(`
    <linearGradient id="bgG5" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c2748"/><stop offset="100%" stop-color="#2e3f6b"/>
    </linearGradient>
    <linearGradient id="cardG5" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fdf8ec"/><stop offset="100%" stop-color="#e0d5b8"/>
    </linearGradient>
  `);
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'url(#bgG5)' }, svg);
  addStars(svg, 26, -150, 0, 1150, 160, 13);

  const ART = {
    blink: `<circle cx="90" cy="80" r="52" fill="#f4d7b8"/>
      <path d="M 56 78 q 34 26 68 0" stroke="#3a2c20" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M 56 78 q 34 -14 68 0" stroke="#3a2c20" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>`,
    brush: `<rect x="52" y="36" width="18" height="96" rx="8" fill="#4a90d9"/>
      <rect x="48" y="26" width="26" height="26" rx="6" fill="#eef3f8" stroke="#c3cdd8" stroke-width="2"/>
      <g stroke="#fff" stroke-width="4" stroke-linecap="round"><line x1="54" y1="30" x2="54" y2="46"/><line x1="61" y1="30" x2="61" y2="46"/><line x1="68" y1="30" x2="68" y2="46"/></g>
      <path d="M 90 60 q 26 -8 34 12 q 8 22 -14 26 q -26 4 -30 -14 q -2 -16 10 -24 z" fill="#eef6ff" stroke="#bcd" stroke-width="2"/>`,
    sleep: `<rect x="34" y="86" width="112" height="34" rx="10" fill="#7a5a8f"/>
      <rect x="34" y="72" width="44" height="22" rx="8" fill="#fdf8ec"/>
      <rect x="42" y="96" width="8" height="28" fill="#4e3a5c"/><rect x="130" y="96" width="8" height="28" fill="#4e3a5c"/>
      <path d="M 128 34 a 20 20 0 1 1 -14 -30 a 16 16 0 0 0 14 30 z" fill="#ffe9a8"/>
      <text x="60" y="52" font-size="24" fill="#cbd6f2">Z z</text>`
  };
  const CARDS = [
    { key: 'blink', label: '眨眼睛', x: 140 },
    { key: 'brush', label: '刷牙', x: 410 },
    { key: 'sleep', label: '睡一晚', x: 680 }
  ];
  const CY0 = 190, CW = 180, CH = 200;
  const hint = S('text', { x: 500, y: 120, 'text-anchor': 'middle', 'font-size': 30, fill: '#f2e6c8', 'font-weight': 'bold' }, svg);
  hint.textContent = '哪件事用的时间最长？';

  let phase = 0; // 0=>问最长(sleep) 1=>问最短(blink) 2=>结束
  const cardEls = {};
  CARDS.forEach(c => {
    const g = S('g', { transform: `translate(${c.x},${CY0})`, cursor: 'pointer' }, svg);
    S('rect', { x: 0, y: 0, width: CW, height: CH, rx: 16, fill: 'url(#cardG5)', stroke: '#8a744a', 'stroke-width': 3 }, g);
    const art = S('g', null, g); art.innerHTML = ART[c.key];
    const tl = S('text', { x: CW / 2, y: CH - 18, 'text-anchor': 'middle', 'font-size': 28, fill: '#4a3a20', 'font-weight': 'bold' }, g);
    tl.textContent = c.label;
    cardEls[c.key] = g;
    g.addEventListener('pointerdown', () => {
      if (phase === 0) {
        if (c.key === 'sleep') {
          glow(g); phase = 1;
          hint.textContent = '哪件事用的时间最短？';
          cheer(() => { say('l5_q2'); replayId = 'l5_q2'; });
        } else { shake(g); say('wrong_generic'); }
      } else if (phase === 1) {
        if (c.key === 'blink') {
          glow(g); phase = 2;
          hint.textContent = '';
          showBars();
          cheer(() => endLevel('l5_done'));
        } else { shake(g); say('wrong_generic'); }
      }
    });
  });
  function glow(g) {
    const r = g.querySelector('rect');
    r.setAttribute('stroke', '#e8b45a'); r.setAttribute('stroke-width', '6');
    r.setAttribute('filter', 'drop-shadow(0 0 14px rgba(232,180,90,0.9))');
  }
  function shake(g) {
    const tr = g.getAttribute('transform');
    g.setAttribute('transform', tr + ' rotate(3)');
    setTimeout(() => g.setAttribute('transform', tr), 200);
  }
  function showBars() {
    // 时长对比条
    const data = [['blink', 8, '不到 1 秒'], ['brush', 90, '3 分钟'], ['sleep', 620, '一整夜']];
    data.forEach((d, i) => {
      const y = 440 + i * 42;
      const lab = S('text', { x: 128, y: y + 20, 'text-anchor': 'end', 'font-size': 22, fill: '#dfe6ff' }, svg);
      lab.textContent = { blink: '眨眼睛', brush: '刷牙', sleep: '睡一晚' }[d[0]];
      const bar = S('rect', { x: 145, y, width: 0, height: 26, rx: 13, fill: ['#9fd8ff', '#e8c26a', '#c98fd9'][i] }, svg);
      let w = 0;
      onTick(dt => { if (w < d[1]) { w = Math.min(d[1], w + dt * 500); bar.setAttribute('width', String(w)); } });
      const val = S('text', { x: 160 + d[1], y: y + 20, 'font-size': 20, fill: '#aab6d4' }, svg);
      val.textContent = d[2];
    });
  }
  say('intro_l5', () => { say('l5_q1'); replayId = 'l5_q1'; });
}

/* ================================================================
   第 6 关 认识钟表 —— 转动时针
================================================================ */
function buildL6() {
  const svg = newScene(`
    <radialGradient id="faceG6" cx="42%" cy="36%" r="80%">
      <stop offset="0%" stop-color="#fffdf6"/><stop offset="85%" stop-color="#efe6d0"/><stop offset="100%" stop-color="#d8cdb2"/>
    </radialGradient>
    <linearGradient id="rimG6" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8a7346"/><stop offset="100%" stop-color="#4e3c1e"/>
    </linearGradient>
    <linearGradient id="bgG6" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#232f52"/><stop offset="100%" stop-color="#151d38"/>
    </linearGradient>
  `);
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'url(#bgG6)' }, svg);
  const CX = 500, CY = 320, R = 215;
  S('circle', { cx: CX, cy: CY, r: R + 18, fill: 'url(#rimG6)' }, svg);
  S('circle', { cx: CX, cy: CY, r: R, fill: 'url(#faceG6)' }, svg);
  // 刻度与数字
  for (let h = 1; h <= 12; h++) {
    const a = (h * 30 - 90) * Math.PI / 180;
    S('line', {
      x1: CX + Math.cos(a) * (R - 8), y1: CY + Math.sin(a) * (R - 8),
      x2: CX + Math.cos(a) * (R - 26), y2: CY + Math.sin(a) * (R - 26),
      stroke: '#5a4d33', 'stroke-width': 5, 'stroke-linecap': 'round'
    }, svg);
    const tx = S('text', {
      x: CX + Math.cos(a) * (R - 56), y: CY + Math.sin(a) * (R - 56) + 13,
      'text-anchor': 'middle', 'font-size': 38, 'font-weight': 'bold', fill: '#3a3122', id: 'num6_' + h
    }, svg);
    tx.textContent = String(h);
  }
  for (let m = 0; m < 60; m++) {
    if (m % 5 === 0) continue;
    const a = (m * 6 - 90) * Math.PI / 180;
    S('line', {
      x1: CX + Math.cos(a) * (R - 10), y1: CY + Math.sin(a) * (R - 10),
      x2: CX + Math.cos(a) * (R - 18), y2: CY + Math.sin(a) * (R - 18),
      stroke: '#8d8064', 'stroke-width': 2
    }, svg);
  }
  // 分针（固定 12）
  S('line', { x1: CX, y1: CY + 24, x2: CX, y2: CY - (R - 44), stroke: '#3a3122', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.85 }, svg);
  // 时针
  const hourHand = S('line', { x1: CX, y1: CY + 20, x2: CX, y2: CY - (R - 105), stroke: '#1f1a10', 'stroke-width': 14, 'stroke-linecap': 'round' }, svg);
  S('circle', { cx: CX, cy: CY, r: 12, fill: '#8a7346', stroke: '#3a3122', 'stroke-width': 3 }, svg);
  const hint = S('text', { x: 500, y: 66, 'text-anchor': 'middle', 'font-size': 30, fill: '#f2e6c8', 'font-weight': 'bold' }, svg);
  hint.textContent = '把时针转到 7 点（起床）';

  const goals = [
    { h: 7, label: '把时针转到 7 点（起床）', voice: 'l6_goal2', next: '把时针转到 12 点（午饭）' },
    { h: 12, label: '', voice: 'l6_goal3', next: '把时针转到 9 点（睡觉）' },
    { h: 9, label: '', voice: 'l6_done', next: '' }
  ];
  let gi = 0, hourAngle = 300; // 10点起始
  let finished = false, busyVoice = false;
  function highlight() {
    for (let h = 1; h <= 12; h++) {
      const el = document.getElementById('num6_' + h);
      const hh = goals[gi] ? goals[gi].h : -1;
      el.setAttribute('fill', h === hh ? '#c0392b' : '#3a3122');
      el.setAttribute('font-size', h === hh ? '48' : '38');
    }
  }
  function renderHand() { hourHand.setAttribute('transform', `rotate(${hourAngle} ${CX} ${CY})`); }
  renderHand(); highlight();

  const hit = S('circle', { cx: CX, cy: CY, r: R + 14, fill: 'rgba(255,255,255,0.01)' }, svg);
  makeDrag(hit, {
    move: ev => {
      if (finished || busyVoice) return;
      const p = svgPoint(svg, ev);
      let a = Math.atan2(p.y - CY, p.x - CX) * 180 / Math.PI + 90;
      hourAngle = (a + 360) % 360;
      renderHand();
    },
    up: () => {
      if (finished || busyVoice) return;
      // 吸附到最近的整点
      let h = Math.round(hourAngle / 30);
      hourAngle = (h * 30) % 360;
      if (h === 0) h = 12;
      renderHand();
      const goal = goals[gi];
      if (h === goal.h) {
        busyVoice = true;
        if (gi === goals.length - 1) {
          finished = true; hint.textContent = '';
          endLevel(goal.voice);
        } else {
          say(goal.voice, () => { busyVoice = false; });
          gi++;
          hint.textContent = goals[gi - 1].next;
          highlight();
        }
      }
    }
  });
  say('intro_l6');
}

/* ================================================================
   第 7 关 我的一天 —— 认四个时段的天空
================================================================ */
function buildL7() {
  const svg = newScene('');
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: '#101627' }, svg);

  function skyPanel(x, y, w, h, type, idSuffix) {
    const g = S('g', { transform: `translate(${x},${y})`, cursor: 'pointer' }, svg);
    const defs = S('defs', null, g);
    const grad = S('linearGradient', { id: 'pg' + idSuffix, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    const palettes = {
      morning: ['#7d90bd', '#f6c493'], noon: ['#3f8fe0', '#bfe3ff'],
      dusk: ['#4a3a68', '#ff8c4a'], night: ['#0a1030', '#25335c']
    };
    S('stop', { offset: '0%', 'stop-color': palettes[type][0] }, grad);
    S('stop', { offset: '100%', 'stop-color': palettes[type][1] }, grad);
    const clip = S('clipPath', { id: 'pc' + idSuffix }, defs);
    S('rect', { x: 0, y: 0, width: w, height: h, rx: 16 }, clip);
    const inner = S('g', { 'clip-path': `url(#pc${idSuffix})` }, g);
    S('rect', { x: 0, y: 0, width: w, height: h, fill: `url(#pg${idSuffix})` }, inner);
    if (type === 'morning') {
      S('circle', { cx: w * 0.28, cy: h * 0.78, r: 34, fill: '#ffe2a0', opacity: 0.95 }, inner);
      S('circle', { cx: w * 0.28, cy: h * 0.78, r: 50, fill: '#ffe2a0', opacity: 0.25 }, inner);
    } else if (type === 'noon') {
      S('circle', { cx: w * 0.5, cy: h * 0.22, r: 30, fill: '#fff6d8' }, inner);
      S('circle', { cx: w * 0.5, cy: h * 0.22, r: 46, fill: '#fff6d8', opacity: 0.3 }, inner);
      S('ellipse', { cx: w * 0.75, cy: h * 0.5, rx: 40, ry: 14, fill: '#ffffff', opacity: 0.8 }, inner);
    } else if (type === 'dusk') {
      S('circle', { cx: w * 0.6, cy: h * 0.85, r: 36, fill: '#ff9d4d' }, inner);
      S('ellipse', { cx: w * 0.4, cy: h * 0.4, rx: 55, ry: 10, fill: '#c05a7c', opacity: 0.6 }, inner);
      S('ellipse', { cx: w * 0.7, cy: h * 0.28, rx: 40, ry: 8, fill: '#d97a5a', opacity: 0.5 }, inner);
    } else {
      S('path', { d: `M ${w * 0.6} ${h * 0.3} a 26 26 0 1 0 20 -14 a 22 22 0 0 1 -20 14 z`, fill: '#f4f0dc', transform: `rotate(-14 ${w * 0.62} ${h * 0.3})` }, inner);
      for (let i = 0; i < 14; i++) {
        S('circle', { cx: (Math.sin(i * 8.3) * 0.5 + 0.5) * w, cy: (Math.sin(i * 3.7) * 0.5 + 0.5) * h, r: 1.6 + (i % 3), fill: '#e9edff', opacity: 0.85 }, inner);
      }
    }
    // 地面剪影
    S('path', { d: `M 0 ${h - 22} Q ${w * 0.3} ${h - 44} ${w * 0.6} ${h - 24} T ${w} ${h - 30} L ${w} ${h} L 0 ${h} Z`, fill: 'rgba(10,14,30,0.55)' }, inner);
    const frame = S('rect', { x: 0, y: 0, width: w, height: h, rx: 16, fill: 'none', stroke: '#8a744a', 'stroke-width': 3 }, g);
    return { g, frame };
  }

  const W = 330, H = 190, GX = 160, GY = 130, GAP = 24;
  const types = ['noon', 'morning', 'night', 'dusk']; // 打乱后的摆放
  const panels = {};
  types.forEach((tp, i) => {
    const x = GX + (i % 2) * (W + GAP), y = GY + Math.floor(i / 2) * (H + GAP);
    panels[tp] = skyPanel(x, y, W, H, tp, i);
  });
  const hint = S('text', { x: 500, y: 90, 'text-anchor': 'middle', 'font-size': 28, fill: '#f2e6c8', 'font-weight': 'bold' }, svg);
  hint.textContent = '听一听，点出对的天空';

  const seq = [
    { tp: 'morning', q: 'l7_q_morning' }, { tp: 'noon', q: 'l7_q_noon' },
    { tp: 'dusk', q: 'l7_q_dusk' }, { tp: 'night', q: 'l7_q_night' }
  ];
  let qi = 0;
  Object.keys(panels).forEach(tp => {
    panels[tp].g.addEventListener('pointerdown', () => {
      if (qi >= seq.length) return;
      if (tp === seq[qi].tp) {
        panels[tp].frame.setAttribute('stroke', '#e8b45a');
        panels[tp].frame.setAttribute('stroke-width', '6');
        panels[tp].frame.setAttribute('filter', 'drop-shadow(0 0 12px rgba(232,180,90,0.9))');
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
  say('intro_l7', () => { say(seq[0].q); replayId = seq[0].q; });
}

/* ================================================================
   第 8 关 一个星期 —— 按顺序点亮七天
================================================================ */
function buildL8() {
  const svg = newScene(`
    <linearGradient id="bgG8" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a2445"/><stop offset="100%" stop-color="#2b3a63"/>
    </linearGradient>
    <radialGradient id="orbOff8" cx="38%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#4a5578"/><stop offset="100%" stop-color="#28304e"/>
    </radialGradient>
    <radialGradient id="orbWk8" cx="38%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#bfe0ff"/><stop offset="100%" stop-color="#4a86c8"/>
    </radialGradient>
    <radialGradient id="orbWe8" cx="38%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#ffe4a8"/><stop offset="100%" stop-color="#dd9a3a"/>
    </radialGradient>
  `);
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'url(#bgG8)' }, svg);
  addStars(svg, 30, -150, 0, 1150, 200, 17);
  const hint = S('text', { x: 500, y: 90, 'text-anchor': 'middle', 'font-size': 28, fill: '#f2e6c8', 'font-weight': 'bold' }, svg);
  hint.textContent = '从星期一开始，按顺序点亮';

  const NAMES = ['一', '二', '三', '四', '五', '六', '日'];
  const orbs = [];
  let next = 0;
  for (let i = 0; i < 7; i++) {
    const x = 150 + i * 116;
    const y = 300 + Math.sin(i / 6 * Math.PI) * -70;
    const weekend = i >= 5;
    const g = S('g', { transform: `translate(${x},${y})`, cursor: 'pointer' }, svg);
    const body = S('circle', { cx: 0, cy: 0, r: 46, fill: 'url(#orbOff8)', stroke: '#151d38', 'stroke-width': 3 }, g);
    const t1 = S('text', { x: 0, y: -6, 'text-anchor': 'middle', 'font-size': 19, fill: '#8f9ab8' }, g);
    t1.textContent = '星期';
    const t2 = S('text', { x: 0, y: 26, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 'bold', fill: '#aab4cf' }, g);
    t2.textContent = NAMES[i];
    orbs.push({ g, body, t1, t2, weekend });
    g.addEventListener('pointerdown', () => {
      if (next >= 7) return;
      if (i === next) {
        body.setAttribute('fill', weekend ? 'url(#orbWe8)' : 'url(#orbWk8)');
        body.setAttribute('filter', 'drop-shadow(0 0 12px rgba(200,220,255,0.8))');
        t1.setAttribute('fill', '#1c2438'); t2.setAttribute('fill', '#1c2438');
        next++;
        if (next < 7) say('l8_d' + (i + 1));
        else {
          hint.textContent = '';
          say('l8_d7', () => {
            // 画出循环箭头
            S('path', { d: 'M 846 330 Q 920 460 500 480 Q 90 460 148 340', fill: 'none', stroke: '#c9b98a', 'stroke-width': 4, 'stroke-dasharray': '10 8', 'stroke-linecap': 'round' }, svg);
            S('path', { d: 'M 148 340 l -12 26 m 12 -26 l 26 12', stroke: '#c9b98a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, svg);
            endLevel('l8_done');
          });
        }
      } else {
        say('wrong_generic');
      }
    });
  }
  const lbl = S('text', { x: 500, y: 555, 'text-anchor': 'middle', 'font-size': 24, fill: '#aab6d4' }, svg);
  lbl.textContent = '蓝色是上幼儿园的日子 · 金色是休息的日子';
  say('intro_l8');
}

/* ================================================================
   第 9 关 四季 —— 地球绕太阳 + 大树变化
================================================================ */
function buildL9() {
  const svg = newScene(`
    <linearGradient id="skyG9" x1="0" y1="0" x2="0" y2="1">
      <stop id="sky9a" offset="0%" stop-color="#8fc0e8"/>
      <stop id="sky9b" offset="100%" stop-color="#d8ecf8"/>
    </linearGradient>
    <radialGradient id="sun9" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff6d8"/><stop offset="100%" stop-color="#ffcf5e"/>
    </radialGradient>
  `);
  const sky = S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'url(#skyG9)' }, svg);
  const ground = S('path', { d: 'M -200 470 Q 300 430 600 465 T 1200 460 L 1200 600 L -200 600 Z', fill: '#5f8c46' }, svg);

  // 大树
  const treeG = S('g', { transform: 'translate(420,0)' }, svg);
  S('path', { d: 'M 0 470 C -6 380 -10 330 -4 290 C -30 260 -46 230 -52 200 M -4 290 C 20 258 40 236 50 205 M -2 330 C -30 310 -50 296 -66 270 M -2 330 C 30 306 48 292 62 268', stroke: '#6e4a28', 'stroke-width': 0, fill: 'none' }, treeG);
  const trunk = S('path', { d: 'M -14 472 C -10 400 -12 340 -6 300 C -8 260 -6 240 -2 220 L 6 220 C 8 250 8 270 6 300 C 14 350 12 410 16 472 Z', fill: '#6e4a28' }, treeG);
  const branches = S('g', { stroke: '#6e4a28', 'stroke-width': 10, fill: 'none', 'stroke-linecap': 'round' }, treeG);
  branches.innerHTML = `
    <path d="M -4 300 C -34 272 -52 246 -60 210"/>
    <path d="M 2 280 C 28 252 44 230 54 196"/>
    <path d="M -6 340 C -36 322 -58 306 -74 282"/>
    <path d="M 4 340 C 34 318 56 302 70 276"/>
    <path d="M 0 240 C 0 220 2 204 4 188"/>`;
  const canopy = S('g', null, treeG);
  const CAN = [[-60, 200, 46], [54, 192, 44], [-74, 276, 40], [70, 270, 42], [4, 178, 52], [-20, 236, 48], [30, 230, 48], [0, 262, 50]];
  const canopyCircles = CAN.map(c => S('circle', { cx: c[0], cy: c[1], r: c[2], fill: '#4f8f3d' }, canopy));
  const blossomG = S('g', null, treeG); // 花/装饰层
  const snowCover = S('g', { opacity: 0 }, treeG);
  snowCover.innerHTML = `
    <path d="M -60 196 q 20 -12 40 0 q -20 10 -40 0 z" fill="#fff"/>
    <path d="M 34 188 q 20 -12 40 0 q -20 10 -40 0 z" fill="#fff"/>
    <path d="M -20 250 q 24 -12 48 0 q -24 10 -48 0 z" fill="#fff"/>`;

  // 右上：公转示意
  const orbitG = S('g', { transform: 'translate(770,120)' }, svg);
  S('ellipse', { cx: 0, cy: 0, rx: 120, ry: 62, fill: 'none', stroke: 'rgba(60,60,80,0.5)', 'stroke-width': 2, 'stroke-dasharray': '6 6' }, orbitG);
  S('circle', { cx: 0, cy: 0, r: 26, fill: 'url(#sun9)' }, orbitG);
  const earthDot = S('circle', { cx: -120, cy: 0, r: 12, fill: '#3f7fbf', stroke: '#bfe0ff', 'stroke-width': 2.5 }, orbitG);
  const orbitLbl = S('text', { x: 0, y: 108, 'text-anchor': 'middle', 'font-size': 20, fill: 'rgba(40,44,66,0.85)', 'font-weight': 'bold' }, orbitG);
  orbitLbl.textContent = '地球绕太阳跑一圈 = 一年';

  const seasonLbl = S('text', { x: 500, y: 80, 'text-anchor': 'middle', 'font-size': 44, 'font-weight': 'bold', fill: '#2c4a20', 'letter-spacing': 8 }, svg);

  // 前进按钮
  const btn = S('g', { transform: 'translate(830,478)', cursor: 'pointer' }, svg);
  S('circle', { cx: 0, cy: 0, r: 54, fill: '#e8b45a', stroke: '#9a6f1e', 'stroke-width': 4 }, btn);
  S('path', { d: 'M -12 -20 L 18 0 L -12 20 Z', fill: '#3a2703' }, btn);
  const btnLbl = S('text', { x: 0, y: 84, 'text-anchor': 'middle', 'font-size': 22, fill: '#2c3a22', 'font-weight': 'bold' }, btn);
  btnLbl.textContent = '下一季';

  const SEASONS = [
    { name: '春', sky: ['#9fcaea', '#e8f4d8'], grass: '#6da34e', can: '#7fb964', voice: 'l9_spring', angle: 180 },
    { name: '夏', sky: ['#4d9be0', '#c8e8ff'], grass: '#4f8f3d', can: '#2f6f28', voice: 'l9_summer', angle: 270 },
    { name: '秋', sky: ['#b8cade', '#f4e0c0'], grass: '#b08a4a', can: '#d9822b', voice: 'l9_autumn', angle: 0 },
    { name: '冬', sky: ['#aebfd4', '#e8eef4'], grass: '#dfe8ee', can: '#ffffff', voice: 'l9_winter', angle: 90 }
  ];
  let si = -1, busy = false, particles = [];
  const partG = S('g', null, svg);

  function setSeason(i, cb) {
    const s = SEASONS[i];
    document.getElementById('sky9a').setAttribute('stop-color', s.sky[0]);
    document.getElementById('sky9b').setAttribute('stop-color', s.sky[1]);
    ground.setAttribute('fill', s.grass);
    seasonLbl.textContent = s.name + '天';
    seasonLbl.setAttribute('fill', ['#3a6428', '#1d4d7a', '#8a5a1e', '#4a6a8a'][i]);
    earthDot.setAttribute('cx', String(Math.cos(s.angle * Math.PI / 180) * 120));
    earthDot.setAttribute('cy', String(Math.sin(s.angle * Math.PI / 180) * 62));
    blossomG.innerHTML = ''; partG.innerHTML = ''; particles = [];
    if (i === 3) { // 冬
      canopyCircles.forEach(c => c.setAttribute('opacity', '0'));
      snowCover.setAttribute('opacity', '1');
      for (let k = 0; k < 40; k++) particles.push(spawnPart('#ffffff', 2.5, 22));
    } else {
      canopyCircles.forEach(c => { c.setAttribute('opacity', '1'); c.setAttribute('fill', s.can); });
      snowCover.setAttribute('opacity', '0');
      if (i === 0) { // 春：花
        CAN.forEach((c, k) => {
          for (let j = 0; j < 3; j++) {
            S('circle', { cx: c[0] + Math.sin(k * 7 + j * 5) * c[2] * 0.6, cy: c[1] + Math.cos(k * 3 + j * 9) * c[2] * 0.6, r: 5, fill: '#f8c8d8', stroke: '#e89ab5', 'stroke-width': 1.5 }, blossomG);
          }
        });
      }
      if (i === 2) { // 秋：落叶
        for (let k = 0; k < 16; k++) particles.push(spawnPart('#d9822b', 4, 34));
      }
    }
    say(s.voice, cb);
  }
  function spawnPart(color, r, speed) {
    const el = S('circle', { r, fill: color, opacity: 0.9 }, partG);
    return { el, x: 100 + Math.random() * 800, y: -20 - Math.random() * 500, vy: speed + Math.random() * 26, vx: (Math.random() - 0.5) * 24, ph: Math.random() * 6 };
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
    busy = true;
    si++;
    if (si === 3) {
      btn.setAttribute('opacity', '0.35');
      setSeason(3, () => endLevel('l9_done'));
    } else {
      setSeason(si, () => { busy = false; });
    }
  });
  say('intro_l9', () => { si = 0; busy = true; setSeason(0, () => { busy = false; }); });
}

/* ================================================================
   第 10 关 时间的脚印 —— 成长时间条
================================================================ */
function buildL10() {
  const svg = newScene(`
    <linearGradient id="bgG10" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a4668"/><stop offset="100%" stop-color="#232c4a"/>
    </linearGradient>
    <linearGradient id="floorG10" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5c4a36"/><stop offset="100%" stop-color="#3e3022"/>
    </linearGradient>
  `);
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'url(#bgG10)' }, svg);
  S('rect', { x: -200, y: 440, width: 1400, height: 160, fill: 'url(#floorG10)' }, svg);
  // 窗
  S('rect', { x: 700, y: 90, width: 190, height: 230, rx: 10, fill: '#182448', stroke: '#8a744a', 'stroke-width': 6 }, svg);
  S('line', { x1: 795, y1: 90, x2: 795, y2: 320, stroke: '#8a744a', 'stroke-width': 5 }, svg);
  S('line', { x1: 700, y1: 205, x2: 890, y2: 205, stroke: '#8a744a', 'stroke-width': 5 }, svg);
  S('circle', { cx: 830, cy: 150, r: 20, fill: '#f4f0dc', opacity: 0.9 }, svg);

  const SIL = '#e8ddc4';
  const FIGS = [
    // 婴儿（爬）
    `<g fill="${SIL}"><circle cx="-38" cy="-34" r="26"/><ellipse cx="10" cy="-8" rx="42" ry="24"/>
      <rect x="-16" y="4" width="12" height="22" rx="6"/><rect x="28" y="4" width="12" height="22" rx="6"/></g>`,
    // 5 岁（扎辫子）
    `<g fill="${SIL}"><circle cx="0" cy="-118" r="26"/>
      <circle cx="-26" cy="-132" r="8"/><circle cx="26" cy="-132" r="8"/>
      <path d="M -18 -92 L 18 -92 L 26 -20 L -26 -20 Z"/>
      <rect x="-30" y="-88" width="10" height="46" rx="5" transform="rotate(14 -25 -65)"/>
      <rect x="20" y="-88" width="10" height="46" rx="5" transform="rotate(-14 25 -65)"/>
      <rect x="-18" y="-22" width="12" height="24" rx="5"/><rect x="6" y="-22" width="12" height="24" rx="5"/></g>`,
    // 大人
    `<g fill="${SIL}"><circle cx="0" cy="-208" r="27"/>
      <path d="M -24 -180 L 24 -180 L 30 -80 L -30 -80 Z"/>
      <rect x="-40" y="-176" width="12" height="76" rx="6" transform="rotate(8 -34 -138)"/>
      <rect x="28" y="-176" width="12" height="76" rx="6" transform="rotate(-8 34 -138)"/>
      <rect x="-22" y="-82" width="14" height="80" rx="6"/><rect x="8" y="-82" width="14" height="80" rx="6"/></g>`,
    // 老人（拄拐）
    `<g fill="${SIL}"><circle cx="6" cy="-176" r="25"/>
      <path d="M -14 -152 Q 12 -140 20 -120 L 26 -70 L -26 -70 Z"/>
      <rect x="-34" y="-140" width="11" height="60" rx="5" transform="rotate(20 -28 -110)"/>
      <rect x="18" y="-146" width="11" height="66" rx="5" transform="rotate(-16 24 -113)"/>
      <rect x="-20" y="-72" width="13" height="70" rx="6"/><rect x="8" y="-72" width="13" height="70" rx="6"/>
      <rect x="42" y="-130" width="7" height="130" rx="3.5" fill="#b09a6a"/></g>`
  ];
  const AGES = ['0 岁 · 小婴儿', '5 岁 · 现在的你', '30 岁 · 大人', '80 岁 · 老爷爷老奶奶'];
  const figG = S('g', { transform: 'translate(340,440)' }, svg);
  const ageLbl = S('text', { x: 340, y: 500, 'text-anchor': 'middle', 'font-size': 28, fill: '#f2e6c8', 'font-weight': 'bold' }, svg);
  // 旁边的树也一起长
  const treeSideG = S('g', { transform: 'translate(120,440)' }, svg);
  function drawTree(k) { // k 0..1
    treeSideG.innerHTML = '';
    const h = 30 + k * 200;
    S('rect', { x: -5 - k * 4, y: -h, width: 10 + k * 8, height: h, rx: 4, fill: '#6e4a28' }, treeSideG);
    S('circle', { cx: 0, cy: -h - 8, r: 14 + k * 52, fill: '#4f8f3d' }, treeSideG);
  }
  function showFig(i) {
    figG.innerHTML = FIGS[i];
    ageLbl.textContent = AGES[i];
  }

  // 时间条
  const TX = 150, TW = 700, TY = 555;
  S('rect', { x: TX, y: TY - 7, width: TW, height: 14, rx: 7, fill: '#141b30', stroke: '#4a5578', 'stroke-width': 2 }, svg);
  const fillBar = S('rect', { x: TX, y: TY - 7, width: 0, height: 14, rx: 7, fill: '#e8b45a' }, svg);
  [0, 1, 2, 3].forEach(i => {
    S('circle', { cx: TX + (i / 3) * TW, cy: TY, r: 5, fill: '#8f9ab8' }, svg);
  });
  const knob = S('circle', { cx: TX, cy: TY, r: 24, fill: '#ffe2a0', stroke: '#9a6f1e', 'stroke-width': 4 }, svg);
  const hint = S('text', { x: 500, y: 70, 'text-anchor': 'middle', 'font-size': 28, fill: '#f2e6c8', 'font-weight': 'bold' }, svg);
  hint.textContent = '拖动时间条，看看时间的脚印';

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
    drawTree(t);
    let z = t < 0.18 ? 0 : t < 0.45 ? 1 : t < 0.75 ? 2 : 3;
    if (z !== zone) {
      zone = z;
      showFig(z);
      visited.add(z);
      if (!finished) say(VOICES[z], () => {
        if (z === 3) oldHeard = true;
        maybeFinish();
      });
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
  say('intro_l10');
}

/* ================================================================
   第 11 关 时间不能倒流 —— 洒了的水 + 碎鸡蛋
================================================================ */
function buildL11() {
  const svg = newScene(`
    <linearGradient id="bgG11" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2c3350"/><stop offset="100%" stop-color="#1a2038"/>
    </linearGradient>
    <linearGradient id="tableG11" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9a6f42"/><stop offset="30%" stop-color="#7d5730"/><stop offset="100%" stop-color="#5c3f20"/>
    </linearGradient>
    <linearGradient id="waterG11" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9fd4f0" stop-opacity="0.85"/><stop offset="100%" stop-color="#5aa8d8" stop-opacity="0.7"/>
    </linearGradient>
  `);
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'url(#bgG11)' }, svg);
  S('rect', { x: -200, y: 380, width: 1400, height: 220, fill: 'url(#tableG11)' }, svg);
  for (let i = 0; i < 5; i++) {
    S('line', { x1: -200, y1: 420 + i * 38, x2: 1200, y2: 424 + i * 38, stroke: 'rgba(60,38,16,0.35)', 'stroke-width': 2.5 }, svg);
  }
  // 倒下的杯子
  const cupG = S('g', { transform: 'translate(400,372) rotate(-84)' }, svg);
  S('path', { d: 'M -30 0 L -24 -84 L 24 -84 L 30 0 Z', fill: 'rgba(210,235,250,0.35)', stroke: '#cfe3f5', 'stroke-width': 4 }, cupG);
  S('ellipse', { cx: 0, cy: -84, rx: 24, ry: 7, fill: 'none', stroke: '#cfe3f5', 'stroke-width': 3.5 }, cupG);
  // 水洼
  const puddle = S('path', { d: '', fill: 'url(#waterG11)' }, svg);
  let pud = 0; // 0..1
  function drawPuddle(k, dx, dy) {
    const w = 40 + k * 210, h = 8 + k * 16;
    const cx = 545 + (dx || 0), cy = 392 + (dy || 0);
    puddle.setAttribute('d', `M ${cx - w} ${cy} Q ${cx - w * 0.6} ${cy - h} ${cx - w * 0.1} ${cy - h * 0.6} Q ${cx + w * 0.35} ${cy - h * 1.2} ${cx + w * 0.7} ${cy - h * 0.3} Q ${cx + w} ${cy + h * 0.4} ${cx + w * 0.5} ${cy + h} Q ${cx - w * 0.5} ${cy + h * 1.3} ${cx - w} ${cy} Z`);
  }
  let spillT = 0;
  const spillTick = (dt) => { if (pud < 1) { pud = Math.min(1, pud + dt * 0.7); drawPuddle(pud); } };
  onTick(spillTick);

  const q = S('text', { x: 500, y: 90, 'text-anchor': 'middle', 'font-size': 30, fill: '#f2e6c8', 'font-weight': 'bold' }, svg);
  q.textContent = '洒出来的水，能自己飞回杯子里吗？';

  // 按钮
  function bigBtn(x, color, stroke, text) {
    const g = S('g', { transform: `translate(${x},510)`, cursor: 'pointer' }, svg);
    S('rect', { x: -110, y: -40, width: 220, height: 80, rx: 40, fill: color, stroke, 'stroke-width': 4 }, g);
    const t = S('text', { x: 0, y: 12, 'text-anchor': 'middle', 'font-size': 32, fill: '#fff', 'font-weight': 'bold' }, g);
    t.textContent = text;
    return g;
  }
  const btnYes = bigBtn(310, '#3d7fc1', '#1d4d7a', '能，回得去');
  const btnNo = bigBtn(690, '#c05a3c', '#7d3018', '不能，回不去');
  let answered = false;

  function eggPhase() {
    btnYes.setAttribute('opacity', '0.25'); btnNo.setAttribute('opacity', '0.25');
    q.textContent = '看，鸡蛋碎了，还能变回去吗？';
    const eggG = S('g', null, svg);
    const egg = S('ellipse', { cx: 720, cy: 120, rx: 30, ry: 38, fill: '#f6ead2', stroke: '#d8c4a0', 'stroke-width': 3 }, eggG);
    let vy = 0, y = 120, cracked = false;
    onTick(dt => {
      if (cracked) return;
      vy += dt * 900; y += vy * dt;
      if (y >= 350) {
        cracked = true;
        eggG.innerHTML = `
          <path d="M 690 372 Q 700 340 716 356 L 724 342 L 734 358 Q 752 344 750 372 Z" fill="#f6ead2" stroke="#d8c4a0" stroke-width="3"/>
          <ellipse cx="722" cy="382" rx="52" ry="12" fill="#f4e6c8"/>
          <circle cx="722" cy="376" r="16" fill="#f2b93c"/>`;
        say('l11_egg', () => endLevel('l11_done'));
      } else egg.setAttribute('cy', String(y));
    });
  }
  btnYes.addEventListener('pointerdown', () => {
    if (answered) return; answered = true;
    // 演示“试一试”：水珠往上跳又落回
    let k = 0;
    const drops = [];
    for (let i = 0; i < 8; i++) drops.push(S('circle', { cx: 480 + i * 18, cy: 388, r: 5, fill: '#9fd4f0' }, svg));
    let tt = 0;
    onTick(dt => {
      tt += dt;
      if (tt > 1.6) { drops.forEach(d => d.remove()); return; }
      drops.forEach((d, i) => {
        const ph = Math.min(1, tt / 1.4);
        const up = Math.sin(ph * Math.PI) * (36 + i * 4);
        d.setAttribute('cy', String(388 - up));
        d.setAttribute('opacity', String(1 - ph * 0.4));
      });
    });
    say('l11_yes_wrong', eggPhase);
  });
  btnNo.addEventListener('pointerdown', () => {
    if (answered) return; answered = true;
    say('l11_no_right', eggPhase);
  });
  say('intro_l11');
}

/* ================================================================
   第 12 关 时间是什么 —— 三颗星星的秘密
================================================================ */
function buildL12() {
  const svg = newScene(`
    <linearGradient id="bgG12" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#060a1a"/><stop offset="70%" stop-color="#0e1630"/><stop offset="100%" stop-color="#1c2748"/>
    </linearGradient>
    <radialGradient id="starBig12" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#fff8dd"/><stop offset="100%" stop-color="#e8b45a"/>
    </radialGradient>
    <linearGradient id="mw12" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8fa4e8" stop-opacity="0"/>
      <stop offset="50%" stop-color="#aebef2" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#8fa4e8" stop-opacity="0"/>
    </linearGradient>
  `);
  S('rect', { x: -200, y: 0, width: 1400, height: 600, fill: 'url(#bgG12)' }, svg);
  S('path', { d: 'M -200 420 Q 300 180 700 240 T 1250 60 L 1250 -50 L 900 -50 Q 400 120 -200 300 Z', fill: 'url(#mw12)' }, svg);
  addStars(svg, 90, -150, 0, 1150, 520, 21);
  // 地平线剪影
  S('path', { d: 'M -200 560 L 120 520 L 300 555 L 520 515 L 760 558 L 1000 525 L 1200 550 L 1200 600 L -200 600 Z', fill: '#04060f' }, svg);

  const hint = S('text', { x: 500, y: 572, 'text-anchor': 'middle', 'font-size': 26, fill: '#aab6d4' }, svg);
  hint.textContent = '点亮三颗大星星，听听时间的秘密';

  const POS = [[260, 200], [520, 110], [760, 250]];
  const LABELS = ['拦不住', '不回头', '在现在'];
  const VOICES = ['l12_s1', 'l12_s2', 'l12_s3'];
  const lit = [false, false, false];
  const centers = [];
  let busy = false;

  POS.forEach((p, i) => {
    const g = S('g', { transform: `translate(${p[0]},${p[1]})`, cursor: 'pointer' }, svg);
    const halo = S('circle', { cx: 0, cy: 0, r: 55, fill: 'url(#starBig12)', opacity: 0.12 }, g);
    const star = S('path', {
      d: 'M 0 -34 L 9 -11 L 34 -10 L 14 5 L 21 30 L 0 16 L -21 30 L -14 5 L -34 -10 L -9 -11 Z',
      fill: '#39415f', stroke: '#565f82', 'stroke-width': 2, 'stroke-linejoin': 'round'
    }, g);
    const lbl = S('text', { x: 0, y: 62, 'text-anchor': 'middle', 'font-size': 22, fill: '#6b7699' }, g);
    lbl.textContent = LABELS[i];
    centers.push(p);
    g.addEventListener('pointerdown', () => {
      if (lit[i] || busy) return;
      busy = true;
      lit[i] = true;
      star.setAttribute('fill', 'url(#starBig12)');
      star.setAttribute('stroke', '#ffe9b0');
      star.setAttribute('filter', 'drop-shadow(0 0 18px rgba(255,225,150,0.9))');
      halo.setAttribute('opacity', '0.4');
      lbl.setAttribute('fill', '#ffe9b0');
      say(VOICES[i], () => {
        busy = false;
        if (lit.every(Boolean)) {
          hint.textContent = '';
          // 连成星座
          for (let k = 0; k < 3; k++) {
            const a = centers[k], b = centers[(k + 1) % 3];
            const line = S('line', { x1: a[0], y1: a[1], x2: a[0], y2: a[1], stroke: 'rgba(255,233,176,0.6)', 'stroke-width': 2.5, 'stroke-dasharray': '4 6' }, svg);
            let pr = 0;
            onTick(dt => {
              if (pr < 1) {
                pr = Math.min(1, pr + dt * 0.8);
                line.setAttribute('x2', String(a[0] + (b[0] - a[0]) * pr));
                line.setAttribute('y2', String(a[1] + (b[1] - a[1]) * pr));
              }
            });
          }
          // 流星
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
  say('intro_l12');
}
