import { json,logAudit } from '../../_utils.js';
import { requireGestorAccess } from '../../_shared.js';

const MAX_IN_PARAMS=80;
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
  const {error}=await requireGestorAccess(request,env);if(error)return error;
  const url=new URL(request.url),q=String(url.searchParams.get('q')||'').trim().toLowerCase(),unidade=String(url.searchParams.get('unidade')||''),especialidade=Number(url.searchParams.get('especialidade')||0),equipe=Number(url.searchParams.get('equipe')||0);
  const includeRefs=url.searchParams.get('include_refs')!=='0';
  const requested=Number(url.searchParams.get('page_size')||20),pageSize=[10,20,50,100].includes(requested)?requested:20,page=Math.max(1,Number(url.searchParams.get('page')||1));
  const where=['p.ativo=1'],binds=[];
  if(q){where.push('(lower(p.nome) LIKE ? OR lower(COALESCE(p.registro_profissional,\'\')) LIKE ?)');binds.push(`%${q}%`,`%${q}%`)}
  if(equipe){where.push('EXISTS(SELECT 1 FROM regulacao_profissional_equipes pe WHERE pe.profissional_id=p.id AND pe.equipe_id=?)');binds.push(equipe)}
  if(unidade){where.push('EXISTS(SELECT 1 FROM regulacao_profissional_vinculos v WHERE v.profissional_id=p.id AND v.ativo=1 AND v.unidade_code=?)');binds.push(unidade)}
  if(especialidade){where.push('EXISTS(SELECT 1 FROM regulacao_profissional_vinculos v WHERE v.profissional_id=p.id AND v.ativo=1 AND v.especialidade_id=?)');binds.push(especialidade)}
  const ws='WHERE '+where.join(' AND ');
  const requestedOffset=(page-1)*pageSize;
  let [count,rowsResp]=await Promise.all([
    env.DB_REGULACAO.prepare(`SELECT COUNT(*) total FROM regulacao_profissionais p ${ws}`).bind(...binds).first(),
    env.DB_REGULACAO.prepare(`SELECT p.* FROM regulacao_profissionais p ${ws} ORDER BY p.nome LIMIT ? OFFSET ?`).bind(...binds,pageSize,requestedOffset).all(),
  ]);
  const total=Number(count?.total||0),pages=total?Math.ceil(total/pageSize):0,safePage=pages?Math.min(page,pages):1;
  if(pages&&safePage!==page){
    rowsResp=await env.DB_REGULACAO.prepare(`SELECT p.* FROM regulacao_profissionais p ${ws} ORDER BY p.nome LIMIT ? OFFSET ?`).bind(...binds,pageSize,(safePage-1)*pageSize).all();
  }
  const profRows=rowsResp.results||[];
  const ids=profRows.map(p=>p.id);
  const links=ids.length?await selectIn(env.DB_REGULACAO,`SELECT v.id,v.profissional_id,v.unidade_code,v.unidade_nome_snapshot,v.especialidade_id,v.carga_horaria_semanal,v.ativo,e.nome especialidade_nome FROM regulacao_profissional_vinculos v JOIN especialidades e ON e.id=v.especialidade_id WHERE v.profissional_id IN (__IDS__) ORDER BY v.profissional_id,e.nome,v.unidade_nome_snapshot`,ids):[];
  const linksMap=new Map();for(const v of links){if(!linksMap.has(v.profissional_id))linksMap.set(v.profissional_id,[]);linksMap.get(v.profissional_id).push(v)}
  const teamLinks=ids.length?await selectIn(env.DB_REGULACAO,`SELECT profissional_id,equipe_id,is_principal FROM regulacao_profissional_equipes WHERE profissional_id IN (__IDS__) ORDER BY profissional_id,is_principal DESC,equipe_id`,ids):[];
  const profTeamMap=new Map();for(const x of teamLinks){if(!profTeamMap.has(x.profissional_id))profTeamMap.set(x.profissional_id,[]);profTeamMap.get(x.profissional_id).push(Number(x.equipe_id))}

  const principalIds=[...new Set(profRows.map(p=>p.principal_id).filter(Boolean))];
  const principalAccounts=principalIds.length?await selectIn(env.DB_REGULACAO,'SELECT principal_id,name,username FROM regulacao_principals WHERE principal_id IN (__IDS__) AND active=1',principalIds):[];
  const accountMap=new Map(principalAccounts.map(u=>[u.principal_id,{name:u.name,username:u.username,source:String(u.principal_id||'').startsWith('local:')?'local':'portal'}]));

  const profissionais=profRows.map(p=>{const vinculos=linksMap.get(p.id)||[];const equipe_ids=profTeamMap.get(p.id)||[...(p.equipe_id?[Number(p.equipe_id)]:[])];return{...p,equipe_ids,equipe_id:equipe_ids[0]??p.equipe_id??null,conta:accountMap.get(p.principal_id)||null,vinculos,carga_horaria_total:vinculos.filter(v=>v.ativo).reduce((a,v)=>a+Number(v.carga_horaria_semanal||0),0)}});

  let unidades=[],equipes=[],especialidades=[],contas=[];
  if(includeRefs){
    const [units,teams,specs,principals]=await Promise.all([
      env.DB_REGULACAO.prepare('SELECT code,nome,tipo FROM regulacao_unidades WHERE ativo=1 ORDER BY nome').all(),
      env.DB_REGULACAO.prepare('SELECT id,nome FROM regulacao_equipes WHERE ativo=1 ORDER BY nome').all(),
      env.DB_REGULACAO.prepare('SELECT id,nome,ativo FROM especialidades WHERE ativo=1 ORDER BY nome').all(),
      env.DB_REGULACAO.prepare('SELECT principal_id,name,username FROM regulacao_principals WHERE active=1 ORDER BY name').all(),
    ]);
    unidades=units.results||[];equipes=teams.results||[];especialidades=specs.results||[];
    contas=(principals.results||[]).map(u=>({principal_id:u.principal_id,name:u.name,username:u.username,source:String(u.principal_id||'').startsWith('local:')?'local':'portal'}));
  }
  return json({profissionais,pagination:{page:safePage,page_size:pageSize,total,pages},unidades,equipes,especialidades,contas,refs_included:includeRefs});
}

