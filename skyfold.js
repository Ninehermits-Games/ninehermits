/* SKYFOLD — paper plane through pipes
   16:9 landscape. Speed ramp, coins, stars, floating obstacles. */

(() => {
  'use strict';

  const BASE_W = 960;
  const BASE_H = 540;
  const GROUND_H = 84;
  const PIPE_W = 74;

  const T = Object.assign({}, window.TWEAK_DEFAULTS || {});

  // ---------- Canvas ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const aspect = BASE_W / BASE_H;
    let w, h;
    if (vw / vh > aspect) {
      h = Math.min(vh - 8, 720);
      w = h * aspect;
    } else {
      w = Math.min(vw - 8, 1280);
      h = w / aspect;
    }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // Portrait overlay
  const portraitEl = document.getElementById('portrait-msg');
  function checkOrientation() {
    if (!portraitEl) return;
    const isPortrait = window.innerHeight > window.innerWidth;
    portraitEl.style.display = isPortrait ? 'flex' : 'none';
  }
  window.addEventListener('resize', checkOrientation);
  checkOrientation();

  // ---------- Audio ----------
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function blip(freq, dur, type = 'square', vol = 0.08, slide = 0) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol = 0.12) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const bufSize = Math.floor(audioCtx.sampleRate * dur);
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const g = audioCtx.createGain(); g.gain.value = vol;
    src.connect(g).connect(audioCtx.destination);
    src.start(t0);
  }
  const sfx = {
    flap:  () => blip(620, 0.08, 'square', 0.05, -180),
    score: () => { blip(880, 0.06, 'square', 0.06); setTimeout(() => blip(1320, 0.09, 'square', 0.06), 50); },
    coin:  () => blip(1100, 0.07, 'triangle', 0.07, -200),
    silver:() => blip(300, 0.12, 'sawtooth', 0.06, -100),
    star:  () => { [880, 1108, 1320].forEach((f,i) => setTimeout(() => blip(f, 0.08, 'square', 0.07), i*40)); },
    crash: () => { noise(0.25, 0.14); blip(180, 0.35, 'sawtooth', 0.08, -120); },
    pop:   () => blip(1200, 0.06, 'triangle', 0.05, -300),
    power: () => { blip(520, 0.06, 'triangle', 0.06); setTimeout(() => blip(780, 0.06, 'triangle', 0.06), 40); setTimeout(() => blip(1040, 0.1, 'triangle', 0.06), 80); },
    medal: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'square', 0.06), i * 90)); },
    speedup: () => { blip(660, 0.05, 'square', 0.05); setTimeout(() => blip(880, 0.08, 'square', 0.05), 60); }
  };

  // ---------- Palettes ----------
  const PALETTES = [
    { skyTop: '#4ec0ff', skyBot: '#b9e8ff', cloud: '#ffffff', cloudShade: '#d9ecf7',
      hillBack: '#8fd67e', hillBackShade: '#6ab05a', hillFront: '#5fbb5a', hillFrontShade: '#3d8a3f',
      bldgFar: '#c8d7e8', bldgFarShade: '#9bb2cc', bldgMid: '#e1b08a', bldgMidShade: '#b3845f',
      windowOn: '#ffef9a', windowOff: '#6d8aa8', sun: '#fff4b0', sunGlow: '#ffe066',
      ground: '#ded895', groundShade: '#9e9c50', groundDirt: '#b9964d', groundDirtShade: '#7a6028',
      pipe: '#5ed44d', pipeHi: '#a9ee86', pipeLo: '#2f8b2c', pipeEdge: '#1d5a21', pipeCap: '#5ed44d', star: null },
    { skyTop: '#ff8a5b', skyBot: '#ffd199', cloud: '#fff0d6', cloudShade: '#f0b28a',
      hillBack: '#a78aa8', hillBackShade: '#735a78', hillFront: '#7a4f7a', hillFrontShade: '#4a2d52',
      bldgFar: '#b995a5', bldgFarShade: '#7f5c72', bldgMid: '#8d5a52', bldgMidShade: '#5a2f2e',
      windowOn: '#ffd98a', windowOff: '#50303c', sun: '#ffe58a', sunGlow: '#ff7a5c',
      ground: '#c89670', groundShade: '#6b4330', groundDirt: '#9c6942', groundDirtShade: '#4e2a1a',
      pipe: '#5ed44d', pipeHi: '#9de87f', pipeLo: '#2f8b2c', pipeEdge: '#1d5a21', pipeCap: '#5ed44d', star: null },
    { skyTop: '#3a3a7a', skyBot: '#7a5aa0', cloud: '#c9b8e0', cloudShade: '#8a75ad',
      hillBack: '#4a4776', hillBackShade: '#2a2850', hillFront: '#2e2b52', hillFrontShade: '#171530',
      bldgFar: '#4a4566', bldgFarShade: '#2d2a48', bldgMid: '#3a2d4a', bldgMidShade: '#1f172e',
      windowOn: '#ffe066', windowOff: '#201a34', sun: '#ffcda6', sunGlow: '#b37aa8',
      ground: '#362e5c', groundShade: '#1b1636', groundDirt: '#4a3b6a', groundDirtShade: '#231a36',
      pipe: '#49bf44', pipeHi: '#82d268', pipeLo: '#2a7a2a', pipeEdge: '#173e1c', pipeCap: '#49bf44', star: '#ffffff' },
    { skyTop: '#0c0d2a', skyBot: '#1b2052', cloud: '#4a5480', cloudShade: '#2e3558',
      hillBack: '#1a1f3d', hillBackShade: '#0d1128', hillFront: '#0e1228', hillFrontShade: '#050814',
      bldgFar: '#1d2340', bldgFarShade: '#10132a', bldgMid: '#131731', bldgMidShade: '#080a1a',
      windowOn: '#ffe066', windowOff: '#0f1230', sun: '#e8e6ff', sunGlow: '#5c64a0',
      ground: '#1a1a3a', groundShade: '#080818', groundDirt: '#262649', groundDirtShade: '#0f0f22',
      pipe: '#3aa042', pipeHi: '#5ec15a', pipeLo: '#1f5c22', pipeEdge: '#0c2a10', pipeCap: '#3aa042', star: '#ffffff' }
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join(''); }
  function lerpHex(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
  function paletteAt(progress) {
    const p = (progress % 1 + 1) % 1;
    const seg = p * PALETTES.length;
    const i = Math.floor(seg) % PALETTES.length;
    const j = (i + 1) % PALETTES.length;
    const t = seg - Math.floor(seg);
    const A = PALETTES[i], B = PALETTES[j];
    const out = {};
    for (const k in A) {
      if (A[k] === null || B[k] === null) out[k] = A[k] || B[k];
      else out[k] = lerpHex(A[k], B[k], t);
    }
    out._i = i; out._t = t;
    return out;
  }

  // ---------- Skins ----------
  const SKINS = [
    { name: 'WHITE', body: '#ffffff', fold: '#d9d9d9', shadow: '#6e6e6e', tip: '#ff4d6d' },
    { name: 'EMBER', body: '#ff8a3d', fold: '#d9591a', shadow: '#6a2a0a', tip: '#ffd866' },
    { name: 'AQUA',  body: '#5adfcf', fold: '#27938a', shadow: '#0f4e4a', tip: '#ffd866' },
    { name: 'GOLD',  body: '#ffd866', fold: '#b88410', shadow: '#5a3c05', tip: '#ffffff' }
  ];
  const SKIN_UNLOCKS = [0, 10, 25, 50];

  // ---------- State ----------
  const STATE = { MENU: 0, PLAY: 1, DEAD: 2 };
  const game = {
    state: STATE.MENU,
    t: 0, playTime: 0, frame: 0,
    score: 0,
    best: parseInt(localStorage.getItem('skyfold.best') || '0', 10) || 0,
    unlocked: parseInt(localStorage.getItem('skyfold.unlocked') || '0', 10) || 0,
    bird: { x: 220, y: BASE_H / 2, vy: 0, angle: 0, r: 11 },
    pipes: [],
    collectibles: [],
    floaters: [],
    clouds: [],
    hillsBack: [], hillsFront: [],
    bldgsFar: [], bldgsMid: [],
    particles: [], stars: [],
    scrollX: 0,
    speedBonus: 0,
    nextSpeedTick: 10,
    shieldT: 0, slowmoT: 0,
    flashT: 0, shakeT: 0,
    scorePopups: [],
    medalEarned: -1,
    deadCooldown: 0,
    coinSpawnTimer: 0,
    floatSpawnTimer: 0
  };

  function seedWorld() {
    game.clouds = [];
    for (let i = 0; i < 10; i++) {
      game.clouds.push({ x: Math.random() * BASE_W * 2, y: 20 + Math.random() * (BASE_H * 0.42),
        s: 1 + Math.floor(Math.random() * 3), v: 0.15 + Math.random() * 0.2 });
    }
    game.hillsBack = [];
    let x = -40;
    while (x < BASE_W * 2) { const w = 140 + Math.floor(Math.random() * 120), h = 70 + Math.floor(Math.random() * 50); game.hillsBack.push({ x, w, h }); x += w - 20; }
    game.hillsFront = [];
    x = -60;
    while (x < BASE_W * 2) { const w = 180 + Math.floor(Math.random() * 140), h = 50 + Math.floor(Math.random() * 40); game.hillsFront.push({ x, w, h }); x += w - 30; }
    game.bldgsFar = [];
    x = 0;
    while (x < BASE_W * 2) { const w = 30 + Math.floor(Math.random() * 26), h = 60 + Math.floor(Math.random() * 90); game.bldgsFar.push({ x, w, h }); x += w + 2; }
    game.bldgsMid = [];
    x = 0;
    while (x < BASE_W * 2) { const w = 46 + Math.floor(Math.random() * 36), h = 80 + Math.floor(Math.random() * 120), win = Math.random() > 0.3; game.bldgsMid.push({ x, w, h, win }); x += w + 3; }
    game.stars = [];
    for (let i = 0; i < 70; i++) game.stars.push({ x: Math.random() * BASE_W, y: Math.random() * (BASE_H * 0.6), b: Math.random() });
  }
  seedWorld();

  function resetRun() {
    game.bird.x = 220; game.bird.y = BASE_H / 2; game.bird.vy = 0; game.bird.angle = 0;
    game.pipes = []; game.collectibles = []; game.floaters = [];
    game.particles = []; game.scorePopups = [];
    game.score = 0;
    game.shieldT = 0; game.slowmoT = 0;
    game.scrollX = 0; game.t = 0; game.playTime = 0;
    game.flashT = 0; game.shakeT = 0;
    game.medalEarned = -1;
    game.speedBonus = 0; game.nextSpeedTick = 10;
    game.coinSpawnTimer = 0; game.floatSpawnTimer = 0;
  }

  function spawnPipe() {
    const gap = T.gapSize;
    const margin = 70;
    const top = margin + Math.random() * (BASE_H - GROUND_H - gap - margin * 2);
    let power = null;
    const pu = Math.random();
    const canSpawn = game.score >= 5 && pu < 0.18 && game.slowmoT <= 0 && game.shieldT <= 0;
    if (canSpawn) {
      power = { type: pu < 0.09 ? 'shield' : 'slowmo', x: 0, y: top + gap / 2, got: false, bob: Math.random() * Math.PI * 2 };
    }
    game.pipes.push({ x: BASE_W + 20, top, gap, passed: false, power });
  }

  function maybeSpawnPipe() {
    if (game.pipes.length === 0) { spawnPipe(); return; }
    const last = game.pipes[game.pipes.length - 1];
    if (BASE_W - last.x >= T.pipeSpacing) spawnPipe();
  }

  // Coin/star types: gold_coin (+5), silver_coin (-3), gold_star (+10)
  function spawnCollectible() {
    const types = ['gold_coin', 'gold_coin', 'silver_coin', 'gold_star'];
    const type = types[Math.floor(Math.random() * types.length)];
    const minY = 60, maxY = BASE_H - GROUND_H - 60;
    game.collectibles.push({
      type, x: BASE_W + 30,
      y: minY + Math.random() * (maxY - minY),
      bob: Math.random() * Math.PI * 2,
      r: 14, got: false,
      spinAngle: 0
    });
  }

  // Floating obstacles: saw, spike_ball, bouncer
  function spawnFloater() {
    const types = ['saw', 'spike_ball', 'bouncer'];
    const type = types[Math.floor(Math.random() * types.length)];
    const minY = 80, maxY = BASE_H - GROUND_H - 80;
    const y = minY + Math.random() * (maxY - minY);
    const vy = (Math.random() - 0.5) * 1.2;
    game.floaters.push({
      type, x: BASE_W + 40, y,
      vy, baseY: y,
      angle: 0,
      r: type === 'saw' ? 20 : type === 'spike_ball' ? 18 : 16,
      bob: Math.random() * Math.PI * 2,
      bobAmp: 25 + Math.random() * 30,
      bobSpeed: 1.2 + Math.random() * 0.8
    });
  }

  function effectiveSpeed() {
    return T.scrollSpeed + game.speedBonus;
  }

  function flap() {
    if (game.state === STATE.MENU) { game.state = STATE.PLAY; resetRun(); }
    if (game.state === STATE.PLAY) {
      game.bird.vy = -T.flapStrength;
      sfx.flap();
      for (let i = 0; i < 5; i++) {
        game.particles.push({ x: game.bird.x - 8, y: game.bird.y + 6,
          vx: -1 - Math.random() * 1.2, vy: -0.5 + Math.random() * 1.5,
          life: 0.6, max: 0.6, c: '#ffffff', s: 2 });
      }
    }
    if (game.state === STATE.DEAD && game.deadCooldown <= 0) game.state = STATE.MENU;
  }

  function addScore(pts, x, y) {
    game.score = Math.max(0, game.score + pts);
    const color = pts > 0 ? (pts >= 10 ? '#ffd866' : '#7fff7f') : '#ff4d6d';
    const label = (pts > 0 ? '+' : '') + pts;
    game.scorePopups.push({ x, y, label, color, life: 0.9, max: 0.9, vy: -1.5 });
    if (pts > 0) sfx.coin();
    else sfx.silver();
  }

  function die(cause) {
    if (game.state !== STATE.PLAY) return;
    if (game.shieldT > 0) {
      game.shieldT = 0; game.bird.vy = -4; sfx.pop(); game.flashT = 0.2;
      for (let i = 0; i < 18; i++) {
        game.particles.push({ x: game.bird.x, y: game.bird.y,
          vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
          life: 0.5, max: 0.5, c: '#6bd968', s: 2 });
      }
      return;
    }
    game.state = STATE.DEAD; game.deadCooldown = 1.0; game.shakeT = 0.4; sfx.crash();
    for (let i = 0; i < 28; i++) {
      game.particles.push({ x: game.bird.x, y: game.bird.y,
        vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 4 - 1,
        life: 1.2, max: 1.2,
        c: ['#ffffff', '#ffd866', '#ff4d6d'][Math.floor(Math.random() * 3)], s: 2 });
    }
    if (game.score > game.best) { game.best = game.score; localStorage.setItem('skyfold.best', game.best); }
    for (let i = 0; i < SKIN_UNLOCKS.length; i++) {
      if (game.score >= SKIN_UNLOCKS[i] && game.unlocked < i) { game.unlocked = i; localStorage.setItem('skyfold.unlocked', game.unlocked); }
    }
    if (game.score >= 50) game.medalEarned = 3;
    else if (game.score >= 25) game.medalEarned = 2;
    else if (game.score >= 10) game.medalEarned = 1;
    else if (game.score >= 5) game.medalEarned = 0;
    if (game.medalEarned >= 1) setTimeout(() => sfx.medal(), 350);
  }

  // ---------- Input ----------
  function onFlap(e) { ensureAudio(); if (e) e.preventDefault(); flap(); }
  canvas.addEventListener('mousedown', onFlap);
  canvas.addEventListener('touchstart', onFlap, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') onFlap(e);
    if (e.code === 'KeyT') toggleTweaks();
  });

  // ---------- Loop ----------
  let lastT = performance.now();
  function loop(now) {
    const dtRaw = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const slow = game.slowmoT > 0 ? 0.45 : 1;
    const dt = dtRaw * slow;
    game.t += dtRaw;
    game.frame++;

    const dayProgress = (game.score / 80) + game.t * 0.002;
    game.palette = paletteAt(dayProgress);

    if (game.state === STATE.PLAY) {
      game.playTime += dtRaw;

      // Speed ramp: +0.2 every 10 seconds
      if (game.playTime >= game.nextSpeedTick) {
        game.speedBonus += 0.2;
        game.nextSpeedTick += 10;
        sfx.speedup();
        for (let i = 0; i < 10; i++) {
          game.particles.push({ x: game.bird.x + 20 + Math.random() * 60, y: BASE_H / 2 + (Math.random() - 0.5) * 100,
            vx: 3 + Math.random() * 3, vy: (Math.random() - 0.5) * 2,
            life: 0.4, max: 0.4, c: '#ffd866', s: 3 });
        }
      }

      const g = T.gravity;
      game.bird.vy += g;
      if (game.bird.vy > 12) game.bird.vy = 12;
      game.bird.y += game.bird.vy;
      game.bird.angle = Math.max(-0.5, Math.min(1.2, game.bird.vy * 0.07));

      const spd = effectiveSpeed() * slow;
      game.scrollX += spd;

      // Pipes
      maybeSpawnPipe();
      for (const p of game.pipes) {
        p.x -= spd;
        if (!p.passed && p.x + PIPE_W < game.bird.x) {
          p.passed = true; game.score++; sfx.score();
          for (let i = 0; i < 6; i++) {
            game.particles.push({ x: game.bird.x + 10, y: game.bird.y - 10,
              vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 1.5,
              life: 0.6, max: 0.6, c: '#ffd866', s: 2 });
          }
        }
        if (p.power && !p.power.got) {
          p.power.x = p.x + PIPE_W / 2;
          p.power.bob += dt * 3;
          const pxp = p.power.x, pyp = p.power.y + Math.sin(p.power.bob) * 4;
          const dx = pxp - game.bird.x, dy = pyp - game.bird.y;
          if (dx * dx + dy * dy < 24 * 24) {
            p.power.got = true;
            if (p.power.type === 'shield') game.shieldT = 6; else game.slowmoT = 4;
            sfx.power();
            for (let i = 0; i < 16; i++) {
              game.particles.push({ x: pxp, y: pyp,
                vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                life: 0.7, max: 0.7, c: p.power.type === 'shield' ? '#6bd968' : '#9ed3ff', s: 2 });
            }
          }
        }
      }
      game.pipes = game.pipes.filter(p => p.x + PIPE_W > -20);

      // Collectibles
      game.coinSpawnTimer -= dtRaw;
      if (game.coinSpawnTimer <= 0) {
        spawnCollectible();
        game.coinSpawnTimer = 1.8 + Math.random() * 1.4;
      }
      for (const c of game.collectibles) {
        c.x -= spd;
        c.bob += dt * 2.5;
        c.spinAngle += dt * (c.type === 'gold_star' ? 2.5 : 3.5);
        const cy = c.y + Math.sin(c.bob) * 8;
        if (!c.got) {
          const dx = c.x - game.bird.x, dy = cy - game.bird.y;
          if (dx * dx + dy * dy < (c.r + game.bird.r) * (c.r + game.bird.r)) {
            c.got = true;
            const pts = c.type === 'gold_coin' ? 5 : c.type === 'silver_coin' ? -3 : 10;
            addScore(pts, c.x, cy);
            if (pts > 0) {
              const col = c.type === 'gold_star' ? '#ffd866' : '#ffe87a';
              for (let i = 0; i < 12; i++) {
                game.particles.push({ x: c.x, y: cy,
                  vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                  life: 0.6, max: 0.6, c: col, s: 2 });
              }
            } else {
              game.flashT = 0.1;
              for (let i = 0; i < 8; i++) {
                game.particles.push({ x: c.x, y: cy,
                  vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
                  life: 0.4, max: 0.4, c: '#ff4d6d', s: 2 });
              }
            }
          }
        }
      }
      game.collectibles = game.collectibles.filter(c => c.x > -30 && !c.got);

      // Floaters (obstacles)
      game.floatSpawnTimer -= dtRaw;
      if (game.floatSpawnTimer <= 0 && game.score >= 3) {
        spawnFloater();
        game.floatSpawnTimer = 3.5 + Math.random() * 2.5;
      }
      for (const f of game.floaters) {
        f.x -= spd * 0.9;
        f.angle += dt * (f.type === 'saw' ? 4 : 1.5);
        f.bob += dt * f.bobSpeed;
        f.y = f.baseY + Math.sin(f.bob) * f.bobAmp;
        if (f.y < 60) { f.y = 60; f.baseY = 60 + f.bobAmp; }
        if (f.y > BASE_H - GROUND_H - 60) { f.y = BASE_H - GROUND_H - 60; f.baseY = BASE_H - GROUND_H - 60 - f.bobAmp; }
        const dx = f.x - game.bird.x, dy = f.y - game.bird.y;
        if (dx * dx + dy * dy < (f.r + game.bird.r - 4) * (f.r + game.bird.r - 4)) {
          die('floater');
        }
      }
      game.floaters = game.floaters.filter(f => f.x > -50);

      // Bird vs world
      const b = game.bird;
      if (b.y + b.r >= BASE_H - GROUND_H) { b.y = BASE_H - GROUND_H - b.r; die('ground'); }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = 1; }
      for (const p of game.pipes) {
        if (b.x + b.r > p.x + 4 && b.x - b.r < p.x + PIPE_W - 4) {
          if (b.y - b.r < p.top || b.y + b.r > p.top + p.gap) { die('pipe'); break; }
        }
      }
      if (game.shieldT > 0) game.shieldT -= dtRaw;
      if (game.slowmoT > 0) game.slowmoT -= dtRaw;
    }
    else if (game.state === STATE.MENU) {
      game.bird.y = BASE_H / 2 + Math.sin(game.t * 3) * 10;
      game.bird.angle = Math.sin(game.t * 3) * 0.15;
      game.scrollX += 1.2;
    }
    else if (game.state === STATE.DEAD) {
      game.bird.vy += 0.6;
      if (game.bird.vy > 12) game.bird.vy = 12;
      game.bird.y += game.bird.vy;
      if (game.bird.y + game.bird.r > BASE_H - GROUND_H) { game.bird.y = BASE_H - GROUND_H - game.bird.r; game.bird.vy = 0; }
      if (game.deadCooldown > 0) game.deadCooldown -= dtRaw;
    }

    // Score popups
    for (const sp of game.scorePopups) { sp.y += sp.vy; sp.life -= dtRaw; }
    game.scorePopups = game.scorePopups.filter(sp => sp.life > 0);

    // Parallax
    const sBase = (game.state === STATE.PLAY ? effectiveSpeed() * (game.slowmoT > 0 ? 0.45 : 1) : (game.state === STATE.MENU ? 1.2 : 0));
    function shiftRecycle(arr, amt) {
      for (const b of arr) b.x -= amt;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].x + arr[i].w < -20) {
          let maxRight = -Infinity;
          for (const b of arr) maxRight = Math.max(maxRight, b.x + b.w);
          arr[i].x = maxRight + 2;
        }
      }
    }
    shiftRecycle(game.bldgsFar, sBase * 0.15);
    shiftRecycle(game.hillsBack, sBase * 0.25);
    shiftRecycle(game.bldgsMid, sBase * 0.4);
    shiftRecycle(game.hillsFront, sBase * 0.55);

    for (const c of game.clouds) {
      c.x -= c.v * (game.state === STATE.PLAY ? effectiveSpeed() : 1) * (game.slowmoT > 0 ? 0.45 : 1);
      if (c.x < -80) { c.x = BASE_W + Math.random() * 200; c.y = 20 + Math.random() * (BASE_H * 0.42); c.s = 1 + Math.floor(Math.random() * 3); c.v = 0.15 + Math.random() * 0.2; }
    }

    for (const p of game.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= dtRaw; }
    game.particles = game.particles.filter(p => p.life > 0);

    if (game.flashT > 0) game.flashT -= dtRaw;
    if (game.shakeT > 0) game.shakeT -= dtRaw;

    draw();
    requestAnimationFrame(loop);
  }

  // ---------- Draw helpers ----------
  function pxr(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

  function drawSky(pal) {
    const bands = 12;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      ctx.fillStyle = lerpHex(pal.skyTop, pal.skyBot, t);
      ctx.fillRect(0, Math.floor(i * BASE_H / bands), BASE_W, Math.ceil(BASE_H / bands) + 1);
    }
    const nightAmt = (pal._i === 3 ? 1 : pal._i === 2 ? pal._t : 0);
    if (nightAmt > 0.05) {
      for (const s of game.stars) {
        const tw = 0.5 + 0.5 * Math.sin(game.t * 2 + s.b * 10);
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, nightAmt * (0.4 + 0.6 * tw))})`;
        ctx.fillRect(s.x | 0, s.y | 0, 2, 2);
      }
    }
    const sx = BASE_W - 110, sy = 90 + Math.sin(game.t * 0.2) * 3;
    ctx.fillStyle = pal.sunGlow;
    for (let r = 34; r >= 26; r -= 2) { ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.sun;
    const r = 22;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) ctx.fillRect((sx + x) | 0, (sy + y) | 0, 1, 1);
    if (nightAmt > 0.5) {
      ctx.fillStyle = pal.sunGlow;
      ctx.fillRect(sx - 6, sy - 8, 5, 5); ctx.fillRect(sx + 4, sy + 3, 4, 4); ctx.fillRect(sx - 10, sy + 5, 4, 4);
    }
  }

  function drawCloud(c, pal) {
    const s = c.s, x = c.x | 0, y = c.y | 0, w = 26 + s * 16, h = 10 + s * 5;
    ctx.fillStyle = pal.cloudShade; ctx.fillRect(x, y + h, w, 5);
    ctx.fillStyle = pal.cloud;
    ctx.fillRect(x + 5, y, w - 10, h); ctx.fillRect(x, y + 5, w, h - 10); ctx.fillRect(x + 10, y - 5, w - 24, 5);
  }

  function drawHillBack(h, pal) {
    const yBase = BASE_H - GROUND_H, cx = h.x + h.w / 2;
    for (let dx = -h.w / 2; dx <= h.w / 2; dx += 4) {
      const t = dx / (h.w / 2), hh = h.h * Math.sqrt(Math.max(0, 1 - t * t));
      pxr(cx + dx, yBase - hh, 4, hh, pal.hillBack);
    }
    ctx.fillStyle = pal.hillBackShade; ctx.fillRect(h.x, yBase - 4, h.w, 4);
  }

  function drawHillFront(h, pal) {
    const yBase = BASE_H - GROUND_H, cx = h.x + h.w / 2;
    for (let dx = -h.w / 2; dx <= h.w / 2; dx += 4) {
      const t = dx / (h.w / 2), hh = h.h * Math.sqrt(Math.max(0, 1 - t * t));
      pxr(cx + dx, yBase - hh, 4, hh, pal.hillFront);
    }
    ctx.fillStyle = pal.hillFrontShade;
    ctx.fillRect(h.x, yBase - 4, h.w, 4);
    for (let bx = h.x + 20; bx < h.x + h.w - 20; bx += 50) {
      const by = yBase - 6 - (((bx * 3) & 3));
      ctx.fillRect(bx, by - 6, 12, 6); ctx.fillRect(bx + 3, by - 10, 6, 4);
    }
  }

  function drawBuildingFar(b, pal) {
    const y = BASE_H - GROUND_H - b.h;
    pxr(b.x, y, b.w, b.h, pal.bldgFar); pxr(b.x + b.w - 2, y, 2, b.h, pal.bldgFarShade);
    if ((b.x | 0) % 3 === 0) pxr(b.x + b.w / 2, y - 6, 2, 6, pal.bldgFarShade);
  }

  function drawBuildingMid(b, pal) {
    const y = BASE_H - GROUND_H - b.h;
    pxr(b.x, y, b.w, b.h, pal.bldgMid);
    pxr(b.x + b.w - 3, y, 3, b.h, pal.bldgMidShade); pxr(b.x, y, 3, b.h, pal.bldgMidShade);
    if (b.win) {
      for (let wy = y + 10; wy < BASE_H - GROUND_H - 10; wy += 10) {
        for (let wx = b.x + 5; wx < b.x + b.w - 7; wx += 8) {
          const on = ((wx + wy + (b.x | 0)) * 13) % 7 < 2;
          ctx.fillStyle = on ? pal.windowOn : pal.windowOff; ctx.fillRect(wx, wy, 3, 4);
        }
      }
    }
    pxr(b.x + 2, y - 3, b.w - 4, 3, pal.bldgMidShade);
  }

  function drawPipe(p, pal) {
    const capH = 26, bodyX = p.x;
    const topBodyH = p.top - capH;
    if (topBodyH > 0) {
      pxr(bodyX + 4, 0, PIPE_W - 8, topBodyH, pal.pipe);
      pxr(bodyX + 8, 0, 6, topBodyH, pal.pipeHi); pxr(bodyX + 16, 0, 2, topBodyH, pal.pipe);
      pxr(bodyX + PIPE_W - 14, 0, 4, topBodyH, pal.pipeLo);
      pxr(bodyX + 4, 0, 2, topBodyH, pal.pipeEdge); pxr(bodyX + PIPE_W - 6, 0, 2, topBodyH, pal.pipeEdge);
    }
    const capY = p.top - capH;
    pxr(bodyX, capY, PIPE_W, capH, pal.pipeCap);
    pxr(bodyX + 4, capY + 3, 8, capH - 6, pal.pipeHi); pxr(bodyX + PIPE_W - 10, capY + 3, 4, capH - 6, pal.pipeLo);
    pxr(bodyX, capY, PIPE_W, 3, pal.pipeEdge); pxr(bodyX, capY + capH - 3, PIPE_W, 3, pal.pipeEdge);
    pxr(bodyX, capY, 3, capH, pal.pipeEdge); pxr(bodyX + PIPE_W - 3, capY, 3, capH, pal.pipeEdge);

    const bY = p.top + p.gap, bottomBodyH = BASE_H - GROUND_H - bY - capH;
    pxr(bodyX, bY, PIPE_W, capH, pal.pipeCap);
    pxr(bodyX + 4, bY + 3, 8, capH - 6, pal.pipeHi); pxr(bodyX + PIPE_W - 10, bY + 3, 4, capH - 6, pal.pipeLo);
    pxr(bodyX, bY, PIPE_W, 3, pal.pipeEdge); pxr(bodyX, bY + capH - 3, PIPE_W, 3, pal.pipeEdge);
    pxr(bodyX, bY, 3, capH, pal.pipeEdge); pxr(bodyX + PIPE_W - 3, bY, 3, capH, pal.pipeEdge);
    if (bottomBodyH > 0) {
      const byStart = bY + capH;
      pxr(bodyX + 4, byStart, PIPE_W - 8, bottomBodyH, pal.pipe);
      pxr(bodyX + 8, byStart, 6, bottomBodyH, pal.pipeHi); pxr(bodyX + 16, byStart, 2, bottomBodyH, pal.pipe);
      pxr(bodyX + PIPE_W - 14, byStart, 4, bottomBodyH, pal.pipeLo);
      pxr(bodyX + 4, byStart, 2, bottomBodyH, pal.pipeEdge); pxr(bodyX + PIPE_W - 6, byStart, 2, bottomBodyH, pal.pipeEdge);
    }
    if (p.power && !p.power.got) {
      const x = p.power.x, y = p.power.y + Math.sin(p.power.bob) * 4;
      drawPowerup(p.power.type, x, y);
    }
  }

  function drawPowerup(type, x, y) {
    const glow = type === 'shield' ? '#6bd968' : '#9ed3ff';
    for (let r = 18; r >= 14; r--) { ctx.globalAlpha = (r === 14) ? 0.3 : 0.14; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0e1a'; ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillStyle = glow; ctx.fillRect(x - 8, y - 8, 16, 16);
    ctx.fillStyle = '#0b0e1a';
    if (type === 'shield') {
      ctx.fillRect(x - 3, y - 6, 6, 2); ctx.fillRect(x - 5, y - 4, 10, 2);
      ctx.fillRect(x - 5, y - 2, 10, 2); ctx.fillRect(x - 4, y, 8, 2); ctx.fillRect(x - 2, y + 2, 4, 2);
    } else {
      ctx.fillRect(x - 5, y - 5, 10, 1); ctx.fillRect(x - 5, y + 4, 10, 1);
      ctx.fillRect(x - 4, y - 4, 8, 1); ctx.fillRect(x - 3, y - 3, 6, 1); ctx.fillRect(x - 2, y - 2, 4, 1);
      ctx.fillRect(x - 1, y - 1, 2, 2); ctx.fillRect(x - 2, y + 1, 4, 1);
      ctx.fillRect(x - 3, y + 2, 6, 1); ctx.fillRect(x - 4, y + 3, 8, 1);
    }
  }

  function drawCollectible(c) {
    const cy = c.y + Math.sin(c.bob) * 8;
    ctx.save();
    ctx.translate(c.x | 0, cy | 0);

    if (c.type === 'gold_coin') {
      // Spinning gold coin
      const scaleX = Math.abs(Math.cos(c.spinAngle));
      ctx.scale(scaleX, 1);
      // glow
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffd866';
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // coin body
      ctx.fillStyle = '#c8880a'; ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = '#ffd866'; ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#ffe87a'; ctx.fillRect(-6, -8, 4, 4);
      ctx.fillStyle = '#b87800'; ctx.fillRect(4, 2, 4, 6);
      // G label
      ctx.fillStyle = '#7a4800'; ctx.fillRect(-2, -3, 5, 1); ctx.fillRect(-3, -2, 2, 5); ctx.fillRect(-3, 2, 7, 1); ctx.fillRect(1, 0, 2, 2);
    } else if (c.type === 'silver_coin') {
      // Spinning silver coin with warning
      const scaleX = Math.abs(Math.cos(c.spinAngle));
      ctx.scale(scaleX, 1);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#666'; ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = '#c0c0c0'; ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#e0e0e0'; ctx.fillRect(-6, -8, 4, 4);
      ctx.fillStyle = '#888'; ctx.fillRect(4, 2, 4, 6);
      // minus symbol
      ctx.fillStyle = '#ff4d6d'; ctx.fillRect(-4, -1, 8, 2);
    } else {
      // Gold star
      ctx.rotate(c.spinAngle);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffd866';
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      drawPixelStar(0, 0, 14, '#ffd866', '#b87800');
    }
    ctx.restore();
  }

  function drawPixelStar(cx, cy, r, col, dark) {
    // 5-pointed pixel star
    ctx.fillStyle = col;
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
      const ai = a + 2 * Math.PI / 5;
      pts.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]);
      pts.push([Math.round(cx + r * 0.4 * Math.cos(ai)), Math.round(cy + r * 0.4 * Math.sin(ai))]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
  }

  function drawFloater(f) {
    ctx.save();
    ctx.translate(f.x | 0, f.y | 0);
    ctx.rotate(f.angle);

    if (f.type === 'saw') {
      // Spinning saw blade — red/dark
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#ff4d6d';
      ctx.beginPath(); ctx.arc(0, 0, f.r + 6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // teeth
      ctx.fillStyle = '#cc2244';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const tx = Math.cos(a) * (f.r + 4), ty = Math.sin(a) * (f.r + 4);
        ctx.fillRect(tx - 3, ty - 3, 6, 6);
      }
      // body
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(0, 0, f.r - 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a0010'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      // cross blades
      ctx.fillStyle = '#cc2244';
      ctx.fillRect(-f.r, -3, f.r * 2, 6); ctx.fillRect(-3, -f.r, 6, f.r * 2);

    } else if (f.type === 'spike_ball') {
      // Spiky ball
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff8800';
      ctx.beginPath(); ctx.arc(0, 0, f.r + 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff6600';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const tx = Math.cos(a), ty = Math.sin(a);
        ctx.fillRect((tx * f.r) - 3, (ty * f.r) - 3, 6, 14);
      }
      ctx.fillStyle = '#cc3300'; ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(0, 0, f.r - 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cc3300'; ctx.beginPath(); ctx.arc(-3, -3, 4, 0, Math.PI * 2); ctx.fill();

    } else {
      // Bouncer — electric blue ball
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#44aaff';
      ctx.beginPath(); ctx.arc(0, 0, f.r + 6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0044aa'; ctx.beginPath(); ctx.arc(0, 0, f.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#44aaff'; ctx.beginPath(); ctx.arc(0, 0, f.r - 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#99ddff'; ctx.fillRect(-4, -f.r + 5, 4, 4);
      // electric zap lines
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-2, 0); ctx.lineTo(-6, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(2, 0); ctx.lineTo(6, 4); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    ctx.restore();
  }

  function drawGround(pal) {
    const y = BASE_H - GROUND_H;
    pxr(0, y, BASE_W, 14, pal.ground); pxr(0, y, BASE_W, 3, pal.groundShade);
    const off = (game.scrollX * 1.5) % 24;
    ctx.fillStyle = pal.groundShade;
    for (let x = -24; x < BASE_W + 24; x += 24) { ctx.fillRect((x - off) | 0, y + 4, 6, 2); ctx.fillRect((x - off + 12) | 0, y + 7, 4, 2); }
    pxr(0, y + 14, BASE_W, GROUND_H - 14, pal.groundDirt);
    ctx.fillStyle = pal.groundDirtShade;
    const off2 = (game.scrollX * 2) % 32;
    for (let x = -32; x < BASE_W + 32; x += 32) { ctx.fillRect((x - off2) | 0, y + 20, 16, 3); ctx.fillRect((x - off2 + 8) | 0, y + 36, 20, 3); ctx.fillRect((x - off2) | 0, y + 54, 14, 3); }
    pxr(0, BASE_H - 6, BASE_W, 6, pal.groundDirtShade);
  }

  function drawBird() {
    const skinIdx = Math.min(T.skin | 0, game.unlocked), s = SKINS[skinIdx], b = game.bird;
    ctx.save(); ctx.translate(b.x | 0, b.y | 0); ctx.rotate(b.angle);
    if (game.shieldT > 0) {
      const pulse = 0.6 + 0.4 * Math.sin(game.t * 10);
      ctx.globalAlpha = 0.35 * (game.shieldT < 1 ? game.shieldT : 1);
      ctx.fillStyle = '#6bd968'; ctx.beginPath(); ctx.arc(0, 0, 20 + pulse * 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const body = s.body, fold = s.fold, shade = s.shadow, tip = s.tip;
    ctx.fillStyle = shade; ctx.fillRect(-12, 4, 22, 4); ctx.fillRect(-10, 6, 20, 2);
    ctx.fillStyle = body;
    ctx.fillRect(-12, -6, 2, 2); ctx.fillRect(-12, -4, 4, 2); ctx.fillRect(-12, -2, 6, 2);
    ctx.fillRect(-12, 0, 16, 2); ctx.fillRect(-12, 2, 20, 2); ctx.fillRect(-12, 4, 16, 2);
    ctx.fillRect(-4, -4, 10, 9); ctx.fillRect(8, 1, 5, 2); ctx.fillRect(11, 2, 3, 2);
    ctx.fillStyle = fold;
    ctx.fillRect(-10, 2, 18, 2); ctx.fillRect(-4, 4, 12, 2); ctx.fillRect(4, 3, 5, 1); ctx.fillRect(-12, -2, 2, 4);
    ctx.fillStyle = tip; ctx.fillRect(13, 2, 2, 2);
    ctx.fillStyle = shade; ctx.fillRect(-12, 6, 14, 1); ctx.fillRect(-12, -7, 2, 1);
    ctx.restore();
  }

  function drawParticles() {
    for (const p of game.particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x | 0, p.y | 0, p.s, p.s); }
    ctx.globalAlpha = 1;
  }

  function drawText(text, x, y, size = 16, color = '#ffffff', shadow = '#000000', align = 'center') {
    ctx.font = `${size}px "Press Start 2P", monospace`;
    ctx.textAlign = align; ctx.textBaseline = 'top';
    ctx.fillStyle = shadow; ctx.fillText(text, x + 3, y + 3);
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  function drawScorePopups() {
    for (const sp of game.scorePopups) {
      ctx.globalAlpha = Math.max(0, sp.life / sp.max);
      drawText(sp.label, sp.x, sp.y, 16, sp.color, '#000');
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD(pal) {
    if (game.state === STATE.PLAY) {
      drawText(String(game.score), BASE_W / 2, 28, 44, '#ffffff', '#2a2a2a');
      // Speed level indicator
      if (game.speedBonus > 0) {
        const lvl = Math.round(game.speedBonus / 0.2);
        drawText('SPD x' + (1 + lvl), BASE_W / 2, 80, 10, '#ffd866', '#000');
      }
      let bx = 14, by = 14;
      if (game.shieldT > 0) { drawPowerup('shield', bx + 14, by + 14); drawText(Math.ceil(game.shieldT) + 'S', bx + 32, by + 8, 12, '#6bd968', '#000', 'left'); by += 36; }
      if (game.slowmoT > 0) { drawPowerup('slowmo', bx + 14, by + 14); drawText(Math.ceil(game.slowmoT) + 'S', bx + 32, by + 8, 12, '#9ed3ff', '#000', 'left'); }

      // Legend bottom-right
      drawText('🪙+5  ⚪-3  ⭐+10', BASE_W - 20, BASE_H - GROUND_H - 24, 9, '#ffffffcc', '#000', 'right');
    }
    if (game.state === STATE.MENU) {
      const pulse = 0.5 + 0.5 * Math.sin(game.t * 3);
      drawText('S K Y F O L D', BASE_W / 2, 80, 36, '#ffffff', '#1c1c1c');
      drawText('a paper plane adventure', BASE_W / 2, 134, 12, '#ffd866', '#5a3a10');
      ctx.globalAlpha = 0.55 + 0.45 * pulse;
      drawText('CLICK  /  SPACE  /  UP', BASE_W / 2, BASE_H - 200, 16, '#ffffff', '#000');
      ctx.globalAlpha = 1;
      drawText('TO FLAP', BASE_W / 2, BASE_H - 172, 16, '#ffffff', '#000');
      if (game.best > 0) drawText('BEST  ' + game.best, BASE_W / 2, BASE_H - 132, 14, '#ffd866', '#000');
      drawText('PRESS T FOR TWEAKS', BASE_W / 2, BASE_H - 104, 9, '#ffffffaa', '#000');
      // coin legend
      drawText('GOLD COIN +5   SILVER COIN -3   GOLD STAR +10', BASE_W / 2, BASE_H - 76, 8, '#ffd866aa', '#000');
    }
    if (game.state === STATE.DEAD) {
      const pw = 400, ph = 310;
      const pxp = BASE_W / 2 - pw / 2, pyp = BASE_H / 2 - ph / 2 - 20;
      ctx.fillStyle = '#0b0e1a'; ctx.fillRect(pxp, pyp, pw, ph);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pxp, pyp, pw, 4); ctx.fillRect(pxp, pyp + ph - 4, pw, 4);
      ctx.fillRect(pxp, pyp, 4, ph); ctx.fillRect(pxp + pw - 4, pyp, 4, ph);
      drawText('GAME OVER', BASE_W / 2, pyp + 20, 22, '#ff4d6d', '#000');
      drawText('SCORE', BASE_W / 2 - 90, pyp + 80, 11, '#ffd866', '#000');
      drawText(String(game.score), BASE_W / 2 - 90, pyp + 104, 28, '#ffffff', '#000');
      drawText('BEST', BASE_W / 2 + 90, pyp + 80, 11, '#9ed3ff', '#000');
      drawText(String(game.best), BASE_W / 2 + 90, pyp + 104, 28, '#ffffff', '#000');
      const medals = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'], medalColors = ['#c07a3c', '#cfd4de', '#ffd866', '#b8e6ff'];
      if (game.medalEarned >= 0) {
        const mx = BASE_W / 2, my = pyp + 200, c = medalColors[game.medalEarned];
        ctx.fillStyle = '#000'; ctx.fillRect(mx - 20, my - 20, 40, 40);
        ctx.fillStyle = c; ctx.fillRect(mx - 18, my - 18, 36, 36);
        ctx.fillStyle = '#ffffff99'; ctx.fillRect(mx - 14, my - 14, 8, 8);
        ctx.fillStyle = '#00000055'; ctx.fillRect(mx + 4, my + 4, 12, 12);
        drawText(medals[game.medalEarned], BASE_W / 2, pyp + 234, 10, c, '#000');
      } else {
        drawText('NO MEDAL — TRY AGAIN', BASE_W / 2, pyp + 194, 10, '#888', '#000');
      }
      if (game.deadCooldown <= 0) {
        const pulse = Math.floor(game.t * 3) % 2 === 0;
        if (pulse) drawText('TAP  TO  CONTINUE', BASE_W / 2, pyp + ph - 36, 11, '#ffffff', '#000');
      }
    }
    drawScorePopups();
  }

  function draw() {
    const pal = game.palette;
    let sx = 0, sy = 0;
    if (game.shakeT > 0) { sx = (Math.random() - 0.5) * 8 * game.shakeT; sy = (Math.random() - 0.5) * 8 * game.shakeT; }
    ctx.save(); ctx.translate(sx, sy);
    drawSky(pal);
    for (const b of game.bldgsFar) drawBuildingFar(b, pal);
    for (const c of game.clouds) if (c.s < 2) drawCloud(c, pal);
    for (const h of game.hillsBack) drawHillBack(h, pal);
    for (const b of game.bldgsMid) drawBuildingMid(b, pal);
    for (const h of game.hillsFront) drawHillFront(h, pal);
    for (const c of game.clouds) if (c.s >= 2) drawCloud(c, pal);
    for (const p of game.pipes) drawPipe(p, pal);
    for (const c of game.collectibles) drawCollectible(c);
    for (const f of game.floaters) drawFloater(f);
    drawGround(pal);
    drawBird();
    drawParticles();
    if (game.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, game.flashT * 3)})`; ctx.fillRect(0, 0, BASE_W, BASE_H); }
    const night = (pal._i === 3 ? 1 : pal._i === 2 ? pal._t : 0);
    if (night > 0.1) {
      const grd = ctx.createRadialGradient(BASE_W / 2, BASE_H / 2, 150, BASE_W / 2, BASE_H / 2, 600);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, `rgba(0,0,0,${0.4 * night})`);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, BASE_W, BASE_H);
    }
    ctx.restore();
    drawHUD(pal);
  }

  // ---------- Tweaks UI ----------
  const tweaksEl = document.getElementById('tweaks');
  const inputs = { gravity: document.getElementById('t-gravity'), flap: document.getElementById('t-flap'), speed: document.getElementById('t-speed'), gap: document.getElementById('t-gap'), space: document.getElementById('t-space'), skin: document.getElementById('t-skin') };
  const labels = { gravity: document.getElementById('v-gravity'), flap: document.getElementById('v-flap'), speed: document.getElementById('v-speed'), gap: document.getElementById('v-gap'), space: document.getElementById('v-space'), skin: document.getElementById('v-skin') };

  function syncInputs() {
    inputs.gravity.value = T.gravity; inputs.flap.value = T.flapStrength; inputs.speed.value = T.scrollSpeed;
    inputs.gap.value = T.gapSize; inputs.space.value = T.pipeSpacing; inputs.skin.value = T.skin;
    labels.gravity.textContent = (+T.gravity).toFixed(2); labels.flap.textContent = (+T.flapStrength).toFixed(1);
    labels.speed.textContent = (+T.scrollSpeed).toFixed(1); labels.gap.textContent = (T.gapSize | 0) + 'px';
    labels.space.textContent = (T.pipeSpacing | 0) + 'px';
    const sIdx = Math.min(T.skin | 0, game.unlocked);
    labels.skin.textContent = SKINS[sIdx].name + (T.skin > game.unlocked ? ' L' : '');
  }

  function persist(edits) { try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*'); } catch (e) {} }
  inputs.gravity.addEventListener('input', () => { T.gravity = +inputs.gravity.value; syncInputs(); persist({ gravity: T.gravity }); });
  inputs.flap.addEventListener('input', () => { T.flapStrength = +inputs.flap.value; syncInputs(); persist({ flapStrength: T.flapStrength }); });
  inputs.speed.addEventListener('input', () => { T.scrollSpeed = +inputs.speed.value; syncInputs(); persist({ scrollSpeed: T.scrollSpeed }); });
  inputs.gap.addEventListener('input', () => { T.gapSize = +inputs.gap.value; syncInputs(); persist({ gapSize: T.gapSize }); });
  inputs.space.addEventListener('input', () => { T.pipeSpacing = +inputs.space.value; syncInputs(); persist({ pipeSpacing: T.pipeSpacing }); });
  inputs.skin.addEventListener('input', () => { T.skin = +inputs.skin.value; syncInputs(); persist({ skin: T.skin }); });
  document.getElementById('btn-reset').addEventListener('click', () => {
    Object.assign(T, { gravity: 0.42, flapStrength: 7.6, scrollSpeed: 3.5, gapSize: 170, pipeSpacing: 260, skin: 0 });
    syncInputs(); persist({ gravity: 0.42, flapStrength: 7.6, scrollSpeed: 3.5, gapSize: 170, pipeSpacing: 260, skin: 0 });
  });

  let editOn = false;
  function setEdit(on) { editOn = on; tweaksEl.classList.toggle('on', on); if (on) syncInputs(); }
  function toggleTweaks() { setEdit(!editOn); }
  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d.type === '__activate_edit_mode') setEdit(true);
    if (d.type === '__deactivate_edit_mode') setEdit(false);
  });
  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
  syncInputs();

  requestAnimationFrame((t) => { lastT = t; loop(t); });
})();
