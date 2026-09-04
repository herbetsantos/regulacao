// Modelo de permissões por funcionalidade.
//
// - role_permissions define o teto por papel para funcionalidades internas.
// - user_permissions guarda exceções individuais.
// - Ambientes externos (Regulação, Produção e Apoio Clínico) usam permissão
//   individual e não herdam automaticamente o papel do Portal.
// - Regulação continua com responsabilidades internas gerenciadas no eMulti.
// - Produção e Apoio Clínico: o acesso ao ambiente é concedido apenas pelo
//   Super Administrador no Portal; os perfis internos ficam nos próprios ambientes.
// - super_admin sempre tem acesso completo.

export const FEATURES = [
  { key: 'receituario', label: 'Receituário' },
  { key: 'malotes', label: 'Malotes e Remessas' },
  { key: 'facilitawhats', label: 'FacilitaWhats' },
  { key: 'mensageiro_esus', label: 'Mensageiro eSUS' },
  { key: 'documentos', label: 'Documentos Úteis' },
  { key: 'manuais', label: 'Manuais de Uso' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'regulacao_vagas', label: 'Regulação de Vagas', managedExternally: true, managerLabel: 'eMulti' },
  { key: 'producao', label: 'Produção', managedExternally: true, managedBySuperAdmin: true, managerLabel: 'Super Administrador' },
  { key: 'apoio_clinico', label: 'Apoio Clínico / IA', managedExternally: true, managedBySuperAdmin: true, managerLabel: 'Super Administrador' },
  { key: 'administracao', label: 'Administração' },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);
const FEATURE_KEY_SET = new Set(FEATURE_KEYS);
const INDIVIDUAL_EXTERNAL_KEYS = new Set(['regulacao_vagas', 'producao', 'apoio_clinico']);

export function isFeatureKey(key) {
  return FEATURE_KEY_SET.has(key);
}

function allTrue() {
  const m = {};
  FEATURE_KEYS.forEach((k) => { m[k] = true; });
  return m;
}
function allFalse() {
  const m = {};
  FEATURE_KEYS.forEach((k) => { m[k] = false; });
  return m;
}

export async function getRoleCeiling(env, role) {
  if (role === 'super_admin') return allTrue();
  try {
    const { results } = await env.DB.prepare(
      'SELECT feature_key, enabled FROM role_permissions WHERE role = ?'
    ).bind(role).all();
    const ceiling = allFalse();
    results.forEach((r) => { if (isFeatureKey(r.feature_key)) ceiling[r.feature_key] = !!r.enabled; });
    // Ambientes externos são individuais: deixamos teto=true para que a tela
    // consiga exibi-los e o valor efetivo seja decidido pelo override individual.
    INDIVIDUAL_EXTERNAL_KEYS.forEach((k) => { ceiling[k] = true; });
    return ceiling;
  } catch {
    const fallback = allTrue();
    INDIVIDUAL_EXTERNAL_KEYS.forEach((k) => { fallback[k] = true; });
    return fallback;
  }
}

export async function getUserPermissions(env, user) {
  if (user.role === 'super_admin') return allTrue();
  const ceiling = await getRoleCeiling(env, user.role);
  try {
    const { results } = await env.DB.prepare(
      'SELECT feature_key, enabled FROM user_permissions WHERE user_id = ?'
    ).bind(user.id).all();
    const overrides = {};
    results.forEach((r) => { if (isFeatureKey(r.feature_key)) overrides[r.feature_key] = !!r.enabled; });
    const effective = {};
    FEATURE_KEYS.forEach((k) => {
      if (INDIVIDUAL_EXTERNAL_KEYS.has(k)) {
        effective[k] = Object.prototype.hasOwnProperty.call(overrides, k) ? overrides[k] : false;
        return;
      }
      const wanted = Object.prototype.hasOwnProperty.call(overrides, k) ? overrides[k] : ceiling[k];
      effective[k] = ceiling[k] && wanted;
    });
    return effective;
  } catch {
    const fallback = { ...ceiling };
    INDIVIDUAL_EXTERNAL_KEYS.forEach((k) => { fallback[k] = false; });
    return fallback;
  }
}
