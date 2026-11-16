import { clamp } from './rng.js';
import { FIRST } from './data.js';
import { effAttrs } from './player.js';

const SCORE_W = { GOL: .02, ZAG: .6, LAT: .8, VOL: 1, MEI: 2.5, PON: 3, ATA: 5 };
const ASSIST_W = { GOL: .02, ZAG: .5, LAT: 2, VOL: 1.5, MEI: 4, PON: 3, ATA: 2 };

// ===== Lances decisivos: em momentos-chave o jogador escolhe a ação (a partida é determinística: refazer com as mesmas escolhas dá o mesmo jogo) =====
export const MM_OPTS = {
  atk: [{ id: 'shoot', label: '⚽ Chutar', sub: 'Gol direto', risk: 2 }, { id: 'pass', label: '🎯 Passar', sub: 'Assistência', risk: 1 }, { id: 'dribble', label: '💨 Driblar', sub: 'Mano a mano', risk: 3 }],
  def: [{ id: 'mark', label: '🛡️ Fechar espaço', sub: 'Seguro', risk: 1 }, { id: 'tackle', label: '🦵 Desarmar', sub: 'Contra-ataque', risk: 3 }, { id: 'foul', label: '🚫 Falta tática', sub: 'Pode dar cartão', risk: 2 }],
  gk: [{ id: 'angle', label: '🧤 Fechar o ângulo', sub: 'Seguro', risk: 1 }, { id: 'dive', label: '🤸 Voar no canto', sub: 'Equilibrado', risk: 2 }, { id: 'rush', label: '🏃 Sair do gol', sub: 'Contra-ataque', risk: 3 }],
};
const MM_W = { ATA: { atk: .30, def: .02 }, PON: { atk: .28, def: .04 }, MEI: { atk: .26, def: .08 }, VOL: { atk: .10, def: .22 }, LAT: { atk: .10, def: .24 }, ZAG: { atk: .03, def: .30 }, GOL: { atk: 0, def: .16 } };
const MM_INTRO = {
  atk: ['A bola sobrou para você na entrada da área!', 'Você recebe livre e tem espaço!', 'Contra-ataque! A jogada chega até você.'],
  def: ['Ataque perigoso! O adversário vem na sua direção.', 'Bola longa para o atacante: você está na jogada!', 'Triangulação rápida e você precisa agir!'],
  gk: ['Finalização! A bola vem em direção ao seu gol!', 'Cabeçada perigosa na pequena área!', 'Chute de fora da área, você está na bola!'],
};
const MM_MAX = 4, MM_GAP = 9;
const avg = (l) => l.reduce((s, p) => s + p.ovr, 0) / l.length;

/**
 * home/away: {id, name, lineup:[{name,pos,ovr}]}
 * u (opcional): {side:'h'|'a', player} — jogador do usuário
 */
