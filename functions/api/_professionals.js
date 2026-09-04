// Profissionais assistenciais da Regulação.
// v2.19.0 separa profissional de usuário do sistema. A agenda continua
// recebendo um identificador numérico de conta para compatibilidade:
// Portal = id positivo; credencial própria = legacy_numeric_id negativo.

import { parsePrincipalId } from './_hybrid.js';

export async function ensureProfissionalSchema(env) {
  // Compatibilidade com a estrutura anterior no Portal. Não cria novas
  // estruturas 2.19.0 automaticamente; a migração do regulacao-vagas-db é explícita.
  const info = await env.DB.prepare("PRAGMA table_info('regulacao_equipe_profissionais')").all();
  const cols = new Set((info.results || []).map((c) => c.name));
  if (!cols.has('cargo')) await env.DB.prepare('ALTER TABLE regulacao_equipe_profissionais ADD COLUMN cargo TEXT').run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS regulacao_profissional_especialidades (
    user_id INTEGER NOT NULL,
    especialidade_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, especialidade_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();
}

async function numericActorForPrincipal(env, pid) {
  const p = parsePrincipalId(pid);
  if (!p) return null;
  if (p.source === 'portal') return Number(p.id) || null;
  const row = await env.DB_REGULACAO.prepare('SELECT legacy_numeric_id FROM regulacao_local_users WHERE id=? AND active=1').bind(p.id).first();
  return row?.legacy_numeric_id == null ? null : Number(row.legacy_numeric_id);
}

async function accountForNumericActor(env, actorId) {
  const n = Number(actorId);
  if (!Number.isFinite(n)) return null;
  if (n >= 0) {
    const u = await env.DB.prepare('SELECT id,name,username FROM users WHERE id=? AND active=1').bind(n).first();
    return u ? { principal_id:`portal:${u.id}`, id:u.id, name:u.name, username:u.username } : null;
  }
  const u = await env.DB_REGULACAO.prepare('SELECT id,legacy_numeric_id,name,username FROM regulacao_local_users WHERE legacy_numeric_id=? AND active=1').bind(n).first();
  return u ? { principal_id:`local:${u.id}`, id:n, name:u.name, username:u.username } : null;
}

export async function getEquipeProfissionais(env, equipeId) {
  // Novo modelo: somente profissionais com conta vinculada podem ser escolhidos
  // como executores da agenda; profissionais sem login continuam compondo carga.
  try {
    const { results: pros } = await env.DB_REGULACAO.prepare(`
      SELECT id,nome,principal_id FROM regulacao_profissionais
      WHERE equipe_id=? AND ativo=1 AND principal_id IS NOT NULL ORDER BY nome
    `).bind(Number(equipeId)).all();
    if ((pros || []).length) {
      const out=[];
      for (const p of pros || []) {
        const actorId=await numericActorForPrincipal(env,p.principal_id);
        if (actorId == null) continue;
        const account=await accountForNumericActor(env,actorId);
        const {results:esp}=await env.DB_REGULACAO.prepare(`SELECT DISTINCT v.especialidade_id,e.nome FROM regulacao_profissional_vinculos v JOIN especialidades e ON e.id=v.especialidade_id WHERE v.profissional_id=? AND v.ativo=1 ORDER BY e.nome`).bind(p.id).all();
        out.push({id:actorId,professional_id:p.id,name:p.nome,username:account?.username||'',cargo:(esp||[]).map(x=>x.nome).join(' / '),especialidade_ids:(esp||[]).map(x=>Number(x.especialidade_id))});
      }
      return out;
    }
  } catch { /* migração 2.19.0 ainda não aplicada */ }

  await ensureProfissionalSchema(env);
  const { results } = await env.DB.prepare(`
    SELECT us.id,us.name,us.username,COALESCE(ep.cargo,'') cargo
    FROM regulacao_equipe_profissionais ep JOIN users us ON us.id=ep.user_id AND us.active=1
    WHERE ep.equipe_id=? ORDER BY us.name
  `).bind(equipeId).all();
  for (const p of results || []) {
    const esp=await env.DB.prepare('SELECT especialidade_id FROM regulacao_profissional_especialidades WHERE user_id=? ORDER BY especialidade_id').bind(p.id).all();
    p.especialidade_ids=(esp.results||[]).map(x=>Number(x.especialidade_id));
  }
  return results || [];
}

export async function setProfissionalEspecialidades(env,userId,especialidadeIds){
  await ensureProfissionalSchema(env);
  await env.DB.prepare('DELETE FROM regulacao_profissional_especialidades WHERE user_id=?').bind(userId).run();
  for(const id of [...new Set((especialidadeIds||[]).map(Number).filter(Boolean))])await env.DB.prepare('INSERT OR IGNORE INTO regulacao_profissional_especialidades(user_id,especialidade_id) VALUES(?,?)').bind(userId,id).run();
}

export async function getProfissionalNaEquipe(env,equipeId,userId){
  try {
    const account=await accountForNumericActor(env,userId);
    if(account){
      const p=await env.DB_REGULACAO.prepare('SELECT id,nome,principal_id,equipe_id FROM regulacao_profissionais WHERE principal_id=? AND equipe_id=? AND ativo=1').bind(account.principal_id,Number(equipeId)).first();
      if(p){const {results:esp}=await env.DB_REGULACAO.prepare('SELECT DISTINCT especialidade_id FROM regulacao_profissional_vinculos WHERE profissional_id=? AND ativo=1').bind(p.id).all();return{id:Number(userId),professional_id:p.id,name:p.nome,username:account.username,cargo:'',especialidade_ids:(esp||[]).map(x=>Number(x.especialidade_id))}}
    }
  } catch {}
  await ensureProfissionalSchema(env);
  const row=await env.DB.prepare(`SELECT us.id,us.name,us.username,COALESCE(ep.cargo,'') cargo FROM regulacao_equipe_profissionais ep JOIN users us ON us.id=ep.user_id AND us.active=1 WHERE ep.equipe_id=? AND ep.user_id=?`).bind(equipeId,userId).first();
  if(!row)return null;const {results}=await env.DB.prepare('SELECT especialidade_id FROM regulacao_profissional_especialidades WHERE user_id=?').bind(userId).all();row.especialidade_ids=(results||[]).map(x=>Number(x.especialidade_id));return row;
}
