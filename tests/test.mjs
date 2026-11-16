import assert from 'node:assert/strict';
import { makeRng } from '../www/js/core/rng.js';
import { ROSTERS, POSITIONS, CLUBS, CLUBS_C, NATIONS, SLOTS, NATS, ITEMS, PERKS, LINES } from '../www/js/core/data.js';
import { createPlayer, applyXp, upgrade, upgradeCost, autoSpend, baseOverall, effAttrs, PH_PER_LEVEL } from '../www/js/core/player.js';
import { roundRobin } from '../www/js/core/schedule.js';
import { simulateMatch } from '../www/js/core/match.js';
import { newCareer, playRound, standings, acceptOffer, endSeason, startNextSeason, buildCalendar, nextSlot, isCalled, club, canRetire, mustRetire, retire, careerSummary, divOf, buyItem, equipItem, buyPerk, ensureLib, libRank } from '../www/js/core/career.js';
import { saveCareer, loadCareer } from '../www/js/core/save.js';
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('OK  ', name); };
const base = { name: 'A', surname: 'B', age: 18, nat: 'Brasil', foot: 'D', look: {} };
const season = (c) => { let k = 0; while (!c.done) { playRound(c); k++; } return k; };

ok('overall inicial 50–60 em todas as posições', () => {
  for (const pos of Object.keys(POSITIONS)) for (let s = 1; s <= 300; s++) {
    const p = createPlayer({ ...base, pos }, makeRng(s));
    assert.ok(p.overall >= 50 && p.overall <= 60, `${pos} seed ${s}: ${p.overall}`); assert.ok(p.potential > p.overall);
  }
});
ok('Série A e Série B reais: 40 clubes únicos, 38 rodadas por divisão, 380 jogos, cada mando 1x', () => {
  assert.equal(CLUBS.length, 40); // Série C fica em CLUBS_C assert.equal(new Set(CLUBS.map(c => c.id)).size, 40); assert.equal(new Set(CLUBS.map(c => c.short)).size, 40);
  assert.ok(CLUBS.every(c => /^#/.test(c.color) && /^#/.test(c.color2) && c.pat && ['A', 'B'].includes(c.div)));
  const A = CLUBS.filter(c => c.div === 'A'), B = CLUBS.filter(c => c.div === 'B'); assert.equal(A.length, 20); assert.equal(B.length, 20);
  for (const nm of ['Flamengo', 'Palmeiras', 'Corinthians', 'Remo', 'Coritiba', 'Chapecoense', 'Santos', 'São Paulo']) assert.ok(A.some(c => c.name === nm), nm);
  for (const nm of ['Ceará', 'Fortaleza', 'Sport', 'Juventude', 'Goiás', 'Novorizontino', 'Londrina', 'São Bernardo', 'Vila Nova', 'Ponte Preta']) assert.ok(B.some(c => c.name === nm), nm);
  assert.ok(Math.max(...B.map(c => c.strength)) < Math.max(...A.map(c => c.strength)));
  assert.equal(CLUBS.filter(c => c.start).length, 6); assert.equal(CLUBS.filter(c => c.start && c.div === 'B').length, 3);
  for (const d of [A, B]) {
    const r = roundRobin(d.map(c => c.id)); assert.equal(r.length, 38);
    const seen = new Map();
    r.forEach(rd => { assert.equal(rd.length, 10); assert.equal(new Set(rd.flat()).size, 20); rd.forEach(([h, a]) => seen.set(h + '>' + a, (seen.get(h + '>' + a) || 0) + 1)); });
    assert.equal(seen.size, 380); assert.ok([...seen.values()].every(v => v === 1));
  }
  for (const nat of NATS) assert.ok(NATIONS[nat], nat);
});
ok('calendário: 38 rodadas + 9 jogos de Copa (final única) + 3 Datas FIFA', () => {
  const cal = buildCalendar(); assert.equal(cal.length, 50);
  assert.equal(cal.filter(s => s.k === 'liga').length, 38); assert.equal(cal.filter(s => s.k === 'copa').length, 9); assert.equal(cal.filter(s => s.k === 'sel').length, 3);
  assert.equal(cal.filter(s => s.k === 'copa' && s.phase === 'fin').length, 1);
});
const mk = (id, s) => ({ id, name: id, short: id, lineup: SLOTS.map(pos => ({ name: pos + id, pos, ovr: s })) });
ok('simulação: média de gols plausível e time forte vence mais', () => {
  const rng = makeRng(7); let goals = 0, w = 0, l = 0; const N = 2000;
  for (let i = 0; i < N; i++) { const r = simulateMatch(mk('f', 82), mk('x', 54), rng); goals += r.home.g + r.away.g; if (r.home.g > r.away.g) w++; else if (r.home.g < r.away.g) l++; }
  console.log(`      gols/jogo=${(goals / N).toFixed(2)} forte vence=${(w / N * 100).toFixed(0)}% perde=${(l / N * 100).toFixed(0)}%`);
  assert.ok(goals / N > 1.8 && goals / N < 4.2); assert.ok(w / N > .6 && w > l * 4);
});
ok('jogador fraco vira reserva em clube forte; titular em clube fraco', () => {
  const p = createPlayer({ ...base, pos: 'ATA' }, makeRng(3)), rng = makeRng(1);
  assert.equal(simulateMatch(mk('f', 48), mk('x', 48), rng, { side: 'h', player: p }).user.starter, true);
  assert.equal(simulateMatch(mk('f', 80), mk('x', 48), rng, { side: 'h', player: p }).user.starter, false);
});
ok('temporada completa (50 compromissos): tabela, Copa, salvar/carregar', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 42);
  assert.equal(season(c), 50);
  const t = standings(c); assert.ok(t.every(x => x.p === 38)); assert.ok(standings(c, 'B').every(x => x.p === 38)); assert.equal(standings(c, 'A').length, 20);
  assert.equal(t.reduce((s, x) => s + x.w, 0), t.reduce((s, x) => s + x.l, 0)); assert.equal(t.reduce((s, x) => s + x.gf, 0), t.reduce((s, x) => s + x.ga, 0));
  const sizes = Object.fromEntries(c.cup.log.map(l => [l.phase, l.ties.length])); assert.deepEqual(sizes, { prel: 8, oit: 8, qua: 4, sem: 2, fin: 1 });
  assert.ok(c.cup.log.every(l => l.ties.every(t => t.w && [t.a, t.b].includes(t.w))));
  assert.ok(club(c, c.cup.champion), 'sem campeão da Copa'); assert.equal(c.seasonLog.length, 1);
  assert.ok(c.stats.apps <= 47 && c.stats.apps > 20);
  const mem = {}, st = { setItem: (k, v) => mem[k] = v, getItem: k => mem[k] ?? null };
  assert.ok(saveCareer(c, st)); assert.deepEqual(loadCareer(st), JSON.parse(JSON.stringify(c)));
  console.log('      stats:', JSON.stringify(c.stats), 'overall', c.player.overall, 'pot', c.player.potential, 'campeão copa', c.cup.champion);
});
ok('save antigo (versão 1) é ignorado', () => {
  const mem = { rumo_ao_topo_carreira_v1: JSON.stringify({ version: 1 }) }, st = { setItem: (k, v) => mem[k] = v, getItem: k => mem[k] ?? null };
  assert.equal(loadCareer(st), null);
});
ok('Copa: mata-mata distribui vencedores; clube eliminado não joga mais', () => {
  let elim = 0;
  for (let s = 1; s <= 8; s++) {
    const c = newCareer({ ...base, pos: 'MEI' }, 'cha', s); let played = 0, out = false;
    while (!c.done) { const ns = nextSlot(c); const r = playRound(c); if (ns.k === 'copa') { if (r.user) played++; else out = true; if (!ns.plays) assert.ok(r.note); } }
    if (out) elim++; assert.ok(played >= 2 && played <= 9);
  }
  assert.ok(elim >= 1, 'ninguém eliminado em 8 temporadas?');
});
ok('seleção: jogador fraco não é convocado; craque é convocado e joga', () => {
  const fraco = newCareer({ ...base, pos: 'ATA' }, 'cha', 5); season(fraco);
  assert.equal(fraco.natStats.called, 0); assert.ok(!fraco.seasonLog[0].awards.includes('convocado'));
  const c = newCareer({ ...base, pos: 'ATA' }, 'fla', 6); c.player.overall = 90; c.player.attrs.chute = 99; c.player.potential = 95; c.player.attrs.ritmo = 95;
  let called = 0; while (!c.done) { const ns = nextSlot(c); if (ns.k === 'sel' && ns.called) { called++; const r = playRound(c); assert.ok(r.user); } else playRound(c); }
  assert.ok(called >= 1 && c.natStats.called === called); assert.ok(c.seasonLog[0].awards.includes('convocado'));
  console.log(`      convocações: ${called}/3, jogos pela seleção: ${c.natStats.apps}`);
});
ok('lesão: lesionado não joga, e a lesão diminui por rodada', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 9); c.player.injury = 2;
  const r = playRound(c); assert.equal(r.user.minutes, 0); assert.equal(c.player.injury, 1);
});
ok('lesões ocorrem com frequência plausível', () => {
  let inj = 0, games = 0;
  for (let s = 1; s <= 12; s++) { const c = newCareer({ ...base, pos: 'ATA' }, 'cha', s); while (!c.done) { const r = playRound(c); if (r.user && r.user.minutes > 0) games++; if (r.injured) inj++; } }
  console.log(`      lesões/jogo=${(inj / games * 100).toFixed(1)}%`); assert.ok(inj > 0 && inj / games < .2);
});
ok('treino: descanso recupera mais forma que treino técnico', () => {
  const f = (tr) => { const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 11); c.training = tr; const r = playRound(c); assert.ok(r.user.minutes > 0); return c.player.fitness; };
  assert.ok(f('descanso') > f('tecnico'));
});
ok('evolução com pontos: jovem titular sobe ~+3 a +7 de overall na 1ª temporada, sem passar do potencial', () => {
  const g = []; for (let s = 1; s <= 6; s++) { const c = newCareer({ ...base, pos: 'MEI' }, 'cha', s); autoSpend(c.player); const o = c.player.overall; season(c); autoSpend(c.player); g.push(c.player.overall - o); assert.ok(baseOverall(c.player) <= c.player.potential); }
  console.log('      ganho de overall na 1ª temporada (6 carreiras):', g.join(', ')); assert.ok(g.every(x => x >= 2 && x <= 9) && g.reduce((a, b) => a + b, 0) / g.length >= 3);
});
ok('propostas surgem para quem vai bem e aceitar muda clube e contrato', () => {
  let got = 0, accepted = false;
  for (let s = 1; s <= 12; s++) {
    const c = newCareer({ ...base, pos: 'ATA' }, 'cha', s); c.player.overall = 78; c.player.attrs.chute = 99; c.player.potential = 95;
    while (!c.done) { playRound(c); if (c.offers.length) { got++; if (!accepted) { const o = c.offers[0], sal = c.player.contract.salary; assert.ok(acceptOffer(c, 0)); assert.equal(c.clubId, o.clubId); assert.ok(c.player.contract.salary > sal); accepted = true; } break; } }
  }
  console.log(`      propostas em ${got}/12 carreiras`); assert.ok(got > 3 && accepted);
});
ok('prêmios: campeão, Copa, craque, artilheiro, revelação e convocado', () => {
  const c = newCareer({ ...base, pos: 'ATA' }, 'cha', 2);
  c.ss = { apps: 40, goals: 18, assists: 3, ratingSum: 40 * 7.6, rated: 40, called: 2, cup: 'fin' }; c.cup.champion = 'cha';
  for (const id of Object.keys(c.table)) Object.assign(c.table[id], { p: 38, pts: id === 'cha' ? 90 : 10 });
  endSeason(c); assert.deepEqual(c.seasonLog[0].awards.slice().sort(), ['artilheiro', 'campeao', 'convocado', 'copa', 'craque', 'revelacao']); assert.equal(c.trophies.length, 6);
});
ok('renovação de contrato e nova temporada (calendário, tabela, Copa e seleção reiniciam)', () => {
  const c = newCareer({ ...base, pos: 'ATA' }, 'cha', 33); const age = c.player.age; c.player.contract.years = 1;
  assert.equal(startNextSeason(c), false); season(c);
  const ri = c.offers.findIndex(o => o.renewal); assert.ok(ri >= 0 && c.offers[ri].years === 3); assert.ok(acceptOffer(c, ri)); assert.equal(c.player.contract.years, 3);
  assert.ok(startNextSeason(c));
  assert.equal(c.season, 2); assert.equal(c.step, 0); assert.equal(c.round, 0); assert.equal(c.player.age, age + 1); assert.equal(c.history.length, 0);
  assert.equal(c.cal.filter(s => s.k === 'liga').length, 38); assert.equal(c.cup.phase, 'prel'); assert.equal(c.cup.ties.length, 8); assert.equal(c.natFix.length, 3);
  assert.ok(Object.values(c.table).every(x => x.p === 0)); assert.ok(c.clubs.every(k => k.strength >= 40 && k.strength <= 88 && k.lineup.length === 11));
  season(c); assert.equal(c.seasonLog.length, 2);
});
ok('determinismo com 2 temporadas', () => {
  const run = () => { const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 8); for (let i = 0; i < 2; i++) { season(c); startNextSeason(c); } return JSON.stringify(c); };
  assert.equal(run(), run());
});

