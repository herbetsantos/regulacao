-- eMulti v2.10 - regulacao-vagas-db
-- Execute uma vez. Não apaga dados.
ALTER TABLE guias ADD COLUMN codigo_guia TEXT;
UPDATE guias SET codigo_guia = strftime('%Y', COALESCE(created_at, datetime('now'))) || '-' || printf('%06d', id)
WHERE codigo_guia IS NULL OR trim(codigo_guia) = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_guias_codigo ON guias(codigo_guia);
CREATE TABLE IF NOT EXISTS guia_atribuicoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guia_id INTEGER NOT NULL,
  profissional_user_id INTEGER NOT NULL,
  equipe_id INTEGER NOT NULL,
  cargo TEXT,
  atribuido_por INTEGER,
  atribuido_em TEXT DEFAULT (datetime('now')),
  encerrado_em TEXT,
  motivo_encerramento TEXT,
  FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_guia_atribuicoes_guia ON guia_atribuicoes(guia_id);
CREATE INDEX IF NOT EXISTS idx_guia_atribuicoes_prof ON guia_atribuicoes(profissional_user_id);
ALTER TABLE acompanhamento_sessoes ADD COLUMN profissional_user_id INTEGER;

ALTER TABLE acompanhamentos ADD COLUMN data_inicio TEXT;
ALTER TABLE acompanhamentos ADD COLUMN horario_inicio TEXT;
