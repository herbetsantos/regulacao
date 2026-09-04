// Unidades de saúde: fonte única de verdade para o seletor do Receituário e
// para as telas de atribuição (Administração > Usuários e Administração >
// Unidades). Os dados vivem na tabela `unidades` (ver schema.sql /
// database/migrations/legacy/migration_unidades.sql) — cadastro de novas unidades é restrito ao Super
// Administrador (ver functions/api/unidades/*.js).

// Um "code" é o identificador estável usado em user_unidades e nunca muda
// depois de criado (mesmo que o nome da unidade seja editado).
export function isValidCodeFormat(code) {
  return typeof code === 'string' && /^[a-z0-9](?:[a-z0-9_-]{0,38}[a-z0-9])?$/.test(code);
}

// Gera um code a partir do nome (slug), garantindo unicidade no banco.
export async function generateUnidadeCode(env, nome) {
  const base = nome
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'unidade';

  let code = base;
  let n = 2;
  while (await env.DB.prepare('SELECT 1 FROM unidades WHERE code = ?').bind(code).first()) {
    const suffix = `-${n}`;
    code = base.slice(0, 40 - suffix.length) + suffix;
    n += 1;
  }
  return code;
}

// Lista todas as unidades cadastradas (opcionalmente só as ativas).
export async function listUnidades(env, { onlyActive = false } = {}) {
  const where = onlyActive ? 'WHERE ativo = 1' : '';
  const { results } = await env.DB.prepare(
    `SELECT code, nome, cnes, endereco, tel, ativo, sort_order FROM unidades ${where} ORDER BY sort_order ASC, nome ASC`
  ).all();
  return results;
}

// Confere se um code existe de fato no cadastro (usado para validar
// atribuições vindas do cliente).
export async function isUnidadeCode(env, code) {
  if (!isValidCodeFormat(code)) return false;
  const row = await env.DB.prepare('SELECT 1 FROM unidades WHERE code = ?').bind(code).first();
  return !!row;
}

// Retorna os códigos de unidade que o usuário autenticado pode acessar no
// Receituário. Admin/super_admin: todas as ativas. Usuário comum: somente as
// atribuídas pelo administrador na tabela user_unidades (e que ainda existam
// e estejam ativas).
export async function getUnidadesPermitidas(env, user) {
  if (user.role === 'admin' || user.role === 'super_admin') {
    const ativas = await listUnidades(env, { onlyActive: true });
    return ativas.map((u) => u.code);
  }
  const { results } = await env.DB.prepare(
    `SELECT uu.unidade_code FROM user_unidades uu
     JOIN unidades u ON u.code = uu.unidade_code
     WHERE uu.user_id = ? AND u.ativo = 1`
  )
    .bind(user.id)
    .all();
  return results.map((r) => r.unidade_code);
}

// Igual a getUnidadesPermitidas, mas já traz nome/CNES/endereço/telefone —
// é o que o Receituário usa para montar o documento impresso.
export async function getUnidadesPermitidasCompletas(env, user) {
  if (user.role === 'admin' || user.role === 'super_admin') {
    return listUnidades(env, { onlyActive: true });
  }
  const { results } = await env.DB.prepare(
    `SELECT u.code, u.nome, u.cnes, u.endereco, u.tel FROM user_unidades uu
     JOIN unidades u ON u.code = uu.unidade_code
     WHERE uu.user_id = ? AND u.ativo = 1
     ORDER BY u.sort_order ASC, u.nome ASC`
  )
    .bind(user.id)
    .all();
  return results;
}
