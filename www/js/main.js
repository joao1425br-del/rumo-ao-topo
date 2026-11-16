import { POSITIONS, ATTRS, NATS, CLUBS, CLUBS_C, NATIONS, SLOTS, WEIGHTS, LINES, ITEMS, PERKS } from './core/data.js';
import { effAttrs, baseOverall, upgrade, autoSpend, upgradeCost, PH_PER_LEVEL } from './core/player.js';
import { newCareer, playRound, nextSlot, standings, club, libRank, ensureLib, acceptOffer, declineOffer, startNextSeason, natSlotOvr, PHASE_NAME, canRetire, mustRetire, retire, careerSummary, divOf, buyItem, equipItem, buyPerk } from './core/career.js';
import { saveCareer, loadCareer, hasSave } from './core/save.js';
import { startMatchView } from './matchview.js';
import { SFX } from './sfx.js';
import { simulateMatch } from './core/match.js';
import { makeRng } from './core/rng.js';
import { animeChar, radar, SKIN, HAIR, EYES, STYLES, SHAPES, MOUTHS, ACCS } from './avatar.js';

const $app = document.getElementById('app');
const prefOn = () => { try { return localStorage.getItem('rat_moments') !== '0'; } catch { return true; } };
const S = { moments: prefOn(), dec: [], snap: null, q: null, momT: 0, screen: 'menu', tab: 'home', career: null, draft: null, report: null, live: null, comp: null, sub: 'skills', toast: null };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const light = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16 & 255) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) > 150; };
const dotBg = (t) => `linear-gradient(135deg,${t.color} 55%,${t.color2 || t.color} 55%)`;
const crest = (t) => `<span class="crest" style="background:${dotBg(t)}"></span>`;
const bigCrest = (t) => `<div class="bigcrest" style="background:${dotBg(t)};${light(t.color) ? 'color:#14104a;text-shadow:none' : ''}">${t.short}</div>`;
const bar = (v, color) => `<div class="bar"><i style="width:${v}%;${color ? 'background:' + color : ''}"></i></div>`;
const persist = () => saveCareer(S.career);
const swatch = (name, arr, def) => `<div class="sw">${arr.map((c, i) => `<label><input type="radio" name="${name}" value="${i}" ${i === def ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>`;
const rad = (n) => +document.querySelector(`input[name=${n}]:checked`).value;
const chips = (name, labels, def) => `<div class="chips">${labels.map((n, i) => `<label class="chip"><input type="radio" name="${name}" value="${i}" ${i === def ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>`;
const DEFAULT = { name: 'Kenji', surname: 'Silva', age: 18, nat: 'Brasil', pos: 'MEI', foot: 'D', look: { skin: 1, hair: 0, eye: 0, style: 0, shape: 0, mouth: 0, acc: 0, num: 10 } };
const gv = (i) => document.getElementById(i).value;
const readLook = () => ({ skin: rad('skin'), hair: rad('hair'), eye: rad('eye'), style: rad('style'), shape: rad('shape'), mouth: rad('mouth'), acc: rad('acc'), num: Math.max(1, Math.min(99, parseInt(gv('f-num'), 10) || 10)) });
function updateCreator() {
  const pv = document.getElementById('pv'); if (!pv) return;
  const l = readLook(); pv.innerHTML = animeChar(l, 280);
  document.getElementById('pvname').innerHTML = `<b>${esc(gv('f-name').trim() || 'Jogador')} ${esc(gv('f-sur').trim())}</b><span>${POSITIONS[gv('f-pos')]} · camisa ${l.num}</span>`;
}

function render() {
  if (S.live) { S.live.stop(); S.live = null; }
  const h = screens[S.screen]();
  $app.innerHTML = (S.screen === 'hub' || S.screen === 'menu') ? h : `<div class="page">${h}</div>`; window.scrollTo(0, 0);
  if (S.screen === 'live') initLive();
  const tp = document.querySelector('.top'); if (tp) document.documentElement.style.setProperty('--tb', tp.offsetHeight + 'px');
}
function uiFrom(r, p) {
  const u = r.user, ui = { side: u.side, slot: Math.max(0, SLOTS.indexOf(p.pos)), entry: u.starter ? 0 : 999, exit: 91, look: p.look };
  for (const e of r.events) if (e.user) { if (e.inn) ui.entry = e.min; else ui.exit = e.min; }
  const rd = r.events.find(e => e.type === 'red' && e.mine); if (rd) { ui.exit = rd.min; ui.off = rd.min; }
  return ui;
}
function initLive() {
  const r = S.report, p = S.career.player, el = (i) => document.getElementById(i);
  S.live = startMatchView(el('cv'), r, r.home, r.away, uiFrom(r, p), {
    onClock: (m, hg, ag, txt) => { el('lv-score').textContent = `${hg} × ${ag}`; el('lv-clock').textContent = `${m}'`; el('lv-ev').textContent = txt; },
    onEnd: () => { el('lv-sum').disabled = false; },
    onMoment: showMoment,
  });
  if (S.live) S.live.moments(S.moments); else el('lv-sum').disabled = false;
}
// Lance decisivo: a partida para e você escolhe. Depois a rodada é refeita com a sua escolha (mesmo jogo até aquele minuto).
function showMoment(m) {
  const b = document.getElementById('mom'); if (!b) return;
  clearTimeout(S.momT);
  b.innerHTML = `<div class="mq">${esc(m.text)}</div><div class="mopts">${m.options.map(o => `<button class="mopt r${o.risk}" data-a="decide" data-id="${o.id}"><b>${o.label}</b><small>${o.sub}</small><i title="risco">${'●'.repeat(o.risk)}${'○'.repeat(3 - o.risk)}</i></button>`).join('')}</div>`;
  b.hidden = false;
}
function decide(id) {
  const b = document.getElementById('mom'), r0 = S.report; if (!b || !r0.moments || !r0.moments.some(x => x.auto)) return;
  S.dec.push(id);
  let rep;
  if (r0.friendly) rep = quickMatch(S.dec);
  else { S.career = JSON.parse(S.snap); rep = playRound(S.career, { decisions: S.dec }); persist(); }
  S.report = rep;
  if (S.live) S.live.update(rep, uiFrom(rep, S.career.player));
  const mm = rep.moments[S.dec.length - 1];
  b.innerHTML = mm ? `<div class="mres ${mm.ok ? 'ok' : 'bad'}">${esc(mm.result)}</div>` : '';
  clearTimeout(S.momT); S.momT = setTimeout(() => { b.hidden = true; }, 2600);
}

function topbar(c) {
  const p = c.player, my = club(c, c.clubId);
  return `<header class="top"><div class="tav">${animeChar(p.look, 78, my.color)}</div><div class="tinfo"><b>${esc(p.name)} ${esc(p.surname)}</b><span>${crest(my)}${my.short} · Série ${divOf(c, c.clubId)} · T${c.season} · OVR ${p.overall}</span><div class="tbar"><i style="width:${p.xp}%"></i></div><small>Nv ${p.level || 1} · ${p.age > 30 ? 'veterano' : 'XP ' + p.xp + '/100'} · 🔸${p.ph || 0}</small></div><div class="tspacer"></div><div class="pill">💵 R$ ${(c.money || 0).toLocaleString('pt-BR')}</div><button class="gear" data-a="menu" aria-label="Menu principal">⚙️</button></header>`;
}
const NAV = [['home', 'Início', '🏠'], ['inicio', 'Carreira', '🎮'], ['evoluir', 'Evoluir', '⚡'], ['clube', 'Meu Time', '🛡️'], ['comp', 'Competições', '📊'], ['jogos', 'Calendário', '📅'], ['perfil', 'Perfil', '🧑']];
function quickMatch(dec) {
  const c = S.career, p = c.player, rng = makeRng(S.q.seed);
  const opp = rng.pick(c.clubs.filter(k => k.id !== c.clubId));
  const r = simulateMatch(club(c, c.clubId), opp, rng, { side: 'h', player: p, interactive: !!dec, decisions: dec });
  r.title = 'Jogo rápido'; r.friendly = true; r.paid = 0; r.others = []; r.progress = { xp: 0, overallBefore: p.overall, overallAfter: p.overall };
  return r;
}
const othersHtml = (l) => l.map(o => `<div class="ot"><span>${o.h}</span><b>${o.hg} × ${o.ag}</b><span>${o.a}</span></div>`).join('');

const screens = {
  menu: () => `<div class="menu"><i class="petal"></i><i class="petal"></i><i class="petal"></i><i class="petal"></i><i class="petal"></i><i class="petal"></i>
  <div class="mtitle title"><div class="kanji">熱血サッカー物語</div><h1>RUMO<br>AO TOPO</h1><small>Sua carreira de jogador de futebol, rodada a rodada.</small></div>
  <div class="mchar">${animeChar({ skin: 1, hair: 4, eye: 0, style: 0 }, 260)}</div>
  <div class="mbtns">${(() => { const v = loadCareer(); return v ? `<div class="mut" style="text-align:center">${v.retired ? 'Carreira encerrada' : 'Carreira salva'}: ${esc(v.player.name)} ${esc(v.player.surname)} · ${esc(club(v, v.clubId).name)} · T${v.season}${v.retired ? '' : ' · ' + v.step + '/' + v.cal.length}</div>` : ''; })()}<button class="btn" data-a="continue" ${hasSave() ? '' : 'disabled'}>Continuar</button><button class="btn alt" data-a="new">Nova Carreira</button></div></div>`,

  create: () => {
    const D = S.draft || DEFAULT, L = { ...DEFAULT.look, ...D.look };
    const sel = (v, cur) => v === cur ? 'selected' : '';
    return `<div class="creator"><div class="cdoll"><div id="pv" class="portrait">${animeChar(L, 280)}</div><div id="pvname" class="pvname"><b>${esc(D.name)} ${esc(D.surname)}</b><span>${POSITIONS[D.pos]} · camisa ${L.num}</span></div>
    <div class="row"><button class="btn alt tiny" data-a="rand">🎲 Aleatório</button><button class="btn alt tiny" data-a="reset">↺ Padrão</button></div></div>
    <div class="cpanel"><div class="ctabs">${[['dados', 'Dados'], ['rosto', 'Rosto'], ['cabelo', 'Cabelo'], ['olhos', 'Olhos']].map(([k, v], n) => `<button class="ctab ${n === 0 ? 'on' : ''}" data-a="ctab" data-id="${k}">${v}</button>`).join('')}</div>
    <div class="cbody">
    <section class="cp on" data-p="dados"><div class="row"><div><label>Nome</label><input id="f-name" value="${esc(D.name)}" maxlength="14"></div><div><label>Sobrenome</label><input id="f-sur" value="${esc(D.surname)}" maxlength="16"></div></div>
    <div class="row"><div><label>Idade (16–34)</label><input id="f-age" type="number" min="16" max="34" value="${D.age}"></div><div><label>Camisa (1–99)</label><input id="f-num" type="number" min="1" max="99" value="${L.num}"></div></div>
    <label>Nacionalidade (define sua seleção)</label><select id="f-nat">${NATS.map(n => `<option ${sel(n, D.nat)}>${n}</option>`).join('')}</select>
    <div class="row"><div><label>Posição</label><select id="f-pos">${Object.entries(POSITIONS).map(([k, v]) => `<option value="${k}" ${sel(k, D.pos)}>${v}</option>`).join('')}</select></div>
    <div><label>Pé dominante</label><select id="f-foot"><option value="D" ${sel('D', D.foot)}>Direito</option><option value="E" ${sel('E', D.foot)}>Esquerdo</option><option value="A" ${sel('A', D.foot)}>Ambidestro</option></select></div></div></section>
    <section class="cp" data-p="rosto"><label>Tom de pele</label>${swatch('skin', SKIN, L.skin)}<label>Boca</label>${chips('mouth', MOUTHS, L.mouth)}<label>Acessório</label>${chips('acc', ACCS, L.acc)}</section>
    <section class="cp" data-p="cabelo"><label>Estilo de cabelo</label>${chips('style', STYLES, L.style)}<label>Cor do cabelo</label>${swatch('hair', HAIR, L.hair)}</section>
    <section class="cp" data-p="olhos"><label>Cor dos olhos</label>${swatch('eye', EYES, L.eye)}<label>Formato dos olhos</label>${chips('shape', SHAPES, L.shape)}</section></div>
    <div class="cfoot"><button class="btn alt" data-a="menu">Voltar</button><button class="btn" data-a="to-club">Escolher clube ▶</button></div></div></div>`;
  },

  club: () => `<h2>Escolha seu clube</h2><p class="mut">Você começa em um clube pequeno da Série A, B ou C. Em clubes mais fortes é bem mais difícil ser titular. Os 4 últimos da A e da B caem; sobem os 4 primeiros da C, os 2 primeiros da B e mais 2 pelo playoff (3º–6º).</p>
  <div class="grid2">${(S.offer || CLUBS.filter(x => x.start)).map(c => `<div class="card"><div class="row sp">${bigCrest(c)}<div style="flex:2"><h3 style="margin:0">${c.name}</h3><div class="mut">Série ${c.div} · Força do elenco: ${c.strength}</div></div></div><button class="btn tiny" data-a="pick" data-id="${c.id}">Assinar contrato</button></div>`).join('')}</div><button class="btn alt" data-a="reroll">🎲 Sortear outros clubes</button>
  <button class="btn alt" data-a="edit">Voltar</button>`,

  hub: () => {
    const c = S.career;
    return `<div class="shell">${topbar(c)}<nav class="side">${NAV.map(([k, v, e]) => `<button class="${S.tab === k ? 'on' : ''}" data-a="tab" data-id="${k}"><span>${e}</span>${v}${k === 'evoluir' && (c.player.ph || 0) > 0 ? '<i class="dot"></i>' : ''}</button>`).join('')}</nav><main class="main">${tabs[S.tab](c)}</main></div>`;
  },

  live: () => {
    const r = S.report;
    return `<div class="sect">${esc(r.title)}</div><div class="live"><div class="lc">
    <canvas id="cv" style="width:100%;height:auto;aspect-ratio:1.6;border-radius:18px 6px 18px 6px;display:block;border:2px solid var(--violet);box-shadow:0 0 22px #7b3bff88" aria-label="Partida em 2D"></canvas><div id="mom" class="mom" hidden aria-live="polite"></div></div><div class="ls">
    <div class="card" style="padding:10px"><div class="row sp"><b>${crest(r.home)}${r.home.short}</b><span id="lv-clock" class="num" style="flex:none;font-size:22px;color:var(--amber)">0'</span><b style="text-align:right">${r.away.short}${crest(r.away)}</b></div>
    <div id="lv-score" class="num score" style="font-size:48px">0 × 0</div></div>
    <div id="lv-ev" class="card" style="min-height:48px;text-align:center">Bola rolando</div>
    <div class="row"><button class="btn alt tiny" data-a="speed" data-id="1">1x</button><button class="btn alt tiny" data-a="speed" data-id="2">2x</button><button class="btn alt tiny" data-a="speed" data-id="4">4x</button><button class="btn alt tiny" data-a="skip">Pular</button><button class="btn alt tiny" data-a="mute" style="flex:.6">${SFX.on ? '🔊' : '🔇'}</button><button class="btn alt tiny" data-a="momtoggle" style="flex:1.2" title="Lances decisivos">🎯 ${S.moments ? 'ON' : 'OFF'}</button></div>
    <button id="lv-sum" class="btn" data-a="summary" disabled>Ver resumo</button></div></div>`;
  },

  end: () => {
    const c = S.career, s = c.summary || careerSummary(c), p = c.player, my = club(c, c.clubId);
    return `<div class="grid2"><div class="card gold span"><div class="hero" style="margin:0"><div class="portrait">${animeChar(p.look, 170, my.color)}</div><div class="hinfo"><div class="mut">Carreira encerrada</div><h2>${esc(s.name)}</h2><div class="tags"><span>${s.tier}</span><span>${s.seasons} temporadas</span><span>${s.startAge}–${s.endAge} anos</span></div><div class="ovrs"><div class="ovr"><b>${s.peak}</b><small>PICO</small></div></div></div></div></div>
    <div class="card"><div class="sect">Números</div><div class="tiles"><div class="tile"><b>${s.apps}</b><span>Jogos</span></div><div class="tile"><b>${s.goals}</b><span>Gols</span></div><div class="tile"><b>${s.assists}</b><span>Assist.</span></div><div class="tile"><b>${s.avg || '–'}</b><span>Nota</span></div></div><p class="mut" style="margin:12px 0 0">Seleção (${esc(s.nat.country)}): ${s.nat.called} convocação(ões) · ${s.nat.apps} jogo(s) · ${s.nat.goals} gol(s)<br>Acessos: ${s.promotions} · Rebaixamentos: ${s.relegations}<br>Dinheiro acumulado: R$ ${s.money.toLocaleString('pt-BR')}</p></div>
    <div class="card"><div class="sect">Troféus (${s.total})</div>${Object.entries(s.trophies).map(([k, v]) => `<div class="row sp" style="padding:6px 0"><span>${AWARD[k]}</span><b style="flex:none">×${v}</b></div>`).join('') || '<p class="mut" style="margin:0">Nenhum troféu desta vez.</p>'}</div>
    <div class="card span"><div class="sect">Clubes e temporadas</div><p style="margin-top:0">${s.clubs.map(esc).join(' → ')}</p>${trophyHtml(c)}</div></div>
    <button class="btn" data-a="new">Nova carreira</button><button class="btn alt" data-a="menu">Menu principal</button>`;
  },

  slot: () => {
    const r = S.report;
    return `<div class="sect">${esc(r.title)}</div><div class="grid2"><div class="card"><h3 style="margin-top:0">${esc(r.note || 'Rodada simulada.')}</h3><p class="mut" style="margin:0">${r.paid ? 'Salário do período: R$ ' + r.paid.toLocaleString('pt-BR') : ''}</p></div>
    <div class="card"><div class="sect">Resultados</div><div class="oth">${othersHtml(r.others)}</div></div></div><button class="btn" data-a="back">Continuar</button>`;
  },

  match: () => {
    const r = S.report, u = r.user, c = S.career, h = r.home, a = r.away, pr = r.progress;
    const st = (l, x, y) => `<div class="stat"><span>${x}</span><span>${l}</span><span>${y}</span></div>`;
    const line = (e) => {
      const t = e.side === 'h' ? h : a;
      const txt = e.type === 'goal' ? `⚽ <b style="color:inherit">${esc(e.scorer)}</b>${e.assist ? ` <span class="mut">(assist. ${esc(e.assist)})</span>` : ''} · ${e.score}`
        : e.type === 'moment' ? `🎯 <span class="mut">${esc(e.text)}</span>` : e.type === 'sub' ? `🔁 Entra ${esc(e.in)}, sai ${esc(e.out)}` : e.type === 'yellow' ? `🟨 ${esc(e.player)}` : `🟥 ${esc(e.player)}`;
      return `<div class="ev"><b>${e.min}'</b><span>${crest(t)}${txt}</span></div>`;
    };
    let tie = '';
    if (r.tieInfo) {
      const ti = r.tieInfo, A = club(c, ti.a), B = club(c, ti.b), W = club(c, ti.winner), fin = r.title.includes('Final'), pre = r.title.startsWith('Pré-Libertadores'), pb = r.title.includes('Playoff');
      tie = `<div class="card span gold"><div class="sect">Confronto</div><p style="margin:0 0 6px">${r.tie.g2 ? 'Agregado: ' : 'Resultado: '}${A.short} ${ti.aggA} × ${ti.aggB} ${B.short}${ti.pen ? ' · decidido nos pênaltis' : ''}</p><p style="margin:0"><b>${esc(W.name)}</b> ${fin ? `é o campeão ${r.title.includes('Sul-Americana') ? 'da Sul-Americana' : r.title.includes('Libertadores') ? 'da Libertadores' : 'da Copa do Brasil'}!` : pre ? 'garante a vaga na fase de grupos da Libertadores.' : pb ? 'conquista o acesso à Série A!' : 'avança de fase.'}${ti.winner === c.clubId ? ' 🎉' : ''}</p></div>`;
    } else if (r.tie) tie = `<div class="card span"><p class="mut" style="margin:0">Jogo de ida. A volta decide o confronto.</p></div>`;
    return `<div class="sect">${esc(r.title)}</div><div class="grid2">
    <div class="pitch card span"><div class="vsrow" style="margin-top:0">${bigCrest(h)}<div class="num score">${h.g} × ${a.g}</div>${bigCrest(a)}</div><div>${esc(h.name)} x ${esc(a.name)}</div></div>${tie}
    <div class="card"><div class="sect">Seu desempenho</div>${u.minutes > 0 ? `<div class="row"><div class="rcircle" style="--r:${u.rating * 10}"><b>${u.rating.toFixed(1)}</b></div><div>${u.rating >= 8.5 ? '<span class="mvp">MVP</span><br>' : ''}${u.starter ? 'Titular' : 'Entrou do banco'} · ${u.minutes} min<br>${u.goals} gol(s) · ${u.assists} assist.<br>${u.yellow} 🟨 ${u.red} 🟥${u.moms && u.moms.n ? `<br>🎯 Lances decisivos: ${u.moms.ok}/${u.moms.n}` : ''}</div></div>`
      : `<p>${r.suspended ? '🟥 Você estava suspenso e não jogou.' : 'Você ficou no banco e não entrou em campo. Um clube forte exige overall alto para ser titular.'}</p>`}
    <p class="mut" style="margin-bottom:0">${r.friendly ? 'Amistoso: não vale pontos, XP nem salário.' : ''}${r.banned ? '<b style="color:var(--red)">🟥 ' + (r.accum ? 'Terceiro amarelo' : 'Expulso') + '! Suspenso por ' + r.banned + ' jogo(s).</b><br>' : ''}${r.injured ? '<b style="color:var(--red)">🩹 Lesão! Fora por ' + r.injured + ' rodada(s).</b><br>' : ''}${r.friendly ? '' : `Salário e bônus: R$ ${r.paid.toLocaleString('pt-BR')} · +${pr.xp} XP`}${pr.levels ? ` · <b style="color:var(--ok)">⬆️ Nível ${pr.level}! +${pr.levels * PH_PER_LEVEL} pontos de habilidade (aba Evoluir)</b>` : ''}</p></div>
    <div class="card"><div class="sect">Estatísticas</div>${st('Posse de bola', r.poss.h + '%', r.poss.a + '%')}${st('Finalizações', h.shots, a.shots)}${st('No alvo', h.onTarget, a.onTarget)}${st('Cartões amarelos', h.yellow, a.yellow)}${st('Cartões vermelhos', h.red, a.red)}</div>
    ${r.others && r.others.length ? `<div class="card span"><div class="sect">Outros jogos</div><div class="oth">${othersHtml(r.others)}</div></div>` : ''}
    <div class="card span"><div class="sect">Lances</div>${r.events.map(line).join('') || '<p class="mut">Jogo sem lances relevantes.</p>'}</div>
    </div><button class="btn" data-a="back">Continuar</button>`;
  },
};

function trainHtml(c) {
  const tr = c.training || 'tecnico';
  const trn = [['tecnico', 'Técnico', 'Mais XP na sua posição, mais cansaço'], ['fisico', 'Físico', 'XP moderado, sem cansaço extra'], ['descanso', 'Descanso', 'Recupera a forma física']];
  return `<div class="card"><div class="sect">Treino da semana</div><div class="row">${trn.map(([k, v]) => `<button class="btn ${tr === k ? '' : 'alt'} tiny" data-a="train" data-id="${k}">${v}</button>`).join('')}</div><div class="mut">${trn.find(x => x[0] === tr)[2]}</div></div>`;
}
function alertsHtml(c) {
  const ph = c.player.ph || 0;
  return (ph > 0 ? `<div class="card gold"><div class="row sp"><span>🔸 <b>${ph}</b> pontos de habilidade para gastar!</span><button class="btn tiny" data-a="evolve" style="flex:none;width:auto;padding:0 16px;margin:0">Evoluir</button></div></div>` : '') + (c.player.injury > 0 ? `<div class="card" style="border-color:var(--red)">🩹 Lesionado: fora por ${c.player.injury} rodada(s).</div>` : '') + (c.player.ban > 0 ? `<div class="card" style="border-color:var(--red)">🟥 Suspenso: fora por ${c.player.ban} jogo(s).</div>` : '') + offersHtml(c);
}
function offersHtml(c) {
  return (c.offers || []).map((o, i) => { const K = club(c, o.clubId); return `<div class="card gold"><div class="row sp">${bigCrest(K)}<div style="flex:2"><h3 style="margin:0">${o.renewal ? 'Renovação de contrato' : 'Proposta de ' + K.name}</h3><p class="mut" style="margin:4px 0 0">${o.renewal ? '' : 'Força ' + K.strength + ' · '}R$ ${o.salary.toLocaleString('pt-BR')}/mês · ${o.years} anos · bônus R$ ${o.bonus.toLocaleString('pt-BR')} por gol${o.renewal ? '' : ' · válida por mais alguns jogos'}</p></div></div><div class="row"><button class="btn tiny" data-a="accept" data-id="${i}">Aceitar</button><button class="btn alt tiny" data-a="decline" data-id="${i}">Recusar</button></div></div>`; }).join('');
}
const TROPHY = { sula: '🌿', campeaoC: '🥉', acessoC: '🔼', liberta: '🌎', campeaoB: '🏅', acesso: '⬆️', campeao: '🏆', copa: '🥇', craque: '⭐', artilheiro: '👟', revelacao: '🌱', convocado: '🌍' };
const AWARD = { sula: '🌿 Campeão da Sul-Americana', campeaoC: '🥉 Campeão da Série C', acessoC: '🔼 Acesso à Série B', liberta: '🌎 Campeão da Libertadores', campeaoB: '🏅 Campeão da Série B', acesso: '⬆️ Acesso à Série A', campeao: '🏆 Campeão da Série A', copa: '🥇 Campeão da Copa do Brasil', craque: '⭐ Craque da Temporada', artilheiro: '👟 Artilheiro', revelacao: '🌱 Revelação', convocado: '🌍 Convocado para a seleção' };
function trophyHtml(c) {
  const log = c.seasonLog || [];
  return log.length ? log.map(l => `<div class="row sp" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>T${l.season} · Série ${l.div || 'A'} ${l.pos}º${l.relegated ? ' ⬇️' : ''}${l.promoted ? ' ⬆️' : ''} · ${l.goals} gols</span><b style="text-align:right">${l.awards.map(a => TROPHY[a]).join(' ') || '–'}</b></div>`).join('') : '<p class="mut" style="margin:0">Termine uma temporada para ganhar troféus.</p>';
}
const tieRow = (c, t) => { const A = club(c, t.a), B = club(c, t.b); return `<div class="row sp tie${t.a === c.clubId || t.b === c.clubId ? ' me' : ''}"><span>${crest(A)}${A.short} x ${B.short}${crest(B)}</span><b>${t.g1 ? `${t.g1[0]}–${t.g1[1]}` : '–'}${t.g2 ? ` · ${t.g2[0]}–${t.g2[1]}` : ''}${t.w ? ` → ${club(c, t.w).short}${t.pen ? ' (pên.)' : ''}` : ''}</b></div>`; };

const fmt = (v) => v >= 1000 ? (v / 1000) + ' mil' : String(v);
function tableHtml(c, dv) {
  const z = (i) => dv === 'A' ? (i < 4 ? 1 : i < 6 ? 2 : i < 14 && i >= 6 ? 3 : i >= 16 ? 4 : 0) : dv === 'B' ? (i < 2 ? 1 : i < 6 ? 2 : i >= 16 ? 4 : 0) : (i < 4 ? 1 : 0);
  const leg = dv === 'A' ? '<span class="zl z1"></span>Libertadores (1–4) · <span class="zl z2"></span>Pré-Libertadores (5º–6º, depois dos classificados diretos) · <span class="zl z3"></span>Sul-Americana (7º–14º) · <span class="zl z4"></span>Rebaixamento para a Série B (17–20)'
    : dv === 'B' ? '<span class="zl z1"></span>Acesso direto (1–2) · <span class="zl z2"></span>Playoff de acesso (3º–6º) · <span class="zl z4"></span>Rebaixamento para a Série C (17–20)'
    : '<span class="zl z1"></span>Acesso à Série B (1–4) · Não existe Série D: ninguém cai da Série C';
  return `<div class="card"><div class="sect">Brasileirão Série ${dv} · ${c.round}/38 rodadas</div><table><tr><th>#</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>Pts</th></tr>${standings(c, dv).map((t, i) => `<tr class="z${z(i)}${t.id === c.clubId ? ' me' : ''}"><td>${i + 1}</td><td>${crest(club(c, t.id))}${club(c, t.id).name}</td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gd}</td><td>${t.pts}</td></tr>`).join('')}</table>
    <p class="mut" style="margin:10px 0 0">${leg}</p></div>${dv === 'B' ? pbHtml(c) : ''}`;
}
function pbHtml(c) {
  const P = c.pb; if (!P) return `<div class="card"><div class="sect">Playoff de acesso</div><p class="mut" style="margin:0">Depois da rodada 38: 1º e 2º sobem direto; 3º x 6º e 4º x 5º jogam ida e volta (o pior colocado joga a ida em casa) e os 2 vencedores também sobem.</p></div>`;
  return `<div class="card"><div class="sect">Playoff de acesso à Série A</div>${P.ties.map(t => tieRow(c, t)).join('')}${P.done ? `<p style="margin:8px 0 0">⬆️ Sobem pelo playoff: <b>${P.winners.map(id => esc(club(c, id).name)).join(' e ')}</b></p>` : '<p class="mut" style="margin:8px 0 0">Em andamento: os vencedores sobem para a Série A.</p>'}</div>`;
}
function copaHtml(c) {
  const cup = c.cup;
  const phases = cup.log.map(l => `<div class="sect" style="margin-top:12px">${PHASE_NAME[l.phase]}</div>${l.ties.map(t => tieRow(c, t)).join('')}`).join('');
  const now = cup.champion ? `<p style="margin:0 0 6px">🥇 Campeão: <b>${esc(club(c, cup.champion).name)}</b></p>` : `<div class="sect" style="margin-top:4px">${PHASE_NAME[cup.phase]} (em andamento)</div>${cup.ties.map(t => tieRow(c, t)).join('')}`;
  return `<div class="card"><div class="sect">Copa do Brasil</div><p class="mut" style="margin:0 0 6px">Mata-mata com ida e volta (final em jogo único). Formato simplificado: 24 clubes (os 20 da Série A e os 4 melhores da Série B); os 16 mais fracos jogam a fase preliminar.</p>${now}${phases ? `<details><summary class="mut" style="padding:8px 0">Fases anteriores</summary>${phases}</details>` : ''}</div>`;
}
function libHtml(c) {
  const L = c.lib; if (!L) return '<div class="card"><p class="mut" style="margin:0">A Libertadores começa na próxima temporada.</p></div>';
  const ko = L.log.map(l => `<div class="sect" style="margin-top:12px">${PHASE_NAME[l.phase]}</div>${l.ties.map(t => tieRow(c, t)).join('')}`).join('');
  const now = L.champion ? `<p style="margin:0 0 6px">🌎 Campeão: <b>${esc(club(c, L.champion).name)}</b></p>` : L.phase === 'grp' ? '' : `<div class="sect" style="margin-top:4px">${PHASE_NAME[L.phase]} (em andamento)</div>${L.ties.map(t => tieRow(c, t)).join('')}`;
  const inIt = (L.field || L.teams).includes(c.clubId), pre = L.pre && L.pre.ties.length ? `<div class="sect" style="margin-top:12px">Pré-Libertadores${L.pre.done ? '' : ' (em andamento)'}</div>${L.pre.ties.map(t => tieRow(c, t)).join('')}<p class="mut" style="margin:6px 0 0">5º e 6º da Série A x os 2 estrangeiros mais fracos. Os vencedores entram na fase de grupos.</p>` : '';
  const head = `<div class="card"><div class="sect">Copa Libertadores</div><p class="mut" style="margin:0 0 6px">32 clubes em 8 grupos de 4 (6 jogos). Os 2 primeiros de cada grupo vão às oitavas; oitavas, quartas e semis têm ida e volta; a final é em jogo único. Vagas: 4 primeiros da Série A, o campeão da Copa do Brasil e os 2 vencedores da Pré-Libertadores. ${inIt ? '' : 'Seu clube não disputa esta edição: ela é simulada e o resultado fecha no fim da temporada.'}</p>${now}${pre}${ko ? `<details><summary class="mut" style="padding:8px 0">Mata-mata</summary>${ko}</details>` : ''}</div>`;
  const grp = L.groups.map((g, i) => `<div class="card"><div class="sect">Grupo ${'ABCDEFGH'[i]}</div><table><tr><th>#</th><th>Clube</th><th>J</th><th>SG</th><th>Pts</th></tr>${libRank(L, g).map((id, j) => { const t = L.gt[id]; return `<tr class="z${j < 2 ? 1 : 0}${id === c.clubId ? ' me' : ''}"><td>${j + 1}</td><td>${crest(club(c, id))}${club(c, id).name}</td><td>${t.p}</td><td>${t.gf - t.ga}</td><td>${t.pts}</td></tr>`; }).join('')}</table></div>`).join('');
  return head + `<div class="grid2">${grp}</div>`;
}
function sulaHtml(c) {
  const S = c.sula; if (!S) return '<div class="card"><p class="mut" style="margin:0">A Sul-Americana começa na próxima temporada.</p></div>';
  const ko = S.log.map(l => `<div class="sect" style="margin-top:12px">${PHASE_NAME[l.phase]}</div>${l.ties.map(t => tieRow(c, t)).join('')}`).join('');
  const now = S.champion ? `<p style="margin:0 0 6px">🌿 Campeão: <b>${esc(club(c, S.champion).name)}</b></p>` : S.phase === 'wait' ? `<div class="sect" style="margin-top:4px">Aguardando o fim da fase de grupos da Libertadores</div><p class="mut" style="margin:0">Brasileiros classificados (7º–14º da Série A): ${S.br.map(id => esc(club(c, id).short)).join(', ')}</p>` : `<div class="sect" style="margin-top:4px">${PHASE_NAME[S.phase]} (em andamento)</div>${S.ties.map(t => tieRow(c, t)).join('')}`;
  const inIt = S.br.includes(c.clubId) || S.lib3.includes(c.clubId);
  return `<div class="card"><div class="sect">Copa Sul-Americana</div><p class="mut" style="margin:0 0 6px">16 clubes: do 7º ao 14º da Série A + os 8 terceiros colocados dos grupos da Libertadores. Oitavas, quartas e semis com ida e volta; final em jogo único.${inIt ? '' : ' Seu clube não disputa esta edição: ela é simulada e fecha no fim da temporada.'}</p>${now}${ko && S.champion ? `<details><summary class="mut" style="padding:8px 0">Mata-mata</summary>${ko}</details>` : ko}</div>`;
}
function selHtml(c) {
  const p = c.player, need = natSlotOvr(c) - 5;
  return `<div class="card"><div class="sect">Seleção: ${esc(c.nat.name)}</div><div class="row sp">${bigCrest(c.nat)}<div style="flex:2"><b>Força ${c.nat.strength}</b><div class="mut">${c.natStats.called} convocação(ões) · ${c.natStats.apps} jogo(s) · ${c.natStats.goals} gol(s)</div></div></div>
    <p style="margin:10px 0 6px">Para ser convocado: overall <b>${need}+</b> na sua posição (o seu é ${p.overall}) e nota média 6,5+ nos últimos jogos do Brasileirão.</p>
    ${c.natFix.map((n, i) => `<div class="row sp" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>Data FIFA ${i + 1}</span><b style="text-align:right">${c.nat.short} x ${NATIONS[n].short}</b></div>`).join('')}</div>`;
}
function skillsHtml(c) {
  const p = c.player, eff = effAttrs(p), bo = baseOverall(p);
  const keys = Object.entries(WEIGHTS[p.pos]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  return `<div class="grid2"><div class="card"><div class="sect">Pontos de habilidade</div><div class="row sp"><div><div class="num big" style="color:var(--amber)">${p.ph || 0}</div><div class="mut">pontos para gastar</div></div><div style="text-align:right"><b>Nível ${p.level || 1}</b><div class="mut">${p.age > 30 ? 'veterano: sem XP' : 'XP ' + p.xp + '/100'}</div></div></div>${bar(p.xp, 'linear-gradient(90deg,#7b5cff,#3de2ff)')}
    <p class="mut" style="margin:10px 0 6px">Cada nível (100 XP) dá ${PH_PER_LEVEL} pontos; na pré-temporada jovens ganham pontos extras. Quanto mais alto o atributo, mais caro (1 a 4 pontos).${p.age > 30 ? ' Veterano não ganha mais XP, mas pode gastar os pontos guardados.' : ''}</p>
    <div class="row sp"><span>Overall base (potencial)</span><b style="flex:none">${bo} / ${p.potential}</b></div>${bar(Math.round(bo / p.potential * 100))}
    <button class="btn tiny" style="margin-top:12px" data-a="auto" ${(p.ph || 0) > 0 ? '' : 'disabled'}>⚡ Distribuir automaticamente</button></div>
    <div class="card"><div class="sect">Atributos da sua posição</div>${keys.map(k => { const v = p.attrs[k], cost = upgradeCost(v), b = eff[k] - v; return `<div class="row sp" style="padding:6px 0 3px"><span style="flex:2">${ATTRS[k]}</span><b style="flex:1;text-align:right">${v}${b ? ` <span style="color:var(--ok)">+${b}</span>` : ''}</b><button class="btn tiny" style="flex:1.4;margin:0" data-a="up" data-id="${k}" ${v >= 99 || (p.ph || 0) < cost ? 'disabled' : ''}>+1 · ${cost} PH</button></div>${bar(eff[k])}`; }).join('')}
    <p class="mut" style="margin:10px 0 0">Em verde: bônus dos itens equipados (veja a Loja).</p></div></div>`;
}
function shopHtml(c) {
  const p = c.player, owned = c.owned || [], pk = c.perks || {}, roman = ['I', 'II', 'III'];
  const eq = LINES.filter(l => WEIGHTS[p.pos][l.attr]).map(l => `<div class="card"><div class="sect">${l.icon} ${l.name} <span class="mut" style="font-style:normal">· ${ATTRS[l.attr]}</span></div><div class="row">${[1, 2, 3].map(t => { const it = ITEMS[l.line + t], has = owned.includes(it.id), on = !!p.gear && p.gear[it.slot] === it.id; return `<button class="btn ${on ? '' : 'alt'} tiny" data-a="${has ? 'equip' : 'buy'}" data-id="${it.id}" ${on || (!has && (c.money || 0) < it.price) ? 'disabled' : ''}>${on ? '✔ Equipado' : has ? 'Equipar' : 'R$ ' + fmt(it.price)}<br><small>${roman[t - 1]} · +${it.val} ${ATTRS[l.attr]}</small></button>`; }).join('')}</div></div>`).join('');
  const perks = Object.entries(PERKS).map(([k, P]) => { const lv = pk[k] || 0, next = lv < 3 ? P.prices[lv] : null; return `<div class="card"><div class="row sp"><div style="flex:2"><b>${P.icon} ${P.name}</b> <span class="mut">nível ${lv}/3</span><div class="mut">${lv ? P.text[lv - 1] : P.desc}</div></div><button class="btn tiny" style="flex:1.3;margin:0" data-a="perk" data-id="${k}" ${next === null || (c.money || 0) < next ? 'disabled' : ''}>${next === null ? 'Máximo' : 'Nível ' + (lv + 1) + '<br><small>R$ ' + fmt(next) + '</small>'}</button></div></div>`; }).join('');
  return `<div class="card gold"><div class="row sp"><span>💵 Seu dinheiro</span><b style="flex:none;font-size:20px">R$ ${(c.money || 0).toLocaleString('pt-BR')}</b></div><p class="mut" style="margin:6px 0 0">Equipamentos dão bônus nos atributos: valem em campo, mas não contam para o potencial. Só um item por tipo fica equipado (a chuteira escolhe qual atributo reforçar).</p></div>
  <div class="sect">Equipamentos</div><div class="grid2">${eq}</div><div class="sect" style="margin-top:6px">Equipe de apoio</div><div class="grid2">${perks}</div>`;
}

// Clubes oferecidos no início da carreira: 2 da Série A (força até 62), 2 da B (até 57) e 2 da C, sorteados a cada vez
const sample = (a, n) => a.slice().sort(() => Math.random() - .5).slice(0, n);
const pickStart = () => sample(CLUBS.filter(x => x.div === 'A' && x.strength <= 62), 2).concat(sample(CLUBS.filter(x => x.div === 'B' && x.strength <= 57), 2), sample(CLUBS_C.filter(x => x.start), 2));
const tabs = {
  home: (c) => {
    const p = c.player, my = club(c, c.clubId);
    return `<div class="home"><div class="hportrait">${animeChar(p.look, 300, my.color)}<div class="hslogan">SUA LENDA<span>COMEÇA AGORA!</span></div></div><div class="hcards">
    <button class="hcard c1" data-a="tab" data-id="inicio"><div class="hbox"><div class="ht">CARREIRA</div><div class="hs">${c.done ? 'Temporada encerrada: veja os prêmios!' : 'Construa sua lenda dentro de campo!'}</div><span class="hgo">JOGAR ▶</span><div class="art num9">9</div></div></button>
    <button class="hcard c2" data-a="quick"><div class="hbox"><div class="ht">JOGO RÁPIDO</div><div class="hs">Amistoso contra um clube sorteado.</div><span class="hgo">JOGAR ▶</span><div class="art">⚽</div></div></button>
    <div class="hrow2"><button class="hcard c3" data-a="comp" data-id="copa"><div class="hbox"><div class="ht" style="font-size:clamp(20px,3.4vw,30px)">TORNEIOS</div><div class="hs">Copa do Brasil e seleção.</div><span class="hgo">VER ▶</span><div class="art" style="font-size:64px">🏆</div></div></button>
    <button class="hcard c4" data-a="tab" data-id="conquistas"><div class="hbox"><div class="ht" style="font-size:clamp(20px,3.4vw,30px)">CONQUISTAS</div><div class="hs">Troféus e prêmios.</div><span class="hgo">VER ▶</span><div class="art" style="font-size:64px">⭐</div></div></button></div></div></div>`;
  },
  conquistas: (c) => `<div class="grid2"><div class="card"><div class="sect">Seus troféus</div>${trophyHtml(c)}</div><div class="card"><div class="sect">Como ganhar prêmios</div>${Object.entries({ campeao: 'termine a Série A em 1º lugar.', campeaoB: 'termine a Série B em 1º lugar.', acesso: 'suba da Série B: 1º ou 2º lugar, ou vença o playoff (3º–6º).', campeaoC: 'termine a Série C em 1º lugar.', acessoC: 'termine a Série C entre os 4 primeiros (você sobe para a Série B).', sula: 'vença a final da Sul-Americana.', copa: 'vença a final da Copa do Brasil.', liberta: 'vença a final da Libertadores (4 primeiros da Série A, campeão da Copa do Brasil ou vencedor da Pré jogam a edição seguinte).', craque: 'nota média 7,3+ em 25 jogos ou mais.', artilheiro: '15 gols ou mais na temporada.', revelacao: 'até 21 anos, nota média 6,8+ em 18 jogos ou mais.', convocado: 'seja convocado para a seleção do seu país.' }).map(([k, v]) => `<p style="margin:0 0 8px">${AWARD[k].split(' ')[0]} <b>${AWARD[k].slice(AWARD[k].indexOf(' ') + 1)}</b>: ${v}</p>`).join('')}</div></div>`,
  inicio: (c) => {
    const p = c.player;
    if (c.done) {
      const L = (c.seasonLog || []).slice(-1)[0] || { pos: 0, pts: 0, champion: c.clubId, awards: [] };
      const must = mustRetire(c), can = canRetire(c);
      const retireCard = must ? `<div class="card span" style="border-color:var(--red)"><div class="sect">Fim de carreira</div><p style="margin:0">Aos ${p.age} anos, o corpo não aguenta mais o ritmo. É hora de pendurar as chuteiras.</p></div>`
        : can ? `<div class="card span"><div class="sect">Hora de decidir</div><p style="margin:0">Você tem ${p.age} anos e o declínio físico acelera a cada temporada. Quer jogar mais um ano ou se aposentar agora? (A carreira termina de qualquer forma aos 41.)</p></div>` : '';
      const retireBtns = must ? `<button class="btn span" data-a="retire">Aposentar-se</button>` : can ? `<button class="btn" data-a="next">Mais uma temporada</button><button class="btn alt" data-a="retire">Aposentar-se</button>` : `<button class="btn span" data-a="next">Próxima temporada</button>`;
      return `<div class="grid2"><div class="card gold span"><div class="sect">Temporada ${c.season} encerrada</div><p>Brasileirão Série ${L.div || 'A'}: seu clube terminou em <b>${L.pos}º lugar</b> com ${L.pts} pontos. Campeão: ${esc(club(c, L.champion).name)}.${L.relegated ? '<br>⬇️ <b>Seu clube foi REBAIXADO para a Série ' + (L.div === 'B' ? 'C' : 'B') + '.</b>' + (c.offers.some(o => !o.renewal) ? ' Clubes da Série ' + (L.div === 'B' ? 'B' : 'A') + ' fizeram propostas pelo seu futebol!' : '') : ''}${L.promoted ? '<br>⬆️ <b>Seu clube CONQUISTOU O ACESSO à Série ' + (L.div === 'C' ? 'B' : 'A') + '!</b>' : ''}${L.div === 'B' && L.pb ? '<br>Playoff de acesso: ' + (L.promoted ? 'seu clube venceu e subiu.' : 'seu clube foi eliminado.') : ''}${L.div === 'B' && L.pbWinners && L.pbWinners.length ? '<br>Subiram pelo playoff: ' + L.pbWinners.map(id => esc(club(c, id).name)).join(' e ') + '.' : ''}<br>Copa do Brasil: ${L.cupChampion ? 'campeão ' + esc(club(c, L.cupChampion).name) : ''}${L.cup && L.cup !== 'fin+' ? ' · seu clube parou na fase: ' + PHASE_NAME[L.cup] : ''}${L.cup === 'fin+' ? ' · SEU CLUBE É CAMPEÃO!' : ''}${!L.cup ? ' · seu clube não disputou a Copa' : ''}<br>Libertadores: ${L.libChampion ? 'campeão ' + esc(club(c, L.libChampion).name) : '–'}${L.lib === 'fin+' ? ' · SEU CLUBE É CAMPEÃO!' : L.lib ? ' · seu clube parou em: ' + (L.lib === 'grp' ? 'fase de grupos' : PHASE_NAME[L.lib]) : ' · seu clube não disputou'}<br>Sul-Americana: ${L.sulaChampion ? 'campeão ' + esc(club(c, L.sulaChampion).name) : '–'}${L.sula === 'fin+' ? ' · SEU CLUBE É CAMPEÃO!' : L.sula ? ' · seu clube parou em: ' + PHASE_NAME[L.sula] : ''}</p><p style="margin-bottom:0">${L.awards.length ? L.awards.map(a => AWARD[a]).join('<br>') : 'Nenhum prêmio desta vez. Jogue melhor para brigar por troféus!'}</p></div>${retireCard}${offersHtml(c)}${retireBtns}</div>`;
    }
    const ns = nextSlot(c), H = ns.home, A = ns.away;
    const slotOvr = ns.k === 'sel' ? natSlotOvr(c) : club(c, c.clubId).lineup.find(x => x.pos === p.pos).ovr;
    const starter = p.injury <= 0 && !(p.ban > 0) && p.overall >= slotOvr - 3;
    const kind = { liga: 'Brasileirão', copa: 'Copa do Brasil', lib: 'Libertadores', pre: 'Pré-Libertadores', sula: 'Sul-Americana', pb: 'Playoff de acesso', sel: 'Seleção' }[ns.k];
    const vs = ns.plays
      ? `<div class="card vs"><div class="sect">${esc(ns.title)}</div><div class="vsrow"><div class="team">${bigCrest(H)}<span>${esc(H.name)}</span></div><div class="vsx">VS</div><div class="team">${bigCrest(A)}<span>${esc(A.name)}</span></div></div><div class="mut">${kind} · adversário com força ${ns.home.id === c.clubId || ns.k === 'sel' ? A.strength : H.strength}</div></div>`
      : `<div class="card vs"><div class="sect">${esc(ns.title)}</div><p style="margin:6px 0">${ns.k === 'sel' ? `Você não está convocado. Na sua posição a seleção pede overall ${slotOvr - 5}+ (o seu é ${p.overall}) e nota média 6,5+ nos últimos jogos.` : (ns.msg ? ns.msg : ns.k === 'lib' ? 'Seu clube está fora da Libertadores.' : c.ss.cup ? 'Seu clube não está mais na Copa do Brasil.' : 'Seu clube não disputa a Copa do Brasil neste ano.') + ' Simule para ver os outros jogos.'}</p></div>`;
    return `<div class="cr"><div class="crl">${vs}${alertsHtml(c)}<button class="btn" data-a="play">${ns.plays ? 'Jogar partida' : 'Simular rodada'}</button></div><div class="crr">
    <div class="card"><div class="row sp"><span>Situação no elenco</span><b style="color:${starter ? 'var(--ok)' : 'var(--red)'}">${starter ? 'Titular' : 'Reserva'}</b></div><p class="mut" style="margin:6px 0 0">${ns.k === 'sel' ? 'O titular da seleção na sua posição' : 'O titular da posição'} tem overall ${slotOvr}; o seu é ${p.overall}.</p></div>
    <div class="card"><div class="row sp"><span>Forma física</span><b>${p.fitness}%</b></div>${bar(p.fitness)}<div class="row sp" style="margin-top:12px"><span>Moral</span><b>${p.morale}%</b></div>${bar(p.morale, 'linear-gradient(90deg,#ffd166,#ff7eb6)')}<div class="row sp" style="margin-top:12px"><span>Nível ${p.level || 1}</span><b>${p.age > 30 ? 'veterano' : p.xp + '/100 XP'}</b></div>${bar(p.xp, 'linear-gradient(90deg,#7b5cff,#3de2ff)')}</div>
    ${trainHtml(c)}</div></div>`;
  },
  perfil: (c) => {
    const p = c.player, s = c.stats, ns = c.natStats, my = club(c, c.clubId);
    const keys = (p.pos === 'GOL' ? ['ritmo', 'goleiro', 'passe', 'drible', 'defesa', 'fisico'] : ['ritmo', 'chute', 'passe', 'drible', 'defesa', 'fisico']);
    return `<div class="grid2"><div class="card"><div class="hero" style="margin:0"><div class="portrait">${animeChar(p.look, 150, my.color)}</div><div class="hinfo"><div class="mut">${crest(my)}${my.name}</div><h2>${esc(p.name)}<br><span>${esc(p.surname)}</span></h2><div class="tags"><span>${POSITIONS[p.pos]}</span><span>${p.age} anos</span><span>${esc(p.nat)}</span>${p.age > 30 ? '<span>veterano · em declínio</span>' : ''}</div><div class="ovrs"><div class="ovr"><b>${p.overall}</b><small>OVR</small></div><div class="ovr pot"><b>${p.potential}</b><small>POT</small></div></div></div></div></div><div class="card"><div class="sect">Atributos</div>${radar(effAttrs(p), keys, ATTRS)}${Object.values(p.gear || {}).filter(Boolean).length ? `<p class="mut" style="margin:8px 0 0">Equipado: ${Object.values(p.gear).filter(Boolean).map(id => ITEMS[id].icon + ' ' + ITEMS[id].name).join(' · ')}</p>` : ''}</div>
    <div class="card"><div class="sect">Carreira</div><div class="tiles"><div class="tile"><b>${s.apps}</b><span>Jogos</span></div><div class="tile"><b>${s.goals}</b><span>Gols</span></div><div class="tile"><b>${s.assists}</b><span>Assist.</span></div><div class="tile"><b>${s.rated ? (s.ratingSum / s.rated).toFixed(1) : '–'}</b><span>Nota</span></div></div>
    <p class="mut" style="margin:12px 0 0">${s.starts} como titular · ${s.yellow} 🟨 ${s.red} 🟥 · pé ${{ D: 'direito', E: 'esquerdo', A: 'ambidestro' }[p.foot]}<br>Seleção (${esc(c.nat.name)}): ${ns.called} convocação(ões) · ${ns.apps} jogo(s) · ${ns.goals} gol(s)</p></div>
    <div class="card"><div class="sect">Contrato</div><div class="row sp"><span>Salário</span><b>R$ ${p.contract.salary.toLocaleString('pt-BR')}/mês</b></div><div class="row sp"><span>Duração</span><b>${p.contract.years} ano(s)</b></div><div class="row sp"><span>Bônus por gol</span><b>R$ ${(p.contract.bonus || 0).toLocaleString('pt-BR')}</b></div><div class="row sp"><span>Dinheiro acumulado</span><b>R$ ${(c.money || 0).toLocaleString('pt-BR')}</b></div>${p.injury > 0 ? `<p style="color:var(--red);margin:8px 0 0">🩹 Lesionado: ${p.injury} rodada(s)</p>` : ''}</div>
    <div class="card span"><div class="sect">Troféus e temporadas</div>${trophyHtml(c)}</div></div>`;
  },
  clube: (c) => {
    const m = club(c, c.clubId), p = c.player, mine = m.lineup.findIndex(x => x.pos === p.pos);
    return `<div class="grid2"><div class="card"><div class="row sp">${bigCrest(m)}<div style="flex:2"><h3 style="margin:0">${m.name}</h3><div class="mut">Força do elenco: ${m.strength}</div></div></div></div>
    <div class="card"><div class="sect">Titulares</div>${m.lineup.map((x, i) => `<div class="row sp" style="padding:8px 0;border-bottom:1px solid var(--line)${i === mine ? ';color:var(--amber)' : ''}"><span><span class="pos">${x.pos}</span>${esc(x.name)}</span><b style="flex:none">${x.ovr}</b></div>`).join('')}</div>
    <p class="mut span">Você ocupa a vaga de ${POSITIONS[p.pos].toLowerCase()} (em amarelo) se seu overall for no máximo 3 pontos abaixo do titular. Os titulares de 18 clubes da Série A têm nomes reais (de memória, podem estar desatualizados); os demais jogadores têm nomes fictícios.</p></div>`;
  },
  jogos: (c) => `<div class="card"><div class="sect">Calendário da temporada ${c.season}</div>${c.cal.map((s, i) => {
    const hs = c.history.find(h => h.step === i); let label, mid;
    if (s.k === 'liga') { const f = c.fixtures[divOf(c, c.clubId)][s.r].find(([h, a]) => h === c.clubId || a === c.clubId); label = `R${s.r + 1}`; mid = hs ? `${hs.h} x ${hs.a}` : `${club(c, f[0]).short} x ${club(c, f[1]).short}`; }
    else if (s.k === 'copa') { label = '🥇'; mid = `Copa · ${PHASE_NAME[s.phase]}${s.phase === 'fin' ? '' : s.leg === 1 ? ' (ida)' : ' (volta)'}${hs ? ` · ${hs.h} x ${hs.a}` : i < c.step ? ' · sem jogo' : ''}`; }
    else if (s.k === 'pre') { label = '🌎'; mid = `Pré-Libertadores${s.leg === 1 ? ' (ida)' : ' (volta)'}${hs ? ` · ${hs.h} x ${hs.a}` : i < c.step ? ' · sem jogo' : ''}`; }
    else if (s.k === 'sula') { label = '🌿'; mid = `Sul-Americana · ${PHASE_NAME[s.phase]}${s.phase === 'fin' ? '' : s.leg === 1 ? ' (ida)' : ' (volta)'}${hs ? ` · ${hs.h} x ${hs.a}` : i < c.step ? ' · sem jogo' : ''}`; }
    else if (s.k === 'pb') { label = '⬆️'; mid = `Série B · Playoff de acesso${s.leg === 1 ? ' (ida)' : ' (volta)'}${hs ? ` · ${hs.h} x ${hs.a}` : i < c.step ? ' · sem jogo' : ''}`; }
    else if (s.k === 'lib') { label = '🌎'; mid = `Libertadores · ${s.phase === 'grp' ? 'Grupos · jogo ' + s.leg : PHASE_NAME[s.phase] + (s.phase === 'fin' ? '' : s.leg === 1 ? ' (ida)' : ' (volta)')}${hs ? ` · ${hs.h} x ${hs.a}` : i < c.step ? ' · sem jogo' : ''}`; }
    else { label = '🌍'; mid = `Data FIFA · ${c.nat.short} x ${NATIONS[c.natFix[s.w - 1]].short}${hs ? '' : i < c.step ? ' · não convocado' : ' (se convocado)'}`; }
    return `<div class="row sp" style="padding:8px 0;border-bottom:1px solid var(--line);${i === c.step ? 'color:var(--amber)' : ''}"><span class="mut" style="flex:none;width:36px">${label}</span><span style="flex:3">${mid}</span><b style="text-align:right;flex:1">${hs ? `${hs.hg}–${hs.ag}` : ''}</b></div>`;
  }).join('')}</div>`,
  evoluir: (c) => {
    const sub = S.sub || 'skills';
    return `<div class="chips" style="margin-bottom:10px">${[['skills', '⚡ Habilidades'], ['loja', '🛒 Loja']].map(([k, v]) => `<button class="ctab ${sub === k ? 'on' : ''}" data-a="sub" data-id="${k}" style="flex:none;min-height:40px">${v}</button>`).join('')}</div>${S.toast ? `<div class="card gold" role="status">${esc(S.toast)}</div>` : ''}${sub === 'skills' ? skillsHtml(c) : shopHtml(c)}`;
  },
  comp: (c) => {
    const cur = S.comp || divOf(c, c.clubId);
    return `<div class="chips" style="margin-bottom:10px">${[['A', 'Série A'], ['B', 'Série B'], ['C', 'Série C'], ['lib', 'Libertadores'], ['sula', 'Sul-Americana'], ['copa', 'Copa do Brasil'], ['sel', 'Seleção']].map(([k, v]) => `<button class="ctab ${cur === k ? 'on' : ''}" data-a="comp" data-id="${k}" style="flex:none;min-height:38px">${v}</button>`).join('')}</div>${cur === 'lib' ? libHtml(c) : cur === 'sula' ? sulaHtml(c) : cur === 'copa' ? copaHtml(c) : cur === 'sel' ? selHtml(c) : tableHtml(c, cur)}`;
  },
};

['change', 'input'].forEach(ev => document.addEventListener(ev, () => { if (S.screen === 'create') updateCreator(); }));
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, id = b.dataset.id, y = window.scrollY, keep = ['up', 'auto', 'buy', 'equip', 'perk', 'sub'].includes(a);
  S.toast = null;
  SFX.init(); if (a === 'mute') { b.textContent = SFX.toggle() ? '🔊' : '🔇'; return; } if (a !== 'speed' && a !== 'skip') SFX.blip();
  if (a === 'speed') { if (S.live) S.live.speed(+id); return; }
  if (a === 'skip') { if (S.live) S.live.skip(); const mb = document.getElementById('mom'); if (mb) mb.hidden = true; return; }
  if (a === 'decide') { decide(id); return; }
  if (a === 'momtoggle') { S.moments = !S.moments; try { localStorage.setItem('rat_moments', S.moments ? '1' : '0'); } catch { } b.textContent = `🎯 ${S.moments ? 'ON' : 'OFF'}`; if (S.live) S.live.moments(S.moments); const mb = document.getElementById('mom'); if (mb && !S.moments) mb.hidden = true; return; }
  if (a === 'ctab') { document.querySelectorAll('.ctab').forEach(x => x.classList.toggle('on', x.dataset.id === id)); document.querySelectorAll('.cp').forEach(x => x.classList.toggle('on', x.dataset.p === id)); return; }
  if (a === 'rand' || a === 'reset') {
    const cnt = { skin: SKIN.length, hair: HAIR.length, eye: EYES.length, style: STYLES.length, shape: SHAPES.length, mouth: MOUTHS.length, acc: ACCS.length };
    for (const [n, k] of Object.entries(cnt)) { const v = a === 'rand' ? Math.floor(Math.random() * k) : DEFAULT.look[n]; const el = document.querySelector(`input[name=${n}][value="${v}"]`); if (el) el.checked = true; }
    if (a === 'reset') document.getElementById('f-num').value = 10;
    updateCreator(); return;
  }
  if (a === 'menu') S.screen = 'menu';
  else if (a === 'new') { S.draft = null; S.screen = 'create'; }
  else if (a === 'edit') S.screen = 'create';
  else if (a === 'continue') { const c = loadCareer(); if (c) { ensureLib(c); S.career = c; S.screen = c.retired ? 'end' : 'hub'; S.tab = 'home'; S.comp = null; } }
  else if (a === 'to-club') {
    const v = (i) => gv(i).trim();
    const age = Math.max(16, Math.min(34, parseInt(v('f-age'), 10) || 18));
    S.draft = { name: v('f-name') || 'Jogador', surname: v('f-sur') || 'Novato', age, nat: v('f-nat'), pos: v('f-pos'), foot: v('f-foot'), look: readLook() };
    S.offer = pickStart(); S.screen = 'club';
  } else if (a === 'pick') { S.career = newCareer(S.draft, id); persist(); S.screen = 'hub'; S.tab = 'home'; S.comp = null; }
  else if (a === 'reroll') S.offer = pickStart();
  else if (a === 'quick') { S.q = { seed: Date.now() >>> 0 }; S.dec = []; S.report = quickMatch(S.moments ? S.dec : null); S.screen = 'live'; }
  else if (a === 'tab') S.tab = id;
  else if (a === 'comp') { S.tab = 'comp'; S.comp = id; }
  else if (a === 'sub') S.sub = id;
  else if (a === 'evolve') { S.tab = 'evoluir'; S.sub = 'skills'; }
  else if (a === 'up') { const r = upgrade(S.career.player, id); if (r === 'ok') persist(); else S.toast = { ph: 'Pontos insuficientes.', potencial: 'Você atingiu o potencial máximo do seu overall base. Os itens da Loja ainda dão bônus!', max: 'Atributo no máximo.', irrelevante: 'Esse atributo não conta para a sua posição.' }[r]; }
  else if (a === 'auto') { const n = autoSpend(S.career.player); persist(); S.toast = n ? `${n} melhoria(s) aplicada(s)!` : 'Nada para melhorar: faltam pontos ou você atingiu o potencial.'; }
  else if (a === 'buy') { const r = buyItem(S.career, id); if (r === 'ok') { persist(); S.toast = `Comprado e equipado: ${ITEMS[id].name}!`; } else S.toast = r === 'dinheiro' ? 'Dinheiro insuficiente.' : 'Você já tem esse item.'; }
  else if (a === 'equip') { if (equipItem(S.career, id)) { persist(); S.toast = `Equipado: ${ITEMS[id].name}.`; } }
  else if (a === 'perk') { const r = buyPerk(S.career, id); if (r === 'ok') { persist(); S.toast = `${PERKS[id].name} contratado!`; } else S.toast = r === 'dinheiro' ? 'Dinheiro insuficiente.' : 'Já está no nível máximo.'; }
  else if (a === 'play') { S.snap = S.moments ? JSON.stringify(S.career) : null; S.dec = []; S.report = playRound(S.career, S.moments ? { decisions: S.dec } : null); persist(); S.screen = S.report.user ? 'live' : 'slot'; }
  else if (a === 'summary') S.screen = 'match';
  else if (a === 'back') S.screen = 'hub';
  else if (a === 'next') { startNextSeason(S.career); persist(); S.tab = 'inicio'; S.comp = null; }
  else if (a === 'retire') { if (retire(S.career)) { persist(); S.screen = 'end'; } }
  else if (a === 'train') { S.career.training = id; persist(); }
  else if (a === 'accept') { acceptOffer(S.career, +id); persist(); }
  else if (a === 'decline') { declineOffer(S.career, +id); persist(); }
  render(); if (keep) window.scrollTo(0, y);
});
render();
