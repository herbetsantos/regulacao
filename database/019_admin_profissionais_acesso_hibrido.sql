PRAGMA foreign_keys = ON;

-- eMulti / Regulação 2.19.0
-- Migração aditiva para:
-- 1) autenticação híbrida (Portal APS ou credencial própria),
-- 2) autorizações próprias da Regulação por principal,
-- 3) profissionais assistenciais independentes de usuários,
-- 4) vínculos profissional + unidade + especialidade + carga horária.

CREATE TABLE IF NOT EXISTS regulacao_local_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  legacy_numeric_id INTEGER NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 210000,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0,1)),
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('auto','light','dark','contrast')),
  created_by_principal TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_reg_local_users_active ON regulacao_local_users(active, username);

CREATE TABLE IF NOT EXISTS regulacao_local_sessions (
  token TEXT PRIMARY KEY,
  local_user_id TEXT NOT NULL REFERENCES regulacao_local_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_local_sessions_exp ON regulacao_local_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_reg_local_sessions_user ON regulacao_local_sessions(local_user_id);

CREATE TABLE IF NOT EXISTS regulacao_login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE,
  ip TEXT,
  success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_login_attempts_user_time ON regulacao_login_attempts(username, created_at);

-- principal_id usa duas origens:
-- portal:<id do users no portal-saude-db>
-- local:<uuid do regulacao_local_users>
CREATE TABLE IF NOT EXISTS regulacao_principal_acessos (
  principal_id TEXT PRIMARY KEY,
  cadastrante INTEGER NOT NULL DEFAULT 0 CHECK (cadastrante IN (0,1)),
  regulador INTEGER NOT NULL DEFAULT 0 CHECK (regulador IN (0,1)),
  executor INTEGER NOT NULL DEFAULT 0 CHECK (executor IN (0,1)),
  administrador INTEGER NOT NULL DEFAULT 0 CHECK (administrador IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  updated_by_principal TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS regulacao_principal_unidades (
  principal_id TEXT NOT NULL,
  unidade_code TEXT NOT NULL,
  pode_emitir INTEGER NOT NULL DEFAULT 0 CHECK (pode_emitir IN (0,1)),
  pode_executar INTEGER NOT NULL DEFAULT 0 CHECK (pode_executar IN (0,1)),
  updated_by_principal TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (principal_id, unidade_code)
);
CREATE INDEX IF NOT EXISTS idx_reg_principal_unidades_unit ON regulacao_principal_unidades(unidade_code, principal_id);

CREATE TABLE IF NOT EXISTS regulacao_principal_equipes (
  principal_id TEXT PRIMARY KEY,
  equipe_id INTEGER NOT NULL,
  updated_by_principal TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_principal_equipes_team ON regulacao_principal_equipes(equipe_id);

CREATE TABLE IF NOT EXISTS regulacao_profissionais (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL COLLATE NOCASE,
  registro_profissional TEXT,
  principal_id TEXT,
  equipe_id INTEGER,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  origem TEXT NOT NULL DEFAULT 'manual',
  legacy_base_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_prof_legacy_base ON regulacao_profissionais(legacy_base_id) WHERE legacy_base_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_prof_principal ON regulacao_profissionais(principal_id) WHERE principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_prof_nome ON regulacao_profissionais(ativo, nome);
CREATE INDEX IF NOT EXISTS idx_reg_prof_equipe ON regulacao_profissionais(equipe_id, ativo);

CREATE TABLE IF NOT EXISTS regulacao_profissional_vinculos (
  id TEXT PRIMARY KEY,
  profissional_id TEXT NOT NULL REFERENCES regulacao_profissionais(id) ON DELETE CASCADE,
  unidade_code TEXT,
  unidade_nome_snapshot TEXT,
  especialidade_id INTEGER NOT NULL REFERENCES especialidades(id),
  carga_horaria_semanal REAL NOT NULL DEFAULT 0 CHECK (carga_horaria_semanal >= 0),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  origem TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_prof_vinculo ON regulacao_profissional_vinculos(
  profissional_id,
  COALESCE(unidade_code,''),
  COALESCE(unidade_nome_snapshot,''),
  especialidade_id
);
CREATE INDEX IF NOT EXISTS idx_reg_prof_vinc_esp ON regulacao_profissional_vinculos(especialidade_id, ativo);
CREATE INDEX IF NOT EXISTS idx_reg_prof_vinc_unit ON regulacao_profissional_vinculos(unidade_code, ativo);

CREATE TABLE IF NOT EXISTS regulacao_local_audit (
  id TEXT PRIMARY KEY,
  actor_principal_id TEXT,
  actor_username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_local_audit_created ON regulacao_local_audit(created_at);

INSERT INTO emulti_schema_version (id, version, updated_at)
VALUES (1, '2.19.0', datetime('now'))
ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at;
