-- Regulação de Vagas — Cajamar Saúde
-- Banco D1 DEDICADO a este projeto (conteúdo clínico: pacientes, guias,
-- acompanhamentos). O login, as unidades e as equipes multidisciplinares
-- vivem no banco do Portal (portal-saude-db).
--
-- Criar o banco:
--   wrangler d1 create regulacao-vagas-db
-- Rodar este schema:
--   wrangler d1 execute regulacao-vagas-db --remote --file=./database/schema.sql
--
-- v2.5: este arquivo é NÃO DESTRUTIVO e pode ser executado novamente.
-- Usa CREATE ... IF NOT EXISTS / INSERT OR IGNORE e NUNCA apaga pacientes,
-- guias ou acompanhamentos existentes.
--
-- Este módulo referencia códigos de unidade (ex.: 'jordanesia'), ids de
-- equipe (ex.: 1 = 'Estratégia 1') e ids de usuário (ex.: 42) que vivem no
-- OUTRO banco (portal-saude-db). Como D1 não permite foreign key entre
-- bancos diferentes, esses campos são guardados como texto/inteiro
-- "soltos" (sem FK) — a validação de que o código/id existe de fato é
-- feita na camada de API, não pelo SQLite.


-- Especialidades atendidas pela regulação. Começa com as 4 pedidas; novas
-- podem ser cadastradas depois via POST /api/especialidades, sem precisar
-- mexer em código.
CREATE TABLE IF NOT EXISTS especialidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  duracao_padrao_min INTEGER NOT NULL DEFAULT 30,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO especialidades (nome, sort_order) VALUES
  ('Fisioterapia', 1),
  ('Nutrição', 2),
  ('Psicologia', 3),
  ('Fonoaudiologia', 4);

-- Cadastro de pacientes. CPF como chave primária (só dígitos, sem
-- pontuação — a formatação fica por conta do front-end).
CREATE TABLE IF NOT EXISTS pacientes (
  cpf TEXT PRIMARY KEY,
  cns TEXT,                                     -- CNS opcional, 15 dígitos
  nome TEXT NOT NULL,
  data_nascimento TEXT NOT NULL,               -- YYYY-MM-DD
  sexo TEXT NOT NULL CHECK (sexo IN ('F','M')),
  tel1 TEXT,
  tel2 TEXT,
  tel3 TEXT,
  -- Código da unidade de referência (APS) do paciente. Corresponde a
  -- unidades.code no banco do portal (não há FK entre bancos — ver acima).
  unidade_referencia_code TEXT NOT NULL,
  endereco TEXT,                                  -- representação legada/formatada
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  uf TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Guias de encaminhamento.
CREATE TABLE IF NOT EXISTS guias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_guia TEXT UNIQUE,                      -- código público: AAAA000001
  cpf TEXT NOT NULL,                            -- FK "lógica" -> pacientes.cpf
  unidade_solicitante_code TEXT NOT NULL,       -- qualquer unidade (não só APS)
  medico_solicitante TEXT NOT NULL,
  especialidade_id INTEGER NOT NULL,
  -- Unidade de Atenção Primária onde a guia será executada. Só unidades
  -- tipo='aps' podem aparecer aqui (CER II, Policlínica, CAPS e CAPS IJ só
  -- emitem guias, não executam, por enquanto) — validado na API, não pelo
  -- SQLite (unidades vive no outro banco). Fica NULL enquanto a guia ainda
  -- não foi triada.
  unidade_executante_code TEXT,
  -- Equipe multidisciplinar responsável pela triagem/execução (referência
  -- solta a regulacao_equipes.id, no banco do portal). Preenchida junto com
  -- unidade_executante_code no momento da triagem.
  equipe_id INTEGER,
  motivo TEXT NOT NULL,
  cid10 TEXT,
  situacao TEXT NOT NULL DEFAULT 'aguardando_autorizacao'
    CHECK (situacao IN (
      'aguardando_autorizacao',  -- Aguardando autorização
      'lista_espera',            -- Em lista de espera
      'em_atendimento',          -- Em atendimento
      'concluido',               -- Concluído
      'negado'                   -- Negado
    )),
  created_by INTEGER,                           -- id do usuário (banco do portal), sem FK
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  desfecho_atendimento TEXT,
  FOREIGN KEY (cpf) REFERENCES pacientes(cpf) ON DELETE RESTRICT,
  FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guias_codigo ON guias(codigo_guia);
CREATE INDEX IF NOT EXISTS idx_guias_cpf ON guias(cpf);
CREATE INDEX IF NOT EXISTS idx_guias_situacao ON guias(situacao);
CREATE INDEX IF NOT EXISTS idx_guias_unidade_executante ON guias(unidade_executante_code);
CREATE INDEX IF NOT EXISTS idx_guias_equipe ON guias(equipe_id);
CREATE INDEX IF NOT EXISTS idx_guias_especialidade ON guias(especialidade_id);


-- Histórico de atribuição da guia a profissionais especialistas.
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

-- Acompanhamentos: agrupam 1 guia (atendimento individual) ou 2+ guias
-- (atendimento em grupo) sob uma mesma agenda/sessões. Um grupo PODE
-- combinar guias que originalmente tinham unidades executantes diferentes
-- (a critério do profissional, ao juntar demanda parecida de mais de uma
-- unidade da mesma equipe) — por isso a "unidade executante" e o "local de
-- execução" vivem aqui no acompanhamento, não obrigatoriamente repetindo o
-- que cada guia tinha antes de entrar no grupo.
CREATE TABLE IF NOT EXISTS acompanhamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('individual','grupo')),
  especialidade_id INTEGER NOT NULL,
  -- Equipe responsável (referência solta a regulacao_equipes.id, banco do
  -- portal) — sempre obrigatória: quem inicia um acompanhamento faz isso
  -- como profissional de uma equipe.
  equipe_id INTEGER NOT NULL,
  -- Unidade de Atenção Primária de referência deste acompanhamento (uma
  -- das unidades cobertas pela equipe acima). Continua obrigatória mesmo
  -- quando o atendimento acontece fisicamente em outro lugar (ver
  -- local_execucao) — é o vínculo administrativo/estatístico.
  unidade_executante_code TEXT NOT NULL,
  -- Local físico do atendimento, quando DIFERENTE da unidade de saúde
  -- acima (ex.: escola, quadra, outro espaço público). Opcional — quando
  -- NULL, entende-se que o atendimento acontece na própria unidade.
  local_execucao TEXT,
  data_inicio TEXT,
  horario_inicio TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  encerrado_em TEXT,
  FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
);
CREATE INDEX IF NOT EXISTS idx_acompanhamentos_equipe ON acompanhamentos(equipe_id);

