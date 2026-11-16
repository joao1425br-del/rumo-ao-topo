export const POSITIONS = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', PON: 'Ponta', ATA: 'Atacante' };
export const ATTRS = { ritmo: 'Ritmo', chute: 'Finalização', passe: 'Passe', drible: 'Drible', defesa: 'Defesa', fisico: 'Físico', goleiro: 'Goleiro' };
// Peso de cada atributo no overall, por posição (soma = 1)
export const WEIGHTS = {
  GOL: { goleiro: .75, fisico: .10, passe: .10, ritmo: .05 },
  ZAG: { defesa: .50, fisico: .30, ritmo: .10, passe: .10 },
  LAT: { ritmo: .30, defesa: .30, passe: .20, fisico: .10, drible: .10 },
  VOL: { defesa: .35, passe: .30, fisico: .25, drible: .10 },
  MEI: { passe: .40, drible: .25, chute: .20, ritmo: .15 },
  PON: { ritmo: .35, drible: .35, chute: .15, passe: .15 },
  ATA: { chute: .45, ritmo: .20, drible: .15, fisico: .20 },
};
export const NATS = ['Brasil', 'Argentina', 'Portugal', 'Espanha', 'Inglaterra', 'França', 'Alemanha', 'Itália', 'Uruguai', 'Colômbia', 'México', 'Estados Unidos'];
export const FIRST = ['Lucas', 'Mateus', 'Rafael', 'Diego', 'Bruno', 'Caio', 'Thiago', 'Pedro', 'Hugo', 'Felipe', 'Gael', 'Davi', 'Iago', 'Nicolas', 'Ruan', 'Samuel'];
export const LAST = ['Silva', 'Souza', 'Costa', 'Ribeiro', 'Almeida', 'Rocha', 'Lima', 'Barros', 'Moreira', 'Teixeira', 'Nunes', 'Cardoso', 'Pires', 'Duarte', 'Farias', 'Macedo'];
// Elenco titular padrão (4-3-3 adaptado)
export const SLOTS = ['GOL', 'ZAG', 'ZAG', 'LAT', 'LAT', 'VOL', 'MEI', 'MEI', 'PON', 'PON', 'ATA'];
// Brasileirão Série A (div 'A') e Série B (div 'B') de 2026: 40 clubes reais. start: true = clubes oferecidos para começar a carreira.
// "strength" é uma ESTIMATIVA do autor para equilíbrio de jogo, não é nota oficial. Escudos reais não são usados: só as cores.
// pat: stripes = listras verticais, hoops = faixas horizontais, half = metade/metade, solid = lisa
export const CLUBS = [
  { div: 'A', start: true, id: 'cha', name: 'Chapecoense', short: 'CHA', strength: 54, color: '#1a9a4a', color2: '#ffffff', pat: 'solid' },
  { div: 'A', start: true, id: 'rem', name: 'Remo', short: 'REM', strength: 55, color: '#1b2f6b', color2: '#ffffff', pat: 'solid' },
  { div: 'A', start: true, id: 'vit', name: 'Vitória', short: 'VIT', strength: 60, color: '#d3202f', color2: '#111111', pat: 'stripes' },
  { div: 'A', id: 'mir', name: 'Mirassol', short: 'MIR', strength: 62, color: '#f5c518', color2: '#0b7a4b', pat: 'solid' },
  { div: 'A', id: 'cfc', name: 'Coritiba', short: 'CFC', strength: 62, color: '#1c8f4f', color2: '#ffffff', pat: 'stripes' },
  { div: 'A', id: 'rbb', name: 'Red Bull Bragantino', short: 'RBB', strength: 66, color: '#f2f2f2', color2: '#d3202f', pat: 'solid' },
  { div: 'A', id: 'san', name: 'Santos', short: 'SAN', strength: 67, color: '#f2f2f2', color2: '#111111', pat: 'solid' },
  { div: 'A', id: 'vas', name: 'Vasco da Gama', short: 'VAS', strength: 68, color: '#111111', color2: '#ffffff', pat: 'solid' },
  { div: 'A', id: 'sao', name: 'São Paulo', short: 'SAO', strength: 70, color: '#d3202f', color2: '#f2f2f2', pat: 'hoops' },
  { div: 'A', id: 'gre', name: 'Grêmio', short: 'GRE', strength: 70, color: '#3aa0e0', color2: '#111111', pat: 'stripes' },
  { div: 'A', id: 'int', name: 'Internacional', short: 'INT', strength: 70, color: '#d3202f', color2: '#ffffff', pat: 'solid' },
  { div: 'A', id: 'cam', name: 'Atlético-MG', short: 'CAM', strength: 71, color: '#111111', color2: '#ffffff', pat: 'stripes' },
  { div: 'A', id: 'cor', name: 'Corinthians', short: 'COR', strength: 71, color: '#f2f2f2', color2: '#111111', pat: 'solid' },
  { div: 'A', id: 'bah', name: 'Bahia', short: 'BAH', strength: 71, color: '#1e5ba8', color2: '#e03a3e', pat: 'half' },
  { div: 'A', id: 'cap', name: 'Athletico-PR', short: 'CAP', strength: 72, color: '#d3202f', color2: '#111111', pat: 'stripes' },
  { div: 'A', id: 'flu', name: 'Fluminense', short: 'FLU', strength: 72, color: '#8a1d3a', color2: '#0b7a4b', pat: 'stripes' },
  { div: 'A', id: 'bot', name: 'Botafogo', short: 'BOT', strength: 74, color: '#111111', color2: '#ffffff', pat: 'stripes' },
  { div: 'A', id: 'cru', name: 'Cruzeiro', short: 'CRU', strength: 75, color: '#1f4fa8', color2: '#ffffff', pat: 'solid' },
  { div: 'A', id: 'pal', name: 'Palmeiras', short: 'PAL', strength: 82, color: '#1f8a4c', color2: '#ffffff', pat: 'solid' },
  { div: 'A', id: 'fla', name: 'Flamengo', short: 'FLA', strength: 82, color: '#d9262c', color2: '#111111', pat: 'hoops' },
  // Brasileirão Série B 2026 (os 20 clubes reais)
  { div: 'B', start: true, id: 'lon', name: 'Londrina', short: 'LON', strength: 50, color: '#1e5ba8', color2: '#ffffff', pat: 'stripes' },
  { div: 'B', start: true, id: 'sbe', name: 'São Bernardo', short: 'SBE', strength: 50, color: '#f5c518', color2: '#111111', pat: 'solid' },
  { div: 'B', start: true, id: 'ope', name: 'Operário-PR', short: 'OPE', strength: 51, color: '#111111', color2: '#ffffff', pat: 'stripes' },
  { div: 'B', id: 'bsp', name: 'Botafogo-SP', short: 'BSP', strength: 51, color: '#d3202f', color2: '#111111', pat: 'stripes' },
  { div: 'B', id: 'ath', name: 'Athletic', short: 'ATH', strength: 52, color: '#111111', color2: '#ffffff', pat: 'stripes' },
  { div: 'B', id: 'nau', name: 'Náutico', short: 'NAU', strength: 52, color: '#d3202f', color2: '#ffffff', pat: 'stripes' },
  { div: 'B', id: 'pon', name: 'Ponte Preta', short: 'PON', strength: 52, color: '#111111', color2: '#ffffff', pat: 'stripes' },
  { div: 'B', id: 'ava', name: 'Avaí', short: 'AVA', strength: 53, color: '#1e5ba8', color2: '#ffffff', pat: 'stripes' },
  { div: 'B', id: 'cri', name: 'Criciúma', short: 'CRI', strength: 53, color: '#f5c518', color2: '#111111', pat: 'stripes' },
  { div: 'B', id: 'cui', name: 'Cuiabá', short: 'CUI', strength: 54, color: '#1a9a4a', color2: '#f5c518', pat: 'solid' },
  { div: 'B', id: 'vno', name: 'Vila Nova', short: 'VNO', strength: 54, color: '#d3202f', color2: '#ffffff', pat: 'solid' },
  { div: 'B', id: 'acg', name: 'Atlético-GO', short: 'ACG', strength: 55, color: '#d3202f', color2: '#111111', pat: 'stripes' },
  { div: 'B', id: 'crb', name: 'CRB', short: 'CRB', strength: 55, color: '#d3202f', color2: '#ffffff', pat: 'solid' },
  { div: 'B', id: 'ame', name: 'América-MG', short: 'AME', strength: 56, color: '#0b7a4b', color2: '#ffffff', pat: 'solid' },
  { div: 'B', id: 'juv', name: 'Juventude', short: 'JUV', strength: 56, color: '#1a9a4a', color2: '#ffffff', pat: 'stripes' },
  { div: 'B', id: 'nov', name: 'Novorizontino', short: 'NOV', strength: 56, color: '#f5c518', color2: '#111111', pat: 'solid' },
  { div: 'B', id: 'goi', name: 'Goiás', short: 'GOI', strength: 57, color: '#1a9a4a', color2: '#ffffff', pat: 'solid' },
  { div: 'B', id: 'spo', name: 'Sport', short: 'SPO', strength: 58, color: '#d3202f', color2: '#111111', pat: 'hoops' },
  { div: 'B', id: 'cea', name: 'Ceará', short: 'CEA', strength: 59, color: '#111111', color2: '#ffffff', pat: 'stripes' },
  { div: 'B', id: 'for', name: 'Fortaleza', short: 'FOR', strength: 60, color: '#1e5ba8', color2: '#d3202f', pat: 'stripes' },
];
// Série C (div 'C'): 20 clubes reais de divisões inferiores. A composição e a força são ESTIMATIVAS do autor (podem não bater com a edição oficial). Não existe Série D no jogo: ninguém cai da C.
export const CLUBS_C = [
  ['pay', 'Paysandu', 'PAY', 49, '#1e5ba8', '#ffffff', 'stripes'], ['fig', 'Figueirense', 'FIG', 49, '#111111', '#ffffff', 'stripes'],
  ['bru', 'Brusque', 'BRU', 48, '#f5c518', '#1e5ba8', 'solid'], ['vre', 'Volta Redonda', 'VRE', 47, '#f5c518', '#111111', 'solid'],
  ['fer', 'Ferroviária', 'FER', 47, '#8a1d3a', '#ffffff', 'solid'], ['ypi', 'Ypiranga-RS', 'YPI', 46, '#f5c518', '#1a9a4a', 'solid'],
  ['cnf', 'Confiança', 'CNF', 46, '#1e5ba8', '#ffffff', 'solid'], ['bpb', 'Botafogo-PB', 'BPB', 46, '#111111', '#ffffff', 'stripes'],
  ['flo', 'Floresta', 'FLO', 45, '#1a9a4a', '#ffffff', 'solid'], ['mar', 'Maringá', 'MAR', 45, '#f5c518', '#111111', 'solid'],
  ['itb', 'Itabaiana', 'ITB', 45, '#1e5ba8', '#ffffff', 'stripes'], ['gua', 'Guarani', 'GUA', 47, '#1a9a4a', '#ffffff', 'stripes'],
  ['tom', 'Tombense', 'TOM', 44, '#d3202f', '#1e5ba8', 'solid'], ['cax', 'Caxias', 'CAX', 44, '#8a1d3a', '#1e5ba8', 'stripes'],
  ['scz', 'Santa Cruz', 'SCZ', 46, '#d3202f', '#111111', 'stripes'], ['abc', 'ABC', 'ABC', 44, '#111111', '#ffffff', 'stripes', true],
  ['ama', 'Amazonas', 'AMA', 44, '#f5c518', '#111111', 'solid'], ['ili', 'Inter de Limeira', 'ILI', 43, '#d3202f', '#111111', 'solid', true],
  ['sam', 'Sampaio Corrêa', 'SAM', 45, '#f5c518', '#d3202f', 'stripes'], ['alt', 'Altos', 'ALT', 43, '#f5c518', '#111111', 'solid'],
].map(([id, name, short, strength, color, color2, pat, start]) => ({ div: 'C', ...(start ? { start: true } : {}), id, name, short, strength, color, color2, pat }));
// Clubes estrangeiros da Libertadores (div 'X'): reais, força estimada pelo autor, sem escudos. Não disputam campeonato nacional no jogo.
export const FOREIGN = [
  ['xboc', 'Boca Juniors', 'BOC', 77, '#1f3a8a', '#f5c518', 'hoops'],
  ['xriv', 'River Plate', 'RIV', 79, '#f2f2f2', '#d3202f', 'solid'],
  ['xrac', 'Racing', 'RAC', 73, '#7ec8f0', '#ffffff', 'stripes'],
  ['xind', 'Independiente', 'IND', 68, '#d3202f', '#ffffff', 'solid'],
  ['xest', 'Estudiantes', 'EST', 72, '#d3202f', '#ffffff', 'stripes'],
  ['xvel', 'Vélez Sarsfield', 'VEL', 70, '#f2f2f2', '#1f3a8a', 'solid'],
  ['xtal', 'Talleres', 'TAL', 68, '#1f3a8a', '#ffffff', 'solid'],
  ['xslo', 'San Lorenzo', 'SLO', 66, '#1f3a8a', '#d3202f', 'stripes'],
  ['xpen', 'Peñarol', 'PEN', 71, '#f5c518', '#111111', 'stripes'],
  ['xnac', 'Nacional (URU)', 'NAC', 71, '#f2f2f2', '#1f3a8a', 'solid'],
  ['xdef', 'Defensor Sporting', 'DEF', 60, '#6a2c91', '#ffffff', 'solid'],
  ['xcco', 'Colo-Colo', 'CCO', 66, '#f2f2f2', '#111111', 'solid'],
  ['xuch', 'Universidad de Chile', 'UCH', 65, '#1f3a8a', '#d3202f', 'solid'],
  ['xuca', 'Universidad Católica', 'UCA', 63, '#f2f2f2', '#1f3a8a', 'solid'],
  ['xanc', 'Atlético Nacional', 'ANC', 67, '#1a9a4a', '#ffffff', 'stripes'],
  ['xmil', 'Millonarios', 'MIL', 64, '#1f3a8a', '#ffffff', 'solid'],
  ['xjun', 'Junior', 'JUN', 62, '#d3202f', '#ffffff', 'stripes'],
  ['xoli', 'Olimpia', 'OLI', 65, '#f2f2f2', '#111111', 'solid'],
  ['xcer', 'Cerro Porteño', 'CER', 63, '#1f3a8a', '#d3202f', 'stripes'],
  ['xlib', 'Libertad', 'LBT', 62, '#111111', '#ffffff', 'solid'],
  ['xldu', 'LDU Quito', 'LDU', 68, '#f2f2f2', '#1f3a8a', 'solid'],
  ['xidv', 'Independiente del Valle', 'IDV', 70, '#111111', '#1f3a8a', 'solid'],
  ['xbsc', 'Barcelona SC', 'BSC', 62, '#f5c518', '#111111', 'solid'],
  ['xuni', 'Universitario', 'UNI', 64, '#f2d9a0', '#8a1d3a', 'solid'],
  ['xali', 'Alianza Lima', 'ALI', 59, '#1f3a8a', '#ffffff', 'stripes'],
  ['xscr', 'Sporting Cristal', 'SCR', 60, '#7ec8f0', '#ffffff', 'solid'],
  ['xbol', 'Bolívar', 'BLV', 61, '#7ec8f0', '#ffffff', 'solid'],
  ['xstr', 'The Strongest', 'STR', 58, '#f5c518', '#111111', 'stripes']
].map(([id, name, short, strength, color, color2, pat]) => ({ div: 'X', id, name, short, strength, color, color2, pat }));
// Seleções (estimativas de força, apenas para o jogo)
export const NATIONS = {
  'Brasil': { name: 'Brasil', short: 'BRA', strength: 82, color: '#f5c518', color2: '#1a9a4a', pat: 'solid' },
  'Argentina': { name: 'Argentina', short: 'ARG', strength: 83, color: '#7ec8f0', color2: '#ffffff', pat: 'stripes' },
  'Portugal': { name: 'Portugal', short: 'POR', strength: 82, color: '#b3202f', color2: '#1a7a3a', pat: 'solid' },
  'Espanha': { name: 'Espanha', short: 'ESP', strength: 84, color: '#c4202f', color2: '#f5c518', pat: 'solid' },
  'Inglaterra': { name: 'Inglaterra', short: 'ING', strength: 83, color: '#f2f2f2', color2: '#1f3a8a', pat: 'solid' },
  'França': { name: 'França', short: 'FRA', strength: 85, color: '#1f3a8a', color2: '#ffffff', pat: 'solid' },
  'Alemanha': { name: 'Alemanha', short: 'ALE', strength: 82, color: '#f2f2f2', color2: '#111111', pat: 'solid' },
  'Itália': { name: 'Itália', short: 'ITA', strength: 80, color: '#2a6fd1', color2: '#ffffff', pat: 'solid' },
  'Uruguai': { name: 'Uruguai', short: 'URU', strength: 79, color: '#7ec8f0', color2: '#111111', pat: 'solid' },
  'Colômbia': { name: 'Colômbia', short: 'COL', strength: 78, color: '#f5c518', color2: '#1f3a8a', pat: 'solid' },
  'México': { name: 'México', short: 'MEX', strength: 74, color: '#1a7a3a', color2: '#ffffff', pat: 'solid' },
  'Estados Unidos': { name: 'Estados Unidos', short: 'EUA', strength: 72, color: '#f2f2f2', color2: '#1f3a8a', pat: 'solid' },
};

