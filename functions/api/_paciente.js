const IDENTIDADES_GENERO = new Set([
  'mulher_cisgenero',
  'mulher_transgenero',
  'homem_cisgenero',
  'homem_transgenero',
  'nao_binario',
  'transgenero',
  'travesti',
  'outro',
]);

const PACIENTE_WRITE_COLUMNS = [
  'cpf',
  'cns',
  'nome',
  'nome_social',
  'data_nascimento',
  'sexo',
  'identidade_genero',
  'tel1',
  'tel2',
  'tel3',
  'unidade_referencia_code',
  'endereco',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'municipio',
  'uf',
];

function normalizedText(value) {
  return String(value ?? '').trim();
}

function normalizedKey(value) {
  return normalizedText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSexo(value) {
  const key = normalizedKey(value);
  if (key === 'f' || key === 'feminino') return 'F';
  if (key === 'm' || key === 'masculino') return 'M';
  if (key === 'i' || key === 'indeterminado') return 'I';
  return '';
}

export function normalizeIdentidadeGenero(value) {
  const raw = normalizedText(value);
  if (!raw) return null;
  if (IDENTIDADES_GENERO.has(raw)) return raw;

  const map = {
    'mulher cisgenero': 'mulher_cisgenero',
    'mulher transgenero': 'mulher_transgenero',
    'homem cisgenero': 'homem_cisgenero',
    'homem transgenero': 'homem_transgenero',
    'nao binario': 'nao_binario',
    'transgenero': 'transgenero',
    'travesti': 'travesti',
    'outro': 'outro',
  };
  return map[normalizedKey(raw)] || '';
}

export function normalizeDemografia(body = {}) {
  return {
    nome_social: normalizedText(body.nome_social) || null,
    sexo: normalizeSexo(body.sexo),
    identidade_genero: normalizeIdentidadeGenero(body.identidade_genero),
    identidade_genero_informada: !!normalizedText(body.identidade_genero),
  };
}

export function validateDemografia(demografia) {
  if (!['F', 'M', 'I'].includes(demografia.sexo)) {
    return 'Sexo deve ser Feminino, Masculino ou Indeterminado.';
  }
  if (demografia.identidade_genero_informada && !demografia.identidade_genero) {
    return 'Identidade de gênero inválida.';
  }
  return null;
}

export async function getPacienteColumns(env) {
  const { results } = await env.DB_REGULACAO.prepare("PRAGMA table_info('pacientes')").all();
  return new Set((results || []).map((column) => column.name));
}

export function demografiaDisponivel(columns) {
  return columns.has('nome_social') && columns.has('identidade_genero');
}

export function requerMigrationDemografia(columns, demografia) {
  if (demografiaDisponivel(columns)) return false;
  return demografia.sexo === 'I' || !!demografia.nome_social || !!demografia.identidade_genero;
}

export async function insertPaciente(env, record, columns = null) {
  const available = columns || await getPacienteColumns(env);
  const selected = PACIENTE_WRITE_COLUMNS.filter(
    (column) => available.has(column) && record[column] !== undefined
  );
  const values = selected.map((column) => record[column]);
  const placeholders = selected.map(() => '?').join(', ');
  await env.DB_REGULACAO.prepare(
    `INSERT INTO pacientes (${selected.join(', ')}) VALUES (${placeholders})`
  ).bind(...values).run();
}

export async function updatePaciente(env, cpf, record, columns = null) {
  const available = columns || await getPacienteColumns(env);
  const selected = PACIENTE_WRITE_COLUMNS.filter(
    (column) => column !== 'cpf' && available.has(column) && record[column] !== undefined
  );
  const assignments = selected.map((column) => `${column}=?`);
  const values = selected.map((column) => record[column]);
  if (available.has('updated_at')) assignments.push("updated_at=datetime('now')");
  await env.DB_REGULACAO.prepare(
    `UPDATE pacientes SET ${assignments.join(', ')} WHERE cpf=?`
  ).bind(...values, cpf).run();
}
