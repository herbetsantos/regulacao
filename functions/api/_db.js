// Compatibilidade e diagnóstico dos dois bancos usados pelo eMulti.
// Este arquivo evita que a ausência da coluna `unidades.tipo` bloqueie o
// cadastro de pacientes e fornece um bootstrap NÃO DESTRUTIVO do banco de
// conteúdo (DB_REGULACAO).

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
  'acompanhamentos',
  'acompanhamento_guias',
  'acompanhamento_sessoes',
  'notificacoes',
  'notificacao_lidas',
];

export async function getRegulacaoSchemaStatus(env) {
  if (!env.DB_REGULACAO) {
    return {
      bindingOk: false,
      schemaOk: false,
      tabelasExistentes: [],
      tabelasFaltantes: [...REGULACAO_TABLES],
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
    return {
      bindingOk: true,
      schemaOk: faltantes.length === 0,
      tabelasExistentes: [...existentes],
      tabelasFaltantes: faltantes,
      erro: null,
    };
  } catch (err) {
    return {
      bindingOk: true,
      schemaOk: false,
      tabelasExistentes: [],
      tabelasFaltantes: [...REGULACAO_TABLES],
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
      nome TEXT NOT NULL,
      data_nascimento TEXT NOT NULL,
      sexo TEXT NOT NULL CHECK (sexo IN ('F','M')),
      tel1 TEXT,
      tel2 TEXT,
      tel3 TEXT,
      unidade_referencia_code TEXT NOT NULL,
      endereco TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS guias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    `CREATE TABLE IF NOT EXISTS acompanhamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK (tipo IN ('individual','grupo')),
      especialidade_id INTEGER NOT NULL,
      equipe_id INTEGER NOT NULL,
      unidade_executante_code TEXT NOT NULL,
      local_execucao TEXT,
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
    `CREATE INDEX IF NOT EXISTS idx_guias_cpf ON guias(cpf)`,
    `CREATE INDEX IF NOT EXISTS idx_guias_situacao ON guias(situacao)`,
    `CREATE INDEX IF NOT EXISTS idx_guias_unidade_executante ON guias(unidade_executante_code)`,
    `CREATE INDEX IF NOT EXISTS idx_guias_equipe ON guias(equipe_id)`,
    `CREATE INDEX IF NOT EXISTS idx_guias_especialidade ON guias(especialidade_id)`,
    `CREATE INDEX IF NOT EXISTS idx_acompanhamentos_equipe ON acompanhamentos(equipe_id)`,
    `CREATE INDEX IF NOT EXISTS idx_acomp_guias_guia ON acompanhamento_guias(guia_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_acompanhamento ON acompanhamento_sessoes(acompanhamento_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notificacoes_equipe ON notificacoes(equipe_id)`,
  ];

  for (const sql of statements) {
    await env.DB_REGULACAO.prepare(sql).run();
  }

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
