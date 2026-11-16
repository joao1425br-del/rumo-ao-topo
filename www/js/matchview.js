// Visualização 2D da partida: reproduz o resultado já simulado (placar e lances saem de 'r').
// Mini personagens com a camisa do clube (listras, faixas, metades), replay em câmera lenta de cada gol.
// A movimentação é visual; gols, cartões e substituições seguem os minutos reais dos lances.
import { SKIN, HAIR, EYES } from './avatar.js';
import { SFX } from './sfx.js';
const BASE = [[.04, .5], [.2, .38], [.2, .62], [.24, .12], [.24, .88], [.36, .5], [.5, .3], [.5, .7], [.7, .15], [.7, .85], [.76, .5]]; // mesma ordem de SLOTS
const MS = 140; // ms reais por minuto de jogo (a 1x, a partida dura ~13 s)
const GK = { h: { color: '#ffd166', color2: '#14104a', pat: 'solid' }, a: { color: '#3ddc97', color2: '#14104a', pat: 'solid' } };
const INK = '#14104a';
const hash = (n) => { let x = Math.imul(n + 1, 2654435761) >>> 0; x ^= x >>> 15; return x >>> 0; };
const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };

function sprite(ctx, x, y, r, kit, lk, me) {
  const bw = r * 1.9, bh = r * 1.5, bx = x - bw / 2, by = y + r * .7;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, by + bh + r * .35, bw * .55, r * .28, 0, 0, 7); ctx.fill();
  ctx.fillStyle = kit.color2; ctx.fillRect(bx + bw * .14, by + bh * .75, bw * .72, bh * .42);
  ctx.save(); rrect(ctx, bx, by, bw, bh * .9, r * .4); ctx.clip();
  ctx.fillStyle = kit.color; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = kit.color2;
  if (kit.pat === 'stripes') { for (const k of [.2, .6]) ctx.fillRect(bx + bw * k, by, bw * .2, bh); }
  else if (kit.pat === 'hoops') { for (const k of [.1, .4, .7]) ctx.fillRect(bx, by + bh * k, bw, bh * .15); }
  else if (kit.pat === 'half') ctx.fillRect(x, by, bw / 2, bh);
  ctx.restore();
  ctx.lineWidth = 1.6; ctx.strokeStyle = INK; rrect(ctx, bx, by, bw, bh * .9, r * .4); ctx.stroke();
  ctx.fillStyle = SKIN[lk.skin]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = HAIR[lk.hair]; ctx.beginPath(); ctx.arc(x, y - r * .05, r * 1.06, Math.PI, 0);
  ctx.lineTo(x + r, y + r * .12); ctx.lineTo(x + r * .5, y - r * .2); ctx.lineTo(x, y + r * .18); ctx.lineTo(x - r * .5, y - r * .2); ctx.lineTo(x - r, y + r * .12); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const dx of [-.38, .38]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + r * dx, y + r * .22, r * .27, r * .33, 0, 0, 7); ctx.fill();
    ctx.fillStyle = EYES[lk.eye]; ctx.beginPath(); ctx.ellipse(x + r * dx, y + r * .26, r * .17, r * .24, 0, 0, 7); ctx.fill();
  }
  if (me) { ctx.lineWidth = 3; ctx.strokeStyle = '#c6ff00'; ctx.shadowColor = '#c6ff00'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y + r * .8, r * 1.9, 0, 7); ctx.stroke(); ctx.shadowBlur = 0; }
}

