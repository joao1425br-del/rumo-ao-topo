import { makeRng, clamp } from './rng.js';
import { CLUBS, CLUBS_C, FOREIGN, ROSTERS, NATIONS, SLOTS, FIRST, LAST, WEIGHTS, ITEMS, PERKS } from './data.js';
import { createPlayer, applyXp, calcOverall } from './player.js';
import { roundRobin } from './schedule.js';
import { simulateMatch } from './match.js';

// Lances decisivos: com 'opt' ativo, a partida do jogador usa um gerador próprio (1 sorteio do principal), então refazê-la com outras escolhas não muda o resto da rodada
let OPT_MOM = null;
function simU(h, a, rng, u) {
  if (u && OPT_MOM) return simulateMatch(h, a, makeRng(rng.int(1, 2147483646)), { ...u, interactive: true, decisions: OPT_MOM.decisions });
  return simulateMatch(h, a, rng, u);
}

export const PHASE_NAME = { pre: 'Pré-Libertadores', prel: 'Fase preliminar', oit: 'Oitavas de final', qua: 'Quartas de final', sem: 'Semifinal', fin: 'Final' };
const PH_ORDER = ['prel', 'oit', 'qua', 'sem', 'fin'];
// Depois de qual rodada do Brasileirão entra cada jogo da Copa do Brasil (ida/volta; final em jogo único) e cada Data FIFA
const CUP_AFTER = { 5: ['prel', 1], 6: ['prel', 2], 10: ['oit', 1], 11: ['oit', 2], 16: ['qua', 1], 17: ['qua', 2], 24: ['sem', 1], 25: ['sem', 2], 33: ['fin', 1] };
const NAT_AFTER = { 8: 1, 20: 2, 30: 3 };
// ===== Libertadores: 32 clubes, 8 grupos de 4 (6 jogos), oitavas/quartas/semis com ida e volta, final em jogo único =====
// Vagas: 4 primeiros da Série A + campeão da Copa do Brasil (se de fora do G4); o resto vem dos clubes estrangeiros mais fortes.
const LIB_SEQ = [['grp', 1], ['grp', 2], ['grp', 3], ['grp', 4], ['grp', 5], ['grp', 6], ['oit', 1], ['oit', 2], ['qua', 1], ['qua', 2], ['sem', 1], ['sem', 2], ['fin', 1]];
const LIB_AFTER = { 2: 0, 4: 1, 9: 2, 13: 3, 18: 4, 22: 5, 26: 6, 27: 7, 29: 8, 31: 9, 34: 10, 35: 11, 38: 12 };
export const libRank = (L, g) => g.slice().sort((x, y) => { const a = L.gt[x], b = L.gt[y]; return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf; });
// Pré-Libertadores: o 5º e o 6º da Série A (ida e volta) enfrentam os 2 clubes estrangeiros mais fracos da edição; os 2 vencedores completam os 32 da Libertadores.
function drawLib(c, rng) {
  const L = c.lib, sorted = L.main.concat(L.pre.winners).sort((x, y) => club(c, y).strength - club(c, x).strength), pots = [0, 1, 2, 3].map(i => shuffle(rng, sorted.slice(i * 8, i * 8 + 8)));
  L.teams = sorted; L.groups = [0, 1, 2, 3, 4, 5, 6, 7].map(g => pots.map(p => p[g])); L.fix = L.groups.map(g => roundRobin(g)); L.phase = 'grp'; L.gt = {};
  sorted.forEach(id => { L.gt[id] = blank(); });
}
function initLib(c, rng) {
  const byStr = c.league.A.slice().sort((x, y) => club(c, y).strength - club(c, x).strength);
  const br = c.nextLib && c.nextLib.length ? c.nextLib : byStr.slice(0, 4), rest = byStr.filter(id => !br.includes(id));
  const prePool = (c.nextPre && c.nextPre.length ? c.nextPre : rest.slice(0, 2)).filter(id => !br.includes(id)).slice(0, 2);
  const fo = c.clubs.filter(k => k.div === 'X').sort((x, y) => y.strength - x.strength).slice(0, 32 - br.length).map(k => k.id), n = Math.min(prePool.length, fo.length);
  const preFor = n ? fo.slice(-n) : [], main = br.concat(fo.slice(0, fo.length - n));
  const ties = prePool.slice(0, n).map((id, i) => ({ a: preFor[n - 1 - i], b: id, g1: null, g2: null, w: null, pen: false }));
  c.lib = { main, field: main.concat(ties.flatMap(t => [t.a, t.b])), pre: { ties, log: [], done: false, winners: [] }, teams: main.slice(), groups: [], fix: [], gt: {}, phase: 'pre', ties: [], log: [], champion: null, n: 0 };
  c.nextLib = null; c.nextPre = null;
  if (!ties.some(t => t.a === c.clubId || t.b === c.clubId)) finishPre(c, rng); // clube do jogador fora da Pré: resolvida ao fundo
}
// Joga (ou simula ao fundo) o que falta da Pré-Libertadores e sorteia os grupos
function finishPre(c, rng) {
  const L = c.lib; if (!L.pre || L.pre.done) return;
  if (L.pre.ties.length && !L.pre.ties[0].g1) koLeg(c, L.pre.ties, 1, false, rng, false);
  if (L.pre.ties.length && !L.pre.ties[0].g2) koLeg(c, L.pre.ties, 2, true, rng, false);
  endPre(c, rng);
}
function endPre(c, rng) {
  const L = c.lib; L.pre.done = true; L.pre.winners = L.pre.ties.map(t => t.w); L.pre.log = [{ phase: 'pre', ties: L.pre.ties }]; drawLib(c, rng);
}
// Saves antigos: adiciona os clubes estrangeiros e a Libertadores da temporada (simulada ao fundo até a próxima temporada), a Série C e a Sul-Americana
export function ensureLib(c) {
  const rng = makeRng(c.seed);
  ensureDivs(c, rng);
  if (!c.clubs.some(k => k.div === 'X')) { c.clubs = c.clubs.concat(FOREIGN.map(k => ({ ...k, lineup: genLineup(k, rng) }))); c.clubs.forEach(k => { if (!c.table[k.id]) c.table[k.id] = blank(); }); }
  if (!c.lib) initLib(c, rng);
  else if (!c.lib.pre) { c.lib.main = c.lib.teams.slice(); c.lib.field = c.lib.teams.slice(); c.lib.pre = { ties: [], log: [], done: true, winners: [] }; }
  if (!c.sula) initSula(c, rng);
  c.seed = rng.state(); return c;
}
// Série C em saves antigos: entra com tabela zerada e calendário só dali para frente
export function ensureDivs(c, rng = makeRng(c.seed)) {
  if (c.league.C) return c;
  const add = CLUBS_C.filter(k => !c.clubs.some(x => x.id === k.id)).map(k => ({ ...k, lineup: genLineup(k, rng) }));
  c.clubs = c.clubs.concat(add); c.league.C = CLUBS_C.map(k => k.id); c.fixtures.C = roundRobin(c.league.C); c.clubs.forEach(k => { if (!c.table[k.id]) c.table[k.id] = blank(); });
  c.seed = rng.state(); return c;
}
// Joga uma rodada (ida, volta ou jogo único) de um chaveamento; live = o jogador pode estar em campo
function koLeg(c, ties, leg, last, rng, live, key, ph) {
  let mine = null; const others = [];
  for (const t of ties) {
    const [h, a] = leg === 1 ? [t.a, t.b] : [t.b, t.a], my = live && (h === c.clubId || a === c.clubId);
    const r = simU(club(c, h), club(c, a), rng, my ? { side: h === c.clubId ? 'h' : 'a', player: c.player } : null);
    const x = leg === 1 ? [r.home.g, r.away.g] : [r.away.g, r.home.g]; if (leg === 1) t.g1 = x; else t.g2 = x;
    if (my) { mine = r; mine.tie = t; if (key) c.ss[key] = ph; } else others.push({ h: r.home.short, a: r.away.short, hg: r.home.g, ag: r.away.g });
  }
  if (last) { ties.forEach(t => resolveTie(c, t, rng)); if (mine) { const t = mine.tie; mine.tieInfo = { a: t.a, b: t.b, aggA: t.aggA, aggB: t.aggB, pen: t.pen, winner: t.w }; } }
  return { m: mine, others };
}
function playPre(c, slot, rng) {
  const L = c.lib, last = slot.leg === 2, x = koLeg(c, L.pre.ties, slot.leg, last, rng, true, 'lib', 'pre');
  if (last) endPre(c, rng); return x;
}
// ===== Sul-Americana: 16 clubes (7º ao 14º da Série A + os 8 terceiros colocados dos grupos da Libertadores); oitavas, quartas e semis com ida e volta, final única =====
const SULA_SEQ = [['oit', 1], ['oit', 2], ['qua', 1], ['qua', 2], ['sem', 1], ['sem', 2], ['fin', 1]];
const SULA_AFTER = { 23: 0, 28: 1, 31: 2, 32: 3, 36: 4, 37: 5, 38: 6 };
function initSula(c, rng) {
  const L = c.lib, taken = L ? (L.field || L.teams) : [], byStr = c.league.A.slice().sort((x, y) => club(c, y).strength - club(c, x).strength).filter(id => !taken.includes(id));
  const br = (c.nextSula && c.nextSula.length ? c.nextSula.filter(id => !taken.includes(id)) : byStr.slice(2, 10)).slice(0, 8);
  c.sula = { br, ties: [], phase: 'wait', log: [], champion: null, n: 0, lib3: [] }; c.nextSula = null;
  if (L && L.n >= 6 && L.groups.length) formSula(c, rng); // save antigo com a fase de grupos já encerrada
}
// Chaveia a Sul-Americana quando acaba a fase de grupos da Libertadores
function formSula(c, rng) {
  const S = c.sula, L = c.lib; if (S.phase !== 'wait') return;
  const lib3 = L.groups.map(g => libRank(L, g)[2]), br = shuffle(rng, S.br), l3 = shuffle(rng, lib3), n = Math.min(br.length, l3.length);
  S.lib3 = lib3; S.ties = l3.slice(0, n).map((id, i) => ({ a: id, b: br[i], g1: null, g2: null, w: null, pen: false })); S.phase = 'oit';
  if (c.cal && lib3.includes(c.clubId) && !c.cal.some(s => s.k === 'sula')) insertSulaSlots(c);
}
function insertSulaSlots(c) {
  for (const [rd, i] of Object.entries(SULA_AFTER)) {
    let at = c.cal.findIndex(s => s.k === 'liga' && s.r === +rd - 1); if (at < 0 || at < c.step - 1) continue;
    while (c.cal[at + 1] && c.cal[at + 1].k !== 'liga') at++;
    c.cal.splice(at + 1, 0, { k: 'sula', i, phase: SULA_SEQ[i][0], leg: SULA_SEQ[i][1] });
  }
}
function playSula(c, rng, live = true) {
  const S = c.sula, [ph, leg] = SULA_SEQ[S.n++], last = ph === 'fin' || leg === 2;
  const x = koLeg(c, S.ties, leg, last, rng, live, 'sula', ph);
  if (last) {
    S.log.push({ phase: ph, ties: S.ties }); const w = S.ties.map(t => t.w);
    if (ph === 'fin') { S.champion = w[0]; S.phase = 'done'; S.ties = []; } else { S.phase = ['qua', 'sem', 'fin'][['oit', 'qua', 'sem'].indexOf(ph)]; S.ties = drawTies(rng, w); }
  }
  return x;
}
// ===== Playoff de acesso da Série B: 1º e 2º sobem direto; 3º x 6º e 4º x 5º (ida e volta, o pior colocado joga a ida em casa); os 2 vencedores sobem =====
function initPlayoff(c) {
  const t = standings(c, 'B').map(x => x.id);
  c.pb = { ties: [[5, 2], [4, 3]].map(([a, b]) => ({ a: t[a], b: t[b], g1: null, g2: null, w: null, pen: false })), done: false, winners: [] };
}
function finishPlayoff(c, rng) {
  if (!c.pb) initPlayoff(c);
  const P = c.pb; if (P.done) return;
  if (!P.ties[0].g1) koLeg(c, P.ties, 1, false, rng, false);
  if (!P.ties[0].g2) koLeg(c, P.ties, 2, true, rng, false);
  endPlayoff(c);
}
function endPlayoff(c) { c.pb.done = true; c.pb.winners = c.pb.ties.map(t => t.w); }
function playLib(c, rng) {
  const L = c.lib, [ph, leg] = LIB_SEQ[L.n++]; let mine = null; const others = [];
  const sim = (h, a, t) => {
    const my = h === c.clubId || a === c.clubId;
    const r = simU(club(c, h), club(c, a), rng, my ? { side: h === c.clubId ? 'h' : 'a', player: c.player } : null);
    if (my) { mine = r; c.ss.lib = ph; if (t) mine.tie = t; } else others.push({ h: r.home.short, a: r.away.short, hg: r.home.g, ag: r.away.g });
    return r;
  };
  if (ph === 'grp') {
    L.fix.forEach(f => f[leg - 1].forEach(([h, a]) => { const r = sim(h, a); record(L.gt[h], r.home.g, r.away.g); record(L.gt[a], r.away.g, r.home.g); }));
    if (leg === 6) { const rk = L.groups.map(g => libRank(L, g)); L.phase = 'oit'; L.ties = rk.map((g, i) => ({ a: g[0], b: rk[(i + 1) % 8][1], g1: null, g2: null, w: null, pen: false })); formSula(c, rng); }
  } else {
    const last = ph === 'fin' || leg === 2;
    for (const t of L.ties) { const [h, a] = leg === 1 ? [t.a, t.b] : [t.b, t.a], r = sim(h, a, t); const x = leg === 1 ? [r.home.g, r.away.g] : [r.away.g, r.home.g]; if (leg === 1) t.g1 = x; else t.g2 = x; }
    if (last) {
      L.ties.forEach(t => resolveTie(c, t, rng));
      if (mine) { const t = mine.tie; mine.tieInfo = { a: t.a, b: t.b, aggA: t.aggA, aggB: t.aggB, pen: t.pen, winner: t.w }; }
      L.log.push({ phase: ph, ties: L.ties }); const w = L.ties.map(t => t.w);
      if (ph === 'fin') { L.champion = w[0]; L.phase = 'done'; L.ties = []; } else { L.phase = ['qua', 'sem', 'fin'][['oit', 'qua', 'sem'].indexOf(ph)]; L.ties = drawTies(rng, w); }
    }
  }
  return { m: mine, others };
}

