import { json,logAudit } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
import { principalId,parsePrincipalId,syncLegacyAccessModel } from '../_hybrid.js';
import { syncPortalRegulacaoFeature } from '../_permissions.js';

async function principalDetails(env,pid){
  const p=parsePrincipalId(pid);if(!p)return null;
  if(p.source==='portal'){
    const u=await env.DB.prepare('SELECT id,username,name,role,active FROM users WHERE id=?').bind(Number(p.id)).first();
    if(!u)return null;return{source:'portal',source_id:String(u.id),username:u.username,name:u.name,portal_role:u.role,active:!!u.active};
  }
  const u=await env.DB_REGULACAO.prepare('SELECT id,username,name,active,must_change_password,last_login_at FROM regulacao_local_users WHERE id=?').bind(p.id).first();
  if(!u)return null;return{source:'local',source_id:u.id,username:u.username,name:u.name,portal_role:null,active:!!u.active,must_change_password:!!u.must_change_password,last_login_at:u.last_login_at};
}
async function fullRow(env,pid,base){
  const a=await env.DB_REGULACAO.prepare('SELECT cadastrante,regulador,executor,administrador,active FROM regulacao_principal_acessos WHERE principal_id=?').bind(pid).first();
  const {results:units}=await env.DB_REGULACAO.prepare('SELECT unidade_code,pode_emitir,pode_executar FROM regulacao_principal_unidades WHERE principal_id=? ORDER BY unidade_code').bind(pid).all();
  const team=await env.DB_REGULACAO.prepare('SELECT equipe_id FROM regulacao_principal_equipes WHERE principal_id=?').bind(pid).first();
  return{principal_id:pid,...base,cadastrante:!!a?.cadastrante,regulador:!!a?.regulador,executor:!!a?.executor,administrador:base.source==='portal'&&base.portal_role==='super_admin'?true:!!a?.administrador,access_active:a?!!a.active:true,unidades:units||[],equipe_id:team?.equipe_id??null};
}

export async function onRequestGet({request,env}){
  const {error}=await requireAdminAccess(request,env);if(error)return error;try{await syncLegacyAccessModel(env)}catch{}
  const url=new URL(request.url),q=String(url.searchParams.get('q')||'').trim().toLowerCase(),source=String(url.searchParams.get('source')||''),funcao=String(url.searchParams.get('funcao')||''),unidade=String(url.searchParams.get('unidade')||'');
  const requested=Number(url.searchParams.get('page_size')||20),pageSize=[10,20,50,100].includes(requested)?requested:20,page=Math.max(1,Number(url.searchParams.get('page')||1));
  const list=[];
  const {results:portal}=await env.DB.prepare('SELECT id,username,name,role,active FROM users WHERE active=1 ORDER BY name').all();
  for(const u of portal||[])list.push(await fullRow(env,`portal:${u.id}`,{source:'portal',source_id:String(u.id),username:u.username,name:u.name,portal_role:u.role,active:true}));
  const {results:locals}=await env.DB_REGULACAO.prepare('SELECT id,username,name,active,must_change_password,last_login_at FROM regulacao_local_users ORDER BY name').all();
  for(const u of locals||[])list.push(await fullRow(env,`local:${u.id}`,{source:'local',source_id:u.id,username:u.username,name:u.name,portal_role:null,active:!!u.active,must_change_password:!!u.must_change_password,last_login_at:u.last_login_at}));
  let filtered=list.filter(x=>!source||x.source===source).filter(x=>!q||x.name.toLowerCase().includes(q)||x.username.toLowerCase().includes(q));
  if(funcao){filtered=filtered.filter(x=>funcao==='sem_funcao'?!(x.cadastrante||x.regulador||x.executor||x.administrador):!!x[funcao])}
  if(unidade)filtered=filtered.filter(x=>x.unidades.some(u=>u.unidade_code===unidade));
  const total=filtered.length,pages=total?Math.ceil(total/pageSize):0,safePage=pages?Math.min(page,pages):1,start=(safePage-1)*pageSize;filtered=filtered.slice(start,start+pageSize);
  const [unitsResp,teamsResp]=await Promise.all([env.DB.prepare('SELECT code,nome,tipo FROM unidades WHERE ativo=1 ORDER BY nome').all(),env.DB.prepare('SELECT id,nome FROM regulacao_equipes WHERE ativo=1 ORDER BY nome').all()]);
  return json({acessos:filtered,pagination:{page:safePage,page_size:pageSize,total,pages},unidades:unitsResp.results||[],equipes:teamsResp.results||[]});
}

export async function onRequestPost({request,env}){
  const {user,error}=await requireAdminAccess(request,env);if(error)return error;let b;try{b=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const pid=String(b.principal_id||''),target=await principalDetails(env,pid);if(!target)return json({error:'Usuário não encontrado.'},404);
  const isSuperActor=user.source==='portal'&&user.role==='super_admin';if(b.administrador&&!(target.source==='portal'&&target.portal_role==='super_admin')&&!isSuperActor)return json({error:'Somente o Super Administrador do Portal APS pode conceder a responsabilidade Administrador.'},403);
  const actor=principalId(user),roles={cadastrante:b.cadastrante?1:0,regulador:b.regulador?1:0,executor:b.executor?1:0,administrador:b.administrador?1:0};
  await env.DB_REGULACAO.prepare(`INSERT INTO regulacao_principal_acessos(principal_id,cadastrante,regulador,executor,administrador,active,updated_by_principal,updated_at) VALUES(?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(principal_id) DO UPDATE SET cadastrante=excluded.cadastrante,regulador=excluded.regulador,executor=excluded.executor,administrador=excluded.administrador,active=excluded.active,updated_by_principal=excluded.updated_by_principal,updated_at=datetime('now')`).bind(pid,roles.cadastrante,roles.regulador,roles.executor,roles.administrador,b.access_active===false?0:1,actor).run();
  const ops=[env.DB_REGULACAO.prepare('DELETE FROM regulacao_principal_unidades WHERE principal_id=?').bind(pid),env.DB_REGULACAO.prepare('DELETE FROM regulacao_principal_equipes WHERE principal_id=?').bind(pid)];
  for(const x of Array.isArray(b.unidades)?b.unidades:[]){if(!x?.unidade_code)continue;ops.push(env.DB_REGULACAO.prepare('INSERT INTO regulacao_principal_unidades(principal_id,unidade_code,pode_emitir,pode_executar,updated_by_principal) VALUES(?,?,?,?,?)').bind(pid,String(x.unidade_code),x.pode_emitir?1:0,x.pode_executar?1:0,actor))}
  if(b.equipe_id)ops.push(env.DB_REGULACAO.prepare('INSERT INTO regulacao_principal_equipes(principal_id,equipe_id,updated_by_principal) VALUES(?,?,?)').bind(pid,Number(b.equipe_id),actor));await env.DB_REGULACAO.batch(ops);
  if(target.source==='local'&&b.user_active!==undefined){await env.DB_REGULACAO.prepare("UPDATE regulacao_local_users SET active=?,updated_at=datetime('now') WHERE id=?").bind(b.user_active?1:0,target.source_id).run();if(!b.user_active)await env.DB_REGULACAO.prepare('DELETE FROM regulacao_local_sessions WHERE local_user_id=?').bind(target.source_id).run()}
  if(target.source==='portal')await syncPortalRegulacaoFeature(env,{id:Number(target.source_id),source:'portal'});
  await logAudit(env,user,'update','regulacao_principal_acessos',pid,{...roles,equipe_id:b.equipe_id,unidades:b.unidades});return json({ok:true});
}