// ===== Loja: equipamentos (bônus em atributos, não contam para o potencial) e equipe de apoio =====
// slot: só um item por slot. Cada linha tem 3 níveis (I, II, III).
export const LINES = [
  { line: 'bV', slot: 'chuteira', name: 'Chuteira Velocista', attr: 'ritmo', icon: '👟' },
  { line: 'bA', slot: 'chuteira', name: 'Chuteira Artilheira', attr: 'chute', icon: '👟' },
  { line: 'bM', slot: 'chuteira', name: 'Chuteira Mágica', attr: 'drible', icon: '👟' },
  { line: 'bP', slot: 'chuteira', name: 'Chuteira Maestro', attr: 'passe', icon: '👟' },
  { line: 'cM', slot: 'caneleira', name: 'Caneleira Muralha', attr: 'defesa', icon: '🦵' },
  { line: 'cT', slot: 'colete', name: 'Colete Titã', attr: 'fisico', icon: '🦺' },
  { line: 'lP', slot: 'luvas', name: 'Luvas Paredão', attr: 'goleiro', icon: '🧤' },
];
const TIER_PRICE = [15000, 60000, 220000], TIER_VAL = [2, 4, 6];
export const ITEMS = {};
for (const l of LINES) for (let t = 1; t <= 3; t++) ITEMS[l.line + t] = { id: l.line + t, line: l.line, slot: l.slot, name: `${l.name} ${['I', 'II', 'III'][t - 1]}`, tier: t, price: TIER_PRICE[t - 1], attr: l.attr, val: TIER_VAL[t - 1], icon: l.icon };
export const PERKS = {
  trainer: { name: 'Personal trainer', icon: '🏋️', desc: 'mais XP por jogo', prices: [40000, 150000, 400000], text: ['+15% de XP', '+30% de XP', '+50% de XP'], xp: [0, .15, .3, .5] },
  nutri: { name: 'Nutricionista', icon: '🥗', desc: 'recupera mais forma física por jogo', prices: [25000, 90000, 250000], text: ['+5 de forma por jogo', '+10 de forma por jogo', '+15 de forma por jogo'], rec: [0, 5, 10, 15] },
  fisio: { name: 'Fisioterapeuta', icon: '🩺', desc: 'menos lesões e recuperação mais rápida', prices: [30000, 110000, 300000], text: ['-20% de risco de lesão', '-40% de risco e 1 rodada a menos parado', '-60% de risco e 1 rodada a menos parado'], inj: [0, .2, .4, .6] },
};

