import { json, getAuthUser } from './_utils.js';
import { getUserPermissions, getRegulacaoAccessProfile } from './_permissions.js';
import { principalId } from './_hybrid.js';
export async function onRequestGet({request,env}){
  const user=await getAuthUser(request,env);if(!user)return json({error:'Não autenticado.'},401);
  const [permissions,regulacao]=await Promise.all([getUserPermissions(env,user),getRegulacaoAccessProfile(env,user)]);
  let equipe=null;try{const pe=await env.DB_REGULACAO.prepare('SELECT equipe_id FROM regulacao_principal_equipes WHERE principal_id=?').bind(principalId(user)).first();if(pe?.equipe_id)equipe=await env.DB.prepare('SELECT id,nome FROM regulacao_equipes WHERE id=? AND ativo=1').bind(pe.equipe_id).first()}catch{}
  if(!equipe&&user.source==='portal'){try{equipe=await env.DB.prepare(`SELECT e.id,e.nome FROM regulacao_equipe_profissionais ep JOIN regulacao_equipes e ON e.id=ep.equipe_id AND e.ativo=1 WHERE ep.user_id=? LIMIT 1`).bind(user.id).first()}catch{}}
  let theme=user.theme||null;if(user.source==='portal'){try{const r=await env.DB.prepare('SELECT theme FROM users WHERE id=?').bind(user.id).first();theme=r?.theme||theme}catch{}}
  return json({user:{...user,theme,permissions,regulacao,equipe:equipe?{id:equipe.id,nome:equipe.nome}:null}});
}