ok('veterano (31+) não evolui por XP', () => {
  const p = createPlayer({ ...base, pos: 'MEI', age: 31 }, makeRng(4)); const o = p.overall;
  assert.deepEqual(applyXp(p, 900, makeRng(1)), []); assert.equal(p.overall, o); assert.equal(p.xp, 0);
  const j = createPlayer({ ...base, pos: 'MEI', age: 20 }, makeRng(4)); assert.equal(j.ph, 6); assert.equal(applyXp(j, 300, makeRng(1)).length, 3); assert.equal(j.level, 4); assert.equal(j.ph, 6 + 3 * PH_PER_LEVEL); assert.equal(j.xp, 0);
  j.potential = baseOverall(j); assert.deepEqual(applyXp(j, 500, makeRng(1)), []); assert.equal(j.xp, 0);
});
ok('carreira longa: pico, declínio real, aposentadoria 36–40 opcional e obrigatória aos 41', () => {
  const c = newCareer({ ...base, pos: 'MEI', age: 18 }, 'cha', 123); c.player.potential = 90; let seasons = 0, atAge = {}; autoSpend(c.player);
  for (;;) {
    season(c); autoSpend(c.player); seasons++; atAge[c.player.age] = c.player.overall;
    assert.equal(canRetire(c), c.player.age >= 36); assert.equal(mustRetire(c), c.player.age >= 41);
    if (mustRetire(c)) break; startNextSeason(c); autoSpend(c.player);
  }
  console.log(`      ${seasons} temporadas · overall aos 25: ${atAge[25]}, 30: ${atAge[30]}, 35: ${atAge[35]}, 40: ${atAge[40]}`);
  assert.equal(c.player.age, 41); assert.equal(seasons, 24);
  assert.ok(atAge[30] - atAge[40] >= 8, 'declínio muito fraco'); assert.ok(atAge[40] < atAge[30]);
  assert.equal(retire(c), true); assert.equal(c.retired, true); assert.equal(startNextSeason(c), false); assert.equal(playRound(c), null);
  const s = c.summary; assert.equal(s.seasons, 24); assert.equal(s.startAge, 18); assert.equal(s.endAge, 41); assert.ok(s.peak >= atAge[30]); assert.ok(s.apps > 300);
  assert.equal(retire(c), false);
});
ok('não dá para se aposentar antes dos 36', () => {
  const c = newCareer({ ...base, pos: 'ATA', age: 25 }, 'cha', 5); season(c); assert.equal(canRetire(c), false); assert.equal(retire(c), false); assert.equal(c.retired, false);
});

