// Compatibilidade e diagnóstico dos dois bancos usados pelo eMulti.
// Este arquivo evita que a ausência da coluna `unidades.tipo` bloqueie o
// cadastro de pacientes e fornece um bootstrap NÃO DESTRUTIVO do banco de
// conteúdo (DB_REGULACAO).

import { PACIENTE_ENDERECO_COLUMNS, getPacienteEnderecoColumnStatus } from './_address.js';

export const KNOWN_APS_CODES = [
  'portal', 'km43', 'beloplanalto', 'marialuiza', 'guaturinho',
  'parquesaoroberto', 'ponunduva', 'cajamarcento', 'jordanesia',
  'polvilho', 'manoelinacio',
];

const APS_SET = new Set(KNOWN_APS_CODES);

function messageOf(err) {
  return String(err?.message || err || '');
}

export function isMissingColumn(err, column = 'tipo') {
  const msg = messageOf(err).toLowerCase();
  return msg.includes('no such column') && msg.includes(String(column).toLowerCase());
}

export function isMissingTable(err, table) {
  const msg = messageOf(err).toLowerCase();
  return msg.includes('no such table') && (!table || msg.includes(String(table).toLowerCase()));
}

export async function hasUnidadesTipoColumn(env) {
  try {
    const { results } = await env.DB.prepare("PRAGMA table_info('unidades')").all();
    return (results || []).some((c) => c.name === 'tipo');
  } catch {
    return false;
  }
}

// Retorna todas as unidades ativas com `tipo`, mesmo em instalações antigas
// do Portal que ainda não receberam a coluna `unidades.tipo`. Nesse cenário,
// a classificação APS é inferida pela lista oficial que já era usada pela
// migração original do eMulti.
export async function listUnidadesAtivasComTipo(env) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT code, nome, tipo FROM unidades WHERE ativo = 1 ORDER BY nome ASC'
    ).all();
    return { unidades: results || [], tipoFonte: 'banco' };
  } catch (err) {
    if (!isMissingColumn(err, 'tipo')) throw err;
    const { results } = await env.DB.prepare(
      'SELECT code, nome FROM unidades WHERE ativo = 1 ORDER BY nome ASC'
    ).all();
    return {
      unidades: (results || []).map((u) => ({ ...u, tipo: APS_SET.has(u.code) ? 'aps' : 'outra' })),
      tipoFonte: 'inferido',
    };
  }
}

export async function getUnidadeAtivaComTipo(env, code) {
  try {
    const unidade = await env.DB.prepare(
      'SELECT code, nome, tipo FROM unidades WHERE code = ? AND ativo = 1'
    ).bind(code).first();
    return unidade ? { unidade, tipoFonte: 'banco' } : { unidade: null, tipoFonte: 'banco' };
  } catch (err) {
    if (!isMissingColumn(err, 'tipo')) throw err;
    const unidade = await env.DB.prepare(
      'SELECT code, nome FROM unidades WHERE code = ? AND ativo = 1'
    ).bind(code).first();
    if (!unidade) return { unidade: null, tipoFonte: 'inferido' };
    return {
      unidade: { ...unidade, tipo: APS_SET.has(unidade.code) ? 'aps' : 'outra' },
      tipoFonte: 'inferido',
    };
  }
}

const REGULACAO_TABLES = [
  'especialidades',
  'pacientes',
  'guias',
  'guia_atribuicoes',
  'acompanhamentos',
  'acompanhamento_guias',
  'acompanhamento_sessoes',
  'notificacoes',
  'notificacao_lidas',
  'agenda_escalas',
  'agenda_grupos',
  'agenda_grupo_encontros',
  'agenda_grupo_pacientes',
  'agenda_individuais',
  'emulti_schema_version',
];

