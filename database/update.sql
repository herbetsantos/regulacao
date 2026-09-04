-- eMulti Regulação 2.18.2 — regulacao-vagas-db
-- Atualização consolidada para a estrutura real informada em 02/09/2026.
-- Não apaga pacientes, guias, acompanhamentos ou notificações.
-- Aplicar administrativamente no regulacao-vagas-db via Cloudflare D1/Wrangler.
-- Este arquivo manual deve ser executado UMA VEZ sobre o estado-base informado.

PRAGMA foreign_keys = ON;

-- Evoluções de colunas já existentes no banco atual.
ALTER TABLE especialidades ADD COLUMN duracao_padrao_min INTEGER NOT NULL DEFAULT 30;
ALTER TABLE guias ADD COLUMN codigo_guia TEXT;
ALTER TABLE guias ADD COLUMN desfecho_atendimento TEXT;
ALTER TABLE acompanhamentos ADD COLUMN data_inicio TEXT;
ALTER TABLE acompanhamentos ADD COLUMN horario_inicio TEXT;
ALTER TABLE acompanhamento_sessoes ADD COLUMN profissional_user_id INTEGER;

-- Código público: ano + id interno com 6 dígitos, sem hífen.
UPDATE guias
SET codigo_guia = substr(COALESCE(created_at, datetime('now')), 1, 4) || printf('%06d', id)
WHERE codigo_guia IS NULL OR trim(codigo_guia) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_guias_codigo ON guias(codigo_guia);
CREATE INDEX IF NOT EXISTS idx_guias_cpf ON guias(cpf);
CREATE INDEX IF NOT EXISTS idx_guias_situacao ON guias(situacao);
CREATE INDEX IF NOT EXISTS idx_guias_unidade_executante ON guias(unidade_executante_code);
CREATE INDEX IF NOT EXISTS idx_guias_equipe ON guias(equipe_id);
CREATE INDEX IF NOT EXISTS idx_guias_especialidade ON guias(especialidade_id);
CREATE INDEX IF NOT EXISTS idx_acompanhamentos_equipe ON acompanhamentos(equipe_id);
CREATE INDEX IF NOT EXISTS idx_acomp_guias_guia ON acompanhamento_guias(guia_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_acompanhamento ON acompanhamento_sessoes(acompanhamento_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_equipe ON notificacoes(equipe_id);

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

CREATE TABLE IF NOT EXISTS emulti_schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO emulti_schema_version (id, version, updated_at)
VALUES (1, '2.18.2', datetime('now'))
ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at;
