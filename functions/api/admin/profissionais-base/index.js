import { json, logAudit } from '../../_utils.js';
import { requireAdminAccess } from '../../_shared.js';

async function ensureSchema(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS regulacao_profissionais_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
    especialidade TEXT NOT NULL,
    user_id INTEGER,
    ativo INTEGER NOT NULL DEFAULT 1,
    origem TEXT NOT NULL DEFAULT 'escala_emulti_2026',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS regulacao_profissionais_base_lotacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profissional_base_id INTEGER NOT NULL,
    unidade_nome TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (profissional_base_id, unidade_nome),
    FOREIGN KEY (profissional_base_id) REFERENCES regulacao_profissionais_base(id) ON DELETE CASCADE
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS regulacao_profissionais_base_escalas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lotacao_id INTEGER NOT NULL,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 5),
    hora_inicio TEXT,
    hora_fim TEXT,
    observacao TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (lotacao_id, dia_semana, hora_inicio, hora_fim),
    FOREIGN KEY (lotacao_id) REFERENCES regulacao_profissionais_base_lotacoes(id) ON DELETE CASCADE
  )`).run();
}

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminAccess(request, env);
  if (error) return error;
  await ensureSchema(env);

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const requestedPageSize = Number(url.searchParams.get('page_size') || 20);
  const pageSize = [10, 20, 50, 100].includes(requestedPageSize) ? requestedPageSize : 20;
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const unidade = (url.searchParams.get('unidade') || '').trim().toLowerCase();
  const especialidade = (url.searchParams.get('especialidade') || '').trim().toLowerCase();
  const vinculo = (url.searchParams.get('vinculo') || '').trim();

  const where = ['p.ativo = 1'];
  const binds = [];
  if (q) {
    where.push(`(lower(p.nome) LIKE ? OR lower(p.especialidade) LIKE ?)`);
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (unidade) {
    where.push(`EXISTS (
      SELECT 1 FROM regulacao_profissionais_base_lotacoes lf
      WHERE lf.profissional_base_id=p.id AND lower(lf.unidade_nome)=?
    )`);
    binds.push(unidade);
  }
  if (especialidade) {
    where.push('lower(p.especialidade)=?');
    binds.push(especialidade);
  }
  if (vinculo === 'vinculado') where.push('p.user_id IS NOT NULL');
  if (vinculo === 'sem_vinculo') where.push('p.user_id IS NULL');

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const count = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM regulacao_profissionais_base p ${whereSql}`
  ).bind(...binds).first();
  const total = Number(count?.total || 0);
  const pages = total ? Math.ceil(total / pageSize) : 0;
  const safePage = pages ? Math.min(page, pages) : 1;
  const offset = (safePage - 1) * pageSize;

  const { results } = await env.DB.prepare(`
    SELECT p.id, p.nome, p.especialidade, p.user_id, p.ativo, p.origem,
           u.name AS user_name, u.username,
           l.id AS lotacao_id, l.unidade_nome,
           e.dia_semana, e.hora_inicio, e.hora_fim, e.observacao
    FROM (
      SELECT p0.*
      FROM regulacao_profissionais_base p0
      WHERE p0.id IN (
        SELECT p.id FROM regulacao_profissionais_base p
        ${whereSql}
        ORDER BY p.nome
        LIMIT ? OFFSET ?
      )
    ) p
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN regulacao_profissionais_base_lotacoes l ON l.profissional_base_id = p.id
    LEFT JOIN regulacao_profissionais_base_escalas e ON e.lotacao_id = l.id
    ORDER BY p.nome, l.unidade_nome, e.dia_semana, e.hora_inicio
  `).bind(...binds, pageSize, offset).all();

  const map = new Map();
  for (const r of results || []) {
    if (!map.has(r.id)) map.set(r.id, {
      id:r.id, nome:r.nome, especialidade:r.especialidade, user_id:r.user_id,
      user_name:r.user_name, username:r.username, origem:r.origem, lotacoes:[]
    });
    const p = map.get(r.id);
    if (r.lotacao_id) {
      let lot = p.lotacoes.find((x) => x.id === r.lotacao_id);
      if (!lot) { lot = { id:r.lotacao_id, unidade_nome:r.unidade_nome, horarios:[] }; p.lotacoes.push(lot); }
      if (r.dia_semana) lot.horarios.push({ dia_semana:r.dia_semana, hora_inicio:r.hora_inicio, hora_fim:r.hora_fim, observacao:r.observacao });
    }
  }

  const { results: units } = await env.DB.prepare(
    `SELECT DISTINCT unidade_nome FROM regulacao_profissionais_base_lotacoes ORDER BY unidade_nome`
  ).all();
  const { results: specs } = await env.DB.prepare(
    `SELECT DISTINCT especialidade FROM regulacao_profissionais_base WHERE ativo=1 ORDER BY especialidade`
  ).all();

  return json({
    profissionais:[...map.values()],
    pagination:{ page:safePage, page_size:pageSize, total, pages },
    filtros:{
      unidades:(units || []).map((x)=>x.unidade_nome),
      especialidades:(specs || []).map((x)=>x.especialidade)
    }
  });
}

export async function onRequestPut({ request, env }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;
  await ensureSchema(env);
  let body; try { body = await request.json(); } catch { return json({ error:'JSON inválido.' }, 400); }
  const id = Number(body.id);
  const userId = body.user_id === null || body.user_id === '' ? null : Number(body.user_id);
  if (!id) return json({ error:'Profissional inválido.' }, 400);
  const base = await env.DB.prepare('SELECT id, nome FROM regulacao_profissionais_base WHERE id=?').bind(id).first();
  if (!base) return json({ error:'Profissional não encontrado.' }, 404);
  if (userId) {
    const alvo = await env.DB.prepare('SELECT id, name, active FROM users WHERE id=?').bind(userId).first();
    if (!alvo || !alvo.active) return json({ error:'Usuário não encontrado ou inativo.' }, 400);
    const outro = await env.DB.prepare('SELECT id, nome FROM regulacao_profissionais_base WHERE user_id=? AND id<>?').bind(userId,id).first();
    if (outro) return json({ error:`Este usuário já está vinculado a ${outro.nome}.` }, 409);
  }
  await env.DB.prepare('UPDATE regulacao_profissionais_base SET user_id=?, updated_at=datetime(\'now\') WHERE id=?').bind(userId,id).run();
  await logAudit(env, user, 'update', 'profissional_base', id, { user_id:userId, nome:base.nome });
  return json({ ok:true });
}