-- Vínculo N:N entre acompanhamento e guias. 1 linha = individual.
-- 2+ linhas (guias diferentes) = grupo.
CREATE TABLE IF NOT EXISTS acompanhamento_guias (
  acompanhamento_id INTEGER NOT NULL,
  guia_id INTEGER NOT NULL,
  PRIMARY KEY (acompanhamento_id, guia_id),
  FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_acomp_guias_guia ON acompanhamento_guias(guia_id);

-- Sessões/atividades executadas dentro de um acompanhamento. Cada sessão
-- tem sua própria data, horário e evolução (nota clínica em texto) — para
-- atendimento em grupo, a evolução pode ser geral da sessão e/ou por
-- paciente via presentes (JSON com os guia_id presentes naquela sessão).
CREATE TABLE IF NOT EXISTS acompanhamento_sessoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  acompanhamento_id INTEGER NOT NULL,
  data_sessao TEXT NOT NULL,     -- YYYY-MM-DD
  horario TEXT NOT NULL,         -- HH:MM
  presentes TEXT,                -- JSON com lista de guia_id presentes (grupo); NULL = todos
  evolucao TEXT NOT NULL,
  created_by INTEGER,
  profissional_user_id INTEGER,                 -- profissional que realizou a sessão (Portal)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessoes_acompanhamento ON acompanhamento_sessoes(acompanhamento_id);

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


-- Notificações dirigidas a uma EQUIPE (referência solta a
-- regulacao_equipes.id, banco do portal) — hoje usada só para avisar sobre
-- transferência de guia entre equipes (ex.: paciente mudou de endereço e a
-- guia foi redirecionada para outra equipe de regulação). guia_id é FK de
-- verdade porque guias vive neste mesmo banco.
CREATE TABLE IF NOT EXISTS notificacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipe_id INTEGER NOT NULL,
  guia_id INTEGER NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'transferencia',
  mensagem TEXT NOT NULL,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notificacoes_equipe ON notificacoes(equipe_id);

-- Controle de leitura POR USUÁRIO (cada profissional da equipe marca como
-- lida individualmente — não é uma leitura "da equipe toda").
CREATE TABLE IF NOT EXISTS notificacao_lidas (
  notificacao_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  lida_em TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (notificacao_id, user_id),
  FOREIGN KEY (notificacao_id) REFERENCES notificacoes(id) ON DELETE CASCADE
);

-- Controle de versão do schema eMulti
CREATE TABLE IF NOT EXISTS emulti_schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO emulti_schema_version (id, version, updated_at)
VALUES (1, '2.18.2', datetime('now'))
ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at;
PRAGMA foreign_keys = ON;

-- eMulti / Regulação 2.19.0
-- Migração aditiva para:
-- 1) autenticação híbrida (Portal APS ou credencial própria),
-- 2) autorizações próprias da Regulação por principal,
-- 3) profissionais assistenciais independentes de usuários,
-- 4) vínculos profissional + unidade + especialidade + carga horária.

