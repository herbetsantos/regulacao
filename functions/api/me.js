import { json, getAuthUser } from './_utils.js';
import { getUserPermissions, getRegulacaoAccessProfile } from './_permissions.js';
import { principalId } from './_hybrid.js';
export async function onRequestGet({request,env}){
  const user=await getAuthUser(request,env);if(!user)return json({error:'Não autenticado.'},401);
  const [permissions,regulacao]=await Promise.all([getUserPermissions(env,user),getRegulacaoAccessProfile(env,user)]);
  let equipes=[];
  try{
    const {results}=await env.DB_REGULACAO.prepare('SELECT equipe_id FROM regulacao_principal_equipes WHERE principal_id=? ORDER BY equipe_id').bind(principalId(user)).all();
    const ids=(results||[]).map(x=>Number(x.equipe_id)).filter(Boolean);
    if(ids.length){const ph=ids.map(()=>'?').join(',');const r=await env.DB.prepare(`SELECT id,nome FROM regulacao_equipes WHERE id IN (${ph}) AND ativo=1 ORDER BY nome`).bind(...ids).all();equipes=r.results||[]}
  }catch{}
  if(!equipes.length&&user.source==='portal'){try{const r=await env.DB.prepare(`SELECT DISTINCT e.id,e.nome FROM regulacao_equipe_profissionais ep JOIN regulacao_equipes e ON e.id=ep.equipe_id AND e.ativo=1 WHERE ep.user_id=? ORDER BY e.nome`).bind(user.id).all();equipes=r.results||[]}catch{}}
  let theme=user.theme||null;if(user.source==='portal'){try{const r=await env.DB.prepare('SELECT theme FROM users WHERE id=?').bind(user.id).first();theme=r?.theme||theme}catch{}}
  return json({user:{...user,theme,permissions,regulacao,equipes,equipe:equipes[0]||null}});
}
