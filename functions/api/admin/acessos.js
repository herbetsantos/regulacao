import { json,logAudit } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
import { principalId,parsePrincipalId } from '../_hybrid.js';
import { syncPortalRegulacaoFeature } from '../_permissions.js';

const MAX_IN_PARAMS=80;

async function principalDetails(env,pid){
  const p=parsePrincipalId(pid);if(!p)return null;
  if(p.source==='portal'){
    const u=await env.DB.prepare('SELECT id,username,name,role,active FROM users WHERE id=?').bind(Number(p.id)).first();
    if(!u)return null;return{source:'portal',source_id:String(u.id),username:u.username,name:u.name,portal_role:u.role,active:!!u.active};
  }
  const u=await env.DB_REGULACAO.prepare('SELECT id,username,name,active,must_change_password,last_login_at FROM regulacao_local_users WHERE id=?').bind(p.id).first();
  if(!u)return null;return{source:'local',source_id:u.id,username:u.username,name:u.name,portal_role:null,active:!!u.active,must_change_password:!!u.must_change_password,last_login_at:u.last_login_at};
}

async function selectIn(db,sqlTemplate,ids){
  const out=[];
  for(let i=0;i<ids.length;i+=MAX_IN_PARAMS){
    const part=ids.slice(i,i+MAX_IN_PARAMS);
    const sql=sqlTemplate.replace('__IDS__',part.map(()=>'?').join(','));
    const {results}=await db.prepare(sql).bind(...part).all();
    out.push(...(results||[]));
  }
  return out;
}

export async function onRequestGet({request,env}){
  const {error}=await requireAdminAccess(request,env);if(error)return error;
  const url=new URL(request.url);
  const q=String(url.searchParams.get('q')||'').trim().toLowerCase();
  const source=String(url.searchParams.get('source')||'');
  const funcao=String(url.searchParams.get('funcao')||'');
  const unidade=String(url.searchParams.get('unidade')||'');
  const includeRefs=url.searchParams.get('include_refs')!=='0';
  const requested=Number(url.searchParams.get('page_size')||20);
  const pageSize=[10,20,50,100].includes(requested)?requested:20;
  const page=Math.max(1,Number(url.searchParams.get('page')||1));
  const like=q?`%${q}%`:null;

  const accountJobs=[];
  if(source!=='local'){
    let sql='SELECT id,username,name,role,active FROM users WHERE active=1';
    const binds=[];
    if(q){sql+=' AND (lower(name) LIKE ? OR lower(username) LIKE ?)';binds.push(like,like)}
    sql+=' ORDER BY name';
    accountJobs.push(env.DB.prepare(sql).bind(...binds).all().then(r=>(r.results||[]).map(u=>({source:'portal',source_id:String(u.id),username:u.username,name:u.name,portal_role:u.role,active:true,principal_id:`portal:${u.id}`}))));
  }
  if(source!=='portal'){
    let sql='SELECT id,username,name,active,must_change_password,last_login_at FROM regulacao_local_users WHERE 1=1';
    const binds=[];
    if(q){sql+=' AND (lower(name) LIKE ? OR lower(username) LIKE ?)';binds.push(like,like)}
    sql+=' ORDER BY name';
    accountJobs.push(env.DB_REGULACAO.prepare(sql).bind(...binds).all().then(r=>(r.results||[]).map(u=>({source:'local',source_id:u.id,username:u.username,name:u.name,portal_role:null,active:!!u.active,must_change_password:!!u.must_change_password,last_login_at:u.last_login_at,principal_id:`local:${u.id}`}))));
  }

  const accountGroups=await Promise.all(accountJobs);
  const accounts=accountGroups.flat();
  const pids=accounts.map(x=>x.principal_id);

  let accessRows=[],unitRows=[],teamRows=[];
  if(pids.length){
    [accessRows,unitRows,teamRows]=await Promise.all([
      selectIn(env.DB_REGULACAO,'SELECT principal_id,cadastrante,regulador,organizador,executor,gestor,administrador,active FROM regulacao_principal_acessos WHERE principal_id IN (__IDS__)',pids),
      selectIn(env.DB_REGULACAO,'SELECT principal_id,unidade_code,pode_emitir,pode_executar FROM regulacao_principal_unidades WHERE principal_id IN (__IDS__) ORDER BY unidade_code',pids),
      selectIn(env.DB_REGULACAO,'SELECT principal_id,equipe_id FROM regulacao_principal_equipes WHERE principal_id IN (__IDS__)',pids),
    ]);
  }

  const accessMap=new Map(accessRows.map(x=>[x.principal_id,x]));
  const teamMap=new Map();for(const x of teamRows){if(!teamMap.has(x.principal_id))teamMap.set(x.principal_id,[]);teamMap.get(x.principal_id).push(Number(x.equipe_id))}
  const unitsMap=new Map();
  for(const row of unitRows){if(!unitsMap.has(row.principal_id))unitsMap.set(row.principal_id,[]);unitsMap.get(row.principal_id).push({unidade_code:row.unidade_code,pode_emitir:row.pode_emitir,pode_executar:row.pode_executar})}

  let list=accounts.map(base=>{
    const a=accessMap.get(base.principal_id);
    return{
      ...base,
      cadastrante:!!a?.cadastrante,
      regulador:!!a?.regulador,
      organizador:!!a?.organizador,
      executor:!!a?.executor,
      gestor:!!a?.gestor,
      administrador:base.source==='portal'&&base.portal_role==='super_admin'?true:!!a?.administrador,
      access_active:a?!!a.active:true,
      unidades:unitsMap.get(base.principal_id)||[],
      equipe_ids:teamMap.get(base.principal_id)||[],
      equipe_id:(teamMap.get(base.principal_id)||[])[0]??null,
    };
  });

  if(funcao)list=list.filter(x=>funcao==='sem_funcao'?!(x.cadastrante||x.regulador||x.organizador||x.executor||x.gestor||x.administrador):!!x[funcao]);
  if(unidade)list=list.filter(x=>x.unidades.some(u=>u.unidade_code===unidade));

  const total=list.length,pages=total?Math.ceil(total/pageSize):0,safePage=pages?Math.min(page,pages):1,start=(safePage-1)*pageSize;
  const acessos=list.slice(start,start+pageSize);

  let unidades=[],equipes=[];
  if(includeRefs){
    const [unitsResp,teamsResp]=await Promise.all([
      env.DB.prepare('SELECT code,nome,tipo FROM unidades WHERE ativo=1 ORDER BY nome').all(),
      env.DB.prepare('SELECT id,nome FROM regulacao_equipes WHERE ativo=1 ORDER BY nome').all(),
    ]);
    unidades=unitsResp.results||[];equipes=teamsResp.results||[];
  }

  return json({acessos,pagination:{page:safePage,page_size:pageSize,total,pages},unidades,equipes,refs_included:includeRefs});
}

