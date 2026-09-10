import { json,logAudit } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';

const MAX_IN_PARAMS=80;
async function selectIn(db,sqlTemplate,ids){const out=[];for(let i=0;i<ids.length;i+=MAX_IN_PARAMS){const part=ids.slice(i,i+MAX_IN_PARAMS);const sql=sqlTemplate.replace('__IDS__',part.map(()=>'?').join(','));const{results}=await db.prepare(sql).bind(...part).all();out.push(...(results||[]))}return out}
async function principalDetails(env,pid){return env.DB_REGULACAO.prepare('SELECT principal_id,portal_user_id,username,name,portal_role,active FROM regulacao_principals WHERE principal_id=?').bind(pid).first()}

export async function onRequestGet({request,env}){
  const {error}=await requireAdminAccess(request,env);if(error)return error;
  const url=new URL(request.url),q=String(url.searchParams.get('q')||'').trim().toLowerCase(),funcao=String(url.searchParams.get('funcao')||''),unidade=String(url.searchParams.get('unidade')||''),includeRefs=url.searchParams.get('include_refs')!=='0';
  const requested=Number(url.searchParams.get('page_size')||20),pageSize=[10,20,50,100].includes(requested)?requested:20,page=Math.max(1,Number(url.searchParams.get('page')||1));
  let sql='SELECT principal_id,portal_user_id,username,name,portal_role,active FROM regulacao_principals WHERE active=1',binds=[];
  if(q){sql+=' AND (lower(name) LIKE ? OR lower(COALESCE(username,\'\')) LIKE ?)';const like=`%${q}%`;binds.push(like,like)}sql+=' ORDER BY name';
  const {results:accounts}=await env.DB_REGULACAO.prepare(sql).bind(...binds).all();const pids=(accounts||[]).map(x=>x.principal_id);
  let accessRows=[],unitRows=[],teamRows=[],superRows=[];
  if(pids.length){[accessRows,unitRows,teamRows,superRows]=await Promise.all([
    selectIn(env.DB_REGULACAO,'SELECT principal_id,cadastrante,regulador,organizador,executor,gestor,administrador,active FROM regulacao_principal_acessos WHERE principal_id IN (__IDS__)',pids),
    selectIn(env.DB_REGULACAO,'SELECT principal_id,unidade_code,pode_emitir,pode_executar FROM regulacao_principal_unidades WHERE principal_id IN (__IDS__) ORDER BY unidade_code',pids),
    selectIn(env.DB_REGULACAO,'SELECT principal_id,equipe_id FROM regulacao_principal_equipes WHERE principal_id IN (__IDS__)',pids),
    selectIn(env.DB_REGULACAO,'SELECT principal_id FROM regulacao_superusers WHERE principal_id IN (__IDS__)',pids),
  ])}
  const accessMap=new Map(accessRows.map(x=>[x.principal_id,x])),superSet=new Set(superRows.map(x=>x.principal_id)),teamMap=new Map(),unitsMap=new Map();
  for(const x of teamRows){if(!teamMap.has(x.principal_id))teamMap.set(x.principal_id,[]);teamMap.get(x.principal_id).push(Number(x.equipe_id))}
  for(const x of unitRows){if(!unitsMap.has(x.principal_id))unitsMap.set(x.principal_id,[]);unitsMap.get(x.principal_id).push({unidade_code:x.unidade_code,pode_emitir:x.pode_emitir,pode_executar:x.pode_executar})}
  let list=(accounts||[]).map(base=>{const a=accessMap.get(base.principal_id),teams=teamMap.get(base.principal_id)||[];return{source:'portal',source_id:String(base.portal_user_id||''),principal_id:base.principal_id,username:base.username,name:base.name,portal_role:base.portal_role,active:!!base.active,superuser:superSet.has(base.principal_id),cadastrante:!!a?.cadastrante,regulador:!!a?.regulador,organizador:!!a?.organizador,executor:!!a?.executor,gestor:!!a?.gestor,administrador:!!a?.administrador,access_active:a?!!a.active:true,unidades:unitsMap.get(base.principal_id)||[],equipe_ids:teams,equipe_id:teams[0]??null}});
  if(funcao)list=list.filter(x=>funcao==='sem_funcao'?!(x.superuser||x.cadastrante||x.regulador||x.organizador||x.executor||x.gestor||x.administrador):!!x[funcao]);if(unidade)list=list.filter(x=>x.unidades.some(u=>u.unidade_code===unidade));
  const total=list.length,pages=total?Math.ceil(total/pageSize):0,safePage=pages?Math.min(page,pages):1,start=(safePage-1)*pageSize,acessos=list.slice(start,start+pageSize);
  let unidades=[],equipes=[];if(includeRefs){const[u,t]=await Promise.all([env.DB_REGULACAO.prepare('SELECT code,nome,tipo FROM regulacao_unidades WHERE ativo=1 ORDER BY nome').all(),env.DB_REGULACAO.prepare('SELECT id,nome FROM regulacao_equipes WHERE ativo=1 ORDER BY nome').all()]);unidades=u.results||[];equipes=t.results||[]}
  return json({acessos,pagination:{page:safePage,page_size:pageSize,total,pages},unidades,equipes,refs_included:includeRefs,identity_source:'Portal APS (somente autenticação)'});
}

