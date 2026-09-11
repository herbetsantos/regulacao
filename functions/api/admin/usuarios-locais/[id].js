import { json,logAudit } from '../../_utils.js';
import { requireAdminAccess } from '../../_shared.js';
import { passwordDigest } from '../../_hybrid.js';

export async function onRequestPut({request,env,params}){
  const {user,error}=await requireAdminAccess(request,env);if(error)return error;
  const id=String(params.id||'');
  const target=await env.DB_REGULACAO.prepare('SELECT id,username,name,active FROM regulacao_local_users WHERE id=?').bind(id).first();
  if(!target)return json({error:'Usuário interno não encontrado.'},404);
  let body;try{body=await request.json()}catch{return json({error:'JSON inválido.'},400)}

  const ops=[];
  if(body.active!==undefined){
    const active=body.active?1:0;
    ops.push(env.DB_REGULACAO.prepare("UPDATE regulacao_local_users SET active=?,updated_at=datetime('now') WHERE id=?").bind(active,id));
    ops.push(env.DB_REGULACAO.prepare("UPDATE regulacao_principals SET active=?,last_seen_at=datetime('now') WHERE principal_id=?").bind(active,`local:${id}`));
    if(!active)ops.push(env.DB_REGULACAO.prepare('DELETE FROM regulacao_auth_sessions WHERE principal_id=?').bind(`local:${id}`));
  }
  if(body.name){
    const name=String(body.name).trim();
    if(name.length<3)return json({error:'Informe um nome válido.'},400);
    ops.push(env.DB_REGULACAO.prepare("UPDATE regulacao_local_users SET name=?,updated_at=datetime('now') WHERE id=?").bind(name,id));
    ops.push(env.DB_REGULACAO.prepare("UPDATE regulacao_principals SET name=?,last_seen_at=datetime('now') WHERE principal_id=?").bind(name,`local:${id}`));
  }
  if(body.temporary_password){
    const temp=String(body.temporary_password);
    if(temp.length<10)return json({error:'A senha temporária deve possuir pelo menos 10 caracteres.'},400);
    const digest=await passwordDigest(temp);
    ops.push(env.DB_REGULACAO.prepare("UPDATE regulacao_local_users SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=1,updated_at=datetime('now') WHERE id=?").bind(digest.hash,digest.salt,digest.iterations,id));
    ops.push(env.DB_REGULACAO.prepare('DELETE FROM regulacao_auth_sessions WHERE principal_id=?').bind(`local:${id}`));
  }
  if(ops.length)await env.DB_REGULACAO.batch(ops);
  await logAudit(env,user,'update','regulacao_local_user',id,{active:body.active,name:body.name,reset:!!body.temporary_password});
  return json({ok:true});
}
