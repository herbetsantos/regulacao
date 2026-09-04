// Permissões próprias do eMulti / Regulação de Vagas.
//
// O papel do usuário no Portal Saúde (user/admin/admin_unidade) NÃO define
// sua responsabilidade dentro da Regulação. As responsabilidades são
// combináveis e ficam em regulacao_user_acessos, no portal-saude-db:
//   - cadastrante: cadastra cidadãos e emite guias (nas unidades autorizadas)
//   - regulador: organiza a fila, tria, transfere e cria acompanhamentos/grupos
//   - executor: registra sessões/atendimentos da equipe
//   - administrador: configura o módulo e possui todas as capacidades
//
// super_admin do Portal permanece com acesso total implícito, como salvaguarda.
// Se a estrutura própria de acessos ainda não estiver disponível, existe um fallback de
// compatibilidade para a antiga feature regulacao_vagas, evitando indisponibilidade.

const LEGACY_FEATURE_KEY = 'regulacao_vagas';
export const REGULACAO_CAPABILITIES = ['cadastrante', 'regulador', 'executor', 'administrador'];

function emptyProfile(extra = {}) {
  return {
    acesso: false,
    cadastrante: false,
    regulador: false,
    executor: false,
    administrador: false,
    fonte: 'regulacao_user_acessos',
    ...extra,
  };
}

function normalizeProfile(row, extra = {}) {
  if (!row) return emptyProfile(extra);
  const administrador = !!row.administrador;
  const profile = {
    cadastrante: administrador || !!row.cadastrante,
    regulador: administrador || !!row.regulador,
    executor: administrador || !!row.executor,
    administrador,
    ...extra,
  };
  profile.acesso = profile.cadastrante || profile.regulador || profile.executor || profile.administrador;
  return profile;
}

export function fullRegulacaoProfile(extra = {}) {
  return {
    acesso: true,
    cadastrante: true,
    regulador: true,
    executor: true,
    administrador: true,
    fonte: 'super_admin',
    ...extra,
  };
}

// Antiga permissão genérica. Mantida apenas como fallback para instalações
// que ainda não possuem a estrutura própria de acessos da Regulação.
async function getLegacyPermission(env, user) {
  if (user.role === 'super_admin') return true;
  try {
    const override = await env.DB.prepare(
      'SELECT enabled FROM user_permissions WHERE user_id = ? AND feature_key = ?'
    ).bind(user.id, LEGACY_FEATURE_KEY).first();
    if (override) return !!override.enabled;

    const ceiling = await env.DB.prepare(
      'SELECT enabled FROM role_permissions WHERE role = ? AND feature_key = ?'
    ).bind(user.role, LEGACY_FEATURE_KEY).first();
    return ceiling ? !!ceiling.enabled : false;
  } catch {
    return false;
  }
}

async function inferLegacyResponsibilities(env, user) {
  const legacyAllowed = await getLegacyPermission(env, user);
  if (!legacyAllowed && user.role !== 'admin') return emptyProfile({ fonte: 'legado' });

  let podeEmitir = false;
  let podeExecutarDireto = false;
  let membroEquipe = false;
  try {
    const direto = await env.DB.prepare(
      `SELECT MAX(pode_emitir) AS emitir, MAX(pode_executar) AS executar
       FROM regulacao_user_unidades WHERE user_id = ?`
    ).bind(user.id).first();
    podeEmitir = !!direto?.emitir;
    podeExecutarDireto = !!direto?.executar;
  } catch { /* tabelas antigas podem não existir */ }

  try {
    const equipe = await env.DB.prepare(
      'SELECT 1 AS ok FROM regulacao_equipe_profissionais WHERE user_id = ? LIMIT 1'
    ).bind(user.id).first();
    membroEquipe = !!equipe;
  } catch { /* tabela pode não existir */ }

  // Compatibilidade: no modelo antigo "pode_executar" concentrava funções
  // que agora foram separadas entre regulador e executor.
  return normalizeProfile({
    cadastrante: podeEmitir,
    regulador: podeExecutarDireto,
    executor: podeExecutarDireto || membroEquipe,
    administrador: user.role === 'admin',
  }, { fonte: 'legado' });
}

export async function getRegulacaoBinding(env, userId) {
  const binding = { equipe: false, unidade: false };
  try {
    const [equipe, unidade] = await Promise.all([
      env.DB.prepare(
        `SELECT 1 AS ok
         FROM regulacao_equipe_profissionais ep
         JOIN regulacao_equipes e ON e.id = ep.equipe_id AND e.ativo = 1
         WHERE ep.user_id = ? LIMIT 1`
      ).bind(userId).first(),
      env.DB.prepare(
        `SELECT 1 AS ok
         FROM regulacao_user_unidades ru
         JOIN unidades u ON u.code = ru.unidade_code AND u.ativo = 1
         WHERE ru.user_id = ? LIMIT 1`
      ).bind(userId).first(),
    ]);
    binding.equipe = !!equipe;
    binding.unidade = !!unidade;
  } catch { /* vínculo é complementar; tabelas antigas podem não existir */ }
  binding.acesso = binding.equipe || binding.unidade;
  return binding;
}

export async function syncPortalRegulacaoFeature(env, userId) {
  let responsabilidades = false;
  try {
    const row = await env.DB.prepare(
      `SELECT cadastrante, regulador, executor, administrador
       FROM regulacao_user_acessos WHERE user_id = ?`
    ).bind(userId).first();
    responsabilidades = !!(row && (row.cadastrante || row.regulador || row.executor || row.administrador));
  } catch { /* compatibilidade */ }

  const binding = await getRegulacaoBinding(env, userId);
  const enabled = responsabilidades || binding.acesso;
  await env.DB.prepare(
    `INSERT INTO user_permissions (user_id, feature_key, enabled)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, feature_key) DO UPDATE SET enabled = excluded.enabled`
  ).bind(userId, LEGACY_FEATURE_KEY, enabled ? 1 : 0).run();
  return { enabled, responsabilidades, ...binding };
}

export async function getRegulacaoAccessProfile(env, user) {
  if (!user) return emptyProfile();
  if (user.role === 'super_admin') return fullRegulacaoProfile();

  try {
    const row = await env.DB.prepare(
      `SELECT cadastrante, regulador, executor, administrador
       FROM regulacao_user_acessos WHERE user_id = ?`
    ).bind(user.id).first();
    const profile = normalizeProfile(row);
    const binding = await getRegulacaoBinding(env, user.id);

    // Regra v2.17.3: o vínculo operacional por equipe ou por unidade já
    // autoriza a entrada no eMulti. As classes continuam definindo o que
    // o usuário pode fazer dentro da ferramenta.
    if (binding.acesso) {
      profile.acesso = true;
      profile.vinculo_equipe = binding.equipe;
      profile.vinculo_unidade = binding.unidade;
      if (!row) profile.fonte = binding.equipe ? 'vinculo_equipe' : 'vinculo_unidade';
      else profile.fonte = `${profile.fonte}+vinculo`;
    }
    return profile;
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('no such table') && msg.includes('regulacao_user_acessos')) {
      return inferLegacyResponsibilities(env, user);
    }
    throw err;
  }
}

export function hasRegulacaoCapability(profile, capability) {
  if (!REGULACAO_CAPABILITIES.includes(capability)) return false;
  return !!profile?.administrador || !!profile?.[capability];
}

// Compatibilidade com /api/me antigo e com partes da interface que ainda
// leem permissions.regulacao_vagas.
export async function getUserPermissions(env, user) {
  const profile = await getRegulacaoAccessProfile(env, user);
  return { regulacao_vagas: !!profile.acesso };
}
