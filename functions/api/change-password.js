import { json,getAuthUser,getCookie,logAudit } from './_utils.js';
import { passwordMatches,passwordDigest } from './_hybrid.js';

export async function onRequestPost({request,env}) {
  const user=await getAuthUser(request,env);
  if(!user)return json({error:'Não autenticado.'},401);
  if(user.source!=='local')return json({error:'A senha desta conta é gerenciada pelo Apoio APS Cajamar.',codigo:'SENHA_GERENCIADA_PELO_PORTAL'},409);

  let body;
  try{body=await request.json()}catch{return json({error:'Requisição inválida.'},400)}
  const currentPassword=String(body.currentPassword||'');
  const newPassword=String(body.newPassword||'');
  if(!currentPassword||!newPassword)return json({error:'Informe a senha atual e a nova senha.'},400);
  if(newPassword.length<10)return json({error:'A nova senha deve ter pelo menos 10 caracteres.'},400);
  if(currentPassword===newPassword)return json({error:'A nova senha deve ser diferente da senha atual.'},400);

  const row=await env.DB_REGULACAO.prepare('SELECT * FROM regulacao_local_users WHERE id=?').bind(user.localUserId).first();
  if(!row||!await passwordMatches(currentPassword,row))return json({error:'Senha atual incorreta.'},401);
  const digest=await passwordDigest(newPassword);
  await env.DB_REGULACAO.prepare(
    "UPDATE regulacao_local_users SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=0,updated_at=datetime('now') WHERE id=?"
  ).bind(digest.hash,digest.salt,digest.iterations,user.localUserId).run();

  const token=getCookie(request,'emulti_session');
  await env.DB_REGULACAO.prepare('DELETE FROM regulacao_auth_sessions WHERE principal_id=? AND token<>?').bind(user.principalId,token||'').run();
  await logAudit(env,user,'change_password','regulacao_local_user',user.localUserId,'Usuário alterou a própria senha.');
  return json({ok:true});
}
