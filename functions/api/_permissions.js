// Permissões próprias do eMulti / Regulação.
// v2.19.0: a autorização passa a usar principal_id no regulacao-vagas-db.
// Portal continua como fonte de identidade para usuários internos.

import { principalId } from './_hybrid.js';

const LEGACY_FEATURE_KEY = 'regulacao_vagas';
export const REGULACAO_CAPABILITIES = ['cadastrante', 'regulador', 'executor', 'administrador'];

function emptyProfile(extra={}){return{acesso:false,cadastrante:false,regulador:false,executor:false,administrador:false,fonte:'regulacao_principal_acessos',...extra}}
function normalizeProfile(row,extra={}){if(!row)return emptyProfile(extra);const administrador=!!row.administrador;const p={cadastrante:administrador||!!row.cadastrante,regulador:administrador||!!row.regulador,executor:administrador||!!row.executor,administrador,...extra};p.acesso=p.cadastrante||p.regulador||p.executor||p.administrador;return p}
export function fullRegulacaoProfile(extra={}){return{acesso:true,cadastrante:true,regulador:true,executor:true,administrador:true,fonte:'super_admin',...extra}}

async function getNewBinding(env,pid){
  const [eq,unitRows]=await Promise.all([
    env.DB_REGULACAO.prepare('SELECT equipe_id FROM regulacao_principal_equipes WHERE principal_id=?').bind(pid).first(),
    env.DB_REGULACAO.prepare('SELECT unidade_code FROM regulacao_principal_unidades WHERE principal_id=?').bind(pid).all(),
  ]);
  let equipe=false, unidade=false;
  if(eq?.equipe_id){try{equipe=!!await env.DB.prepare('SELECT 1 ok FROM regulacao_equipes WHERE id=? AND ativo=1').bind(eq.equipe_id).first()}catch{equipe=false}}
  for(const row of unitRows.results || []){
    try{if(await env.DB.prepare('SELECT 1 ok FROM unidades WHERE code=? AND ativo=1').bind(row.unidade_code).first()){unidade=true;break}}catch{}
  }
  return {equipe,unidade,acesso:equipe||unidade};
}

async function getLegacyPermission(env,user){if(user.source==='local')return false;if(user.role==='super_admin')return true;try{const o=await env.DB.prepare('SELECT enabled FROM user_permissions WHERE user_id=? AND feature_key=?').bind(user.id,LEGACY_FEATURE_KEY).first();if(o)return!!o.enabled;const c=await env.DB.prepare('SELECT enabled FROM role_permissions WHERE role=? AND feature_key=?').bind(user.role,LEGACY_FEATURE_KEY).first();return c?!!c.enabled:false}catch{return false}}
async function inferLegacyResponsibilities(env,user){if(user.source==='local')return emptyProfile({fonte:'local_sem_migracao'});const legacyAllowed=await getLegacyPermission(env,user);if(!legacyAllowed&&user.role!=='admin')return emptyProfile({fonte:'legado'});let emitir=false,executar=false,equipe=false;try{const d=await env.DB.prepare('SELECT MAX(pode_emitir) emitir,MAX(pode_executar) executar FROM regulacao_user_unidades WHERE user_id=?').bind(user.id).first();emitir=!!d?.emitir;executar=!!d?.executar}catch{}try{equipe=!!await env.DB.prepare('SELECT 1 ok FROM regulacao_equipe_profissionais WHERE user_id=? LIMIT 1').bind(user.id).first()}catch{}return normalizeProfile({cadastrante:emitir,regulador:executar,executor:executar||equipe,administrador:user.role==='admin'},{fonte:'legado'})}

export async function getRegulacaoBinding(env,userIdOrUser){
  const user=typeof userIdOrUser==='object'?userIdOrUser:{id:userIdOrUser,source:'portal'};
  const pid=principalId(user);
  try{const nb=await getNewBinding(env,pid);if(nb.acesso||user.source==='local')return nb}catch{}
  if(user.source==='local')return{equipe:false,unidade:false,acesso:false};
  try{const [e,u]=await Promise.all([env.DB.prepare(`SELECT 1 ok FROM regulacao_equipe_profissionais ep JOIN regulacao_equipes eq ON eq.id=ep.equipe_id AND eq.ativo=1 WHERE ep.user_id=? LIMIT 1`).bind(user.id).first(),env.DB.prepare(`SELECT 1 ok FROM regulacao_user_unidades ru JOIN unidades un ON un.code=ru.unidade_code AND un.ativo=1 WHERE ru.user_id=? LIMIT 1`).bind(user.id).first()]);return{equipe:!!e,unidade:!!u,acesso:!!e||!!u}}catch{return{equipe:false,unidade:false,acesso:false}}
}

export async function syncPortalRegulacaoFeature(env,userOrId){
  const user=typeof userOrId==='object'?userOrId:{id:userOrId,source:'portal'};
  if(user.source==='local')return{enabled:true,responsabilidades:true,equipe:false,unidade:false};
  const pid=`portal:${user.id}`;let responsabilidades=false;try{const r=await env.DB_REGULACAO.prepare('SELECT cadastrante,regulador,executor,administrador FROM regulacao_principal_acessos WHERE principal_id=? AND active=1').bind(pid).first();responsabilidades=!!(r&&(r.cadastrante||r.regulador||r.executor||r.administrador))}catch{}
  const binding=await getRegulacaoBinding(env,user);const enabled=responsabilidades||binding.acesso;
  await env.DB.prepare(`INSERT INTO user_permissions(user_id,feature_key,enabled) VALUES(?,?,?) ON CONFLICT(user_id,feature_key) DO UPDATE SET enabled=excluded.enabled`).bind(user.id,LEGACY_FEATURE_KEY,enabled?1:0).run();
  return{enabled,responsabilidades,...binding};
}

export async function getRegulacaoAccessProfile(env,user){
  if(!user)return emptyProfile();if(user.source==='portal'&&user.role==='super_admin')return fullRegulacaoProfile();const pid=principalId(user);
  try{const row=await env.DB_REGULACAO.prepare('SELECT cadastrante,regulador,executor,administrador,active FROM regulacao_principal_acessos WHERE principal_id=?').bind(pid).first();const p=normalizeProfile(row&&row.active?row:null,{fonte:'regulacao_principal_acessos'});const b=await getNewBinding(env,pid);if(b.acesso){p.acesso=true;p.vinculo_equipe=b.equipe;p.vinculo_unidade=b.unidade;if(!row)p.fonte=b.equipe?'vinculo_equipe':'vinculo_unidade'}if(row||b.acesso||user.source==='local')return p}catch{}
  return inferLegacyResponsibilities(env,user);
}
export function hasRegulacaoCapability(profile,capability){return REGULACAO_CAPABILITIES.includes(capability)&&!!(profile?.administrador||profile?.[capability])}
export async function getUserPermissions(env,user){const p=await getRegulacaoAccessProfile(env,user);return{regulacao_vagas:!!p.acesso}}
