-- Portal Saúde 2.10.1 — habilitação dos ambientes Produção e Apoio Clínico.
-- Não cria tabelas novas: user_permissions já aceita feature_key textual.
-- O acesso é opt-in; usuários comuns começam sem acesso.

INSERT INTO user_permissions (user_id, feature_key, enabled)
SELECT id, 'producao', 0 FROM users WHERE role <> 'super_admin'
ON CONFLICT(user_id, feature_key) DO NOTHING;

INSERT INTO user_permissions (user_id, feature_key, enabled)
SELECT id, 'apoio_clinico', 0 FROM users WHERE role <> 'super_admin'
ON CONFLICT(user_id, feature_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS app_db_meta (
  app_key TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO app_db_meta (app_key, schema_version, updated_at)
VALUES ('portal_saude', '2.10.1', datetime('now'))
ON CONFLICT(app_key) DO UPDATE SET schema_version=excluded.schema_version, updated_at=excluded.updated_at;