const forceTable = (c, lastId, firstIds = []) => { for (const id of Object.keys(c.table)) Object.assign(c.table[id], { p: 38, pts: 50 }); c.table[lastId].pts = 1; firstIds.forEach((id, i) => { c.table[id].pts = 100 - i; }); };
ok('rebaixamento e acesso em 3 divisões: A→B (4), B→C (4), C→B (4), playoff da B (2); cada liga continua com 20 clubes', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 7); season(c);
  const A = standings(c, 'A').map(x => x.id), B = standings(c, 'B').map(x => x.id), C = standings(c, 'C').map(x => x.id);
  const mv = c.pendingMoves; assert.deepEqual(mv.down, A.slice(16)); assert.deepEqual(mv.downB, B.slice(16)); assert.deepEqual(mv.upC, C.slice(0, 4));
  assert.equal(mv.up.length, 4); assert.deepEqual(mv.up.slice(0, 2), B.slice(0, 2)); assert.ok(mv.up.slice(2).every(id => B.slice(2, 6).includes(id)), 'vagas do playoff só para o 3º–6º');
  assert.ok(startNextSeason(c));
  for (const d of ['A', 'B', 'C']) assert.equal(c.league[d].length, 20, d);
  assert.equal(new Set([...c.league.A, ...c.league.B, ...c.league.C]).size, 60);
  mv.down.forEach(id => assert.equal(divOf(c, id), 'B')); mv.up.forEach(id => assert.equal(divOf(c, id), 'A'));
  mv.downB.forEach(id => assert.equal(divOf(c, id), 'C')); mv.upC.forEach(id => assert.equal(divOf(c, id), 'B'));
  assert.ok(['A', 'B', 'C'].every(d => c.fixtures[d].length === 38)); assert.equal(c.pendingMoves, null); assert.equal(c.pb, null);
  season(c); assert.equal(c.seasonLog.length, 2);
});
ok('clube do jogador rebaixado: registro, moral cai, propostas de clubes da Série A e jogador passa a jogar a Série B', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 3); c.ss = { apps: 30, goals: 5, assists: 3, ratingSum: 30 * 7, rated: 30, called: 0, cup: '' };
  forceTable(c, 'cha'); c.player.morale = 60; endSeason(c);
  const L = c.seasonLog[0]; assert.equal(L.relegated, true); assert.equal(L.div, 'A'); assert.ok(c.pendingMoves.down.includes('cha'));
  const prop = c.offers.filter(o => !o.renewal); assert.ok(prop.length >= 1, 'sem propostas após rebaixamento');
  assert.ok(prop.every(o => divOf(c, o.clubId) === 'A' && !c.pendingMoves.down.includes(o.clubId)));
  c.done = true; assert.ok(startNextSeason(c));
  assert.equal(divOf(c, c.clubId), 'B'); assert.equal(c.player.morale, 48); assert.equal(nextSlot(c).title.includes('Série B'), true);
});
ok('jogador mal avaliado em clube rebaixado não recebe propostas', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 3); c.ss = { apps: 30, goals: 0, assists: 0, ratingSum: 30 * 5.5, rated: 30, called: 0, cup: '' };
  forceTable(c, 'cha'); endSeason(c); assert.equal(c.offers.filter(o => !o.renewal).length, 0);
});
ok('aceitar proposta após rebaixamento mantém o jogador na Série A', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 3); c.ss = { apps: 30, goals: 5, assists: 3, ratingSum: 30 * 7, rated: 30, called: 0, cup: '' };
  forceTable(c, 'cha'); endSeason(c); const i = c.offers.findIndex(o => !o.renewal); const target = c.offers[i].clubId; assert.ok(acceptOffer(c, i));
  c.done = true; startNextSeason(c); assert.equal(c.clubId, target); assert.equal(divOf(c, c.clubId), 'A');
});
ok('acesso: jogador na Série B termina no G4, ganha prêmio e sobe', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'lon', 3); c.ss = { apps: 30, goals: 5, assists: 3, ratingSum: 30 * 7, rated: 30, called: 0, cup: '' };
  assert.equal(divOf(c, 'lon'), 'B'); forceTable(c, 'cha', ['lon', 'for', 'cea', 'spo']); endSeason(c);
  const L = c.seasonLog[0]; assert.equal(L.promoted, true); assert.equal(L.relegated, false); assert.ok(L.awards.includes('acesso') && L.awards.includes('campeaoB'));
  c.done = true; startNextSeason(c); assert.equal(divOf(c, 'lon'), 'A'); assert.equal(c.player.morale, 72);
});
ok('carreira começando na Série B: temporada completa, tabela da B, sem Copa se o clube não está entre os 4 melhores da B', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'lon', 12); assert.equal(c.cup.ties.flatMap(t => [t.a, t.b]).includes('lon'), false); let copaJogos = 0;
  while (!c.done) { const ns = nextSlot(c); const r = playRound(c); if (ns.k === 'copa' && r.user) copaJogos++; if (ns.k === 'liga') assert.ok(ns.title.includes('Série B')); }
  assert.equal(copaJogos, 0); assert.ok(standings(c).every(x => x.p === 38)); assert.equal(c.seasonLog[0].div, 'B');
  assert.ok(c.seasonLog[0].cup === '' || c.seasonLog[0].cup === undefined);
});