export function simulateMatch(home, away, rng, u = null) {
  let U = null, uState = null;
  if (u) {
    const p = u.player;
    const slotOvr = (u.side === 'h' ? home : away).lineup.find(x => x.pos === p.pos);
    const out = p.injury > 0 || p.ban > 0, starter = !out && p.overall >= (slotOvr ? slotOvr.ovr : 0) - 3;
    U = { name: `${p.name} ${p.surname}`, pos: p.pos, isUser: true,
      ovr: p.overall * (0.9 + 0.1 * p.fitness / 100) + (p.morale - 50) * 0.03 };
    uState = { starter, entry: 999, exit: 91, goals: 0, assists: 0, yellow: 0, red: 0, mom: 0 };
    if (out) uState.entry = 999;
    else if (starter) { uState.entry = 1; if (p.fitness < 55) uState.exit = rng.int(60, 80); }
    else if (rng.chance(.5)) uState.entry = rng.int(55, 75);
  }
  const MOM = U && u.interactive ? { dec: u.decisions || [], list: [], last: -99, A: effAttrs(u.player) } : null;
  const S = {
    h: { team: home, base: home.lineup.map(p => ({ ...p })), g: 0, sh: 0, sot: 0, y: 0, r: 0, atk: 0, yc: {} },
    a: { team: away, base: away.lineup.map(p => ({ ...p })), g: 0, sh: 0, sot: 0, y: 0, r: 0, atk: 0, yc: {} },
  };
  for (const k of ['h', 'a']) {
    const s = S[k];
    s.slot = U && u.side === k ? Math.max(0, s.base.findIndex(p => p.pos === U.pos)) : -1;
  }
  const pitch = (k, min) => {
    const s = S[k];
    if (s.slot < 0) return s.base.filter(x => !x.off);
    const l = s.base.slice();
    if (min >= uState.entry && min < uState.exit) l[s.slot] = U;
    return l.filter(x => !x.off); // expulsos saem de campo: o time joga com 10
  };
  const events = [];
  let sumH = 0, sumA = 0;
  const uSub = (min, inn) => events.push({ min, type: 'sub', side: u.side, out: S[u.side].base[S[u.side].slot].name, in: U.name, user: true, inn });
  if (U && uState.entry > 1 && uState.entry <= 90) uSub(uState.entry, true);
  if (U && uState.exit <= 90) uSub(uState.exit, false);
  // substituições da IA (apenas eventos de texto)
  for (const k of ['h', 'a']) for (const m of [rng.int(58, 66), rng.int(70, 78)]) {
    const outs = S[k].base.filter(p => p.pos !== 'GOL' && !p.isUser);
    events.push({ min: m, type: 'sub', side: k, out: rng.pick(outs).name, in: `${rng.pick(FIRST)} (reserva)` });
  }


  const addGoal = (k, atk, min, fix = {}) => {
    const scorer = fix.scorer || rng.weighted(atk, atk.map(p => SCORE_W[p.pos] * (p.ovr / 60) ** 3));
    const as = 'assist' in fix ? fix.assist : (rng.chance(.7) ? rng.weighted(atk, atk.map(p => p === scorer ? 0 : ASSIST_W[p.pos] * (p.ovr / 60) ** 2)) : null);
    S[k].g++;
    if (scorer.isUser) uState.goals++;
    if (as && as.isUser) uState.assists++;
    events.push({ min, type: 'goal', side: k, scorer: scorer.name, assist: as ? as.name : null, score: `${S.h.g}-${S.a.g}` });
  };
  const shotSeq = (k, atk, ae, de, min) => {
    if (rng() < .62) { S[k].sh++; if (rng() < .45) { S[k].sot++; if (rng() < clamp(.22 + (ae - de) * .012, .08, .45)) addGoal(k, atk, min); } }
  };
  const card = (k, p, direct, min) => {
    const n = (S[k].yc[p.name] = (S[k].yc[p.name] || 0) + (direct ? 2 : 1));
    const red = n >= 2;
    if (red) { S[k].r++; if (!direct) S[k].y++; p.off = true; } else S[k].y++;
    events.push({ min, type: red ? 'red' : 'yellow', side: k, player: p.name, mine: !!p.isUser });
    if (p.isUser) {
      if (red) { // expulsão: sai na hora, o time fica com 10 e ele é suspenso (vermelho direto = 2 jogos)
        uState.red++; if (!direct) uState.yellow++; uState.exit = min; uState.ban = direct ? 2 : 1; S[k].base[S[k].slot].off = true;
        for (let i = events.length - 1; i >= 0; i--) if (events[i].user && events[i].type === 'sub' && !events[i].inn) events.splice(i, 1);
      } else uState.yellow++;
    }
  };
  // Lance decisivo: k = time que ataca; X = {ph, pa, eh, ea} no minuto
  const mom = (k, min, atk, ae, de, X) => {
    const me = u.side, mine = k === me, A = MOM.A, gk = U.pos === 'GOL', kind = mine ? 'atk' : gk ? 'gk' : 'def';
    const opts = MM_OPTS[kind], auto = kind === 'atk' ? (U.pos === 'ATA' || U.pos === 'PON' ? 'shoot' : 'pass') : kind === 'def' ? 'mark' : 'angle';
    const i = MOM.list.length, given = MOM.dec[i], chosen = opts.some(o => o.id === given) ? given : auto;
    const myL = me === 'h' ? X.ph : X.pa, myE = me === 'h' ? X.eh : X.ea;
    const form = (u.player.fitness - 80) * .001 + (u.player.morale - 50) * .0008, at = events.length;
    let txt = '', ok = false, d = 0;
    const teammate = () => rng.weighted(myL, myL.map(p => p === U ? 0 : SCORE_W[p.pos] * (p.ovr / 60) ** 3));
    const counter = () => { // contra-ataque do seu time depois de ganhar a bola
      if (rng() < .35) { S[me].sh++; if (rng() < .5) { S[me].sot++; if (rng() < .35) { addGoal(me, myL, min, { scorer: teammate(), assist: rng() < .5 ? U : null }); return true; } } }
      return false;
    };
    if (kind === 'atk') {
      if (chosen === 'shoot') {
        S[k].sh++;
        if (rng() < clamp(.07 + (A.chute - 60) * .005 + (ae - de) * .003 + form, .03, .4)) { S[k].sot++; addGoal(k, atk, min, { scorer: U }); txt = 'Você bateu firme e fez GOL!'; ok = true; d = .2; }
        else { const x = rng(); if (x < .5) { S[k].sot++; txt = 'Você chutou, mas o goleiro defendeu.'; } else txt = x < .85 ? 'Você chutou para fora.' : 'Seu chute foi bloqueado.'; d = -.15; }
      } else if (chosen === 'pass') {
        if (rng() < clamp(.58 + (A.passe - 60) * .006 + form, .28, .88)) {
          S[k].sh++; ok = true;
          if (rng() < clamp(.16 + (ae - de) * .004, .06, .4)) { S[k].sot++; addGoal(k, atk, min, { scorer: teammate(), assist: U }); txt = 'Passe perfeito! Seu companheiro marcou.'; d = .15; }
          else { txt = 'Ótimo passe, mas a finalização não saiu.'; d = .1; }
        } else { txt = 'O passe foi interceptado.'; d = -.15; }
      } else {
        if (rng() < clamp(.38 + (A.drible - 60) * .008 + (A.ritmo - 60) * .003 + form - (de - 60) * .003, .15, .72)) {
          S[k].sh++; S[k].sot++; ok = true;
          if (rng() < clamp(.28 + (A.chute - 60) * .005, .12, .6)) { addGoal(k, atk, min, { scorer: U }); txt = 'Você driblou o marcador e marcou!'; d = .3; }
          else { txt = 'Você driblou, mas o goleiro salvou.'; d = .1; }
        } else { txt = 'Você perdeu a bola no drible.'; d = -.2; }
      }
    } else if (kind === 'def') {
      if (chosen === 'mark') {
        if (rng() < clamp(.70 + (A.defesa - 60) * .005 + (A.fisico - 60) * .003 + form, .4, .9)) { txt = 'Você fechou o espaço e travou o ataque.'; ok = true; d = .15; }
        else { const g0 = S[k].g; shotSeq(k, atk, ae, de, min); d = S[k].g > g0 ? -.3 : -.15; txt = S[k].g > g0 ? 'Você chegou atrasado e o adversário marcou.' : 'Você chegou atrasado, mas a finalização não deu em nada.'; }
      } else if (chosen === 'tackle') {
        if (rng() < clamp(.62 + (A.defesa - 60) * .007 + (A.ritmo - 60) * .002 + form, .3, .88)) { ok = true; d = .3; txt = counter() ? 'Desarme perfeito e contra-ataque fatal: GOL!' : 'Desarme perfeito! Bola sua.'; }
        else {
          S[k].sh++; if (rng() < .22) card(me, U, false, min);
          if (rng() < clamp(.30 + (ae - de) * .008, .15, .55)) { S[k].sot++; addGoal(k, atk, min); txt = 'Você errou o bote e sofreu o gol.'; d = -.45; }
          else { txt = 'Você errou o bote, mas a defesa se salvou.'; d = -.3; }
        }
      } else {
        txt = 'Você parou o ataque com uma falta tática.'; ok = true; d = .1;
        if (rng() < .45) { card(me, U, false, min); txt += ' Cartão para você.'; d = -.05; }
        if (rng() < .06) { S[k].sh++; S[k].sot++; addGoal(k, atk, min); txt += ' Mas a cobrança entrou…'; d = -.35; ok = false; }
      }
    } else {
      S[k].sh++; S[k].sot++;
      const gol = (txtOk, dOk) => { txt = txtOk; ok = true; d = dOk; }, sofre = (t2, d2) => { addGoal(k, atk, min); txt = t2; d = d2; };
      if (chosen === 'angle') { if (rng() < clamp(.89 + (A.goleiro - 60) * .003 + form, .7, .97)) gol('Você fechou o ângulo e defendeu!', .25); else sofre('O chute entrou, não deu para defender.', -.3); }
      else if (chosen === 'dive') { if (rng() < clamp(.82 + (A.goleiro - 60) * .006 + form, .5, .97)) gol('Defesaça! Você espalmou para escanteio.', .3); else sofre('Você voou, mas a bola entrou.', -.3); }
      else if (rng() < clamp(.74 + (A.goleiro - 60) * .003 + (A.ritmo - 60) * .002 + form, .45, .92)) { gol('Você saiu e ficou com a bola!', .2); if (counter()) txt = 'Você saiu, ganhou a bola e o contra-ataque terminou em GOL!'; }
      else if (rng() < .85) sofre('Você saiu mal e o gol ficou vazio.', -.5); else { txt = 'Sorte! A bola passou rente à trave.'; d = -.1; }
    }
    events.splice(at, 0, { min, type: 'moment', side: me, text: txt, ok, mom: true });
    MOM.list.push({ min, kind, text: MM_INTRO[kind][min % 3], options: opts, chosen, auto: i >= MOM.dec.length, result: txt, ok });
    MOM.last = min; uState.mom += d;
  };

  for (let min = 1; min <= 90; min++) {
    const ph = pitch('h', min), pa = pitch('a', min);
    const eh = avg(ph) + 2 - 5 * S.h.r, ea = avg(pa) - 5 * S.a.r;
    sumH += eh; sumA += ea;
    if (rng() < .30) {
      const k = rng() < eh ** 3 / (eh ** 3 + ea ** 3) ? 'h' : 'a';
      const atk = k === 'h' ? ph : pa, ae = k === 'h' ? eh : ea, de = k === 'h' ? ea : eh;
      S[k].atk++;
      let done = false;
      if (MOM && min >= uState.entry && min < uState.exit && !U.off && min < 88 && MOM.list.length < MM_MAX && min - MOM.last >= MM_GAP) {
        const w = MM_W[U.pos][k === u.side ? 'atk' : 'def'];
        if (w && rng() < w) { mom(k, min, atk, ae, de, { ph, pa, eh, ea }); done = true; }
      }
      if (!done) shotSeq(k, atk, ae, de, min);
    }
    for (const k of ['h', 'a']) {
      const on = pitch(k, min);
      const direct = rng() < .0004;
      if (rng() < .004 || direct) {
        const p = rng.weighted(on, on.map(x => x.pos === 'GOL' ? .3 : 1));
        card(k, p, direct, min);
      }
    }
  }
  events.sort((a, b) => a.min - b.min);
  const share = .6 * (sumH / (sumH + sumA)) + .4 * (S.h.atk / Math.max(1, S.h.atk + S.a.atk));
  const poss = Math.round(clamp(share * 100, 25, 75));
  const side = (k) => ({ id: S[k].team.id, name: S[k].team.name, short: S[k].team.short, color: S[k].team.color, color2: S[k].team.color2, pat: S[k].team.pat, g: S[k].g, shots: S[k].sh, onTarget: S[k].sot, yellow: S[k].y, red: S[k].r });
  const res = { home: side('h'), away: side('a'), poss: { h: poss, a: 100 - poss }, events, moments: MOM ? MOM.list : [], user: null };

  if (U) {
    const mine = S[u.side].g, theirs = S[u.side === 'h' ? 'a' : 'h'].g;
    const minutes = uState.entry > 90 ? 0 : Math.max(0, Math.min(uState.exit, 91) - uState.entry);
    let rating = null;
    if (minutes > 0) {
      const defender = U.pos === 'GOL' || U.pos === 'ZAG' || U.pos === 'LAT';
      rating = 6 + uState.goals * .9 + uState.assists * .6 + (mine > theirs ? .3 : mine < theirs ? -.3 : 0)
        + (u.player.overall - avg(S[u.side].base)) * .03 + (rng() - .5) - uState.yellow * .2 - uState.red * 1.5
        + (defender ? (theirs === 0 ? .5 : -.2 * theirs) : 0) + clamp(uState.mom || 0, -1, 1.2);
      rating = Math.round(clamp(rating, 3, 10) * 10) / 10;
    }
    res.user = { side: u.side, starter: uState.starter, minutes, rating, goals: uState.goals, assists: uState.assists, yellow: uState.yellow, red: uState.red, ban: uState.ban || 0, moms: MOM ? { n: MOM.list.length, ok: MOM.list.filter(m => m.ok).length } : null, result: mine > theirs ? 'V' : mine < theirs ? 'D' : 'E' };
  }
  return res;
}
