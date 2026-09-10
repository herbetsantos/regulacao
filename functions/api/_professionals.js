// Profissionais assistenciais da Regulação — 2.26.0.
// Profissional é entidade própria. Conta é apenas uma identidade Portal já
// conhecida no regulacao-vagas-db; nenhuma tabela operacional do Portal é usada.

export async function ensureProfissionalSchema(env) {
  // As estruturas são versionadas no regulacao-vagas-db. Mantido por compatibilidade.
  return true;
}

async function numericActorForPrincipal(env,pid){
  const m=String(pid||'').match(/^portal:(\d+)$/);return m?Number(m[1]):null;
}
async function accountForNumericActor(env,actorId){
  const n=Number(actorId);if(!Number.isFinite(n)||n<=0)return null;
  const u=await env.DB_REGULACAO.prepare('SELECT principal_id,portal_user_id,name,username FROM regulacao_principals WHERE portal_user_id=? AND active=1').bind(n).first();
  return u?{principal_id:u.principal_id,id:n,name:u.name,username:u.username}:null;
}

export async function getEquipeProfissionais(env,equipeId){
  const {results:pros}=await env.DB_REGULACAO.prepare(`
    SELECT DISTINCT p.id,p.nome,p.principal_id
    FROM regulacao_profissionais p
    JOIN regulacao_profissional_equipes pe ON pe.profissional_id=p.id
    WHERE pe.equipe_id=? AND p.ativo=1 AND p.principal_id IS NOT NULL
    ORDER BY p.nome
  `).bind(Number(equipeId)).all();
  const out=[];
  for(const p of pros||[]){
    const actorId=await numericActorForPrincipal(env,p.principal_id);if(actorId==null)continue;
    const account=await accountForNumericActor(env,actorId);
    const {results:esp}=await env.DB_REGULACAO.prepare(`SELECT DISTINCT v.especialidade_id,e.nome FROM regulacao_profissional_vinculos v JOIN especialidades e ON e.id=v.especialidade_id WHERE v.profissional_id=? AND v.ativo=1 ORDER BY e.nome`).bind(p.id).all();
    out.push({id:actorId,professional_id:p.id,name:p.nome,username:account?.username||'',cargo:(esp||[]).map(x=>x.nome).join(' / '),especialidade_ids:(esp||[]).map(x=>Number(x.especialidade_id))});
  }
  return out;
}

// Compatibilidade com endpoints antigos: especialidades devem ser geridas pelos
// vínculos assistenciais do profissional, portanto esta função não cria mais
// tabela paralela no Portal.
export async function setProfissionalEspecialidades(env,userId,especialidadeIds){return {userId,especialidadeIds}}

export async function getProfissionalNaEquipe(env,equipeId,userId){
  const account=await accountForNumericActor(env,userId);if(!account)return null;
  const p=await env.DB_REGULACAO.prepare(`SELECT p.id,p.nome,p.principal_id,p.equipe_id FROM regulacao_profissionais p JOIN regulacao_profissional_equipes pe ON pe.profissional_id=p.id WHERE p.principal_id=? AND pe.equipe_id=? AND p.ativo=1`).bind(account.principal_id,Number(equipeId)).first();
  if(!p)return null;const {results:esp}=await env.DB_REGULACAO.prepare('SELECT DISTINCT especialidade_id FROM regulacao_profissional_vinculos WHERE profissional_id=? AND ativo=1').bind(p.id).all();
  return{id:Number(userId),professional_id:p.id,name:p.nome,username:account.username,cargo:'',especialidade_ids:(esp||[]).map(x=>Number(x.especialidade_id))};
}

// --- Modelo assistencial 2.20.0 ------------------------------------------------
// A agenda deixa de depender de a pessoa possuir login. O profissional
// assistencial é identificado por regulacao_profissionais.id (TEXT).

export async function getProfissionalAssistencial(env, profissionalId) {
  if (!profissionalId) return null;
  try {
    const p = await env.DB_REGULACAO.prepare(`
      SELECT id,nome,registro_profissional,principal_id,equipe_id,ativo
      FROM regulacao_profissionais
      WHERE id=? AND ativo=1
    `).bind(String(profissionalId)).first();
    if (!p) return null;
    const { results: vinculos } = await env.DB_REGULACAO.prepare(`
      SELECT v.unidade_code,v.unidade_nome_snapshot,v.especialidade_id,
             v.carga_horaria_semanal,e.nome AS especialidade_nome
      FROM regulacao_profissional_vinculos v
      JOIN especialidades e ON e.id=v.especialidade_id
      WHERE v.profissional_id=? AND v.ativo=1
      ORDER BY e.nome,v.unidade_code
    `).bind(p.id).all();
    return { ...p, vinculos: vinculos || [] };
  } catch {
    return null;
  }
}

export async function getProfissionalAssistencialPorPrincipal(env, user) {
  const pid = user?.source === 'local' ? `local:${user.id}` : `portal:${user?.id}`;
  if (!user?.id) return null;
  try {
    return await env.DB_REGULACAO.prepare(`
      SELECT id,nome,registro_profissional,principal_id,equipe_id,ativo
      FROM regulacao_profissionais
      WHERE principal_id=? AND ativo=1
      LIMIT 1
    `).bind(pid).first();
  } catch {
    return null;
  }
}

export async function listProfissionaisAssistenciais(env, {
  equipeId = null,
  unidadeCode = null,
  especialidadeId = null,
  principalId = null,
} = {}) {
  const where = ['p.ativo=1', 'v.ativo=1'];
  const binds = [];

  if (equipeId) {
    where.push('EXISTS(SELECT 1 FROM regulacao_profissional_equipes pe WHERE pe.profissional_id=p.id AND pe.equipe_id=?)');
    binds.push(Number(equipeId));
  }
  if (unidadeCode) {
    where.push('v.unidade_code=?');
    binds.push(String(unidadeCode));
  }
  if (especialidadeId) {
    where.push('v.especialidade_id=?');
    binds.push(Number(especialidadeId));
  }
  if (principalId) {
    where.push('p.principal_id=?');
    binds.push(String(principalId));
  }

  const sql = `
    SELECT
      p.id,
      p.nome,
      p.registro_profissional,
      p.principal_id,
      p.equipe_id,
      ROUND(SUM(v.carga_horaria_semanal),2) AS carga_horaria_semanal,
      GROUP_CONCAT(DISTINCT e.nome) AS especialidades
    FROM regulacao_profissionais p
    JOIN regulacao_profissional_vinculos v
      ON v.profissional_id=p.id
    JOIN especialidades e
      ON e.id=v.especialidade_id
    WHERE ${where.join(' AND ')}
    GROUP BY p.id,p.nome,p.registro_profissional,p.principal_id,p.equipe_id
    ORDER BY p.nome
  `;
  const stmt = env.DB_REGULACAO.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return results || [];
}

export async function profissionalCompativelComVinculo(env, profissionalId, equipeId, especialidadeId, unidadeCode) {
  const p = await env.DB_REGULACAO.prepare(`
    SELECT p.id,p.nome,p.principal_id,p.equipe_id,v.carga_horaria_semanal
    FROM regulacao_profissionais p
    JOIN regulacao_profissional_vinculos v ON v.profissional_id=p.id AND v.ativo=1
    JOIN regulacao_profissional_equipes pe ON pe.profissional_id=p.id AND pe.equipe_id=?
    WHERE p.id=? AND p.ativo=1
      AND v.especialidade_id=?
      AND v.unidade_code=?
    LIMIT 1
  `).bind(Number(equipeId),String(profissionalId),Number(especialidadeId),String(unidadeCode)).first();
  return p || null;
}