export async function getRegulacaoSchemaStatus(env) {
  if (!env.DB_REGULACAO) {
    return {
      bindingOk: false,
      schemaOk: false,
      tabelasExistentes: [],
      tabelasFaltantes: [...REGULACAO_TABLES],
      colunasPacienteEnderecoFaltantes: [...PACIENTE_ENDERECO_COLUMNS],
      colunasPacienteIntegracaoFaltantes: ['cns'],
      colunasFluxoV210Faltantes: ['guias.codigo_guia','acompanhamentos.data_inicio','acompanhamentos.horario_inicio','acompanhamento_sessoes.profissional_user_id'],
      colunasAgendaFaltantes: ['especialidades.duracao_padrao_min','guias.desfecho_atendimento'],
      erro: 'Binding DB_REGULACAO não configurado no projeto Cloudflare Pages.',
    };
  }

  try {
    const placeholders = REGULACAO_TABLES.map(() => '?').join(',');
    const { results } = await env.DB_REGULACAO.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`
    ).bind(...REGULACAO_TABLES).all();
    const existentes = new Set((results || []).map((r) => r.name));
    const faltantes = REGULACAO_TABLES.filter((t) => !existentes.has(t));
    let colunasPacienteEnderecoFaltantes = [];
    let colunasPacienteIntegracaoFaltantes = [];
    let colunasFluxoV210Faltantes = [];
    let colunasAgendaFaltantes = [];
    if (existentes.has('pacientes')) {
      const enderecoStatus = await getPacienteEnderecoColumnStatus(env);
      colunasPacienteEnderecoFaltantes = enderecoStatus.faltantes;
      const info = await env.DB_REGULACAO.prepare("PRAGMA table_info('pacientes')").all();
      const cols = new Set((info.results || []).map((c) => c.name));
      if (!cols.has('cns')) colunasPacienteIntegracaoFaltantes.push('cns');
    }
    if (existentes.has('guias')) {
      const info = await env.DB_REGULACAO.prepare("PRAGMA table_info('guias')").all();
      const cols = new Set((info.results || []).map((c) => c.name));
      if (!cols.has('codigo_guia')) colunasFluxoV210Faltantes.push('guias.codigo_guia');
      if (!cols.has('desfecho_atendimento')) colunasAgendaFaltantes.push('guias.desfecho_atendimento');
    }
    if (existentes.has('especialidades')) {
      const info = await env.DB_REGULACAO.prepare("PRAGMA table_info('especialidades')").all();
      const cols = new Set((info.results || []).map((c) => c.name));
      if (!cols.has('duracao_padrao_min')) colunasAgendaFaltantes.push('especialidades.duracao_padrao_min');
    }
    if (existentes.has('acompanhamentos')) {
      const info = await env.DB_REGULACAO.prepare("PRAGMA table_info('acompanhamentos')").all();
      const cols = new Set((info.results || []).map((c) => c.name));
      if (!cols.has('data_inicio')) colunasFluxoV210Faltantes.push('acompanhamentos.data_inicio');
      if (!cols.has('horario_inicio')) colunasFluxoV210Faltantes.push('acompanhamentos.horario_inicio');
    }
    if (existentes.has('acompanhamento_sessoes')) {
      const info = await env.DB_REGULACAO.prepare("PRAGMA table_info('acompanhamento_sessoes')").all();
      const cols = new Set((info.results || []).map((c) => c.name));
      if (!cols.has('profissional_user_id')) colunasFluxoV210Faltantes.push('acompanhamento_sessoes.profissional_user_id');
    }

    return {
      bindingOk: true,
      schemaOk: faltantes.length === 0 && colunasPacienteEnderecoFaltantes.length === 0 && colunasPacienteIntegracaoFaltantes.length === 0 && colunasFluxoV210Faltantes.length === 0 && colunasAgendaFaltantes.length === 0,
      tabelasExistentes: [...existentes],
      tabelasFaltantes: faltantes,
      colunasPacienteEnderecoFaltantes,
      colunasPacienteIntegracaoFaltantes,
      colunasFluxoV210Faltantes,
      colunasAgendaFaltantes,
      erro: null,
    };
  } catch (err) {
    return {
      bindingOk: true,
      schemaOk: false,
      tabelasExistentes: [],
      tabelasFaltantes: [...REGULACAO_TABLES],
      colunasPacienteEnderecoFaltantes: [...PACIENTE_ENDERECO_COLUMNS],
      colunasPacienteIntegracaoFaltantes: ['cns'],
      colunasFluxoV210Faltantes: ['guias.codigo_guia','acompanhamentos.data_inicio','acompanhamentos.horario_inicio','acompanhamento_sessoes.profissional_user_id'],
      colunasAgendaFaltantes: ['especialidades.duracao_padrao_min','guias.desfecho_atendimento'],
      erro: messageOf(err),
    };
  }
}

// Cria SOMENTE estruturas ausentes. Não apaga tabelas, não recria dados e
// não usa DROP. É seguro para banco já em uso e pode ser executado mais de
// uma vez. Alterações de estrutura de tabelas já existentes continuam sendo
// tratadas por migrações versionadas específicas.
export async function ensureRegulacaoSchema(env) {
  if (!env.DB_REGULACAO) throw new Error('Binding DB_REGULACAO não configurado.');

  const statements = [
    `CREATE TABLE IF NOT EXISTS especialidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      ativo INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS pacientes (
      cpf TEXT PRIMARY KEY,
      cns TEXT,
      nome TEXT NOT NULL,
      data_nascimento TEXT NOT NULL,
      sexo TEXT NOT NULL CHECK (sexo IN ('F','M')),
      tel1 TEXT,
      tel2 TEXT,
      tel3 TEXT,
      unidade_referencia_code TEXT NOT NULL,
      endereco TEXT,
      cep TEXT,
      logradouro TEXT,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      municipio TEXT,
      uf TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS guias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_guia TEXT UNIQUE,
      cpf TEXT NOT NULL,
      unidade_solicitante_code TEXT NOT NULL,
      medico_solicitante TEXT NOT NULL,
      especialidade_id INTEGER NOT NULL,
      unidade_executante_code TEXT,
      equipe_id INTEGER,
      motivo TEXT NOT NULL,
      cid10 TEXT,
      situacao TEXT NOT NULL DEFAULT 'aguardando_autorizacao'
        CHECK (situacao IN ('aguardando_autorizacao','lista_espera','em_atendimento','concluido','negado')),
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (cpf) REFERENCES pacientes(cpf) ON DELETE RESTRICT,
      FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
    )`,
    `CREATE TABLE IF NOT EXISTS guia_atribuicoes (
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
    )`,
    `CREATE TABLE IF NOT EXISTS acompanhamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK (tipo IN ('individual','grupo')),
      especialidade_id INTEGER NOT NULL,
      equipe_id INTEGER NOT NULL,
      unidade_executante_code TEXT NOT NULL,
      local_execucao TEXT,
      data_inicio TEXT,
      horario_inicio TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      encerrado_em TEXT,
      FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
    )`,
    `CREATE TABLE IF NOT EXISTS acompanhamento_guias (
      acompanhamento_id INTEGER NOT NULL,
      guia_id INTEGER NOT NULL,
      PRIMARY KEY (acompanhamento_id, guia_id),
      FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos(id) ON DELETE CASCADE,
      FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE RESTRICT
    )`,
    `CREATE TABLE IF NOT EXISTS acompanhamento_sessoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      acompanhamento_id INTEGER NOT NULL,
      data_sessao TEXT NOT NULL,
      horario TEXT NOT NULL,
      presentes TEXT,
      evolucao TEXT NOT NULL,
      created_by INTEGER,
      profissional_user_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS notificacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipe_id INTEGER NOT NULL,
      guia_id INTEGER NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'transferencia',
      mensagem TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS notificacao_lidas (
      notificacao_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      lida_em TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (notificacao_id, user_id),
      FOREIGN KEY (notificacao_id) REFERENCES notificacoes(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS agenda_escalas (
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
    )`,
    `CREATE TABLE IF NOT EXISTS agenda_grupos (
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
    )`,
    `CREATE TABLE IF NOT EXISTS agenda_grupo_encontros (
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
    )`,
    `CREATE TABLE IF NOT EXISTS agenda_grupo_pacientes (
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
    )`,
    `CREATE TABLE IF NOT EXISTS agenda_individuais (
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
    )`,
    `CREATE TABLE IF NOT EXISTS emulti_schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_guias_cpf ON guias(cpf)`,
    `CREATE INDEX IF NOT EXISTS idx_guia_atribuicoes_guia ON guia_atribuicoes(guia_id)`,
    `CREATE INDEX IF NOT EXISTS idx_guia_atribuicoes_prof ON guia_atribuicoes(profissional_user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_guias_situacao ON guias(situacao)`,
    `CREATE INDEX IF NOT EXISTS idx_guias_unidade_executante ON guias(unidade_executante_code)`,
    `CREATE INDEX IF NOT EXISTS idx_guias_equipe ON guias(equipe_id)`,
    `CREATE INDEX IF NOT EXISTS idx_guias_especialidade ON guias(especialidade_id)`,
    `CREATE INDEX IF NOT EXISTS idx_acompanhamentos_equipe ON acompanhamentos(equipe_id)`,
    `CREATE INDEX IF NOT EXISTS idx_acomp_guias_guia ON acompanhamento_guias(guia_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_acompanhamento ON acompanhamento_sessoes(acompanhamento_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notificacoes_equipe ON notificacoes(equipe_id)`,
    `CREATE INDEX IF NOT EXISTS idx_agenda_escalas_prof ON agenda_escalas(profissional_user_id, ativo)`,
    `CREATE INDEX IF NOT EXISTS idx_agenda_grupos_prof ON agenda_grupos(profissional_user_id, ativo)`,
    `CREATE INDEX IF NOT EXISTS idx_grupo_encontros_data ON agenda_grupo_encontros(grupo_id, data_encontro, hora_inicio)`,
    `CREATE INDEX IF NOT EXISTS idx_grupo_pacientes_guia ON agenda_grupo_pacientes(guia_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_agenda_ind_data ON agenda_individuais(profissional_user_id, data_atendimento, hora_inicio)`,
  ];

  for (const sql of statements) {
    await env.DB_REGULACAO.prepare(sql).run();
  }

  // Evolução não destrutiva da tabela de pacientes. O SQLite/D1 não possui
  // ADD COLUMN IF NOT EXISTS em todas as versões, então consultamos o schema
  // e adicionamos apenas o que estiver faltando.
  const enderecoStatus = await getPacienteEnderecoColumnStatus(env);
  for (const coluna of enderecoStatus.faltantes) {
    await env.DB_REGULACAO.prepare(`ALTER TABLE pacientes ADD COLUMN ${coluna} TEXT`).run();
  }

  // v2.9 — CNS opcional para integração com e-SUS PEC.
  const pacienteInfo = await env.DB_REGULACAO.prepare("PRAGMA table_info('pacientes')").all();
  const pacienteCols = new Set((pacienteInfo.results || []).map((c) => c.name));
  if (!pacienteCols.has('cns')) {
    await env.DB_REGULACAO.prepare('ALTER TABLE pacientes ADD COLUMN cns TEXT').run();
  }

  // v2.10 — código público da guia, atribuição profissional e autor clínico da sessão.
  const guiaInfo = await env.DB_REGULACAO.prepare("PRAGMA table_info('guias')").all();
  const guiaCols = new Set((guiaInfo.results || []).map((c) => c.name));
  if (!guiaCols.has('codigo_guia')) {
    await env.DB_REGULACAO.prepare('ALTER TABLE guias ADD COLUMN codigo_guia TEXT').run();
  }
  await env.DB_REGULACAO.prepare(`UPDATE guias
    SET codigo_guia = substr(COALESCE(created_at, datetime('now')), 1, 4) || printf('%06d', id)
    WHERE codigo_guia IS NULL OR trim(codigo_guia) = ''`).run();
  await env.DB_REGULACAO.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_guias_codigo ON guias(codigo_guia)').run();

  const acompInfo = await env.DB_REGULACAO.prepare("PRAGMA table_info('acompanhamentos')").all();
  const acompCols = new Set((acompInfo.results || []).map((c) => c.name));
  if (!acompCols.has('data_inicio')) await env.DB_REGULACAO.prepare('ALTER TABLE acompanhamentos ADD COLUMN data_inicio TEXT').run();
  if (!acompCols.has('horario_inicio')) await env.DB_REGULACAO.prepare('ALTER TABLE acompanhamentos ADD COLUMN horario_inicio TEXT').run();

  const sessaoInfo = await env.DB_REGULACAO.prepare("PRAGMA table_info('acompanhamento_sessoes')").all();
  const sessaoCols = new Set((sessaoInfo.results || []).map((c) => c.name));
  if (!sessaoCols.has('profissional_user_id')) {
    await env.DB_REGULACAO.prepare('ALTER TABLE acompanhamento_sessoes ADD COLUMN profissional_user_id INTEGER').run();
  }

  // v2.17 — agenda e desfecho de atendimento.
  const espInfo = await env.DB_REGULACAO.prepare("PRAGMA table_info('especialidades')").all();
  const espCols = new Set((espInfo.results || []).map((c) => c.name));
  if (!espCols.has('duracao_padrao_min')) {
    await env.DB_REGULACAO.prepare('ALTER TABLE especialidades ADD COLUMN duracao_padrao_min INTEGER NOT NULL DEFAULT 30').run();
  }

  const guiaInfoAgenda = await env.DB_REGULACAO.prepare("PRAGMA table_info('guias')").all();
  const guiaColsAgenda = new Set((guiaInfoAgenda.results || []).map((c) => c.name));
  if (!guiaColsAgenda.has('desfecho_atendimento')) {
    await env.DB_REGULACAO.prepare('ALTER TABLE guias ADD COLUMN desfecho_atendimento TEXT').run();
  }

  await env.DB_REGULACAO.prepare(`INSERT INTO emulti_schema_version (id, version, updated_at)
    VALUES (1, '2.18.2', datetime('now'))
    ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at`).run();

  const especialidades = [
    ['Fisioterapia', 1],
    ['Nutrição', 2],
    ['Psicologia', 3],
    ['Fonoaudiologia', 4],
  ];
  for (const [nome, sortOrder] of especialidades) {
    await env.DB_REGULACAO.prepare(
      'INSERT OR IGNORE INTO especialidades (nome, sort_order) VALUES (?, ?)'
    ).bind(nome, sortOrder).run();
  }

  return getRegulacaoSchemaStatus(env);
}

export function friendlyRegulacaoError(err) {
  const msg = messageOf(err);
  const low = msg.toLowerCase();
  if (low.includes('db_regulacao') || low.includes('undefined')) {
    return {
      codigo: 'DB_REGULACAO_AUSENTE',
      error: 'O banco da Regulação não está vinculado ao projeto. Configure o binding DB_REGULACAO no Cloudflare Pages.',
    };
  }
  if (low.includes('no such table: pacientes')) {
    return {
      codigo: 'TABELA_PACIENTES_AUSENTE',
      error: 'A tabela de pacientes ainda não existe no banco da Regulação. Um administrador pode corrigir a estrutura em Administração > Diagnóstico.',
    };
  }
  if (low.includes('no such table')) {
    return {
      codigo: 'SCHEMA_REGULACAO_INCOMPLETO',
      error: 'A estrutura do banco da Regulação está incompleta. Um administrador pode corrigi-la em Administração > Diagnóstico.',
    };
  }
  return {
    codigo: 'ERRO_BANCO_REGULACAO',
    error: 'Não foi possível acessar o banco da Regulação.',
  };
}