export async function onRequestPost({request,env}){
  const {user,error}=await requireAdminAccess(request,env);if(error)return error;let b;try{b=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const pid=String(b.principal_id||''),target=await principalDetails(env,pid);if(!target)return json({error:'Usuário não encontrado.'},404);
  const isSuperActor=user.source==='portal'&&user.role==='super_admin';const atual=await env.DB_REGULACAO.prepare('SELECT administrador FROM regulacao_principal_acessos WHERE principal_id=?').bind(pid).first();const adminAtual=target.source==='portal'&&target.portal_role==='super_admin'?true:!!atual?.administrador;const adminDesejado=!!b.administrador;if(adminAtual!==adminDesejado&&!isSuperActor)return json({error:'Somente o Super Administrador do Portal APS pode conceder ou revogar a responsabilidade Administrador.'},403);
  const actor=principalId(user),roles={cadastrante:b.cadastrante?1:0,regulador:b.regulador?1:0,organizador:b.organizador?1:0,executor:b.executor?1:0,gestor:b.gestor?1:0,administrador:b.administrador?1:0};
  await env.DB_REGULACAO.prepare(`INSERT INTO regulacao_principal_acessos(principal_id,cadastrante,regulador,organizador,executor,gestor,administrador,active,updated_by_principal,updated_at) VALUES(?,?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(principal_id) DO UPDATE SET cadastrante=excluded.cadastrante,regulador=excluded.regulador,organizador=excluded.organizador,executor=excluded.executor,gestor=excluded.gestor,administrador=excluded.administrador,active=excluded.active,updated_by_principal=excluded.updated_by_principal,updated_at=datetime('now')`).bind(pid,roles.cadastrante,roles.regulador,roles.organizador,roles.executor,roles.gestor,roles.administrador,b.access_active===false?0:1,actor).run();
  const ops=[env.DB_REGULACAO.prepare('DELETE FROM regulacao_principal_unidades WHERE principal_id=?').bind(pid),env.DB_REGULACAO.prepare('DELETE FROM regulacao_principal_equipes WHERE principal_id=?').bind(pid)];
  for(const x of Array.isArray(b.unidades)?b.unidades:[]){if(!x?.unidade_code)continue;ops.push(env.DB_REGULACAO.prepare('INSERT INTO regulacao_principal_unidades(principal_id,unidade_code,pode_emitir,pode_executar,updated_by_principal) VALUES(?,?,?,?,?)').bind(pid,String(x.unidade_code),x.pode_emitir?1:0,x.pode_executar?1:0,actor))}
  const equipeIds=[...new Set((Array.isArray(b.equipe_ids)?b.equipe_ids:(b.equipe_id?[b.equipe_id]:[])).map(Number).filter(Boolean))];
  for(const equipeId of equipeIds)ops.push(env.DB_REGULACAO.prepare('INSERT INTO regulacao_principal_equipes(principal_id,equipe_id,updated_by_principal) VALUES(?,?,?)').bind(pid,equipeId,actor));
  await env.DB_REGULACAO.batch(ops);
  if(target.source==='local'&&b.user_active!==undefined){await env.DB_REGULACAO.prepare("UPDATE regulacao_local_users SET active=?,updated_at=datetime('now') WHERE id=?").bind(b.user_active?1:0,target.source_id).run();if(!b.user_active)await env.DB_REGULACAO.prepare('DELETE FROM regulacao_local_sessions WHERE local_user_id=?').bind(target.source_id).run()}
  if(target.source==='portal')await syncPortalRegulacaoFeature(env,{id:Number(target.source_id),source:'portal'});
  await logAudit(env,user,'update','regulacao_principal_acessos',pid,{...roles,equipe_ids:equipeIds,unidades:b.unidades});return json({ok:true});
}
