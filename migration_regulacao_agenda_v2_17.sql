-- eMulti Regulação v2.17.0 — Agenda, escalas, grupos e atendimentos individuais
-- Executar no D1 regulacao-vagas-db.

ALTER TABLE especialidades ADD COLUMN duracao_padrao_min INTEGER NOT NULL DEFAULT 30;
ALTER TABLE guias ADD COLUMN desfecho_atendimento TEXT;

CREATE TABLE IF NOT EXISTS agenda_escalas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profissional_user_id INTEGER NOT NULL,
  especialidade_id INTEGER NOT NULL,
  equipe_id INTEGER NOT NULL,
  unidade_code TEXT NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT NOT NULL,
  vigencia_inicio TEXT,
  vigencia_fim TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
);
CREATE INDEX IF NOT EXISTS idx_agenda_escalas_prof ON agenda_escalas(profissional_user_id, ativo);

CREATE TABLE IF NOT EXISTS agenda_grupos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  profissional_user_id INTEGER NOT NULL,
  especialidade_id INTEGER NOT NULL,
  equipe_id INTEGER NOT NULL,
  unidade_code TEXT NOT NULL,
  capacidade INTEGER NOT NULL DEFAULT 8,
  duracao_minutos INTEGER NOT NULL,
  observacao TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  encerrado_em TEXT,
  FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
);
CREATE INDEX IF NOT EXISTS idx_agenda_grupos_prof ON agenda_grupos(profissional_user_id, ativo);

CREATE TABLE IF NOT EXISTS agenda_grupo_encontros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grupo_id INTEGER NOT NULL,
  data_encontro TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'programado' CHECK (situacao IN ('programado','realizado','cancelado')),
  observacao TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (grupo_id) REFERENCES agenda_grupos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_grupo_encontros_data ON agenda_grupo_encontros(grupo_id, data_encontro, hora_inicio);

CREATE TABLE IF NOT EXISTS agenda_grupo_pacientes (
  grupo_id INTEGER NOT NULL,
  guia_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','concluido','abandono','removido')),
  entrada_em TEXT DEFAULT (datetime('now')),
  saida_em TEXT,
  motivo_saida TEXT,
  added_by INTEGER,
  PRIMARY KEY (grupo_id, guia_id),
  FOREIGN KEY (grupo_id) REFERENCES agenda_grupos(id) ON DELETE CASCADE,
  FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_grupo_pacientes_guia ON agenda_grupo_pacientes(guia_id, status);

CREATE TABLE IF NOT EXISTS agenda_individuais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guia_id INTEGER NOT NULL,
  profissional_user_id INTEGER NOT NULL,
  especialidade_id INTEGER NOT NULL,
  equipe_id INTEGER NOT NULL,
  unidade_code TEXT NOT NULL,
  data_atendimento TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'agendado' CHECK (situacao IN ('agendado','realizado','cancelado')),
  observacao TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE RESTRICT,
  FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
);
CREATE INDEX IF NOT EXISTS idx_agenda_ind_data ON agenda_individuais(profissional_user_id, data_atendimento, hora_inicio);
