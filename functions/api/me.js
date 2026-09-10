import { json,getAuthUser } from './_utils.js';
import { getUserPermissions,getRegulacaoAccessProfile } from './_permissions.js';
export async function onRequestGet({request,env}){
  const user=await getAuthUser(request,env);if(!user)return json({error:'Não autenticado.'},401);
  const [permissions,regulacao]=await Promise.all([getUserPermissions(env,user),getRegulacaoAccessProfile(env,user)]);
  const pid=user.principalId||`portal:${user.id}`;
  const {results:teams}=await env.DB_REGULACAO.prepare(`SELECT e.id,e.nome FROM regulacao_principal_equipes pe JOIN regulacao_equipes e ON e.id=pe.equipe_id AND e.ativo=1 WHERE pe.principal_id=? ORDER BY e.nome`).bind(pid).all();
  let theme='light';try{theme=(await env.DB_REGULACAO.prepare('SELECT theme FROM regulacao_user_preferences WHERE principal_id=?').bind(pid).first())?.theme||'light'}catch{}
  return json({user:{...user,theme,permissions,regulacao,equipes:teams||[],equipe:(teams||[])[0]||null}});
}
