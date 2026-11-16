// Gera dist/index.html (arquivo único) só para pré-visualizar no navegador. O app Android usa a pasta www/ como está.
import fs from 'node:fs';
const order = ['rng', 'data', 'player', 'schedule', 'match', 'save', 'career'].map(f => `www/js/core/${f}.js`).concat('www/js/sfx.js', 'www/js/avatar.js', 'www/js/matchview.js', 'www/js/main.js');
const js = order.map(f => fs.readFileSync(f, 'utf8').replace(/^import .*$/gm, '').replace(/^export (const|function|let) /gm, '$1 ')).join('\n');
const css = fs.readFileSync('www/css/style.css', 'utf8');
const html = fs.readFileSync('www/index.html', 'utf8').replace('<link rel="stylesheet" href="css/style.css">', `<style>${css}</style>`).replace('<script type="module" src="js/main.js"></script>', `<script>${js}</script>`);
fs.mkdirSync('dist', { recursive: true }); fs.writeFileSync('dist/index.html', html); console.log('dist/index.html', html.length, 'bytes');
