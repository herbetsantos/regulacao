// Estrutura profissional eMulti (portal-saude-db).
// Mantém cargo/profissão separado das permissões operacionais do eMulti.

export async function ensureProfissionalSchema(env) {
  const info = await env.DB.prepare("PRAGMA table_info('regulacao_equipe_profissionais')").all();
  const cols = new Set((info.results || []).map((c) => c.name));
  if (!cols.has('cargo')) {
    await env.DB.prepare('ALTER TABLE regulacao_equipe_profissionais ADD COLUMN cargo TEXT').run();
  }
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS regulacao_profissional_especialidades (
    user_id INTEGER NOT NULL,
    especialidade_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, especialidade_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();
}

export async function getEquipeProfissionais(env, equipeId) {
  await ensureProfissionalSchema(env);
  const { results } = await env.DB.prepare(`
    SELECT us.id, us.name, us.username, COALESCE(ep.cargo, '') AS cargo
    FROM regulacao_equipe_profissionais ep
    JOIN users us ON us.id = ep.user_id AND us.active = 1
    WHERE ep.equipe_id = ? ORDER BY us.name
  `).bind(equipeId).all();
  for (const p of results || []) {
    const esp = await env.DB.prepare(
      'SELECT especialidade_id FROM regulacao_profissional_especialidades WHERE user_id = ? ORDER BY especialidade_id'
    ).bind(p.id).all();
    p.especialidade_ids = (esp.results || []).map((x) => Number(x.especialidade_id));
  }
  return results || [];
}

export async function setProfissionalEspecialidades(env, userId, especialidadeIds) {
  await ensureProfissionalSchema(env);
  await env.DB.prepare('DELETE FROM regulacao_profissional_especialidades WHERE user_id = ?').bind(userId).run();
  for (const id of [...new Set((especialidadeIds || []).map(Number).filter(Boolean))]) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO regulacao_profissional_especialidades (user_id, especialidade_id) VALUES (?, ?)'
    ).bind(userId, id).run();
  }
}

export async function getProfissionalNaEquipe(env, equipeId, userId) {
  await ensureProfissionalSchema(env);
  const row = await env.DB.prepare(`
    SELECT us.id, us.name, us.username, COALESCE(ep.cargo, '') AS cargo
    FROM regulacao_equipe_profissionais ep
    JOIN users us ON us.id = ep.user_id AND us.active = 1
    WHERE ep.equipe_id = ? AND ep.user_id = ?
  `).bind(equipeId, userId).first();
  if (!row) return null;
  const { results } = await env.DB.prepare(
    'SELECT especialidade_id FROM regulacao_profissional_especialidades WHERE user_id = ?'
  ).bind(userId).all();
  row.especialidade_ids = (results || []).map((x) => Number(x.especialidade_id));
  return row;
}