ok('pontos de habilidade: custo cresce, potencial limita, só atributos da posição', () => {
  assert.deepEqual([50, 64, 65, 79, 80, 91, 92].map(upgradeCost), [1, 1, 2, 2, 3, 3, 4]);
  const p = createPlayer({ ...base, pos: 'ATA' }, makeRng(5)); assert.equal(p.ph, 6);
  const v = p.attrs.chute, ph0 = p.ph; assert.equal(upgrade(p, 'chute'), 'ok'); assert.equal(p.attrs.chute, v + 1); assert.equal(p.ph, ph0 - upgradeCost(v));
  assert.equal(upgrade(p, 'goleiro'), 'irrelevante'); p.ph = 0; assert.equal(upgrade(p, 'chute'), 'ph');
  p.ph = 999; p.potential = baseOverall(p); assert.equal(upgrade(p, 'chute'), 'potencial');
  p.potential = baseOverall(p) + 3; autoSpend(p); assert.equal(baseOverall(p), p.potential); assert.ok(p.ph > 0 && p.ph < 999);
  p.attrs.chute = 99; p.potential = 99; assert.equal(upgrade(p, 'chute'), 'max');
});
ok('loja: comprar equipa o item, dá bônus em campo, não conta para o potencial; trocar de chuteira', () => {
  const c = newCareer({ ...base, pos: 'ATA' }, 'cha', 2), p = c.player, o0 = p.overall, b0 = baseOverall(p), ch0 = p.attrs.chute;
  assert.equal(c.money, 0); assert.equal(buyItem(c, 'bA1'), 'dinheiro'); c.money = 1000000;
  assert.equal(buyItem(c, 'bA1'), 'ok'); assert.equal(c.money, 1000000 - 15000); assert.equal(effAttrs(p).chute, ch0 + 2); assert.equal(baseOverall(p), b0); assert.ok(p.overall >= o0);
  assert.equal(buyItem(c, 'bA1'), 'ja'); assert.equal(buyItem(c, 'bA3'), 'ok'); assert.equal(effAttrs(p).chute, ch0 + 6); assert.ok(p.overall >= o0 + 2, `${p.overall} vs ${o0}`);
  assert.equal(buyItem(c, 'bV2'), 'ok'); assert.equal(p.gear.chuteira, 'bV2'); assert.equal(effAttrs(p).chute, ch0); assert.equal(effAttrs(p).ritmo, p.attrs.ritmo + 4);
  assert.equal(equipItem(c, 'bA3'), true); assert.equal(p.gear.chuteira, 'bA3'); assert.equal(equipItem(c, 'bM2'), false);
  assert.equal(p.overall, effAttrs(p) && p.overall); assert.equal(buyItem(c, 'zzz'), 'invalido');
  assert.equal(LINES.length * 3, Object.keys(ITEMS).length);
});
ok('equipe de apoio: personal trainer (+XP), nutricionista (+forma), fisioterapeuta (-lesões), compra por nível', () => {
  const run = (perks) => { const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 11); c.training = 'tecnico'; Object.assign(c.perks, perks); const r = playRound(c); return { xp: r.progress.xp, fit: c.player.fitness }; };
  const a = run({}), b = run({ trainer: 3, nutri: 3 }); assert.ok(b.xp > a.xp, `${b.xp} vs ${a.xp}`); assert.ok(b.fit > a.fit, `${b.fit} vs ${a.fit}`);
  const inj = (fisio) => { let n = 0; for (let s = 1; s <= 8; s++) { const c = newCareer({ ...base, pos: 'ATA' }, 'cha', s); c.perks.fisio = fisio; while (!c.done) { const r = playRound(c); if (r.injured) n++; } } return n; };
  const i0 = inj(0), i3 = inj(3); console.log(`      lesões em 8 temporadas: sem fisio ${i0}, fisio III ${i3}`); assert.ok(i3 < i0);
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 1); assert.equal(buyPerk(c, 'trainer'), 'dinheiro'); c.money = 1000000;
  assert.equal(buyPerk(c, 'trainer'), 'ok'); assert.equal(c.perks.trainer, 1); assert.equal(c.money, 1000000 - PERKS.trainer.prices[0]);
  assert.equal(buyPerk(c, 'trainer'), 'ok'); assert.equal(buyPerk(c, 'trainer'), 'ok'); assert.equal(c.perks.trainer, 3); assert.equal(buyPerk(c, 'trainer'), 'max'); assert.equal(buyPerk(c, 'x'), 'invalido');
});
ok('dinheiro do salário dá para comprar o 1º item na 1ª temporada', () => {
  const c = newCareer({ ...base, pos: 'ATA' }, 'cha', 4); season(c); assert.ok(c.money >= 15000, `dinheiro ${c.money}`); assert.equal(buyItem(c, 'bA1'), 'ok');
});
ok('migração de save v3 para v4 (ganha pontos, itens e equipe de apoio)', () => {
  const old = JSON.parse(JSON.stringify(newCareer({ ...base, pos: 'MEI' }, 'cha', 9))); old.version = 3; delete old.perks; delete old.owned; delete old.player.level; delete old.player.ph; delete old.player.gear;
  const mem = { rumo_ao_topo_carreira_v1: JSON.stringify(old) }, st = { setItem: (k, v) => mem[k] = v, getItem: k => mem[k] ?? null };
  const c = loadCareer(st); assert.equal(c.version, 4); assert.equal(c.player.ph, 6); assert.deepEqual(c.player.gear, {}); assert.deepEqual(c.perks, { trainer: 0, nutri: 0, fisio: 0 }); assert.deepEqual(c.owned, []); assert.ok(playRound(c));
});
ok('Libertadores: 32 clubes, 8 grupos de 4, calendário com 13 jogos para quem se classifica', () => {
  const c = newCareer({ ...base, pos: 'ATA' }, 'cha', 7);
  assert.equal(c.lib.teams.length, 32); assert.equal(new Set(c.lib.teams).size, 32); assert.equal(c.lib.groups.length, 8); assert.ok(c.lib.groups.every(g => g.length === 4));
  assert.equal(c.cal.filter(s => s.k === 'lib').length, 0); // Chapecoense não está no G4
  const f = newCareer({ ...base, pos: 'ATA' }, 'fla', 7); assert.equal(f.cal.length, 63); assert.equal(f.cal.filter(s => s.k === 'lib').length, 13);
});
ok('Libertadores: temporada completa com campeão, mata-mata de 16 e vaga para a próxima edição', () => {
  const c = newCareer({ ...base, pos: 'ATA' }, 'fla', 11); let played = 0;
  while (!c.done) { const ns = nextSlot(c); const r = playRound(c); if (ns.k === 'lib' && r.user) played++; }
  const L = c.lib; assert.equal(L.n, 13); assert.equal(L.phase, 'done'); assert.ok(L.teams.includes(L.champion));
  assert.ok(played >= 6); // 6 jogos de grupo no mínimo
  assert.equal(L.log.map(l => l.ties.length).join(), '8,4,2,1');
  assert.ok(L.groups.every(g => libRank(L, g).every(id => L.gt[id].p === 6)));
  assert.equal(c.nextLib.length >= 4, true); assert.ok(c.seasonLog[0].libChampion === L.champion);
  assert.ok(startNextSeason(c)); assert.equal(c.lib.n, 0); assert.equal(c.lib.teams.length, 32); assert.ok(c.lib.teams.includes(c.nextLib === null ? c.lib.teams[0] : c.lib.teams[0]));
});
ok('Libertadores: clube de fora simula ao fundo; ofertas nunca vêm de clube estrangeiro; save antigo é migrado', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 5); season(c); assert.equal(c.lib.phase, 'done'); assert.ok(c.offers.every(o => c.clubs.find(k => k.id === o.clubId).div !== 'X'));
  const old = newCareer({ ...base, pos: 'MEI' }, 'cha', 5); old.clubs = old.clubs.filter(k => k.div !== 'X'); delete old.lib;
  ensureLib(old); assert.equal(old.clubs.filter(k => k.div === 'X').length, 28); assert.equal(old.lib.teams.length, 32); season(old); assert.equal(old.lib.phase, 'done');
});

