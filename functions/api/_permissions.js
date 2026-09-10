// Permissões próprias do eMulti / Regulação 2.26.0.
// O Portal fornece apenas identidade; toda autorização fica no regulacao-vagas-db.

export const REGULACAO_CAPABILITIES = ['cadastrante','regulador','organizador','executor','gestor','administrador'];

function emptyProfile(extra={}){return{acesso:false,cadastrante:false,regulador:false,organizador:false,executor:false,gestor:false,administrador:false,fonte:'regulacao_principal_acessos',...extra}}
function normalizeProfile(row,extra={}){if(!row)return emptyProfile(extra);const administrador=!!row.administrador;const p={cadastrante:administrador||!!row.cadastrante,regulador:administrador||!!row.regulador,organizador:administrador||!!row.organizador,executor:administrador||!!row.executor,gestor:administrador||!!row.gestor,administrador,...extra};p.acesso=!!row.active&&(p.cadastrante||p.regulador||p.organizador||p.executor||p.gestor||p.administrador);return p}
export function fullRegulacaoProfile(extra={}){return{acesso:true,cadastrante:true,regulador:true,organizador:true,executor:true,gestor:true,administrador:true,fonte:'superuser_local',...extra}}

async function getBinding(env,pid){
  const [eqRows,unitRows]=await Promise.all([
    env.DB_REGULACAO.prepare(`SELECT pe.equipe_id FROM regulacao_principal_equipes pe JOIN regulacao_equipes e ON e.id=pe.equipe_id AND e.ativo=1 WHERE pe.principal_id=? ORDER BY pe.equipe_id`).bind(pid).all(),
    env.DB_REGULACAO.prepare(`SELECT pu.unidade_code FROM regulacao_principal_unidades pu JOIN regulacao_unidades u ON u.code=pu.unidade_code AND u.ativo=1 WHERE pu.principal_id=?`).bind(pid).all(),
  ]);
  const equipe=(eqRows.results||[]).length>0,unidade=(unitRows.results||[]).length>0;
  return{equipe,unidade,acesso:equipe||unidade};
}

export async function getRegulacaoBinding(env,userOrId){
  const pid=typeof userOrId==='string'?userOrId:(userOrId?.principalId||`portal:${userOrId?.id}`);
  if(!pid)return{equipe:false,unidade:false,acesso:false};
  return getBinding(env,pid);
}

// Compatibilidade com chamadas antigas. Não grava mais permissões no Portal.
export async function syncPortalRegulacaoFeature(env,userOrId){
  const pid=typeof userOrId==='object'?(userOrId.principalId||`portal:${userOrId.id}`):`portal:${userOrId}`;
  const row=await env.DB_REGULACAO.prepare('SELECT cadastrante,regulador,organizador,executor,gestor,administrador,active FROM regulacao_principal_acessos WHERE principal_id=?').bind(pid).first();
  const profile=normalizeProfile(row);
  const binding=await getBinding(env,pid);
  return{enabled:profile.acesso||binding.acesso,responsabilidades:profile.acesso,...binding};
}

export async function getRegulacaoAccessProfile(env,user){
  if(!user)return emptyProfile();
  if(user.isSuperAdmin)return fullRegulacaoProfile();
  const pid=user.principalId||`portal:${user.id}`;
  const row=await env.DB_REGULACAO.prepare('SELECT cadastrante,regulador,organizador,executor,gestor,administrador,active FROM regulacao_principal_acessos WHERE principal_id=?').bind(pid).first();
  const p=normalizeProfile(row);
  const b=await getBinding(env,pid);
  if(b.acesso){p.acesso=true;p.vinculo_equipe=b.equipe;p.vinculo_unidade=b.unidade;if(!row)p.fonte=b.equipe?'vinculo_equipe':'vinculo_unidade'}
  return p;
}

export function hasRegulacaoCapability(profile,capability){return REGULACAO_CAPABILITIES.includes(capability)&&!!(profile?.administrador||profile?.[capability])}
export async function getUserPermissions(env,user){const p=await getRegulacaoAccessProfile(env,user);return{regulacao_vagas:!!p.acesso}}
