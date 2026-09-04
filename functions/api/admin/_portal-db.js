import { PROFESSIONAL_BASE_SEED } from './_professional-base-seed.js';

export const PORTAL_TARGET_VERSION = '2.18.2';

const REQUIRED_TABLES = [
  'regulacao_link_icons',
  'regulacao_user_acessos',
  'regulacao_profissional_especialidades',
  'regulacao_profissionais_base',
  'regulacao_profissionais_base_lotacoes',
  'regulacao_profissionais_base_escalas',
  'emulti_schema_version',
];

export async function getPortalSchemaStatus(env) {
  const placeholders = REQUIRED_TABLES.map(() => '?').join(',');
  try {
    const { results } = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`
    ).bind(...REQUIRED_TABLES).all();
    const existing = new Set((results || []).map((r) => r.name));
    const missing = REQUIRED_TABLES.filter((t) => !existing.has(t));
    const baseCount = existing.has('regulacao_profissionais_base')
      ? Number((await env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_profissionais_base WHERE ativo=1').first())?.n || 0)
      : 0;
    const lotCount = existing.has('regulacao_profissionais_base_lotacoes')
      ? Number((await env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_profissionais_base_lotacoes').first())?.n || 0)
      : 0;
    const scaleCount = existing.has('regulacao_profissionais_base_escalas')
      ? Number((await env.DB.prepare('SELECT COUNT(*) AS n FROM regulacao_profissionais_base_escalas').first())?.n || 0)
      : 0;
    return {
      schemaOk: missing.length === 0 && baseCount > 0 && lotCount > 0 && scaleCount > 0,
      tabelasFaltantes: missing,
      profissionaisBase: baseCount,
      lotacoesBase: lotCount,
      escalasBase: scaleCount,
    };
  } catch (err) {
    return {
      schemaOk: false,
      tabelasFaltantes: [...REQUIRED_TABLES],
      profissionaisBase: 0,
      lotacoesBase: 0,
      escalasBase: 0,
      erro: String(err?.message || err || ''),
    };
  }
}

export async function ensurePortalSchema(env) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS regulacao_link_icons (
      link_id INTEGER PRIMARY KEY,
      icon_key TEXT NOT NULL DEFAULT 'links',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS regulacao_user_acessos (
      user_id INTEGER PRIMARY KEY,
      cadastrante INTEGER NOT NULL DEFAULT 0 CHECK (cadastrante IN (0,1)),
      regulador INTEGER NOT NULL DEFAULT 0 CHECK (regulador IN (0,1)),
      executor INTEGER NOT NULL DEFAULT 0 CHECK (executor IN (0,1)),
      administrador INTEGER NOT NULL DEFAULT 0 CHECK (administrador IN (0,1)),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS regulacao_profissional_especialidades (
      user_id INTEGER NOT NULL,
      especialidade_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, especialidade_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS regulacao_profissionais_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
      especialidade TEXT NOT NULL,
      user_id INTEGER,
      ativo INTEGER NOT NULL DEFAULT 1,
      origem TEXT NOT NULL DEFAULT 'escala_emulti_2026',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS regulacao_profissionais_base_lotacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profissional_base_id INTEGER NOT NULL,
      unidade_nome TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(profissional_base_id, unidade_nome),
      FOREIGN KEY (profissional_base_id) REFERENCES regulacao_profissionais_base(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS regulacao_profissionais_base_escalas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lotacao_id INTEGER NOT NULL,
      dia_semana INTEGER NOT NULL CHECK(dia_semana BETWEEN 1 AND 5),
      hora_inicio TEXT,
      hora_fim TEXT,
      observacao TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(lotacao_id,dia_semana,hora_inicio,hora_fim),
      FOREIGN KEY (lotacao_id) REFERENCES regulacao_profissionais_base_lotacoes(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_prof_base_user ON regulacao_profissionais_base(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_prof_base_esp ON regulacao_profissionais_base(especialidade,ativo)`,
    `CREATE TABLE IF NOT EXISTS emulti_schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of statements) await env.DB.prepare(sql).run();

  // Pré-cadastro e escala de referência. Todos os comandos usam UPSERT/IGNORE.
  // Nenhum login, senha ou usuário é criado aqui.
  for (const sql of PROFESSIONAL_BASE_SEED) await env.DB.prepare(sql).run();

  // Vínculo com equipe ou unidade concede entrada no eMulti. As classes
  // (Cadastrante/Regulador/Executor/Administrador) não são alteradas aqui.
  await env.DB.prepare(`
    INSERT INTO user_permissions (user_id, feature_key, enabled)
    SELECT u.id, 'regulacao_vagas',
      CASE
        WHEN u.role='super_admin' THEN 1
        WHEN EXISTS (SELECT 1 FROM regulacao_user_acessos a WHERE a.user_id=u.id AND (a.cadastrante=1 OR a.regulador=1 OR a.executor=1 OR a.administrador=1)) THEN 1
        WHEN EXISTS (SELECT 1 FROM regulacao_equipe_profissionais ep JOIN regulacao_equipes e ON e.id=ep.equipe_id AND e.ativo=1 WHERE ep.user_id=u.id) THEN 1
        WHEN EXISTS (SELECT 1 FROM regulacao_user_unidades ru JOIN unidades un ON un.code=ru.unidade_code AND un.ativo=1 WHERE ru.user_id=u.id) THEN 1
        ELSE 0
      END
    FROM users u WHERE u.active=1
    ON CONFLICT(user_id, feature_key) DO UPDATE SET enabled=excluded.enabled
  `).run();

  await env.DB.prepare(`
    INSERT INTO emulti_schema_version (id, version, updated_at)
    VALUES (1, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at
  `).bind(PORTAL_TARGET_VERSION).run();

  return getPortalSchemaStatus(env);
}