export async function onRequestPost({request,env}){
  const {user,error}=await requireAdminAccess(request,env);if(error)return error;let b;try{b=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const pid=String(b.principal_id||''),target=await principalDetails(env,pid);if(!target)return json({error:'Usuário ainda não conhecido pela Regulação. Peça para ele acessar o eMulti pelo Portal uma vez ou execute a importação inicial.'},404);
  const actor=user.principalId||`portal:${user.id}`;
  const [atual,superAtualRow]=await Promise.all([
    env.DB_REGULACAO.prepare('SELECT administrador FROM regulacao_principal_acessos WHERE principal_id=?').bind(pid).first(),
    env.DB_REGULACAO.prepare('SELECT principal_id FROM regulacao_superusers WHERE principal_id=?').bind(pid).first(),
  ]);
  const adminAtual=!!atual?.administrador,adminDesejado=!!b.administrador;
  if(adminAtual!==adminDesejado&&!user.isSuperAdmin)return json({error:'Somente o Superusuário da Regulação pode conceder ou revogar a responsabilidade Administrador.'},403);

  const superAtual=!!superAtualRow,superDesejado=b.superuser==null?superAtual:!!b.superuser;
  if(superAtual!==superDesejado&&!user.isSuperAdmin)return json({error:'Somente um Superusuário da Regulação pode alterar esse nível de acesso.'},403);
  if(superAtual&&!superDesejado){
    const total=(await env.DB_REGULACAO.prepare('SELECT COUNT(*) total FROM regulacao_superusers').first())?.total||0;
    if(Number(total)<=1)return json({error:'Não é permitido remover o último Superusuário da Regulação.'},409);
  }

  const roles={cadastrante:b.cadastrante?1:0,regulador:b.regulador?1:0,organizador:b.organizador?1:0,executor:b.executor?1:0,gestor:b.gestor?1:0,administrador:b.administrador?1:0};
  await env.DB_REGULACAO.prepare(`INSERT INTO regulacao_principal_acessos(principal_id,cadastrante,regulador,organizador,executor,gestor,administrador,active,updated_by_principal,updated_at) VALUES(?,?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(principal_id) DO UPDATE SET cadastrante=excluded.cadastrante,regulador=excluded.regulador,organizador=excluded.organizador,executor=excluded.executor,gestor=excluded.gestor,administrador=excluded.administrador,active=excluded.active,updated_by_principal=excluded.updated_by_principal,updated_at=datetime('now')`).bind(pid,roles.cadastrante,roles.regulador,roles.organizador,roles.executor,roles.gestor,roles.administrador,b.access_active===false?0:1,actor).run();

  const ops=[env.DB_REGULACAO.prepare('DELETE FROM regulacao_principal_unidades WHERE principal_id=?').bind(pid),env.DB_REGULACAO.prepare('DELETE FROM regulacao_principal_equipes WHERE principal_id=?').bind(pid)];
  for(const x of Array.isArray(b.unidades)?b.unidades:[]){if(!x?.unidade_code)continue;ops.push(env.DB_REGULACAO.prepare('INSERT INTO regulacao_principal_unidades(principal_id,unidade_code,pode_emitir,pode_executar,updated_by_principal) VALUES(?,?,?,?,?)').bind(pid,String(x.unidade_code),x.pode_emitir?1:0,x.pode_executar?1:0,actor))}
  const equipeIds=[...new Set((Array.isArray(b.equipe_ids)?b.equipe_ids:(b.equipe_id?[b.equipe_id]:[])).map(Number).filter(Boolean))];for(const equipeId of equipeIds)ops.push(env.DB_REGULACAO.prepare('INSERT INTO regulacao_principal_equipes(principal_id,equipe_id,updated_by_principal) VALUES(?,?,?)').bind(pid,equipeId,actor));await env.DB_REGULACAO.batch(ops);

  if(superAtual!==superDesejado){
    if(superDesejado)await env.DB_REGULACAO.prepare('INSERT OR IGNORE INTO regulacao_superusers(principal_id,granted_by_principal) VALUES(?,?)').bind(pid,actor).run();
    else await env.DB_REGULACAO.prepare('DELETE FROM regulacao_superusers WHERE principal_id=?').bind(pid).run();
  }

  await logAudit(env,user,'update','regulacao_principal_acessos',pid,{...roles,superuser:superDesejado,equipe_ids:equipeIds,unidades:b.unidades});return json({ok:true});
}
