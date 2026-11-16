// Pontos corridos, turno e returno (método do círculo). Retorna lista de rodadas; cada rodada = [[casa, fora], ...]
export function roundRobin(ids) {
  const n = ids.length, arr = ids.slice(), rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const m = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      m.push((r + i) % 2 ? [b, a] : [a, b]);
    }
    rounds.push(m);
    arr.splice(1, 0, arr.pop());
  }
  return rounds.concat(rounds.map(r => r.map(([h, a]) => [a, h])));
}
