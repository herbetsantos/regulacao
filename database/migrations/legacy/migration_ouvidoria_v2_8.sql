-- Portal Saúde Cajamar — Ouvidoria IA / distribuição externa
-- Versão 2.8.0
-- Execute UMA vez no banco D1 do Portal:
-- wrangler d1 execute portal-saude-db --remote --file=./migration_ouvidoria_v2_8.sql
--
-- Este módulo armazena SOMENTE configuração administrativa da Ouvidoria
-- (profissionais, regras e fallback). Não armazena manifestações.

CREATE TABLE IF NOT EXISTS ouvidoria_profissionais (
  codigo TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  nome_ouvidorsus TEXT,
  email TEXT,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  observacao TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ouvidoria_regras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  divisao TEXT NOT NULL,
  subtipo TEXT NOT NULL DEFAULT 'geral',
  descricao TEXT,
  prioridade INTEGER NOT NULL DEFAULT 100,
  profissional_codigo TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profissional_codigo) REFERENCES ouvidoria_profissionais(codigo)
);

CREATE INDEX IF NOT EXISTS idx_ouvidoria_regras_divisao
  ON ouvidoria_regras(divisao, ativo, prioridade);
CREATE INDEX IF NOT EXISTS idx_ouvidoria_regras_profissional
  ON ouvidoria_regras(profissional_codigo);

CREATE TABLE IF NOT EXISTS ouvidoria_fallbacks (
  ordem INTEGER PRIMARY KEY CHECK (ordem BETWEEN 1 AND 10),
  profissional_codigo TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profissional_codigo) REFERENCES ouvidoria_profissionais(codigo)
);

CREATE TABLE IF NOT EXISTS ouvidoria_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  confidence_threshold REAL NOT NULL DEFAULT 0.80 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  versao INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO ouvidoria_config (id, confidence_threshold, versao)
VALUES (1, 0.80, 1);

-- Cadastro inicial solicitado. O nome exato exibido no OuvidorSUS e os e-mails
-- podem ser preenchidos posteriormente pelo painel do Portal.
INSERT OR IGNORE INTO ouvidoria_profissionais (codigo, nome, nome_ouvidorsus, email, ativo, observacao)
VALUES
  ('beatriz', 'Beatriz', NULL, NULL, 1, 'Responsável padrão por Odontologia, exceto demandas muito técnicas.'),
  ('ariane',  'Ariane',  NULL, NULL, 1, 'Responsável por demandas odontológicas muito técnicas/especializadas.'),
  ('herbet',  'Herbet',  NULL, NULL, 1, 'Primeiro fallback quando houver dúvida na distribuição.'),
  ('luiz',    'Luiz',    NULL, NULL, 1, 'Segundo fallback quando persistir dúvida ou o primeiro não estiver disponível.');

INSERT INTO ouvidoria_regras (titulo, divisao, subtipo, descricao, prioridade, profissional_codigo, ativo)
SELECT 'Odontologia — demanda técnica', 'Odontologia', 'tecnica',
       'Demanda odontológica muito técnica, especializada ou que exija avaliação técnica aprofundada.',
       10, 'ariane', 1
WHERE NOT EXISTS (
  SELECT 1 FROM ouvidoria_regras WHERE titulo = 'Odontologia — demanda técnica'
);

INSERT INTO ouvidoria_regras (titulo, divisao, subtipo, descricao, prioridade, profissional_codigo, ativo)
SELECT 'Odontologia — regra geral', 'Odontologia', 'geral',
       'Demanda odontológica geral que não se enquadre na regra técnica.',
       20, 'beatriz', 1
WHERE NOT EXISTS (
  SELECT 1 FROM ouvidoria_regras WHERE titulo = 'Odontologia — regra geral'
);

INSERT OR IGNORE INTO ouvidoria_fallbacks (ordem, profissional_codigo, ativo)
VALUES (1, 'herbet', 1);
INSERT OR IGNORE INTO ouvidoria_fallbacks (ordem, profissional_codigo, ativo)
VALUES (2, 'luiz', 1);
