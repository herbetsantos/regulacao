PRAGMA foreign_keys = ON;

-- eMulti / Regulação 2.20.0
-- Separação formal entre Regulação, Organização e Execução.
-- Esta migração é aditiva e deve ser executada uma única vez.

ALTER TABLE regulacao_principal_acessos
ADD COLUMN organizador INTEGER NOT NULL DEFAULT 0
CHECK (organizador IN (0,1));

ALTER TABLE agenda_escalas
ADD COLUMN profissional_id TEXT
REFERENCES regulacao_profissionais(id);

ALTER TABLE agenda_individuais
ADD COLUMN profissional_id TEXT
REFERENCES regulacao_profissionais(id);

CREATE INDEX IF NOT EXISTS idx_agenda_escalas_profissional
ON agenda_escalas(profissional_id, ativo);

CREATE INDEX IF NOT EXISTS idx_agenda_ind_profissional
ON agenda_individuais(profissional_id, data_atendimento, hora_inicio);

CREATE TABLE IF NOT EXISTS agenda_grupo_profissionais (
  grupo_id INTEGER NOT NULL,
  profissional_id TEXT NOT NULL,
  papel TEXT,
  responsavel INTEGER NOT NULL DEFAULT 0 CHECK (responsavel IN (0,1)),
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (grupo_id, profissional_id),
  FOREIGN KEY (grupo_id) REFERENCES agenda_grupos(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES regulacao_profissionais(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_agenda_grupo_profissionais_prof
ON agenda_grupo_profissionais(profissional_id, grupo_id);

-- Backfill de agendas legadas que pertenciam a contas do Portal.
UPDATE agenda_escalas
SET profissional_id = (
  SELECT rp.id
  FROM regulacao_profissionais rp
  WHERE rp.principal_id = 'portal:' || agenda_escalas.profissional_user_id
  LIMIT 1
)
WHERE profissional_id IS NULL
  AND profissional_user_id > 0;

UPDATE agenda_individuais
SET profissional_id = (
  SELECT rp.id
  FROM regulacao_profissionais rp
  WHERE rp.principal_id = 'portal:' || agenda_individuais.profissional_user_id
  LIMIT 1
)
WHERE profissional_id IS NULL
  AND profissional_user_id > 0;

INSERT OR IGNORE INTO agenda_grupo_profissionais(grupo_id, profissional_id, responsavel, added_by)
SELECT
  ag.id,
  rp.id,
  1,
  'migration:2.20.0'
FROM agenda_grupos ag
JOIN regulacao_profissionais rp
  ON rp.principal_id = 'portal:' || ag.profissional_user_id
WHERE ag.profissional_user_id > 0;

-- Backfill de credenciais próprias que usam legacy_numeric_id negativo.
UPDATE agenda_escalas
SET profissional_id = (
  SELECT rp.id
  FROM regulacao_profissionais rp
  JOIN regulacao_local_users lu
    ON rp.principal_id = 'local:' || lu.id
  WHERE lu.legacy_numeric_id = agenda_escalas.profissional_user_id
  LIMIT 1
)
WHERE profissional_id IS NULL
  AND profissional_user_id < 0;

UPDATE agenda_individuais
SET profissional_id = (
  SELECT rp.id
  FROM regulacao_profissionais rp
  JOIN regulacao_local_users lu
    ON rp.principal_id = 'local:' || lu.id
  WHERE lu.legacy_numeric_id = agenda_individuais.profissional_user_id
  LIMIT 1
)
WHERE profissional_id IS NULL
  AND profissional_user_id < 0;

INSERT OR IGNORE INTO agenda_grupo_profissionais(grupo_id, profissional_id, responsavel, added_by)
SELECT
  ag.id,
  rp.id,
  1,
  'migration:2.20.0'
FROM agenda_grupos ag
JOIN regulacao_local_users lu
  ON lu.legacy_numeric_id = ag.profissional_user_id
JOIN regulacao_profissionais rp
  ON rp.principal_id = 'local:' || lu.id
WHERE ag.profissional_user_id < 0;

UPDATE emulti_schema_version
SET version = '2.20.0',
    updated_at = datetime('now')
WHERE id = 1;
