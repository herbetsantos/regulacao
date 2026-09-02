-- eMulti Regulação — atualização do banco regulacao-vagas-db
-- Versão suportada de origem: 2.17.4
-- Destino: 2.17.5
-- Não apaga dados.

CREATE TABLE IF NOT EXISTS emulti_schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO emulti_schema_version (id, version, updated_at)
VALUES (1, '2.17.5', datetime('now'))
ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at;
