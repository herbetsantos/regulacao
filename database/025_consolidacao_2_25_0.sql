-- eMulti / Regulação 2.25.0 — consolidação gerencial
-- Migração ADITIVA e não destrutiva sobre a linha 2.20.x.
PRAGMA foreign_keys = ON;

ALTER TABLE regulacao_principal_acessos ADD COLUMN gestor INTEGER NOT NULL DEFAULT 0 CHECK (gestor IN (0,1));

CREATE TABLE IF NOT EXISTS regulacao_etiquetas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by_principal TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS guia_etiquetas (
  guia_id INTEGER NOT NULL,
  etiqueta_id INTEGER NOT NULL,
  added_by_principal TEXT,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (guia_id, etiqueta_id),
  FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE,
  FOREIGN KEY (etiqueta_id) REFERENCES regulacao_etiquetas(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_guia_etiquetas_tag ON guia_etiquetas(etiqueta_id,guia_id);

CREATE TABLE IF NOT EXISTS regulacao_execucoes_administrativas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK(tipo IN ('individual','grupo')),
  referencia_id TEXT NOT NULL,
  guia_id INTEGER NOT NULL,
  resultado TEXT NOT NULL CHECK(resultado IN ('realizado','falta','abandono','cancelado','removido')),
  observacao_administrativa TEXT,
  registrado_por_principal TEXT,
  registrado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_exec_admin_guia ON regulacao_execucoes_administrativas(guia_id,registrado_em DESC);

INSERT OR IGNORE INTO regulacao_etiquetas(nome,sort_order) VALUES
 ('Prioridade',10),('Retorno',20),('Contato pendente',30),('Documentação pendente',40),('Atenção compartilhada',50);

INSERT INTO emulti_schema_version(id,version,updated_at) VALUES(1,'2.25.0',datetime('now'))
ON CONFLICT(id) DO UPDATE SET version='2.25.0',updated_at=datetime('now');
