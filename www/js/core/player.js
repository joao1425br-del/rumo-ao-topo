import { WEIGHTS, ATTRS, ITEMS } from './data.js';
import { clamp } from './rng.js';

// Atributos efetivos = base (que o jogador melhora com pontos) + bônus dos itens equipados
export function effAttrs(p) {
  const e = { ...p.attrs };
  for (const id of Object.values(p.gear || {})) { const it = id && ITEMS[id]; if (it) e[it.attr] = Math.min(99, (e[it.attr] || 0) + it.val); }
  return e;
}
const weigh = (p, a) => Math.round(Object.entries(WEIGHTS[p.pos]).reduce((s, [k, v]) => s + a[k] * v, 0));
export const calcOverall = (p) => weigh(p, effAttrs(p));   // overall que vale em campo (com itens)
export const baseOverall = (p) => weigh(p, p.attrs);        // overall só dos atributos (limitado pelo potencial)

// o = {name, surname, age, nat, pos, foot, look}
export function createPlayer(o, rng) {
  const w = WEIGHTS[o.pos];
  const target = rng.int(51, 58);
  const attrs = {};
  for (const a of Object.keys(ATTRS)) attrs[a] = clamp(w[a] ? target + rng.int(-4, 6) : target - rng.int(8, 20), 25, 99);
  const p = { ...o, attrs, xp: 0, level: 1, ph: 6, gear: {}, fitness: 100, morale: 60, injury: 0 };
  const d = target - calcOverall(p);
  for (const a of Object.keys(w)) p.attrs[a] = clamp(p.attrs[a] + d, 25, 99);
  p.overall = calcOverall(p);
  p.potential = clamp(p.overall + rng.int(12, 28) + (o.age < 20 ? 6 : 0), 60, 94);
  p.contract = { salary: 2000 + p.overall * 40, years: 2, bonus: 500 + p.overall * 10 };
  return p;
}

export const PH_PER_LEVEL = 4;
// Experiência: cada 100 XP = 1 nível = 4 pontos de habilidade (o jogador escolhe onde gastar). Depois dos 30 não há mais XP.
export function applyXp(p, gain, rng) {
  if (p.age > 30) { p.xp = 0; return []; }
  if (baseOverall(p) >= p.potential) { p.xp = 0; return []; } // já atingiu o potencial
  p.xp += gain; const ups = [];
  while (p.xp >= 100) { p.xp -= 100; p.level = (p.level || 1) + 1; p.ph = (p.ph || 0) + PH_PER_LEVEL; ups.push(p.level); }
  return ups;
}
// Custo (em pontos) de subir +1 um atributo: quanto mais alto, mais caro
export const upgradeCost = (v) => v < 65 ? 1 : v < 80 ? 2 : v < 92 ? 3 : 4;
export function upgrade(p, attr) {
  if (!WEIGHTS[p.pos][attr]) return 'irrelevante';
  const v = p.attrs[attr]; if (v >= 99) return 'max';
  const cost = upgradeCost(v); if ((p.ph || 0) < cost) return 'ph';
  p.attrs[attr] = v + 1;
  if (baseOverall(p) > p.potential) { p.attrs[attr] = v; return 'potencial'; }
  p.ph -= cost; p.overall = calcOverall(p); return 'ok';
}
// Gasta todos os pontos de forma inteligente: prioriza atributos de maior peso e menor custo
export function autoSpend(p) {
  const keys = Object.keys(WEIGHTS[p.pos]); let n = 0;
  for (let g = 0; g < 300; g++) {
    let best = null, bs = -1;
    for (const k of keys) {
      const v = p.attrs[k]; if (v >= 99) continue;
      const cost = upgradeCost(v); if ((p.ph || 0) < cost) continue;
      p.attrs[k] = v + 1; const ok = baseOverall(p) <= p.potential; p.attrs[k] = v;
      const sc = WEIGHTS[p.pos][k] / cost; if (ok && sc > bs) { bs = sc; best = k; }
    }
    if (!best) break; upgrade(p, best); n++;
  }
  return n;
}
