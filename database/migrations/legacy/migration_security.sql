-- Migração aditiva: rate limiting de login, trilha de auditoria e índice de
-- sessões. NÃO contém nenhum DROP TABLE — pode rodar direto no D1 de
-- produção, sem afetar as tabelas existentes.
--
-- Rode com: wrangler d1 execute portal-saude-db --file=./migration_security.sql
--
-- O que este arquivo faz:
--   1. Cria a tabela login_attempts (histórico de tentativas de login, usado
--      para bloquear temporariamente após várias falhas seguidas — ver
--      checkLoginRateLimit()/recordLoginAttempt() em functions/api/_utils.js).
--   2. Cria a tabela audit_log (quem criou/editou/excluiu o quê).
--   3. Cria um índice em sessions(user_id), usado para invalidar sessões de
--      um usuário rapidamente (troca de senha, exclusão de conta) e também
--      pela limpeza oportunista de sessões expiradas.

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip TEXT,
  success INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time ON login_attempts(username, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip, created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  actor_username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
