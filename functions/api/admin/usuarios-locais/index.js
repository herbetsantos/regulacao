import { json,logAudit,upsertLocalPrincipal } from '../../_utils.js';
import { requireAdminAccess } from '../../_shared.js';
import { passwordDigest } from '../../_hybrid.js';

export async function onRequestGet({request,env}){
  const {error}=await requireAdminAccess(request,env);if(error)return error;
  const {results}=await env.DB_REGULACAO.prepare(`
    SELECT id,username,name,active,must_change_password,last_login_at,created_at
    FROM regulacao_local_users
    ORDER BY name,username
  `).all();
  return json({usuarios:results||[]});
}

export async function onRequestPost({request,env}){
  const {user,error}=await requireAdminAccess(request,env);if(error)return error;
  let body;try{body=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const name=String(body.name||'').trim();
  const username=String(body.username||'').trim().toLowerCase();
  const temp=String(body.temporary_password||'');
  if(name.length<3||username.length<3)return json({error:'Informe nome e usuário válidos.'},400);
  if(temp.length<10)return json({error:'A senha temporária deve possuir pelo menos 10 caracteres.'},400);
  const exists=await env.DB_REGULACAO.prepare('SELECT 1 ok FROM regulacao_local_users WHERE lower(username)=lower(?)').bind(username).first();
  if(exists)return json({error:'Já existe uma credencial interna com este usuário.'},409);

  const id=crypto.randomUUID();
  const digest=await passwordDigest(temp);
  const minRow=await env.DB_REGULACAO.prepare('SELECT MIN(legacy_numeric_id) m FROM regulacao_local_users').first();
  const legacyId=Math.min(-1,Number(minRow?.m||0)-1);
  const actor=user.principalId||null;
  await env.DB_REGULACAO.prepare(`
    INSERT INTO regulacao_local_users(
      id,username,name,legacy_numeric_id,password_hash,password_salt,password_iterations,
      active,must_change_password,created_by_principal
    ) VALUES(?,?,?,?,?,?,?,1,1,?)
  `).bind(id,username,name,legacyId,digest.hash,digest.salt,digest.iterations,actor).run();
  const localUser={id,username,name,active:1};
  const pid=await upsertLocalPrincipal(env,localUser);
  await env.DB_REGULACAO.prepare('INSERT OR IGNORE INTO regulacao_user_preferences(principal_id,theme) VALUES(?,?)').bind(pid,'light').run();
  await logAudit(env,user,'create','regulacao_local_user',id,{username,name});
  return json({ok:true,id,principal_id:pid},201);
}
