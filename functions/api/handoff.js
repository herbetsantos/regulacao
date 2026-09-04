// POST /api/handoff -> gera um código de uso único (60s de validade) que
// carrega a identidade do usuário logado para outro projeto Cloudflare
// Pages que lê o MESMO banco (env.DB). Nunca carrega senha nem o token de
// sessão em si — só permite que o outro site crie a PRÓPRIA sessão local
// para o mesmo user_id, depois de validar o código uma única vez.
// Ver database/migrations/legacy/migration_regulacao_setup.sql (tabela handoff_tokens) e o
// functions/_middleware.js do projeto regulacao-vagas-cajamar, que consome
// este código.

import { json, getAuthUser } from './_utils.js';

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'Não autenticado.' }, 401);

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO handoff_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, user.id, expiresAt).run();

  // Limpeza best-effort de códigos velhos, pra tabela não crescer para sempre.
  try {
    await env.DB.prepare("DELETE FROM handoff_tokens WHERE expires_at < datetime('now', '-1 hour')").run();
  } catch { /* não crítico */ }

  return json({ token });
}
