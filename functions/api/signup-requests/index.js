import { json, requireAdminPanel, getAdminUnidades, hashPassword, randomHex, verifyTurnstile, getClientIP } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (minhas.length === 0) return json({ requests: [] });
    const placeholders = minhas.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT id, name, username, unidade, status, created_at
       FROM signup_requests WHERE status = 'pending' AND lower(unidade) IN (${placeholders})
       ORDER BY created_at ASC`
    ).bind(...minhas).all();
    return json({ requests: results });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, name, username, unidade, status, created_at
     FROM signup_requests WHERE status = 'pending' ORDER BY created_at ASC`
  ).all();

  return json({ requests: results });
}

// Endpoint público — qualquer pessoa pode solicitar acesso, sem estar logada.
export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const name = (body.name || '').trim();
  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';
  const unidade = (body.unidade || '').trim();

  // Protege o formulário público (sem login) contra automação: envio em
  // massa de solicitações falsas e uso do endpoint para enumerar usernames
  // já cadastrados (a resposta abaixo diferencia "já existe" de "não existe").
  const turnstileOK = await verifyTurnstile(body.turnstileToken, env, getClientIP(request));
  if (!turnstileOK) {
    return json({ error: 'Não foi possível confirmar que você não é um robô. Recarregue a página e tente novamente.' }, 400);
  }

  if (!name) return json({ error: 'Informe seu nome completo.' }, 400);
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return json({ error: 'Usuário deve ter 3-32 caracteres (letras, números, ponto, hífen, underline).' }, 400);
  }
  if (!unidade) return json({ error: 'Informe sua unidade de lotação.' }, 400);
  if (!password || password.length < 8) {
    return json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, 400);
  }

  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE lower(username) = ?').bind(username).first();
  if (existingUser) return json({ error: 'Já existe um usuário com esse login.' }, 409);

  const existingRequest = await env.DB.prepare(
    `SELECT id FROM signup_requests WHERE lower(username) = ? AND status = 'pending'`
  ).bind(username).first();
  if (existingRequest) return json({ error: 'Já existe uma solicitação pendente com esse login.' }, 409);

  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);

  await env.DB.prepare(
    'INSERT INTO signup_requests (name, username, password_hash, salt, unidade) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(name, username, hash, salt, unidade)
    .run();

  return json({ ok: true }, 201);
}
