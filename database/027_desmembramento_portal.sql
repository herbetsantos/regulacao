PRAGMA foreign_keys = ON;

-- eMulti / Regulação 2.26.0
-- Desmembramento operacional do Portal APS.
-- O Portal permanece somente como provedor de identidade/login.
-- Esta migração NÃO apaga tabelas nem dados legados do Portal.

CREATE TABLE IF NOT EXISTS regulacao_principals (
  principal_id TEXT PRIMARY KEY,
  portal_user_id INTEGER,
  username TEXT,
  name TEXT NOT NULL,
  portal_role TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_principal_portal_user
  ON regulacao_principals(portal_user_id)
  WHERE portal_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_principals_name ON regulacao_principals(active, name);

-- Superusuários são uma autorização LOCAL da Regulação. O papel do Portal
-- é usado somente para o bootstrap do primeiro superusuário durante o handoff.
CREATE TABLE IF NOT EXISTS regulacao_superusers (
  principal_id TEXT PRIMARY KEY,
  granted_by_principal TEXT,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (principal_id) REFERENCES regulacao_principals(principal_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS regulacao_auth_sessions (
  token TEXT PRIMARY KEY,
  principal_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (principal_id) REFERENCES regulacao_principals(principal_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reg_auth_sessions_principal ON regulacao_auth_sessions(principal_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_reg_auth_sessions_expiry ON regulacao_auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS regulacao_user_preferences (
  principal_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('auto','light','dark','contrast')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (principal_id) REFERENCES regulacao_principals(principal_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS regulacao_unidades (
  code TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'aps',
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  origem TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_unidades_ativo_nome ON regulacao_unidades(ativo, nome);

CREATE TABLE IF NOT EXISTS regulacao_equipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  created_by_principal TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_equipes_ativo_nome ON regulacao_equipes(ativo, nome);

CREATE TABLE IF NOT EXISTS regulacao_equipe_unidades (
  equipe_id INTEGER NOT NULL,
  unidade_code TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (equipe_id, unidade_code),
  FOREIGN KEY (equipe_id) REFERENCES regulacao_equipes(id) ON DELETE CASCADE,
  FOREIGN KEY (unidade_code) REFERENCES regulacao_unidades(code) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_reg_equipe_unidades_unit ON regulacao_equipe_unidades(unidade_code, equipe_id);

CREATE TABLE IF NOT EXISTS regulacao_migration_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO emulti_schema_version(id,version,updated_at)
VALUES(1,'2.26.0',datetime('now'))
ON CONFLICT(id) DO UPDATE SET version='2.26.0',updated_at=datetime('now');
