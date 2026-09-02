-- eMulti v2.10 - portal-saude-db
-- Execute uma vez. Não apaga dados.
ALTER TABLE regulacao_equipe_profissionais ADD COLUMN cargo TEXT;
CREATE TABLE IF NOT EXISTS regulacao_profissional_especialidades (
  user_id INTEGER NOT NULL,
  especialidade_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, especialidade_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
