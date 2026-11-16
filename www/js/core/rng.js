// Gerador pseudoaleatório com semente (permite salvar e reproduzir a carreira)
export function makeRng(seed) {
  let s = seed >>> 0;
  const f = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.state = () => s;
  f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  f.weighted = (items, w) => {
    let t = w.reduce((x, y) => x + y, 0) * f(), i = 0;
    for (; i < items.length - 1; i++) { t -= w[i]; if (t < 0) break; }
    return items[i];
  };
  return f;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
