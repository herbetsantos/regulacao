-- eMulti / Regulação 2.25.3
-- Permite que um usuário/profissional esteja vinculado a múltiplas equipes simultaneamente.
-- Migração compatível: preserva vínculos existentes e não altera guias, agendas ou atendimentos.
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS regulacao_principal_equipes_v2 (
  principal_id TEXT NOT NULL,
  equipe_id INTEGER NOT NULL,
  updated_by_principal TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (principal_id, equipe_id)
);

INSERT OR IGNORE INTO regulacao_principal_equipes_v2(principal_id,equipe_id,updated_by_principal,updated_at)
SELECT principal_id,equipe_id,updated_by_principal,updated_at
FROM regulacao_principal_equipes;

DROP TABLE regulacao_principal_equipes;
ALTER TABLE regulacao_principal_equipes_v2 RENAME TO regulacao_principal_equipes;
CREATE INDEX IF NOT EXISTS idx_reg_principal_equipes_team
  ON regulacao_principal_equipes(equipe_id, principal_id);

CREATE TABLE IF NOT EXISTS regulacao_profissional_equipes (
  profissional_id TEXT NOT NULL REFERENCES regulacao_profissionais(id) ON DELETE CASCADE,
  equipe_id INTEGER NOT NULL,
  is_principal INTEGER NOT NULL DEFAULT 0 CHECK (is_principal IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (profissional_id, equipe_id)
);
CREATE INDEX IF NOT EXISTS idx_reg_prof_equipes_team
  ON regulacao_profissional_equipes(equipe_id, profissional_id);

INSERT OR IGNORE INTO regulacao_profissional_equipes(profissional_id,equipe_id,is_principal)
SELECT id,equipe_id,1
FROM regulacao_profissionais
WHERE equipe_id IS NOT NULL;

INSERT INTO emulti_schema_version(id,version,updated_at)
VALUES(1,'2.25.3',datetime('now'))
ON CONFLICT(id) DO UPDATE SET version='2.25.3',updated_at=datetime('now');

PRAGMA foreign_keys = ON;