ok('cartão vermelho: o jogador sai de campo, o time joga com 10 e ele cumpre suspensão', () => {
  const pl = createPlayer({ ...base, pos: 'MEI' }, makeRng(1)); pl.overall = 90; let r = null;
  for (let s = 1; s < 6000 && !(r && r.user.red > 0); s++) r = simulateMatch(mk('a', 70), mk('b', 70), makeRng(s), { side: 'h', player: pl });
  assert.ok(r.user.red > 0); const red = r.events.find(e => e.type === 'red' && e.mine);
  assert.equal(r.user.minutes, red.min - (r.user.starter ? 1 : r.events.find(e => e.user && e.inn).min)); assert.ok(r.user.ban >= 1);
  assert.ok(!r.events.some(e => e.type === 'goal' && e.min > red.min && e.scorer === pl.name + ' ' + pl.surname));
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 3); c.player.ban = 2;
  const a = playRound(c); assert.equal(a.user.minutes, 0); assert.equal(c.player.ban, 1); assert.ok(a.suspended);
  const b = playRound(c); assert.equal(b.user.minutes, 0); assert.equal(c.player.ban, 0);
});
ok('elencos reais: 11 nomes por clube, clubes existentes, e a escalação usa os nomes', () => {
  for (const [id, r] of Object.entries(ROSTERS)) { const v = r.split(','); assert.equal(v.length, 11, id); assert.ok(v.every(x => x.trim()), id); assert.ok(CLUBS.some(k => k.id === id), id); }
  const c = newCareer({ ...base, pos: 'ATA' }, 'cha', 9), f = c.clubs.find(k => k.id === 'fla');
  assert.equal(f.lineup[0].name, 'Rossi'); assert.equal(f.lineup[10].pos, 'ATA'); assert.equal(f.lineup[10].name, 'Pedro');
  assert.ok(c.clubs.find(k => k.id === 'cha').lineup.every(x => x.name.includes(' ')));
});
ok('Série C: 20 clubes reais únicos, só 2 para começar; carreira na C joga 38 rodadas, sobe se ficar no G4 e não cai nunca', () => {
  assert.equal(CLUBS_C.length, 20); assert.equal(new Set(CLUBS_C.map(k => k.id)).size, 20);
  const all = CLUBS.concat(CLUBS_C); assert.equal(new Set(all.map(k => k.id)).size, 60); assert.equal(new Set(all.map(k => k.short)).size, 60);
  assert.ok(CLUBS_C.every(k => k.div === 'C' && /^#/.test(k.color) && /^#/.test(k.color2) && k.pat && k.strength < 50)); assert.equal(CLUBS_C.filter(k => k.start).length, 2);
  const c = newCareer({ ...base, pos: 'MEI' }, 'ili', 4); assert.equal(divOf(c, 'ili'), 'C'); assert.equal(c.cal.filter(s => s.k === 'pb').length, 0);
  let ligas = 0; while (!c.done) { const ns = nextSlot(c); playRound(c); if (ns.k === 'liga') { ligas++; assert.ok(ns.title.includes('Série C')); } }
  assert.equal(ligas, 38); assert.ok(standings(c).every(x => x.p === 38)); assert.equal(c.seasonLog[0].div, 'C'); assert.equal(c.seasonLog[0].relegated, false);
  const f = newCareer({ ...base, pos: 'MEI' }, 'ili', 3); f.ss = { apps: 30, goals: 5, assists: 3, ratingSum: 30 * 7, rated: 30, called: 0, cup: '' };
  forceTable(f, 'cha', ['ili', 'pay', 'fig', 'bru']); endSeason(f);
  const L = f.seasonLog[0]; assert.equal(L.promoted, true); assert.ok(L.awards.includes('acessoC') && L.awards.includes('campeaoC'));
  f.done = true; startNextSeason(f); assert.equal(divOf(f, 'ili'), 'B'); assert.equal(f.player.morale, 72);
  const g = newCareer({ ...base, pos: 'MEI' }, 'ili', 3); g.ss = { apps: 30, goals: 5, assists: 3, ratingSum: 30 * 7, rated: 30, called: 0, cup: '' };
  forceTable(g, 'ili'); endSeason(g); assert.equal(g.seasonLog[0].relegated, false); g.done = true; startNextSeason(g); assert.equal(divOf(g, 'ili'), 'C');
});
ok('Série B: playoff de acesso (3º x 6º e 4º x 5º, ida e volta) reserva 2 datas no calendário e dá as 2 últimas vagas', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'lon', 12); assert.equal(c.cal.filter(s => s.k === 'pb').length, 2); assert.equal(c.cal.length, 52);
  assert.equal(c.cal[c.cal.length - 1].k, 'pb'); let pbJogos = 0, sawPb = false;
  while (!c.done) {
    const ns = nextSlot(c), r = playRound(c);
    if (ns.k === 'pb') { sawPb = true; assert.ok(ns.title.includes('Playoff')); if (r.user) pbJogos++; else assert.ok(r.note); }
    if (ns.k === 'liga' && ns.r === 37) { const B = standings(c, 'B').map(x => x.id); assert.deepEqual(c.pb.ties.map(t => [t.a, t.b]), [[B[5], B[2]], [B[4], B[3]]]); }
  }
  assert.ok(sawPb); assert.ok(c.pb.done && c.pb.winners.length === 2 && c.pb.ties.every(t => t.g1 && t.g2 && [t.a, t.b].includes(t.w)));
  const B = standings(c, 'B').map(x => x.id); assert.deepEqual(c.pendingMoves.up, B.slice(0, 2).concat(c.pb.winners)); assert.ok(c.pb.winners.every(w => B.slice(2, 6).includes(w)));
  assert.equal(c.seasonLog[0].promoted, c.pendingMoves.up.includes('lon')); if (pbJogos) assert.equal(pbJogos, 2);
  const a = newCareer({ ...base, pos: 'MEI' }, 'cha', 12); assert.equal(a.cal.filter(s => s.k === 'pb').length, 0);
});
ok('Série B: jogador do 3º–6º que vence o playoff sobe e ganha o prêmio de acesso; o que perde fica', () => {
  let subiu = 0, ficou = 0;
  for (let s = 1; s <= 30 && (!subiu || !ficou); s++) {
    const c = newCareer({ ...base, pos: 'MEI' }, 'lon', s); c.ss = { apps: 30, goals: 5, assists: 3, ratingSum: 30 * 7, rated: 30, called: 0, cup: '' };
    forceTable(c, 'cha', ['for', 'cea', 'lon', 'spo', 'goi', 'cri']); endSeason(c); const L = c.seasonLog[0];
    if (L.promoted) { subiu++; assert.ok(L.awards.includes('acesso')); } else { ficou++; assert.ok(!L.awards.includes('acesso')); }
    assert.equal(L.pbWinners.length, 2); assert.equal(L.promoted, c.pb.winners.includes('lon'));
  }
  assert.ok(subiu && ficou, `sobe=${subiu} fica=${ficou}`);
});
ok('rebaixado da Série B: moral cai, vai para a C e jogador bem avaliado recebe propostas de clubes que ficam na B', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'lon', 3); c.ss = { apps: 30, goals: 5, assists: 3, ratingSum: 30 * 7, rated: 30, called: 0, cup: '' };
  c.player.morale = 60; forceTable(c, 'lon'); endSeason(c);
  const L = c.seasonLog[0]; assert.equal(L.relegated, true); assert.equal(L.promoted, false); assert.ok(c.pendingMoves.downB.includes('lon'));
  const prop = c.offers.filter(o => !o.renewal); assert.ok(prop.length >= 1); assert.ok(prop.every(o => divOf(c, o.clubId) === 'B' && !c.pendingMoves.downB.includes(o.clubId) && !c.pendingMoves.up.includes(o.clubId)));
  c.done = true; startNextSeason(c); assert.equal(divOf(c, 'lon'), 'C'); assert.equal(c.player.morale, 48);
});
ok('Pré-Libertadores: 5º e 6º da Série A x 2 estrangeiros mais fracos; os 2 vencedores fecham os 32 da Libertadores', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 7); const P = c.lib.pre;
  assert.equal(P.ties.length, 2); assert.ok(P.done && P.winners.length === 2 && P.ties.every(t => t.g1 && t.g2 && [t.a, t.b].includes(t.w)));
  assert.equal(c.lib.teams.length, 32); assert.equal(new Set(c.lib.teams).size, 32); assert.ok(P.winners.every(w => c.lib.teams.includes(w)));
  assert.equal(c.lib.field.length, 34); assert.ok(P.ties.every(t => club(c, t.a).div === 'X' && club(c, t.b).div === 'A'));
  assert.equal(c.cal.filter(s => s.k === 'pre').length, 0);
  // clube do jogador na Pré: 2 jogos antes da rodada 1, grupos sorteados só depois
  const base2 = newCareer({ ...base, pos: 'MEI' }, 'cha', 7), b = base2.league.A.slice().sort((x, y) => club(base2, y).strength - club(base2, x).strength);
  base2.nextLib = b.slice(0, 4); base2.nextPre = ['cha', b[4]];
  startNextSeason(Object.assign(base2, { done: true }));
  assert.equal(base2.lib.pre.ties.length, 2); const mine = base2.lib.pre.ties.find(t => t.a === 'cha' || t.b === 'cha');
  assert.ok(mine, 'cha deveria estar na Pré'); assert.equal(base2.lib.phase, 'pre'); assert.equal(base2.lib.groups.length, 0); assert.equal(base2.lib.pre.done, false);
  assert.deepEqual(base2.cal.slice(0, 3).map(s => s.k), ['pre', 'pre', 'liga']); assert.equal(base2.cal.filter(s => s.k === 'lib').length, 13);
  const r1 = playRound(base2); assert.ok(r1.user && r1.title.includes('Pré-Libertadores') && r1.title.includes('ida')); assert.equal(base2.lib.phase, 'pre');
  const r2 = playRound(base2); assert.ok(r2.user && r2.tieInfo); assert.ok(base2.lib.pre.done && base2.lib.teams.length === 32 && base2.lib.groups.length === 8);
  assert.equal(base2.lib.teams.includes('cha'), base2.lib.pre.winners.includes('cha'));
  while (!base2.done) playRound(base2); assert.equal(base2.lib.phase, 'done'); assert.ok(base2.lib.teams.includes(base2.lib.champion));
});
ok('Sul-Americana: 7º ao 14º da A + 8 terceiros da Libertadores; 16 → campeão (7 jogos), sem repetir clube da Libertadores', () => {
  const c = newCareer({ ...base, pos: 'MEI' }, 'cha', 7); assert.equal(c.sula.br.length, 8); assert.ok(c.sula.br.every(id => club(c, id).div === 'A' && !c.lib.field.includes(id)));
  const S = c.sula; season(c);
  assert.equal(S.n, 7); assert.equal(S.phase, 'done'); assert.equal(S.lib3.length, 8); assert.ok(S.lib3.every(id => c.lib.teams.includes(id)));
  assert.deepEqual(S.log.map(l => l.ties.length), [8, 4, 2, 1]); assert.ok([...S.br, ...S.lib3].includes(S.champion)); assert.equal(new Set([...S.br, ...S.lib3]).size, 16);
  assert.equal(c.seasonLog[0].sulaChampion, S.champion);
  assert.equal(c.nextPre.length, 2); assert.equal(c.nextSula.length, 8); assert.ok(c.nextSula.every(id => !c.nextLib.includes(id) && !c.nextPre.includes(id)));
  assert.ok(startNextSeason(c)); assert.equal(c.sula.n, 0); assert.equal(c.sula.br.length, 8); assert.ok(c.sula.br.every(id => c.sula.br.indexOf(id) === c.sula.br.lastIndexOf(id)));
});
ok('Sul-Americana: clube do jogador no 7º–14º tem 7 datas e joga; clube que fica em 3º na Libertadores ganha datas no calendário', () => {
  const c = newCareer({ ...base, pos: 'ATA' }, 'cha', 9); const S = c.sula;
  c.sula.br = ['cha', ...S.br.slice(0, 7)]; const cal = buildCalendar({ sula: true }); assert.equal(cal.filter(s => s.k === 'sula').length, 7); assert.equal(cal.length, 57);
  const c2 = newCareer({ ...base, pos: 'ATA' }, 'cha', 9); c2.sula.br = ['cha', ...c2.sula.br.slice(0, 7)]; c2.cal = buildCalendar({ sula: true });
  let jogos = 0; while (!c2.done) { const ns = nextSlot(c2), r = playRound(c2); if (ns.k === 'sula') { assert.ok(ns.title.startsWith('Sul-Americana')); if (r.user) jogos++; else assert.ok(r.note); } }
  assert.ok(c2.sula.n === 7 && c2.sula.phase === 'done'); assert.ok(jogos >= 1 && jogos <= 7, `jogos ${jogos}`);
  let inserido = 0, jogou = 0;
  for (let sd = 1; sd <= 40; sd++) {
    const f = newCareer({ ...base, pos: 'ATA' }, 'cha', sd), top = f.league.A.slice().sort((x, y) => club(f, y).strength - club(f, x).strength).filter(id => id !== 'cha').slice(0, 3);
    f.nextLib = ['cha', ...top]; f.nextPre = []; f.done = true; startNextSeason(f); assert.ok(f.cal.some(x => x.k === 'lib') && !f.cal.some(x => x.k === 'sula'));
    while (!f.done) { const ns = nextSlot(f), r = playRound(f); if (ns.k === 'sula' && r.user) jogou++; }
    if (f.sula.lib3.includes('cha')) { inserido++; assert.equal(f.cal.filter(x => x.k === 'sula').length, 7); }
    else assert.ok(!f.cal.some(x => x.k === 'sula'));
  }
  console.log(`      Chapecoense: 3º no grupo da Libertadores em ${inserido}/40 temporadas, ${jogou} jogos de Sul-Americana`);
  assert.ok(inserido >= 1 && jogou >= 1);
});
ok('save antigo sem Série C, Pré-Libertadores e Sul-Americana é migrado e joga uma temporada inteira', () => {
  const old = JSON.parse(JSON.stringify(newCareer({ ...base, pos: 'MEI' }, 'cha', 5)));
  delete old.league.C; delete old.fixtures.C; delete old.sula; delete old.pb; old.clubs = old.clubs.filter(k => k.div !== 'C'); for (const k of CLUBS_C) delete old.table[k.id];
  old.lib.pre = undefined; delete old.lib.main; delete old.lib.field; old.version = 4;
  const mem = { rumo_ao_topo_carreira_v1: JSON.stringify(old) }, st = { setItem: (k, v) => mem[k] = v, getItem: k => mem[k] ?? null };
  const c = ensureLib(loadCareer(st)); assert.equal(c.league.C.length, 20); assert.equal(c.fixtures.C.length, 38); assert.ok(c.sula && c.lib.pre.done);
  season(c); assert.equal(c.seasonLog.length, 1); assert.equal(c.pb.done, true); assert.equal(standings(c, 'C').length, 20); assert.ok(startNextSeason(c)); season(c);
});