CREATE TABLE IF NOT EXISTS regulacao_local_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  legacy_numeric_id INTEGER NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 210000,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0,1)),
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('auto','light','dark','contrast')),
  created_by_principal TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_reg_local_users_active ON regulacao_local_users(active, username);

CREATE TABLE IF NOT EXISTS regulacao_local_sessions (
  token TEXT PRIMARY KEY,
  local_user_id TEXT NOT NULL REFERENCES regulacao_local_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_local_sessions_exp ON regulacao_local_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_reg_local_sessions_user ON regulacao_local_sessions(local_user_id);

CREATE TABLE IF NOT EXISTS regulacao_login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE,
  ip TEXT,
  success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_login_attempts_user_time ON regulacao_login_attempts(username, created_at);

-- principal_id usa duas origens:
-- portal:<id do users no portal-saude-db>
-- local:<uuid do regulacao_local_users>
CREATE TABLE IF NOT EXISTS regulacao_principal_acessos (
  principal_id TEXT PRIMARY KEY,
  cadastrante INTEGER NOT NULL DEFAULT 0 CHECK (cadastrante IN (0,1)),
  regulador INTEGER NOT NULL DEFAULT 0 CHECK (regulador IN (0,1)),
  executor INTEGER NOT NULL DEFAULT 0 CHECK (executor IN (0,1)),
  administrador INTEGER NOT NULL DEFAULT 0 CHECK (administrador IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  updated_by_principal TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS regulacao_principal_unidades (
  principal_id TEXT NOT NULL,
  unidade_code TEXT NOT NULL,
  pode_emitir INTEGER NOT NULL DEFAULT 0 CHECK (pode_emitir IN (0,1)),
  pode_executar INTEGER NOT NULL DEFAULT 0 CHECK (pode_executar IN (0,1)),
  updated_by_principal TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (principal_id, unidade_code)
);
CREATE INDEX IF NOT EXISTS idx_reg_principal_unidades_unit ON regulacao_principal_unidades(unidade_code, principal_id);

CREATE TABLE IF NOT EXISTS regulacao_principal_equipes (
  principal_id TEXT PRIMARY KEY,
  equipe_id INTEGER NOT NULL,
  updated_by_principal TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_principal_equipes_team ON regulacao_principal_equipes(equipe_id);

CREATE TABLE IF NOT EXISTS regulacao_profissionais (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL COLLATE NOCASE,
  registro_profissional TEXT,
  principal_id TEXT,
  equipe_id INTEGER,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  origem TEXT NOT NULL DEFAULT 'manual',
  legacy_base_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_prof_legacy_base ON regulacao_profissionais(legacy_base_id) WHERE legacy_base_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_prof_principal ON regulacao_profissionais(principal_id) WHERE principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reg_prof_nome ON regulacao_profissionais(ativo, nome);
CREATE INDEX IF NOT EXISTS idx_reg_prof_equipe ON regulacao_profissionais(equipe_id, ativo);

CREATE TABLE IF NOT EXISTS regulacao_profissional_vinculos (
  id TEXT PRIMARY KEY,
  profissional_id TEXT NOT NULL REFERENCES regulacao_profissionais(id) ON DELETE CASCADE,
  unidade_code TEXT,
  unidade_nome_snapshot TEXT,
  especialidade_id INTEGER NOT NULL REFERENCES especialidades(id),
  carga_horaria_semanal REAL NOT NULL DEFAULT 0 CHECK (carga_horaria_semanal >= 0),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1)),
  origem TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_prof_vinculo ON regulacao_profissional_vinculos(
  profissional_id,
  COALESCE(unidade_code,''),
  COALESCE(unidade_nome_snapshot,''),
  especialidade_id
);
CREATE INDEX IF NOT EXISTS idx_reg_prof_vinc_esp ON regulacao_profissional_vinculos(especialidade_id, ativo);
CREATE INDEX IF NOT EXISTS idx_reg_prof_vinc_unit ON regulacao_profissional_vinculos(unidade_code, ativo);

CREATE TABLE IF NOT EXISTS regulacao_local_audit (
  id TEXT PRIMARY KEY,
  actor_principal_id TEXT,
  actor_username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_local_audit_created ON regulacao_local_audit(created_at);

INSERT INTO emulti_schema_version (id, version, updated_at)
VALUES (1, '2.19.0', datetime('now'))
ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at;
