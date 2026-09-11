import { json, createSession, sessionCookieHeader, upsertLocalPrincipal } from '../_utils.js';
import { passwordMatches } from '../_hybrid.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error:'Requisição inválida.' },400); }

  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!username || !password) return json({ error:'Informe usuário e senha.' },400);

  try {
    const recent = await env.DB_REGULACAO.prepare(
      "SELECT COUNT(*) total FROM regulacao_login_attempts WHERE username=? AND success=0 AND created_at>=datetime('now','-15 minutes')"
    ).bind(username).first();
    if (Number(recent?.total || 0) >= 5) {
      return json({ error:'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.' },429);
    }

    const localUser = await env.DB_REGULACAO.prepare(
      'SELECT * FROM regulacao_local_users WHERE lower(username)=lower(?) LIMIT 1'
    ).bind(username).first();
    const ok = Boolean(localUser && localUser.active && await passwordMatches(password, localUser));

    await env.DB_REGULACAO.prepare(
      'INSERT INTO regulacao_login_attempts(id,username,ip,success) VALUES(?,?,?,?)'
    ).bind(crypto.randomUUID(), username, ip, ok ? 1 : 0).run();

    if (!ok) return json({ error:'Usuário ou senha inválidos.' },401);

    const principalId = await upsertLocalPrincipal(env, localUser);
    const token = await createSession(env, { ...localUser, principalId, source:'local' });
    await env.DB_REGULACAO.prepare(
      "UPDATE regulacao_local_users SET last_login_at=datetime('now'),updated_at=datetime('now') WHERE id=?"
    ).bind(localUser.id).run();

    return json(
      { ok:true, must_change_password:!!localUser.must_change_password },
      200,
      { 'Set-Cookie':sessionCookieHeader(token) }
    );
  } catch (err) {
    return json({
      error:'O acesso interno ainda não está disponível neste banco. Aplique a atualização 028 da versão 2.26.3.',
      detalhe:String(err?.message || '')
    },503);
  }
}
