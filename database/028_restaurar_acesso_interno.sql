PRAGMA foreign_keys = ON;

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

CREATE INDEX IF NOT EXISTS idx_reg_local_users_active
ON regulacao_local_users(active, username);

CREATE TABLE IF NOT EXISTS regulacao_login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE,
  ip TEXT,
  success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reg_login_attempts_user_time
ON regulacao_login_attempts(username, created_at);

INSERT OR IGNORE INTO regulacao_principals(
  principal_id,portal_user_id,username,name,portal_role,active,first_seen_at,last_seen_at
)
SELECT
  'local:' || id,NULL,username,name,NULL,active,
  COALESCE(created_at,datetime('now')),
  COALESCE(last_login_at,updated_at,created_at,datetime('now'))
FROM regulacao_local_users;

UPDATE regulacao_principals
SET username=(SELECT u.username FROM regulacao_local_users u WHERE ('local:' || u.id)=regulacao_principals.principal_id),
    name=(SELECT u.name FROM regulacao_local_users u WHERE ('local:' || u.id)=regulacao_principals.principal_id),
    active=(SELECT u.active FROM regulacao_local_users u WHERE ('local:' || u.id)=regulacao_principals.principal_id)
WHERE principal_id LIKE 'local:%'
  AND EXISTS(SELECT 1 FROM regulacao_local_users u WHERE ('local:' || u.id)=regulacao_principals.principal_id);

INSERT OR IGNORE INTO regulacao_user_preferences(principal_id,theme,updated_at)
SELECT 'local:' || id,theme,datetime('now')
FROM regulacao_local_users;

INSERT INTO emulti_schema_version(id,version,updated_at)
VALUES(1,'2.26.3',datetime('now'))
ON CONFLICT(id) DO UPDATE SET version='2.26.3',updated_at=datetime('now');