// Titulares reais (de memória, podem estar desatualizados: elencos mudam). 11 nomes por clube, na ordem de SLOTS:
// GOL, ZAG, ZAG, LAT (dir.), LAT (esq.), VOL, MEI, MEI, PON, PON, ATA. Clube sem linha aqui usa nomes fictícios.
// O overall de cada um continua sorteado ao redor da força do clube (não é nota oficial).
export const ROSTERS = {
  fla: 'Rossi,Léo Pereira,Léo Ortiz,Varela,Ayrton Lucas,Pulgar,De la Cruz,Arrascaeta,Luiz Araújo,Everton Cebolinha,Pedro',
  pal: 'Weverton,Gustavo Gómez,Murilo,Giay,Piquerez,Aníbal Moreno,Raphael Veiga,Maurício,Ramón Sosa,Felipe Anderson,Vitor Roque',
  bot: 'John,Barboza,Bastos,Vitinho,Cuiabano,Gregore,Marlon Freitas,Savarino,Artur,Matheus Martins,Arthur Cabral',
  cru: 'Cássio,Fabrício Bruno,Villalba,William,Kaiki Bruno,Lucas Romero,Matheus Henrique,Matheus Pereira,Wanderson,Christian,Kaio Jorge',
  cor: 'Hugo Souza,André Ramalho,Gustavo Henrique,Matheuzinho,Hugo,Raniele,Rodrigo Garro,Maycon,Memphis Depay,Ángel Romero,Yuri Alberto',
  san: 'Gabriel Brazão,Gil,Luan Peres,Igor Vinícius,Escobar,João Schmidt,Rollheiser,Neymar,Soteldo,Barreal,Deivid Washington',
  sao: 'Rafael,Alan Franco,Sabino,Cédric Soares,Enzo Díaz,Marcos Antônio,Lucas Moura,Oscar,Luciano,Ferreirinha,Calleri',
  vas: 'Léo Jardim,Robert Renan,João Victor,Paulo Henrique,Lucas Piton,Hugo Moura,Philippe Coutinho,Tchê Tchê,Rayan,Nuno Moreira,Vegetti',
  gre: 'Tiago Volpi,Jemerson,Kannemann,João Pedro,Marlon,Villasanti,Edenílson,Cristaldo,Alysson,Aravena,Braithwaite',
  int: 'Sergio Rochet,Vitão,Juninho,Aguirre,Bernabei,Fernando,Thiago Maia,Alan Patrick,Wesley,Bruno Henrique,Borré',
  cam: 'Everson,Junior Alonso,Ruan,Natanael,Guilherme Arana,Alan Franco,Gustavo Scarpa,Igor Gomes,Cuello,Hulk,Rony',
  bah: 'Ronaldo,Gabriel Xavier,David Duarte,Gilberto,Luciano Juba,Jean Lucas,Rodrigo Nestor,Everton Ribeiro,Erick Pulga,Ademir,Willian José',
  cap: 'Santos,Thiago Heleno,Léo Godoy,Madson,Esquivel,Fernandinho,Christian,Zapelli,Julimar,Viveros,Pablo',
  flu: 'Fábio,Thiago Silva,Ignácio,Samuel Xavier,Renê,Martinelli,Nonato,Ganso,Kevin Serna,Canobbio,Germán Cano',
  mir: 'Walter,Reinaldo,Jemmes,Daniel Borges,Igor Cariús,Neto Moura,Gabriel,Chico Kim,Shaylon,Negueba,Fernandão',
  cfc: 'Pedro Rangel,Maurício Antônio,Jacy,Tinga,Egídio,Willian Farias,Sebastián Gómez,Josué,Alef Manga,Vini Paulista,Pedro Rocha',
  rbb: 'Cleiton,Eduardo Santos,Pedro Henrique,Andrés Hurtado,Juninho Capixaba,Jadsom Silva,Lucas Evangelista,Eric Ramires,Jhon Jhon,Lincoln,Isidro Pitta',
  vit: 'Lucas Arcanjo,Camutanga,Neris,Zeca,Claudinho,Willian Oliveira,Ricardo Ryller,Matheuzinho,Osvaldo,Janderson,Renato Kayzer',
};
