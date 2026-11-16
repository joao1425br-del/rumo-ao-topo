// Personagem estilo anime (SVG, totalmente editável) e gráfico radar de atributos
export const SKIN = ['#ffe0cc', '#f7c9a5', '#e0a77c', '#b9805a', '#7a4f36'];
export const HAIR = ['#23233f', '#7a4a2a', '#ffb347', '#ffe27a', '#ff4d6d', '#6c8cff', '#f2f2f2', '#3ddc97'];
export const EYES = ['#3d7bff', '#2fd6a6', '#a05cff', '#ff6b6b', '#f5b83d', '#2b2b3d'];
export const STYLES = ['Espetado', 'Franja', 'Longo', 'Topete', 'Curto', 'Moicano'];
export const SHAPES = ['Normal', 'Determinado', 'Gentil'];
export const MOUTHS = ['Sorriso', 'Sério', 'Animado'];
export const ACCS = ['Nenhum', 'Faixa', 'Curativo'];
let uid = 0;
const L = '#14104a';
// [rx esclera, ry esclera, rx íris, ry íris, rx pupila, ry pupila, centro y]
const EYE = [[14, 16, 10.5, 13.5, 4.8, 7.5, 108], [14, 12.5, 10.5, 10, 4.8, 6, 110], [15, 17.5, 11.5, 14.5, 5.5, 8, 107]];
const LASH = ['M62 100Q78 88 94 100M106 100Q122 88 138 100', 'M62 104L94 96M106 96L138 104', 'M62 98Q78 85 94 98M106 98Q122 85 138 98'];
const BROW = ['M62 86Q78 78 94 85M106 85Q122 78 138 86', 'M62 80L94 89M106 89L138 80', 'M62 84Q78 73 94 82M106 82Q122 73 138 84'];