// ===== Lances decisivos =====
const mkP = (pos, s) => { const p = createPlayer({ ...base, pos }, makeRng(s)); p.overall = 68; for (const k in p.attrs) p.attrs[k] = Math.max(p.attrs[k], 60); return p; };
const mkTeam = (id, s) => ({ id, name: id, short: id, color: '#fff', color2: '#000', pat: 'solid', lineup: ['GOL', 'ZAG', 'ZAG', 'LAT', 'LAT', 'VOL', 'VOL', 'MEI', 'PON', 'PON', 'ATA'].map((pos, i) => ({ name: id + i, pos, ovr: s + (i % 3) })) });
ok('lances decisivos: sem "interactive" a partida é idêntica à de antes (nenhum lance, mesmo resultado)', () => {
  for (let s = 1; s <= 100; s++) {
    const p = createPlayer({ ...base, pos: 'ATA' }, makeRng(s)), H = mkTeam('H', 70), A = mkTeam('A', 66);
    const r = simulateMatch(H, A, makeRng(s), { side: 'h', player: p });
    assert.deepEqual(r.moments, []); assert.equal(r.user.moms, null); assert.ok(!r.events.some(e => e.type === 'moment'));
  }
});
ok('lances decisivos: determinístico; a 1ª decisão só muda o que vem depois do lance (mesmo jogo até lá)', () => {
  let com = 0;
  for (const pos of ['ATA', 'MEI', 'ZAG', 'GOL']) for (let s = 1; s <= 120; s++) {
    const p = mkP(pos, s), H = mkTeam('H', 68), A = mkTeam('A', 68), U = (d) => ({ side: 'h', player: p, interactive: true, decisions: d });
    const a = simulateMatch(H, A, makeRng(s), U([])), b = simulateMatch(H, A, makeRng(s), U([]));
    assert.deepEqual(a, b); assert.ok(a.moments.length <= 4);
    if (!a.moments.length) continue; com++;
    const m = a.moments[0], alt = m.options.find(o => o.id !== m.chosen).id, c = simulateMatch(H, A, makeRng(s), U([alt]));
    assert.ok(m.auto && !c.moments[0].auto && c.moments[0].chosen === alt && c.moments[0].min === m.min);
    assert.deepEqual(a.events.filter(e => e.min < m.min), c.events.filter(e => e.min < m.min));
    for (let i = 1; i < a.moments.length; i++) assert.ok(a.moments[i].min - a.moments[i - 1].min >= 9);
  }
  assert.ok(com > 400, 'lances precisam aparecer com frequência: ' + com);
});
ok('lances decisivos: o jogo continua equilibrado (gols do time e sofridos ±0,2 do modo normal)', () => {
  for (const pos of ['ATA', 'MEI', 'ZAG', 'GOL']) {
    let gi = 0, go = 0, ni = 0, no = 0; const T = 600;
    for (let s = 1; s <= T; s++) {
      const p = mkP(pos, s), H = mkTeam('H', 68), A = mkTeam('A', 68);
      const x = simulateMatch(H, A, makeRng(s), { side: 'h', player: p, interactive: true, decisions: [] }), y = simulateMatch(H, A, makeRng(s), { side: 'h', player: p });
      gi += x.home.g; go += x.away.g; ni += y.home.g; no += y.away.g;
    }
    assert.ok(Math.abs(gi - ni) / T < .2 && Math.abs(go - no) / T < .2, `${pos}: ${gi / T} x ${ni / T} | ${go / T} x ${no / T}`);
  }
});
ok('lances decisivos na carreira: refazer a rodada com outra escolha só muda a sua partida', () => {
  let rodadas = 0;
  let c = newCareer({ ...base, pos: 'MEI' }, 'cha', 7);
  for (let i = 0; i < 12 && !c.done; i++) {
    const snap = JSON.stringify(c), a = playRound(JSON.parse(snap), { decisions: [] });
    if (!a.moments || !a.moments.length) { playRound(c); continue; }
    const m = a.moments[0], alt = m.options.find(o => o.id !== m.chosen).id, x = JSON.parse(snap), b = playRound(x, { decisions: [alt] });
    assert.deepEqual(a.others, b.others); assert.equal(b.moments[0].chosen, alt); rodadas++; c = x;
  }
  assert.ok(rodadas >= 3, 'rodadas com lances: ' + rodadas);
  season(c); // a temporada termina normalmente depois de partidas decididas
});

console.log(`\n${n} grupos de testes passaram`);