export async function onRequestPost({request,env}){
  const {user,error}=await requireGestorAccess(request,env);if(error)return error;
  let b;try{b=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const nome=String(b.nome||'').trim();if(nome.length<3)return json({error:'Informe o nome do profissional.'},400);
  const pid=b.principal_id?String(b.principal_id):null;
  if(pid){const exists=await env.DB_REGULACAO.prepare('SELECT nome FROM regulacao_profissionais WHERE principal_id=? AND ativo=1').bind(pid).first();if(exists)return json({error:`Esta conta já está vinculada ao profissional ${exists.nome}.`},409)}
  const equipeIds=[...new Set((Array.isArray(b.equipe_ids)?b.equipe_ids:(b.equipe_id?[b.equipe_id]:[])).map(Number).filter(Boolean))];
  const id=crypto.randomUUID(),principalEquipe=equipeIds[0]||null;
  const ops=[env.DB_REGULACAO.prepare(`INSERT INTO regulacao_profissionais(id,nome,registro_profissional,principal_id,equipe_id,ativo,origem) VALUES(?,?,?,?,?,1,'manual')`).bind(id,nome,String(b.registro_profissional||'').trim()||null,pid,principalEquipe)];
  equipeIds.forEach((equipeId,i)=>ops.push(env.DB_REGULACAO.prepare('INSERT INTO regulacao_profissional_equipes(profissional_id,equipe_id,is_principal) VALUES(?,?,?)').bind(id,equipeId,i===0?1:0)));
  if(pid)equipeIds.forEach(equipeId=>ops.push(env.DB_REGULACAO.prepare('INSERT OR IGNORE INTO regulacao_principal_equipes(principal_id,equipe_id,updated_by_principal) VALUES(?,?,?)').bind(pid,equipeId,pid)));
  await env.DB_REGULACAO.batch(ops);
  await logAudit(env,user,'create','regulacao_profissional',id,{nome,pid,equipe_ids:equipeIds});return json({ok:true,id},201)
}
