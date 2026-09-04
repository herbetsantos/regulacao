import { json,getAuthUser,getCookie,logAudit } from './_utils.js';
import { passwordMatches,passwordDigest } from './_hybrid.js';

function bufToHex(buf){return[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function hexToBuf(hex){const bytes=new Uint8Array(hex.length/2);for(let i=0;i<hex.length;i+=2)bytes[i/2]=parseInt(hex.substr(i,2),16);return bytes}
function randomHex(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return bufToHex(a.buffer)}
async function portalHash(password,saltHex){const enc=new TextEncoder();const key=await crypto.subtle.importKey('raw',enc.encode(password),{name:'PBKDF2'},false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:hexToBuf(saltHex),iterations:100000,hash:'SHA-256'},key,256);return bufToHex(bits)}
async function portalVerify(password,salt,expected){const c=await portalHash(password,salt);if(c.length!==expected.length)return false;let d=0;for(let i=0;i<c.length;i++)d|=c.charCodeAt(i)^expected.charCodeAt(i);return d===0}

export async function onRequestPost({request,env}){
  const user=await getAuthUser(request,env);if(!user)return json({error:'Não autenticado.'},401);let body;try{body=await request.json()}catch{return json({error:'Requisição inválida.'},400)}
  const currentPassword=String(body.currentPassword||''),newPassword=String(body.newPassword||'');if(!currentPassword||!newPassword)return json({error:'Informe a senha atual e a nova senha.'},400);const minLen=user.source==='local'?10:8;if(newPassword.length<minLen)return json({error:`A nova senha deve ter pelo menos ${minLen} caracteres.`},400);if(currentPassword===newPassword)return json({error:'A nova senha deve ser diferente da senha atual.'},400);
  if(user.source==='local'){
    const row=await env.DB_REGULACAO.prepare('SELECT * FROM regulacao_local_users WHERE id=?').bind(user.localUserId).first();if(!row||!await passwordMatches(currentPassword,row))return json({error:'Senha atual incorreta.'},401);const d=await passwordDigest(newPassword);await env.DB_REGULACAO.prepare("UPDATE regulacao_local_users SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=0,updated_at=datetime('now') WHERE id=?").bind(d.hash,d.salt,d.iterations,user.localUserId).run();const token=getCookie(request,'emulti_local_session');await env.DB_REGULACAO.prepare('DELETE FROM regulacao_local_sessions WHERE local_user_id=? AND token<>?').bind(user.localUserId,token||'').run();await logAudit(env,user,'change_password','local_user',user.localUserId,'Usuário alterou a própria senha.');return json({ok:true});
  }
  const row=await env.DB.prepare('SELECT password_hash,salt FROM users WHERE id=?').bind(user.id).first();if(!row)return json({error:'Usuário não encontrado.'},404);if(!await portalVerify(currentPassword,row.salt,row.password_hash))return json({error:'Senha atual incorreta.'},401);const salt=randomHex(16),hash=await portalHash(newPassword,salt);await env.DB.prepare('UPDATE users SET password_hash=?,salt=?,must_change_password=0 WHERE id=?').bind(hash,salt,user.id).run();const token=getCookie(request,'session');await env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').bind(user.id,token||'').run();await logAudit(env,user,'change_password','user',user.id,'Usuário alterou a própria senha pelo eMulti.');return json({ok:true});
}
