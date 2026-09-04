import { json, requireAdminPanel, getAdminUnidades, hashPassword, randomHex, logAudit } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const requestedPageSize = Number(url.searchParams.get('page_size') || 20);
  const pageSize = [10, 20, 50, 100].includes(requestedPageSize) ? requestedPageSize : 20;
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const unidade = (url.searchParams.get('unidade') || '').trim().toLowerCase();
  const role = (url.searchParams.get('role') || '').trim();
  const status = (url.searchParams.get('status') || '').trim();

  const where = [];
  const binds = [];

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (minhas.length === 0) {
      return json({ users: [], pagination: { page, page_size: pageSize, total: 0, pages: 0 } });
    }
    where.push(`role = 'user'`);
    where.push(`lower(unidade) IN (${minhas.map(() => '?').join(',')})`);
    binds.push(...minhas);
  }

  if (q) {
    where.push(`(lower(name) LIKE ? OR lower(username) LIKE ?)`);
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (unidade) {
    where.push(`lower(COALESCE(unidade, '')) = ?`);
    binds.push(unidade);
  }
  if (role && ['user', 'admin', 'super_admin', 'admin_unidade'].includes(role)) {
    where.push(`role = ?`);
    binds.push(role);
  }
  if (status === 'ativo') where.push(`active = 1`);
  if (status === 'inativo') where.push(`active = 0`);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM users ${whereSql}`
  ).bind(...binds).first();

  const total = Number(countRow?.total || 0);
  const pages = total ? Math.ceil(total / pageSize) : 0;
  const safePage = pages ? Math.min(page, pages) : 1;
  const safeOffset = (safePage - 1) * pageSize;

  const { results } = await env.DB.prepare(
    `SELECT id, username, name, role, active, unidade, created_at
     FROM users
     ${whereSql}
     ORDER BY name ASC
     LIMIT ? OFFSET ?`
  ).bind(...binds, pageSize, safeOffset).all();

  return json({
    users: results || [],
    pagination: { page: safePage, page_size: pageSize, total, pages }
  });
}

export async function onRequestPost({ request, env }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const username = (body.username || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  const password = body.password || '';
  const unidade = (body.unidade || '').trim();
  const allowedRoles = ['admin', 'super_admin', 'admin_unidade'];
  const requestedRole = allowedRoles.includes(body.role) ? body.role : 'user';

  if (requestedRole !== 'user' && requester.role !== 'super_admin') {
    return json({ error: 'Somente o Super Administrador pode criar contas de administrador.' }, 403);
  }

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (!unidade || !minhas.includes(unidade.toLowerCase())) {
      return json({ error: 'Você só pode cadastrar usuários das unidades sob sua gestão.' }, 403);
    }
  }

  if (!username || !name) return json({ error: 'Informe usuário e nome.' }, 400);
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return json({ error: 'Usuário deve ter 3-32 caracteres (letras, números, ponto, hífen, underline).' }, 400);
  }
  if (!password || password.length < 8) {
    return json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE lower(username) = ?').bind(username).first();
  if (existing) return json({ error: 'Já existe um usuário com esse login.' }, 409);

  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);

  const result = await env.DB.prepare(
    'INSERT INTO users (username, name, password_hash, salt, role, unidade) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(username, name, hash, salt, requestedRole, unidade || null)
    .run();

  await logAudit(env, requester, 'create_user', 'user', result.meta.last_row_id, {
    username, name, role: requestedRole, unidade: unidade || null,
  });

  return json({ ok: true, id: result.meta.last_row_id }, 201);
}
