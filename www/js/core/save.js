const KEY = 'rumo_ao_topo_carreira_v1';
// 'storage' é injetável (facilita testes); no app usa localStorage.
// v3 -> v4: ganha pontos de habilidade, itens e equipe de apoio
export function migrate3(c) { const p = c.player; p.level = p.level || 1; p.ph = p.ph ?? 6; p.gear = p.gear || {}; c.perks = c.perks || { trainer: 0, nutri: 0, fisio: 0 }; c.owned = c.owned || []; c.version = 4; return c; }
const def = () => { try { return localStorage; } catch { return null; } };
export function saveCareer(c, st = def()) { try { st.setItem(KEY, JSON.stringify(c)); return true; } catch { return false; } }
// Saves de versões antigas (liga fictícia) são ignorados: agora existem Série A e Série B reais, com acesso e rebaixamento.
export function loadCareer(st = def()) { try { const r = st.getItem(KEY); let c = r ? JSON.parse(r) : null; if (c && c.version === 3) c = migrate3(c); return c && c.version === 4 ? c : null; } catch { return null; } }
export function hasSave(st = def()) { return !!loadCareer(st); }