export function startMatchView(cv, r, H, A, u, cb) {
  const ctx = cv.getContext && cv.getContext('2d');
  if (!ctx) return null;
  const W = cv.clientWidth || 360, Hh = Math.round(W / 1.6);
  const dpr = (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1;
  cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); ctx.scale(dpr, dpr);
  const mx = W * .03, my = Hh * .11, fw = W - 2 * mx, fh = Hh - 2 * my;
  const P = (x, y) => [mx + x * fw, my + y * fh];
  let ev = r.events, goals = ev.filter(e => e.type === 'goal');
  const gkey = (g) => `${g.min}${g.side}${g.scorer}`;
  const text = (e) => e.type === 'goal' ? `⚽ ${e.min}' ${e.scorer}` : e.type === 'moment' ? `🎯 ${e.min}' ${e.text}` : e.type === 'sub' ? `🔁 ${e.min}' Entra ${e.in}` : e.type === 'yellow' ? `🟨 ${e.min}' ${e.player}` : `🟥 ${e.min}' ${e.player}`;
  let t = 0, speed = 1, last = null, raf = 0, stopped = false, ended = false, phase = 0, replay = null, skipping = false, paused = false, momOn = true;
  SFX.init(); SFX.whistle(1); SFX.crowdStart();
  const rp = new Set(), ball = { x: .5, y: .5, tx: .5, ty: .5 }, trail = [];

  function pitch() {
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#0c8a47' : '#12a85a'; ctx.fillRect(mx + i * fw / 10, my, fw / 10 + 1, fh); }
    const lg = ctx.createRadialGradient(mx + fw / 2, my + fh / 2, fh * .1, mx + fw / 2, my + fh / 2, fw * .62); lg.addColorStop(0, 'rgba(255,255,255,.14)'); lg.addColorStop(1, 'rgba(0,0,0,.38)'); ctx.fillStyle = lg; ctx.fillRect(mx, my, fw, fh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.shadowColor = '#c6ff00'; ctx.shadowBlur = 12;
    ctx.strokeRect(mx, my, fw, fh);
    ctx.beginPath(); ctx.moveTo(mx + fw / 2, my); ctx.lineTo(mx + fw / 2, my + fh); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx + fw / 2, my + fh / 2, fh * .16, 0, 7); ctx.stroke();
    for (const s of [0, 1]) {
      const bx = s ? mx + fw - fw * .16 : mx, gx = s ? mx + fw - fw * .06 : mx;
      ctx.strokeRect(bx, my + fh * .25, fw * .16, fh * .5);
      ctx.strokeRect(gx, my + fh * .38, fw * .06, fh * .24);
    }
    ctx.shadowBlur = 0;
  }
  const crowdArt = (vt, goal) => {
    const hot = goal && vt >= goal.min ? 1 : 0;
    const bgG = ctx.createLinearGradient(0, 0, 0, Hh); bgG.addColorStop(0, '#2a0f7a'); bgG.addColorStop(.5, '#07031a'); bgG.addColorStop(1, '#2a0f7a'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, Hh);
    for (const top of [1, 0]) for (let i = 0; i < 64; i++) for (let j = 0; j < 3; j++) {
      const h = hash(i * 7 + j * 131 + top * 17), x = (i + .5) * W / 64, y = (top ? 0 : my + fh) + (j + .7) * my / 3.4 - hot * Math.abs(Math.sin(vt * 10 + h % 7)) * 3;
      ctx.fillStyle = h % 10 < 6 ? H.color : h % 10 < 8 ? A.color : '#f4f1ff'; ctx.fillRect(x, y, 3.2, 3.2);
    }
  };
  const netArt = (vt, goal) => {
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; const rip = goal && vt >= goal.min ? Math.sin(vt * 40) * 2 : 0;
    for (const s of [0, 1]) {
      const gx = s ? mx + fw - fw * .06 : mx, gy = my + fh * .38, gw = fw * .06, gh = fh * .24;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(gx + gw * i / 4, gy); ctx.lineTo(gx + gw * i / 4 + rip, gy + gh); ctx.stroke(); }
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(gx, gy + gh * i / 6); ctx.lineTo(gx + gw, gy + gh * i / 6 + rip); ctx.stroke(); }
    }
  };
  const camera = (vt, goal) => {
    if (replay) { const k = Math.min(1, (replay.rt - (replay.g.min - 1.6)) / 1.4), z = 1 + .55 * k, gx = W * (replay.g.side === 'h' ? .82 : .18); ctx.translate(gx, Hh / 2); ctx.scale(z, z); ctx.translate(-gx, -Hh / 2); }
    if (goal && vt >= goal.min && vt - goal.min < .6) ctx.translate((Math.random() - .5) * 6, (Math.random() - .5) * 6);
  };
  let fxG = null;
  const redsOf = () => ev.filter(e => e.type === 'red' && !e.mine).map(e => [e.side, 1 + hash(e.min * 3) % 10, e.min]);
  let reds = redsOf();
  function frame(now) {
    if (stopped) return;
    if (last == null) last = now;
    let rd = Math.min(.1, (now - last) / 1000) * speed; last = now;
    if (paused) rd = 0; // lance decisivo: o relógio fica parado até você escolher
    let vt;
    if (replay) {
      rd *= .45; replay.rt += rd * 1000 / MS; vt = replay.rt;
      if (replay.rt >= replay.g.min + .9) { replay = null; phase = 0; vt = t; }
    } else {
      t = Math.min(90, t + rd * 1000 / MS); vt = t;
      const pm = momOn && !skipping && !paused && (r.moments || []).find(m => m.auto && t >= m.min - 1.2);
      if (pm) { t = Math.max(0, pm.min - 1.2); vt = t; paused = true; if (cb.onMoment) cb.onMoment(pm); }
      if (!skipping && !paused) {
        const g = goals.find(x => !rp.has(gkey(x)) && t >= Math.min(90, x.min + 1.1));
        if (g) { rp.add(gkey(g)); replay = { g, rt: g.min - 1.6 }; vt = replay.rt; Object.assign(ball, { x: .5, y: .5, tx: .5, ty: .5 }); trail.length = 0; phase = 0; }
      }
    }
    const goal = goals.find(g => vt >= g.min - 1 && vt <= g.min + 1);
    phase -= rd;
    if (goal) {
      phase = 0;
      ball.tx = vt < goal.min ? (goal.side === 'h' ? .96 : .04) : (goal.side === 'h' ? 1.01 : -.01); ball.ty = .5;
    } else if (phase <= 0) {
      phase = .9;
      const h = Math.random() * 100 < r.poss.h;
      ball.tx = h ? .35 + Math.random() * .5 : .15 + Math.random() * .5; ball.ty = .15 + Math.random() * .7;
    }
    const k = 1 - Math.exp(-rd * 4);
    ball.x += (ball.tx - ball.x) * k; ball.y += (ball.ty - ball.y) * k;

    ctx.clearRect(0, 0, W, Hh); ctx.save(); camera(vt, goal); crowdArt(vt, goal); pitch(); netArt(vt, goal);
    const rad = Math.max(6, W * .019), list = [];
    for (const s of ['h', 'a']) for (let i = 0; i < 11; i++) {
      if ((u && u.off != null && s === u.side && i === u.slot && vt >= u.off) || reds.some(([rs, ri, rm]) => rs === s && ri === i && vt >= rm && !(u && s === u.side && i === u.slot))) continue; // expulso sai de campo
      let [bx, by] = BASE[i]; if (s === 'a') { bx = 1 - bx; by = 1 - by; }
      const pull = i === 0 ? .03 : .16, ph = i * 1.7 + (s === 'a' ? 3 : 0);
      const [px, py] = P(bx + (ball.x - bx) * pull + Math.sin(vt * .9 + ph) * .012, by + (ball.y - by) * pull + Math.cos(vt * .8 + ph) * .012);
      const me = !!u && u.side === s && u.slot === i && t >= u.entry && t < u.exit;
      const kit = i === 0 ? GK[s] : (s === 'h' ? H : A);
      const lk = me && u.look ? { skin: u.look.skin ?? 1, hair: u.look.hair ?? 0, eye: u.look.eye ?? 0 }
        : { skin: hash(i * 3 + (s === 'a' ? 7 : 1)) % SKIN.length, hair: hash(i * 5 + (s === 'a' ? 11 : 3)) % HAIR.length, eye: hash(i * 7 + 5) % EYES.length };
      list.push({ px, py, me, kit, lk });
    }
    list.sort((a, b) => a.py - b.py);
    trail.push([ball.x, ball.y]); if (trail.length > 7) trail.shift();
    trail.forEach(([tx, ty], i) => { const [a, b] = P(tx, ty); ctx.globalAlpha = i / 12; ctx.beginPath(); ctx.arc(a, b, Math.max(3, W * .008), 0, 7); ctx.fillStyle = '#c6ff00'; ctx.shadowColor = '#c6ff00'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0; });
    ctx.globalAlpha = 1;
    for (const o of list) {
      sprite(ctx, o.px, o.py, rad, o.kit, o.lk, o.me);
      if (o.me) { ctx.fillStyle = '#c6ff00'; ctx.font = `bold ${Math.round(W * .03)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('VOCÊ', o.px, o.py - rad * 1.6); }
    }
    const [bxp, byp] = P(ball.x, ball.y);
    ctx.beginPath(); ctx.arc(bxp, byp, Math.max(3.5, W * .009), 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
    if (goal && vt >= goal.min) { if (fxG !== goal) { fxG = goal; SFX.goal(replay ? .4 : 1); } } else fxG = null;
    if (goal && vt >= goal.min) {
      const fl = Math.max(0, .55 - (vt - goal.min) * 1.2); if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, W, Hh); }
      ctx.strokeStyle = 'rgba(198,255,0,.7)'; ctx.lineWidth = 2;
      for (let i = 0; i < 28; i++) { const an = i / 28 * 6.2832, c = Math.cos(an), s = Math.sin(an); ctx.beginPath(); ctx.moveTo(W / 2 + c * W * .2, Hh / 2 + s * Hh * .2); ctx.lineTo(W / 2 + c * W * .65, Hh / 2 + s * Hh * .65); ctx.stroke(); }
      ctx.textAlign = 'center'; ctx.font = `italic 900 ${Math.round(W * .14)}px sans-serif`; ctx.lineWidth = 12; ctx.strokeStyle = '#ff2e93'; ctx.shadowColor = '#c6ff00'; ctx.shadowBlur = 24; ctx.strokeText('GOOOL!', W / 2, Hh / 2 + W * .04); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillText('GOOOL!', W / 2, Hh / 2 + W * .04);
      ctx.fillStyle = '#ffd166'; ctx.font = `${Math.round(W * .06)}px sans-serif`; for (let i = 0; i < 7; i++) ctx.fillText('✦', W * (.12 + .76 * ((i * 37 + Math.floor(vt * 7)) % 10) / 10), Hh * (.2 + .6 * ((i * 53 + Math.floor(vt * 5)) % 10) / 10));
      const since = vt - goal.min, cc = [H.color, H.color2, '#ffd400', '#ff2e93', '#00e5ff'];
      for (let i = 0; i < 36; i++) { const h = hash(i + 50); ctx.save(); ctx.translate(W * ((h % 100) / 100), Hh * (((h >> 8) % 40) / 100) + since * Hh * .5 + (h % 7) * 4); ctx.rotate(since * 4 + i); ctx.fillStyle = cc[h % 5]; ctx.fillRect(-3, -2, 6, 4); ctx.restore(); }
      if (goal.scorer) { ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(W * .05)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(goal.scorer, W / 2, Hh / 2 + W * .11); }
    }
    if (replay) {
      ctx.fillStyle = 'rgba(20,10,60,.22)'; ctx.fillRect(0, 0, W, Hh);
      ctx.lineWidth = 4; ctx.strokeStyle = '#ff4d6d'; ctx.strokeRect(2, 2, W - 4, Hh - 4);
      ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(W * .06, Hh * .09, W * .015, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = `italic 900 ${Math.round(W * .045)}px sans-serif`; ctx.fillText('REPLAY', W * .09, Hh * .105);
      ctx.textAlign = 'center'; ctx.font = `800 ${Math.round(W * .04)}px sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = '#14104a'; const cap = `⚽ ${replay.g.min}' ${replay.g.scorer || ''}`; ctx.strokeText(cap, W / 2, Hh * .965); ctx.fillText(cap, W / 2, Hh * .965);
    }
    if (paused) { const pl = .5 + .5 * Math.sin(now / 160); ctx.fillStyle = `rgba(20,10,60,${.28 + .1 * pl})`; ctx.fillRect(0, 0, W, Hh); ctx.textAlign = 'center'; ctx.font = `italic 900 ${Math.round(W * .085)}px sans-serif`; ctx.lineWidth = 8; ctx.strokeStyle = '#14104a'; ctx.strokeText('DECIDA!', W / 2, Hh * .2); ctx.fillStyle = '#c6ff00'; ctx.fillText('DECIDA!', W / 2, Hh * .2); }
    const seen = ev.filter(e => e.min <= t);
    const hg = goals.filter(g => g.side === 'h' && g.min <= t).length, ag = goals.filter(g => g.side === 'a' && g.min <= t).length;
    cb.onClock(Math.floor(t), hg, ag, seen.length ? text(seen[seen.length - 1]) : 'Bola rolando');
    if (t >= 90 && !replay) { ended = true; stopped = true; SFX.whistle(3); SFX.crowdStop(); cb.onEnd(); return; }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return { speed: (n) => { speed = n; }, skip: () => { skipping = true; paused = false; replay = null; t = 90; },
    // depois de uma decisão a partida é refeita com as mesmas escolhas: troca o resultado e segue do mesmo minuto
    update: (nr, nu) => { r = nr; ev = nr.events; goals = ev.filter(e => e.type === 'goal'); reds = redsOf(); if (nu) u = nu; paused = false; },
    moments: (on) => { momOn = !!on; if (!on) paused = false; }, stop: () => { stopped = true; SFX.crowdStop(); if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf); }, get ended() { return ended; } };
}
