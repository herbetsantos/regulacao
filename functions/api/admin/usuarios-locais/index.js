import { json,logAudit } from '../../_utils.js';
import { requireAdminAccess } from '../../_shared.js';
import { passwordDigest,principalId } from '../../_hybrid.js';

export async function onRequestPost({request,env}){
  const {user,error}=await requireAdminAccess(request,env);if(error)return error;let b;try{b=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const name=String(b.name||'').trim(),username=String(b.username||'').trim().toLowerCase(),temp=String(b.temporary_password||'');if(name.length<3||username.length<3)return json({error:'Informe nome e usuário válidos.'},400);if(temp.length<10)return json({error:'A senha temporária deve possuir pelo menos 10 caracteres.'},400);
  const exists=await env.DB_REGULACAO.prepare('SELECT 1 ok FROM regulacao_local_users WHERE lower(username)=lower(?)').bind(username).first();if(exists)return json({error:'Já existe uma credencial própria com este usuário.'},409);
  const id=crypto.randomUUID(),d=await passwordDigest(temp),actor=principalId(user);const minRow=await env.DB_REGULACAO.prepare('SELECT MIN(legacy_numeric_id) m FROM regulacao_local_users').first();const legacyId=Math.min(-1,Number(minRow?.m||0)-1);await env.DB_REGULACAO.prepare(`INSERT INTO regulacao_local_users(id,username,name,legacy_numeric_id,password_hash,password_salt,password_iterations,active,must_change_password,created_by_principal) VALUES(?,?,?,?,?,?,?,1,1,?)`).bind(id,username,name,legacyId,d.hash,d.salt,d.iterations,actor).run();
  await logAudit(env,user,'create','regulacao_local_user',id,{username,name});return json({ok:true,id,principal_id:`local:${id}`},201);
}