const XP_SCALE = .7;
const blank = () => ({ p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
const blankSs = () => ({ apps: 0, goals: 0, assists: 0, ratingSum: 0, rated: 0, called: 0, cup: '', lib: '', sula: '', pb: '' });

// opts: lib (joga a Libertadores), pre (joga a Pré-Libertadores, antes da rodada 1), sula (começa na Sul-Americana), pb (clube na Série B: reserva datas do playoff de acesso)
export function buildCalendar(opts = {}) {
  const o = typeof opts === 'boolean' ? { lib: opts } : opts, cal = [];
  if (o.pre) cal.push({ k: 'pre', leg: 1 }, { k: 'pre', leg: 2 });
  for (let r = 0; r < 38; r++) {
    cal.push({ k: 'liga', r });
    const cp = CUP_AFTER[r + 1]; if (cp) cal.push({ k: 'copa', phase: cp[0], leg: cp[1] });
    const w = NAT_AFTER[r + 1]; if (w) cal.push({ k: 'sel', w });
    const li = LIB_AFTER[r + 1]; if (o.lib && li !== undefined) cal.push({ k: 'lib', i: li, phase: LIB_SEQ[li][0], leg: LIB_SEQ[li][1] });
    const si = SULA_AFTER[r + 1]; if (o.sula && si !== undefined) cal.push({ k: 'sula', i: si, phase: SULA_SEQ[si][0], leg: SULA_SEQ[si][1] });
    if (r === 37 && o.pb) cal.push({ k: 'pb', leg: 1 }, { k: 'pb', leg: 2 });
  }
  return cal;
}
// Compromissos extras do clube do jogador na temporada que começa
const calOpts = (c) => ({ lib: !!c.lib.field && c.lib.field.includes(c.clubId), pre: c.lib.pre.ties.some(t => t.a === c.clubId || t.b === c.clubId), sula: c.sula.br.includes(c.clubId), pb: divOf(c, c.clubId) === 'B' });
function genLineup(team, rng) {
  const R = ROSTERS[team.id] ? ROSTERS[team.id].split(',') : null; // elenco real, se cadastrado
  return SLOTS.map((pos, i) => ({ name: R ? R[i].trim() : `${rng.pick(FIRST)} ${rng.pick(LAST)}`, pos, ovr: clamp(team.strength + rng.int(-4, 4), 35, 95) }));
}
function shuffle(rng, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rng.int(0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function drawTies(rng, ids) { const s = shuffle(rng, ids), t = []; for (let i = 0; i < s.length; i += 2) t.push({ a: s[i], b: s[i + 1], g1: null, g2: null, w: null, pen: false }); return t; }
// Copa do Brasil (simplificada): os 20 da Série A + os 4 melhores da Série B; os 16 mais fracos jogam a fase preliminar (8 confrontos)
function initCup(c, rng) {
  const bTop = c.league.B.map(id => club(c, id)).sort((x, y) => x.strength - y.strength).slice(-4).map(k => k.id);
  const pool = c.league.A.concat(bTop).sort((x, y) => club(c, x).strength - club(c, y).strength);
  c.cup = { phase: 'prel', ties: drawTies(rng, pool.slice(0, 16)), byes: pool.slice(16), log: [], champion: null };
}
function initNation(c, rng) {
  const n = NATIONS[c.player.nat] || NATIONS['Brasil'];
  c.nat = { ...n, lineup: genLineup(n, rng) };
  c.natFix = shuffle(rng, Object.keys(NATIONS).filter(x => x !== n.name)).slice(0, 3);
}

export function newCareer(opts, clubId, seed = Date.now()) {
  const rng = makeRng(seed);
  const player = createPlayer(opts, rng);
  const clubs = CLUBS.concat(CLUBS_C, FOREIGN).map(k => ({ ...k, lineup: genLineup(k, rng) }));
  const table = {}; clubs.forEach(k => table[k.id] = blank());
  const league = { A: clubs.filter(k => k.div === 'A').map(k => k.id), B: clubs.filter(k => k.div === 'B').map(k => k.id), C: clubs.filter(k => k.div === 'C').map(k => k.id) };
  const c = { version: 4, perks: { trainer: 0, nutri: 0, fisio: 0 }, owned: [], seed: 0, startAge: player.age, peakOverall: player.overall, retired: false, summary: null, player, clubId, clubs, season: 1, round: 0, step: 0, league, fixtures: { A: roundRobin(league.A), B: roundRobin(league.B), C: roundRobin(league.C) }, pendingMoves: null, cal: buildCalendar(), table, pb: null,
    history: [], ss: blankSs(), stats: { apps: 0, starts: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0, rated: 0 }, natStats: { called: 0, apps: 0, goals: 0 },
    trophies: [], seasonLog: [], training: 'tecnico', offers: [], money: 0, done: false };
  initCup(c, rng); initNation(c, rng); initLib(c, rng); initSula(c, rng); c.cal = buildCalendar(calOpts(c)); c.seed = rng.state();
  return c;
}
export const club = (c, id) => c.clubs.find(x => x.id === id);
export const divOf = (c, id) => c.league.A.includes(id) ? 'A' : c.league.B.includes(id) ? 'B' : 'C';
export function standings(c, div = divOf(c, c.clubId)) {
  return c.league[div].map(id => ({ id, ...c.table[id], gd: c.table[id].gf - c.table[id].ga })).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}
function record(t, gf, ga) { t.p++; t.gf += gf; t.ga += ga; if (gf > ga) { t.w++; t.pts += 3; } else if (gf === ga) { t.d++; t.pts++; } else t.l++; }

// Convocação: overall perto do titular da seleção na posição + boa fase recente (determinística, para poder mostrar antes)
export function natSlotOvr(c) { const s = c.nat.lineup.find(x => x.pos === c.player.pos); return s ? s.ovr : 99; }
export function isCalled(c) {
  const p = c.player, recent = c.history.filter(h => h.kind === 'liga' && h.rating != null).slice(-5);
  const form = recent.length ? recent.reduce((s, h) => s + h.rating, 0) / recent.length : 0;
  return p.injury <= 0 && p.overall >= natSlotOvr(c) - 5 && recent.length >= 3 && form >= 6.5;
}
const natTeam = (c) => ({ id: 'sel', ...c.nat });
const oppTeam = (name, rng) => { const n = NATIONS[name]; return { id: 'opp', ...n, lineup: genLineup(n, rng) }; };

// Descreve o próximo compromisso do calendário
export function nextSlot(c) {
  if (c.done) return null;
  const s = c.cal[c.step];
  if (s.k === 'liga') {
    const dv = divOf(c, c.clubId), f = c.fixtures[dv][s.r].find(([h, a]) => h === c.clubId || a === c.clubId);
    return { ...s, title: `Brasileirão Série ${dv} · Rodada ${s.r + 1} de 38`, plays: true, home: club(c, f[0]), away: club(c, f[1]) };
  }
  if (s.k === 'copa') {
    const t = c.cup.ties.find(x => x.a === c.clubId || x.b === c.clubId);
    const f = t ? (s.leg === 1 ? [t.a, t.b] : [t.b, t.a]) : null;
    return { ...s, title: `Copa do Brasil · ${PHASE_NAME[s.phase]}${s.phase === 'fin' ? '' : s.leg === 1 ? ' (ida)' : ' (volta)'}`, plays: !!t, tie: t, home: f && club(c, f[0]), away: f && club(c, f[1]) };
  }
  if (s.k === 'lib') {
    const L = c.lib; let f = null;
    if (s.phase === 'grp') { for (const g of L.fix) { const m = g[s.leg - 1].find(([h, a]) => h === c.clubId || a === c.clubId); if (m) f = m; } }
    else { const t = L.ties.find(x => x.a === c.clubId || x.b === c.clubId); if (t) f = s.leg === 1 ? [t.a, t.b] : [t.b, t.a]; }
    return { ...s, title: `Libertadores · ${s.phase === 'grp' ? 'Fase de grupos · Jogo ' + s.leg + ' de 6' : PHASE_NAME[s.phase] + (s.phase === 'fin' ? '' : s.leg === 1 ? ' (ida)' : ' (volta)')}`, plays: !!f, home: f && club(c, f[0]), away: f && club(c, f[1]) };
  }
  if (s.k === 'pre' || s.k === 'sula' || s.k === 'pb') {
    const ties = s.k === 'pre' ? c.lib.pre.ties : s.k === 'sula' ? c.sula.ties : (c.pb ? c.pb.ties : []), t = ties.find(x => x.a === c.clubId || x.b === c.clubId);
    const f = t ? (s.leg === 1 ? [t.a, t.b] : [t.b, t.a]) : null, leg = s.leg === 1 ? ' (ida)' : ' (volta)';
    const title = s.k === 'pre' ? `Pré-Libertadores${leg}` : s.k === 'sula' ? `Sul-Americana · ${PHASE_NAME[s.phase]}${s.phase === 'fin' ? '' : leg}` : `Série B · Playoff de acesso${leg}`;
    const msg = s.k === 'pre' ? 'Seu clube não disputa a Pré-Libertadores.' : s.k === 'sula' ? 'Seu clube não está mais na Sul-Americana.' : 'Seu clube não disputa o playoff de acesso.';
    return { ...s, title, plays: !!t, tie: t, msg, home: f && club(c, f[0]), away: f && club(c, f[1]) };
  }
  const called = isCalled(c);
  return { ...s, title: `Data FIFA · ${c.nat.name}`, plays: called, called, home: natTeam(c), away: NATIONS[c.natFix[s.w - 1]] };
}

function resolveTie(c, t, rng) {
  const g = [t.g1, t.g2].filter(Boolean);
  t.aggA = g.reduce((s, x) => s + x[0], 0); t.aggB = g.reduce((s, x) => s + x[1], 0);
  if (t.aggA !== t.aggB) t.w = t.aggA > t.aggB ? t.a : t.b;
  else { t.pen = true; t.w = rng() < clamp(.5 + (club(c, t.a).strength - club(c, t.b).strength) * .004, .35, .65) ? t.a : t.b; }
}
function advanceCup(c, rng) {
  const cup = c.cup; cup.log.push({ phase: cup.phase, ties: cup.ties });
  const winners = cup.ties.map(t => t.w);
  if (cup.phase === 'fin') { cup.champion = winners[0]; cup.phase = 'done'; cup.ties = []; return; }
  const next = PH_ORDER[PH_ORDER.indexOf(cup.phase) + 1];
  cup.ties = drawTies(rng, cup.phase === 'prel' ? winners.concat(cup.byes) : winners); cup.phase = next;
}
function playCup(c, slot, rng) {
  let mine = null; const others = [], last = slot.phase === 'fin' || slot.leg === 2;
  for (const t of c.cup.ties) {
    const [h, a] = slot.leg === 1 ? [t.a, t.b] : [t.b, t.a], isMine = h === c.clubId || a === c.clubId;
    const r = simU(club(c, h), club(c, a), rng, isMine ? { side: h === c.clubId ? 'h' : 'a', player: c.player } : null);
    const ga = slot.leg === 1 ? r.home.g : r.away.g, gb = slot.leg === 1 ? r.away.g : r.home.g;
    if (slot.leg === 1) t.g1 = [ga, gb]; else t.g2 = [ga, gb];
    if (isMine) { mine = r; mine.tie = t; c.ss.cup = slot.phase; } else others.push({ h: r.home.short, a: r.away.short, hg: r.home.g, ag: r.away.g });
  }
  if (last) for (const t of c.cup.ties) resolveTie(c, t, rng);
  if (mine && last) { const t = mine.tie; mine.tieInfo = { a: t.a, b: t.b, aggA: t.aggA, aggB: t.aggB, pen: t.pen, winner: t.w }; }
  if (last) advanceCup(c, rng);
  return { m: mine, others };
}
function playSel(c, slot, rng) {
  const called = isCalled(c), m = simU(natTeam(c), oppTeam(c.natFix[slot.w - 1], rng), rng, called ? { side: 'h', player: c.player } : null);
  if (called) { c.natStats.called++; c.ss.called++; }
  return { m: called ? m : null, others: called ? [] : [{ h: m.home.short, a: m.away.short, hg: m.home.g, ag: m.away.g }] };
}

// Efeitos no jogador depois de cada compromisso: XP, moral, forma, lesão e salário
function afterSlot(c, m, kind, rng, rep) {
  const p = c.player, st = c.stats, ss = c.ss, u = m && m.user, tr = c.training || 'tecnico';
  let gain = 2;
  if (u && u.minutes > 0) {
    if (kind === 'sel') { c.natStats.apps++; c.natStats.goals += u.goals; }
    else {
      st.apps++; if (u.starter) st.starts++; st.goals += u.goals; st.assists += u.assists; st.yellow += u.yellow; st.red += u.red; st.ratingSum += u.rating; st.rated++;
      ss.apps++; ss.goals += u.goals; ss.assists += u.assists; ss.ratingSum += u.rating; ss.rated++;
    }
    gain = Math.round(Math.max(0, (u.rating - 5.5) * 12) * XP_SCALE) + 2 + (kind === 'sel' ? 4 : 0);
    p.morale = clamp(p.morale + (u.result === 'V' ? 5 : u.result === 'D' ? -4 : 0) + (u.rating >= 7.5 ? 4 : u.rating < 6 ? -3 : 0), 0, 100);
  } else if (u && kind !== 'sel') p.morale = clamp(p.morale - 3, 0, 100);
  gain += tr === 'tecnico' ? 3 : tr === 'fisico' ? 1 : 0;
  const pk = c.perks || {}, fi = pk.fisio || 0;
  gain = Math.round(gain * (1 + PERKS.trainer.xp[pk.trainer || 0]));
  const before = p.overall, ups = applyXp(p, gain, rng), minutes = u ? u.minutes : 0;
  p.fitness = clamp(p.fitness - Math.round(minutes / 3) + 25 + (tr === 'descanso' ? 15 : tr === 'tecnico' ? -5 : 0) + PERKS.nutri.rec[pk.nutri || 0], 40, 100);
  if (m && kind !== 'sel' && (p.ban || 0) > 0) { p.ban--; rep.suspended = true; } // cumpriu um jogo de suspensão
  if (p.injury > 0) p.injury--;
  else if (minutes > 0 && rng.chance((.02 + (100 - p.fitness) * .0008) * (1 - PERKS.fisio.inj[fi]))) { p.injury = Math.max(1, rng.int(1, 4) - (fi >= 2 ? 1 : 0)); rep.injured = p.injury; }
  if (u && kind !== 'sel') { p.yAcc = (p.yAcc || 0) + u.yellow; if (u.ban) { p.ban = u.ban; p.yAcc = 0; rep.banned = u.ban; } else if (p.yAcc >= 3) { p.yAcc -= 3; p.ban = 1; rep.banned = 1; rep.accum = true; } }
  const paid = Math.round(p.contract.salary * 12 / c.cal.length) + (u && kind !== 'sel' ? u.goals * (p.contract.bonus || 0) : 0);
  c.money = (c.money || 0) + paid; rep.paid = paid;
  c.peakOverall = Math.max(c.peakOverall || 0, p.overall);
  rep.progress = { xp: gain, levels: ups.length, level: p.level, overallBefore: before, overallAfter: p.overall };
}

// Joga o próximo compromisso do calendário (rodada do Brasileirão, jogo da Copa ou Data FIFA)
export function playRound(c, opt = null) {
  OPT_MOM = opt && opt.decisions ? opt : null;
  try { return playRoundCore(c); } finally { OPT_MOM = null; }
}
function playRoundCore(c) {
  if (c.done || c.retired) return null;
  if (!c.league.C || !c.sula) ensureLib(c);
  const rng = makeRng(c.seed), slot = c.cal[c.step], p = c.player;
  if (c.lib.phase === 'pre' && slot.k !== 'pre') finishPre(c, rng); // segurança: a Pré-Libertadores não pode ficar pendente
  const rep = { kind: slot.k, step: c.step, title: nextSlot(c).title, user: null, others: [], note: '' };
  let m = null;
  if (slot.k === 'liga') {
    const ud = divOf(c, c.clubId);
    for (const dv of ['A', 'B', 'C']) for (const [h, a] of c.fixtures[dv][slot.r]) {
      const mine = dv === ud && (h === c.clubId || a === c.clubId);
      const r = simU(club(c, h), club(c, a), rng, mine ? { side: h === c.clubId ? 'h' : 'a', player: p } : null);
      record(c.table[h], r.home.g, r.away.g); record(c.table[a], r.away.g, r.home.g);
      if (mine) m = r; else if (dv === ud) rep.others.push({ h: r.home.short, a: r.away.short, hg: r.home.g, ag: r.away.g });
    }
    c.round = slot.r + 1; if (slot.r === 37) initPlayoff(c);
    // Libertadores sem o clube do jogador: simulada ao fundo no ritmo do calendário (a Sul-Americana depende do fim dos grupos)
    if (!c.cal.some(x => x.k === 'lib') && LIB_AFTER[c.round] !== undefined && c.lib.n === LIB_AFTER[c.round]) playLib(c, rng);
  } else if (slot.k === 'copa') {
    const x = playCup(c, slot, rng); m = x.m; rep.others = x.others;
    if (!m) rep.note = c.ss.cup ? 'Seu clube não está mais na Copa do Brasil. Veja como foram os outros jogos.' : 'Seu clube não disputa a Copa do Brasil neste ano (entram os 20 da Série A e os 4 melhores da Série B). Veja os outros jogos.';
  } else if (slot.k === 'lib') {
    const x = playLib(c, rng); m = x.m; rep.others = x.others;
    if (!m) rep.note = 'Seu clube não está mais na Libertadores. Veja como foram os outros jogos.';
  } else if (slot.k === 'pre') {
    const x = playPre(c, slot, rng); m = x.m; rep.others = x.others;
  } else if (slot.k === 'sula') {
    const x = playSula(c, rng); m = x.m; rep.others = x.others;
    if (!m) rep.note = 'Seu clube não está mais na Sul-Americana. Veja como foram os outros jogos.';
  } else if (slot.k === 'pb') {
    if (!c.pb) initPlayoff(c);
    const x = koLeg(c, c.pb.ties, slot.leg, slot.leg === 2, rng, true, 'pb', 'pb'); m = x.m; rep.others = x.others; if (slot.leg === 2) endPlayoff(c);
    if (!m) rep.note = 'Seu clube não disputa o playoff de acesso à Série A. Veja como foram os outros jogos.';
  } else {
    const x = playSel(c, slot, rng); m = x.m; rep.others = x.others;
    if (!m) rep.note = `Você não foi convocado para a seleção (${c.nat.name}). Na sua posição, é preciso overall ${natSlotOvr(c) - 5}+ e nota média 6,5+ nos últimos jogos.`;
  }
  if (m) Object.assign(rep, m);
  afterSlot(c, m, slot.k, rng, rep);
  if (m) c.history.push({ step: c.step, kind: slot.k, title: rep.title, h: m.home.short, a: m.away.short, hg: m.home.g, ag: m.away.g, rating: m.user.rating, minutes: m.user.minutes });
  c.step++;
  if (c.step >= c.cal.length) { c.done = true; finishPre(c, rng); while (c.lib && c.lib.n < LIB_SEQ.length) playLib(c, rng); formSula(c, rng); while (c.sula && c.sula.n < SULA_SEQ.length) playSula(c, rng, false); endSeason(c, rng); } else makeOffers(c, rng);
  c.seed = rng.state();
  return rep;
}

// Propostas: bom desempenho recente atrai clubes mais fortes (até 14 pontos de força acima)
function makeOffers(c, rng) {
  c.offers = (c.offers || []).filter(o => o.expires > c.step);
  if (c.done || c.round < 6 || c.offers.length >= 2) return;
  const rated = c.history.filter(h => h.kind === 'liga' && h.rating != null).slice(-3);
  if (rated.length < 3 || rated.reduce((s, h) => s + h.rating, 0) / rated.length < 6.7 || !rng.chance(.35)) return;
  const cur = club(c, c.clubId), p = c.player;
  const pool = c.clubs.filter(k => k.div !== 'X' && k.strength > cur.strength && k.strength <= cur.strength + 14 && !c.offers.some(o => o.clubId === k.id));
  if (!pool.length) return;
  const k = rng.pick(pool);
  c.offers.push({ clubId: k.id, salary: Math.round(p.contract.salary * (1 + (k.strength - cur.strength) / 40)), years: rng.int(2, 4), bonus: Math.round((p.contract.bonus || 500) * 1.3), expires: c.step + 5 });
}
export function acceptOffer(c, i) {
  const o = (c.offers || [])[i]; if (!o) return false;
  c.clubId = o.clubId; c.player.contract = { salary: o.salary, years: o.years, bonus: o.bonus };
  c.player.morale = clamp(c.player.morale + 10, 0, 100); c.offers = []; return true;
}
export function declineOffer(c, i) { (c.offers || []).splice(i, 1); }

// Fim de temporada: prêmios, histórico e contrato
export function endSeason(c, rng = makeRng(c.seed)) {
  const dv = divOf(c, c.clubId), t = standings(c, dv), pos = t.findIndex(x => x.id === c.clubId) + 1, p = c.player, ss = c.ss || blankSs();
  const avg = ss.rated ? ss.ratingSum / ss.rated : 0, awards = [];
  // acesso e rebaixamento: 4 últimos da A caem; sobem os 2 primeiros da B + os 2 vencedores do playoff (3º–6º); 4 últimos da B caem; sobem os 4 primeiros da C (não existe Série D: ninguém cai da C)
  finishPlayoff(c, rng);
  const down = standings(c, 'A').slice(16).map(x => x.id), up = standings(c, 'B').slice(0, 2).map(x => x.id).concat(c.pb.winners);
  const downB = standings(c, 'B').slice(16).map(x => x.id), upC = standings(c, 'C').slice(0, 4).map(x => x.id);
  c.pendingMoves = { down, up, downB, upC };
  const g4 = standings(c, 'A').slice(0, 4).map(x => x.id), cc = c.cup && c.cup.champion; c.nextLib = cc && !g4.includes(cc) ? g4.concat(cc) : g4;
  const restA = standings(c, 'A').map(x => x.id).filter(id => !c.nextLib.includes(id)); c.nextPre = restA.slice(0, 2); c.nextSula = restA.slice(2, 10);
  const relegated = (dv === 'A' || dv === 'B') && pos >= 17, promoted = (dv === 'B' && up.includes(c.clubId)) || (dv === 'C' && upC.includes(c.clubId));
  if (dv === 'A' && pos === 1) awards.push('campeao');
  if (dv === 'B' && pos === 1) awards.push('campeaoB');
  if (dv === 'C' && pos === 1) awards.push('campeaoC');
  if (promoted) awards.push(dv === 'C' ? 'acessoC' : 'acesso');
  if (c.sula && c.sula.champion === c.clubId) awards.push('sula');
  if (c.cup && c.cup.champion === c.clubId) awards.push('copa');
  if (c.lib && c.lib.champion === c.clubId) awards.push('liberta');
  if (ss.rated >= 25 && avg >= 7.3) awards.push('craque');
  if (ss.goals >= 15) awards.push('artilheiro');
  if (p.age <= 21 && ss.rated >= 18 && avg >= 6.8) awards.push('revelacao');
  if (ss.called >= 1) awards.push('convocado');
  c.trophies = (c.trophies || []).concat(awards.map(a => ({ season: c.season, type: a, club: c.clubId })));
  c.seasonLog = (c.seasonLog || []).concat({ season: c.season, club: c.clubId, div: dv, relegated, promoted, pos, pts: t[pos - 1].pts, champion: t[0].id, cup: c.cup && c.cup.champion === c.clubId ? 'fin+' : ss.cup, cupChampion: c.cup && c.cup.champion, lib: c.lib && c.lib.champion === c.clubId ? 'fin+' : ss.lib, libChampion: c.lib && c.lib.champion, sula: c.sula && c.sula.champion === c.clubId ? 'fin+' : ss.sula, sulaChampion: c.sula && c.sula.champion, pb: ss.pb, pbWinners: c.pb.winners.slice(),
    apps: ss.apps, goals: ss.goals, assists: ss.assists, called: ss.called, avg: +avg.toFixed(2), awards });
  p.contract.years = Math.max(0, p.contract.years - 1);
  const offers = [];
  if (p.contract.years === 0) offers.push({ renewal: true, clubId: c.clubId, salary: Math.round((2000 + p.overall * 45) * (1 + Math.max(0, avg - 6) / 10)), years: 3, bonus: 500 + p.overall * 12, expires: 1e9 });
  if (relegated && avg >= 6.2) { // clube rebaixado: quem foi bem ainda recebe propostas de clubes que continuam na mesma divisão (A ou B)
    const cur = club(c, c.clubId), stay = dv === 'A' ? c.league.A.filter(id => !down.includes(id)) : c.league.B.filter(id => !downB.includes(id) && !up.includes(id));
    const pool = stay.filter(id => club(c, id).strength > cur.strength && club(c, id).strength <= cur.strength + 16);
    for (const id of shuffle(rng, pool).slice(0, 2)) { const k = club(c, id); offers.push({ clubId: id, salary: Math.round(p.contract.salary * (1 + (k.strength - cur.strength) / 40)), years: rng.int(2, 4), bonus: Math.round((p.contract.bonus || 500) * 1.3), expires: 1e9 }); }
  }
  c.offers = offers;
}

// Nova temporada: jogador envelhece/evolui, clubes mudam de força, calendário, tabela e Copa recomeçam
export function startNextSeason(c) {
  if (!c.done || c.retired) return false;
  const rng = makeRng(c.seed), p = c.player, keys = Object.keys(WEIGHTS[p.pos]);
  p.age++;
  if (p.age <= 30) {
    p.ph = (p.ph || 0) + (p.age <= 23 ? 4 : p.age <= 27 ? 2 : 0); // crescimento natural da juventude: pontos extras na pré-temporada
  } else {
    // declínio por idade: a perda de overall por temporada cresce com os anos e pesa mais em ritmo e físico
    const start = p.overall, L = [0, 1, 1, 2, 2, 2, 3, 3, 3, 4][Math.min(9, p.age - 31)] + (p.age >= 34 && rng.chance(.4) ? 1 : 0);
    const w = keys.map(k => WEIGHTS[p.pos][k] * (k === 'ritmo' || k === 'fisico' ? 2 : 1));
    for (let g = 0; g < 40 && p.overall > start - L && p.overall > 40; g++) { const a = rng.weighted(keys, w); p.attrs[a] = Math.max(25, p.attrs[a] - 1); p.overall = calcOverall(p); }
  }
  if (p.contract.years <= 0) p.contract.years = 1;
  p.fitness = 100; p.injury = 0; p.yAcc = 0;
  const mv = { down: [], up: [], downB: [], upC: [], ...(c.pendingMoves || {}) };
  c.league.A = c.league.A.filter(id => !mv.down.includes(id)).concat(mv.up);
  c.league.B = c.league.B.filter(id => !mv.up.includes(id) && !mv.downB.includes(id)).concat(mv.down, mv.upC);
  c.league.C = (c.league.C || []).filter(id => !mv.upC.includes(id)).concat(mv.downB);
  mv.down.forEach(id => { club(c, id).strength -= 3; }); mv.up.forEach(id => { club(c, id).strength += 2; });
  mv.downB.forEach(id => { club(c, id).strength -= 2; }); mv.upC.forEach(id => { club(c, id).strength += 2; });
  if (mv.down.includes(c.clubId) || mv.downB.includes(c.clubId)) p.morale = clamp(p.morale - 12, 0, 100);
  if (mv.up.includes(c.clubId) || mv.upC.includes(c.clubId)) p.morale = clamp(p.morale + 12, 0, 100);
  c.pendingMoves = null;
  c.clubs.forEach(k => { k.strength = clamp(k.strength + rng.int(-3, 3), 40, 88); k.lineup = genLineup(k, rng); });
  c.season++; c.round = 0; c.step = 0; c.done = false; c.history = []; c.offers = [];
  c.fixtures = { A: roundRobin(c.league.A), B: roundRobin(c.league.B), C: roundRobin(c.league.C) }; c.pb = null;
  c.table = {}; c.clubs.forEach(k => c.table[k.id] = blank());
  initLib(c, rng); initSula(c, rng); c.cal = buildCalendar(calOpts(c));
  c.ss = blankSs(); initCup(c, rng); initNation(c, rng);
  c.seed = rng.state();
  return true;
}

// Aposentadoria: decisão entre 36 e 40 anos; obrigatória aos 41
export const canRetire = (c) => c.done && !c.retired && c.player.age >= 36;
export const mustRetire = (c) => c.done && !c.retired && c.player.age >= 41;
export function careerSummary(c) {
  const p = c.player, tr = {}; for (const t of c.trophies || []) tr[t.type] = (tr[t.type] || 0) + 1;
  const total = (c.trophies || []).length, st = c.stats;
  return { name: `${p.name} ${p.surname}`, seasons: (c.seasonLog || []).length, startAge: c.startAge ?? p.age, endAge: p.age,
    clubs: [...new Set((c.seasonLog || []).map(l => club(c, l.club).name))], trophies: tr, total,
    tier: total >= 8 ? 'Lenda' : total >= 4 ? 'Ídolo' : total >= 1 ? 'Campeão' : 'Jogador de carreira',
    peak: c.peakOverall || p.overall, apps: st.apps, goals: st.goals, assists: st.assists, avg: st.rated ? +(st.ratingSum / st.rated).toFixed(2) : 0,
    nat: { ...c.natStats, country: c.nat.name }, money: c.money || 0,
    relegations: (c.seasonLog || []).filter(l => l.relegated).length, promotions: (c.seasonLog || []).filter(l => l.promoted).length };
}
export function retire(c) {
  if (!canRetire(c)) return false;
  c.retired = true; c.summary = careerSummary(c); return true;
}

// ===== Loja =====
export function buyItem(c, id) {
  const it = ITEMS[id]; if (!it) return 'invalido'; if ((c.owned || []).includes(id)) return 'ja';
  if ((c.money || 0) < it.price) return 'dinheiro';
  c.money -= it.price; c.owned = (c.owned || []).concat(id); c.player.gear = c.player.gear || {}; c.player.gear[it.slot] = id; c.player.overall = calcOverall(c.player);
  return 'ok';
}
export function equipItem(c, id) {
  const it = ITEMS[id]; if (!it || !(c.owned || []).includes(id)) return false;
  c.player.gear = c.player.gear || {}; c.player.gear[it.slot] = id; c.player.overall = calcOverall(c.player); return true;
}
export function buyPerk(c, key) {
  const P = PERKS[key]; if (!P) return 'invalido';
  const next = ((c.perks || {})[key] || 0) + 1; if (next > 3) return 'max';
  const price = P.prices[next - 1]; if ((c.money || 0) < price) return 'dinheiro';
  c.money -= price; c.perks = { ...(c.perks || {}), [key]: next }; return 'ok';
}
