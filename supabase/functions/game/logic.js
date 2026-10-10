// Lógica do jogo no servidor: o cliente NUNCA recebe culpado nem solução antes de acertar.
import { CASES, buildCase } from './cases.js';

export const HINT_COST = [0.15, 0.15, 0.4];
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const clamp = (v, a, b) => Math.min(b, Math.max(a, Math.trunc(Number(v)) || 0));
export const xpFor = (base, hints, wrongs) => {
  let cost = 0; for (let i = 0; i < hints; i++) cost += HINT_COST[i];
  return Math.round(base * Math.max(0.2, 1 - cost - wrongs * 0.2));
};
const fail = (error, status = 400) => ({ status, json: { error } });

export async function handle(body, userId, store) {
  const meta = CASES.find((c) => c.id === body?.case_id);
  if (!meta) return fail('Caso inválido.');
  const c = buildCase(meta);
  const att = userId ? await store.getAttempts(userId, meta.id) : { hints: 0, wrongs: 0 };

  switch (body.action) {
    case 'case':
      return { json: {
        id: meta.id, num: meta.num, titulo: meta.titulo, d: meta.d, lvl: meta.lvl, tag: meta.tag, yard: meta.yard, xp: meta.xp,
        briefing: c.briefing, objetivo: c.objetivo, tables: c.tables,
        hints: c.dicas.slice(0, att.hints), wrongs: att.wrongs, logged: !!userId,
      } };
    case 'hint': {
      const n = clamp(body.n, 1, 3);
      if (userId && n > att.hints) await store.setAttempts(userId, meta.id, { hints: n, wrongs: att.wrongs });
      return { json: { n, text: c.dicas[n - 1] } };
    }
    case 'accuse': {
      const name = String(body.name ?? '').slice(0, 100);
      let hints = att.hints, wrongs = att.wrongs;
      if (!userId) { hints = clamp(body.hints, 0, 3); wrongs = clamp(body.wrongs, 0, 20); }
      if (norm(name) !== norm(c.culpado)) {
        wrongs++;
        if (userId) await store.setAttempts(userId, meta.id, { hints, wrongs });
        return { json: { correct: false, wrongs, potential: xpFor(meta.xp, hints, wrongs) } };
      }
      const xp = xpFor(meta.xp, hints, wrongs);
      let best = xp, replay = false;
      if (userId) {
        const prev = await store.getProgress(userId, meta.id);
        if (prev) { replay = true; best = Math.max(prev.xp, xp); }
        if (!prev || xp > prev.xp) await store.upsertProgress(userId, meta.id, { xp: best, hints, wrongs });
      }
      return { json: { correct: true, xp, best, replay, culpado: c.culpado, solucao: c.solucao } };
    }
  }
  return fail('Ação inválida.');
}
