// Edge Function "game": gera os casos e valida acusações no servidor.
// Deploy:  supabase functions deploy game --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handle } from './logic.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: 'JSON inválido.' }, 400); }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  // Visitante: o token é a chave pública, getUser falha e userId fica null.
  let userId: string | null = null;
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (token) { const { data } = await admin.auth.getUser(token); userId = data?.user?.id ?? null; }

  const store = {
    async getAttempts(u: string, c: string) {
      const { data } = await admin.from('attempts').select('hints,wrongs').eq('user_id', u).eq('case_id', c).maybeSingle();
      return data ?? { hints: 0, wrongs: 0 };
    },
    async setAttempts(u: string, c: string, v: { hints: number; wrongs: number }) {
      await admin.from('attempts').upsert({ user_id: u, case_id: c, hints: v.hints, wrongs: v.wrongs });
    },
    async getProgress(u: string, c: string) {
      const { data } = await admin.from('progress').select('xp').eq('user_id', u).eq('case_id', c).maybeSingle();
      return data;
    },
    async upsertProgress(u: string, c: string, v: { xp: number; hints: number; wrongs: number }) {
      await admin.from('progress').upsert({ user_id: u, case_id: c, xp: v.xp, hints: v.hints, wrongs: v.wrongs, solved_at: new Date().toISOString() });
    },
  };
  try {
    const r = await handle(body, userId, store);
    return reply(r.json, r.status ?? 200);
  } catch (e) {
    console.error(e);
    return reply({ error: 'Erro interno.' }, 500);
  }
});