export function animeChar(look = {}, size = 120, kit = '#6c4cff') {
  const sk = SKIN[look.skin ?? 1], ha = HAIR[look.hair ?? 0], ey = EYES[look.eye ?? 0];
  const st = look.style ?? 0, sh = look.shape ?? 0, mo = look.mouth ?? 0, ac = look.acc ?? 0, num = look.num ?? 10, id = 'a' + (uid++);
  const back = st === 2 ? `<path d="M50 92Q36 150 56 196L84 178 116 178 144 196Q164 150 150 92Z" fill="${ha}" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>` : '';
  const front = [
    `<path d="M46 104L38 58 62 74 64 26 88 56 104 16 120 56 142 28 140 74 164 56 154 104Q150 76 128 74L116 94 100 70 84 94 72 74Q52 78 46 104Z"/>`,
    `<path d="M45 108Q36 40 100 34Q164 40 155 108Q150 72 128 64Q104 92 72 66Q52 76 45 108Z"/>`,
    `<path d="M45 112Q34 40 100 32Q166 40 155 112Q150 74 118 66Q100 82 84 66Q54 76 45 112Z"/>`,
    `<path d="M46 104Q30 52 76 32Q118 6 152 42Q170 72 154 104Q148 76 124 70Q100 60 78 72Q54 78 46 104Z"/>`,
    `<path d="M48 100Q42 50 100 46Q158 50 152 100Q146 70 100 66Q54 70 48 100Z"/>`,
    `<path d="M72 78Q66 56 78 44L82 18 92 38 100 6 108 38 118 18 122 44Q134 56 128 78Q116 68 100 68Q84 68 72 78Z"/><path d="M50 100Q46 70 70 64L70 82Q56 86 50 100ZM150 100Q154 70 130 64L130 82Q144 86 150 100Z" opacity=".55"/>`,
  ][st];
  const eye = (cx) => { const [rx, ry, ir, iy, pr, py, cy] = EYE[sh];
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff"/><ellipse cx="${cx}" cy="${cy + 2}" rx="${ir}" ry="${iy}" fill="${ey}"/><ellipse cx="${cx}" cy="${cy - 3}" rx="${ir}" ry="${iy * .45}" fill="#000" opacity=".18"/><ellipse cx="${cx}" cy="${cy + 3}" rx="${pr}" ry="${py}" fill="${L}"/><circle cx="${cx - 4}" cy="${cy - 5}" r="4.2" fill="#fff"/><circle cx="${cx + 4}" cy="${cy + 8}" r="2" fill="#fff"/>`; };
  const mouth = [`<path d="M89 138Q100 148 111 138" fill="none" stroke="${L}" stroke-width="2.8" stroke-linecap="round"/>`,
    `<path d="M91 141H109" fill="none" stroke="${L}" stroke-width="2.8" stroke-linecap="round"/>`,
    `<path d="M88 135Q100 155 112 135Z" fill="#7a1f3a" stroke="${L}" stroke-width="2" stroke-linejoin="round"/><path d="M92 136.5H108V139Q100 142 92 139Z" fill="#fff"/>`][mo];
  const acc = ac === 1 ? `<path d="M47 74Q100 58 153 74L151 88Q100 74 49 88Z" fill="#ff5d7e" stroke="${L}" stroke-width="2" stroke-linejoin="round"/>`
    : ac === 2 ? `<g transform="rotate(-18 100 126)"><rect x="86" y="121" width="28" height="10" rx="4" fill="#f5d7a6" stroke="${L}" stroke-width="1.8"/><circle cx="96" cy="126" r="1" fill="#c79a5a"/><circle cx="100" cy="126" r="1" fill="#c79a5a"/><circle cx="104" cy="126" r="1" fill="#c79a5a"/></g>` : '';
  return `<svg width="${size}" height="${Math.round(size * 1.1)}" viewBox="0 0 200 220" role="img" aria-label="Personagem">
<defs><radialGradient id="${id}"><stop offset="0" stop-color="#ff7eb6" stop-opacity=".7"/><stop offset="1" stop-color="#6c4cff" stop-opacity="0"/></radialGradient></defs>
<circle cx="100" cy="100" r="92" fill="url(#${id})"/>${back}
<path d="M18 222C22 176 60 160 100 160S178 176 182 222Z" fill="${kit}" stroke="${L}" stroke-width="2.5"/>
<path d="M76 162L100 192 124 162Z" fill="#fff" stroke="${L}" stroke-width="2"/>
<path d="M30 206L170 186" stroke="#fff" stroke-width="7" opacity=".35"/>
<text x="100" y="216" text-anchor="middle" font-size="${String(num).length > 1 ? 26 : 30}" font-weight="900" font-style="italic" fill="#fff" stroke="${L}" stroke-width="1" font-family="sans-serif">${num}</text>
<path d="M86 138V168Q100 180 114 168V138Z" fill="${sk}" stroke="${L}" stroke-width="2"/><path d="M86 150Q100 162 114 150V138H86Z" fill="#8a4a30" opacity=".18"/>
<circle cx="51" cy="106" r="8" fill="${sk}" stroke="${L}" stroke-width="2"/><circle cx="149" cy="106" r="8" fill="${sk}" stroke="${L}" stroke-width="2"/>
<path d="M52 95Q52 150 100 160Q148 150 148 95Q148 48 100 48Q52 48 52 95Z" fill="${sk}" stroke="${L}" stroke-width="2.5"/>
<path d="M52 112Q60 152 100 160Q140 152 148 112Q140 138 100 142Q60 138 52 112Z" fill="#8a4a30" opacity=".12"/>
${eye(78)}${eye(122)}
<path d="${LASH[sh]}" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/>
<path d="${BROW[sh]}" fill="none" stroke="${ha}" stroke-width="3.5" stroke-linecap="round"/>
<path d="M98 124Q100 128 102 124" fill="none" stroke="#a8644a" stroke-width="1.8" stroke-linecap="round"/>${mouth}
<ellipse cx="66" cy="128" rx="8" ry="4" fill="#ff7eb6" opacity=".5"/><ellipse cx="134" cy="128" rx="8" ry="4" fill="#ff7eb6" opacity=".5"/>${acc.startsWith('<g') ? acc : ''}
<g fill="${ha}" stroke="${L}" stroke-width="2.5" stroke-linejoin="round">${front}</g>${acc.startsWith('<path') ? acc : ''}
<path d="M68 50Q92 36 120 46" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".4"/>
<text x="168" y="40" font-size="20" fill="#ffd166">✦</text><text x="22" y="64" font-size="13" fill="#3de2ff">✦</text></svg>`;
}

export function radar(attrs, keys, labels, size = 260) {
  const c = size / 2, R = size * .33, n = keys.length;
  const pt = (i, r) => [c + Math.sin(i * 2 * Math.PI / n) * R * r, c - Math.cos(i * 2 * Math.PI / n) * R * r];
  const poly = (r) => keys.map((_, i) => pt(i, r).map(v => v.toFixed(1)).join(',')).join(' ');
  const data = keys.map((k, i) => pt(i, Math.min(1, attrs[k] / 100)).map(v => v.toFixed(1)).join(',')).join(' ');
  const lab = keys.map((k, i) => { const [x, y] = pt(i, 1.28); return `<text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="middle" font-size="11" fill="#bdb4f0" font-family="sans-serif">${labels[k]}</text><text x="${x.toFixed(1)}" y="${(y + 12).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="900" fill="#fff" font-family="sans-serif">${attrs[k]}</text>`; }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" role="img" aria-label="Gráfico de atributos">${[.33, .66, 1].map(r => `<polygon points="${poly(r)}" fill="none" stroke="#3a2f7a" stroke-width="1.5"/>`).join('')}${keys.map((_, i) => `<line x1="${c}" y1="${c}" x2="${pt(i, 1)[0].toFixed(1)}" y2="${pt(i, 1)[1].toFixed(1)}" stroke="#3a2f7a"/>`).join('')}<polygon points="${data}" fill="#ff7eb6" fill-opacity=".38" stroke="#ff7eb6" stroke-width="2.5" stroke-linejoin="round"/>${lab}</svg>`;
}
