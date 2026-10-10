# SQL Yard · Detetives de Dados

Jogo de detetive em SQL com 36 casos (4 níveis, incluindo caçadas estilo Scotland Yard), contas de jogador e ranking.
Site estático (`dist/index.html`) + Supabase (Auth, Postgres e uma Edge Function).

## Como funciona (e por que é seguro)
- O navegador roda o SQL do jogador localmente, sem tocar no banco.
- Os casos são **gerados no servidor** (Edge Function `game`). O culpado e a solução só chegam ao navegador depois de a acusação estar certa. Dicas e acusações erradas são contadas no servidor e valem para o XP.
- `progress` e `attempts` só podem ser escritos pela Edge Function (RLS sem política de escrita). Ninguém consegue se dar XP pela API.
- Visitantes jogam sem conta (progresso só no navegador). Com conta: progresso em qualquer aparelho, anotações na nuvem e ranking.

## Passo a passo
1. **Banco**: Supabase → SQL Editor → cole e rode `supabase/schema.sql`.
2. **Edge Function**: com a CLI do Supabase:
   ```
   supabase login
   supabase link --project-ref ndugekayjlxznlrqwtiw
   supabase functions deploy game --no-verify-jwt
   ```
   (ou pelo painel: Edge Functions → Deploy new → envie os 3 arquivos de `supabase/functions/game/`, desmarcando "Enforce JWT verification").
3. **Chave pública**: Project Settings → API. Copie a chave `anon` / `publishable` e cole em `CONFIG.key`, no topo de `app.js`. Depois rode `node build.mjs` para regerar `dist/index.html`. Use **somente** a chave pública, nunca a `service_role`.
4. **Autenticação**: Authentication → URL Configuration. Em *Site URL* e *Redirect URLs* coloque o endereço onde o jogo ficará publicado. Em Providers → Email, decida se quer exigir confirmação de e-mail (recomendado em produção).
5. **Publicar** a pasta `dist/` em qualquer hospedagem estática: Render (Static Site), Netlify, Vercel, Cloudflare Pages ou GitHub Pages.

## Estrutura
```
dist/index.html                      site pronto para publicar
app.js  build.mjs  tpl.html          código-fonte do cliente
supabase/schema.sql                  tabelas, RLS, trigger de perfil, ranking
supabase/functions/game/             servidor: index.ts, logic.js, cases.js
```
Para adicionar casos: edite `cases.js` (novos crimes em `CRIMES` e mecânicas em `m1…m12`), copie o mesmo arquivo para a função e para `build.mjs`/meta, e faça deploy de novo.
