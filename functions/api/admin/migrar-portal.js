// Migração única 2.26.0: copia catálogo operacional legado do Portal APS
// para o regulacao-vagas-db preservando IDs/códigos. Após a cópia, as rotas
// normais da Regulação não consultam mais essas tabelas no Portal.

import { json, requireSuperAdmin, logAudit } from '../_utils.js';

async function tableExists(db,name){try{return!!await db.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=?").bind(name).first()}catch{return false}}
async function hasColumn(db,table,column){try{const r=await db.prepare(`PRAGMA table_info('${String(table).replaceAll("'","''")}')`).all();return(r.results||[]).some(c=>c.name===column)}catch{return false}}
async function distinctValues(db,table,column){try{if(!await tableExists(db,table)||!await hasColumn(db,table,column))return[];const{results}=await db.prepare(`SELECT DISTINCT ${column} value FROM ${table} WHERE ${column} IS NOT NULL`).all();return(results||[]).map(x=>x.value).filter(v=>v!==null&&v!==undefined&&String(v)!=='')}catch{return[]}}

export async function onRequestGet({request,env}){
  const {error}=await requireSuperAdmin(request,env);if(error)return error;
  let imported=false,importedAt=null;
  try{const row=await env.DB_REGULACAO.prepare("SELECT value,updated_at FROM regulacao_migration_state WHERE key='portal_operacional_importado'").first();imported=row?.value==='1';importedAt=row?.updated_at||null}catch{}
  return json({imported,imported_at:importedAt,source:'portal-saude-db',target:'regulacao-vagas-db',mode:'one-time'});
}

export async function onRequestPost({request,env}){
  const {user,error}=await requireSuperAdmin(request,env);if(error)return error;
  try{const done=await env.DB_REGULACAO.prepare("SELECT value,updated_at FROM regulacao_migration_state WHERE key='portal_operacional_importado'").first();if(done?.value==='1')return json({error:'A importação operacional do Portal já foi concluída. Não é necessário executá-la novamente.',codigo:'MIGRACAO_JA_CONCLUIDA',imported_at:done.updated_at},409)}catch{}
  const summary={principals:0,unidades:0,equipes:0,equipe_unidades:0,acessos:0,principal_unidades:0,principal_equipes:0,reconstruidas:{unidades:0,equipes:0},avisos:[]};

  // Identidades — dado de diretório copiado apenas para administração local.
  if(await tableExists(env.DB,'users')){
    const {results}=await env.DB.prepare('SELECT id,username,name,role,active FROM users').all();
    const ops=[];
    for(const u of results||[]){ops.push(env.DB_REGULACAO.prepare(`INSERT INTO regulacao_principals(principal_id,portal_user_id,username,name,portal_role,active,first_seen_at,last_seen_at) VALUES(?,?,?,?,?,?,datetime('now'),datetime('now')) ON CONFLICT(principal_id) DO UPDATE SET portal_user_id=excluded.portal_user_id,username=excluded.username,name=excluded.name,portal_role=excluded.portal_role,active=excluded.active,last_seen_at=datetime('now')`).bind(`portal:${u.id}`,u.id,u.username||null,u.name||u.username||`Usuário ${u.id}`,u.role||null,u.active?1:0));summary.principals++}
    if(ops.length)await env.DB_REGULACAO.batch(ops);
  }

  if(await tableExists(env.DB,'unidades')){
    const tipo=await hasColumn(env.DB,'unidades','tipo');
    const {results}=await env.DB.prepare(tipo?'SELECT code,nome,tipo,ativo FROM unidades':'SELECT code,nome,ativo FROM unidades').all();
    const ops=[];
    for(const u of results||[]){const t=tipo?(u.tipo||'outra'):'aps';ops.push(env.DB_REGULACAO.prepare(`INSERT INTO regulacao_unidades(code,nome,tipo,ativo,origem,updated_at) VALUES(?,?,?,?, 'portal_legado',datetime('now')) ON CONFLICT(code) DO UPDATE SET nome=excluded.nome,tipo=excluded.tipo,ativo=excluded.ativo,origem='portal_legado',updated_at=datetime('now')`).bind(u.code,u.nome,t,u.ativo?1:0));summary.unidades++}
    if(ops.length)await env.DB_REGULACAO.batch(ops);
  } else {
    const unitSources=[['guias','unidade_solicitante_code'],['guias','unidade_executante_code'],['agenda_escalas','unidade_code'],['agenda_grupos','unidade_code'],['agenda_individuais','unidade_code'],['regulacao_profissional_vinculos','unidade_code']];
    const codes=new Set();for(const [t,c] of unitSources)for(const v of await distinctValues(env.DB_REGULACAO,t,c))codes.add(String(v));
    const ops=[];for(const code of codes){ops.push(env.DB_REGULACAO.prepare(`INSERT OR IGNORE INTO regulacao_unidades(code,nome,tipo,ativo,origem) VALUES(?,?, 'aps',1,'reconstruido_legado')`).bind(code,code));summary.reconstruidas.unidades++}if(ops.length)await env.DB_REGULACAO.batch(ops);
    summary.avisos.push('Tabela unidades não encontrada no Portal; códigos existentes no banco da Regulação foram reconstruídos com o próprio código como nome. Revise os nomes em Administração → Unidades.');
  }

  if(await tableExists(env.DB,'regulacao_equipes')){
    const {results}=await env.DB.prepare('SELECT id,nome,ativo FROM regulacao_equipes').all();
    const ops=[];for(const e of results||[]){ops.push(env.DB_REGULACAO.prepare(`INSERT INTO regulacao_equipes(id,nome,ativo,created_by_principal,updated_at) VALUES(?,?,?,NULL,datetime('now')) ON CONFLICT(id) DO UPDATE SET nome=excluded.nome,ativo=excluded.ativo,updated_at=datetime('now')`).bind(e.id,e.nome,e.ativo?1:0));summary.equipes++}if(ops.length)await env.DB_REGULACAO.batch(ops);
  } else {
    const teamSources=[['guias','equipe_id'],['agenda_escalas','equipe_id'],['agenda_grupos','equipe_id'],['agenda_individuais','equipe_id'],['guia_atribuicoes','equipe_id'],['notificacoes','equipe_id'],['acompanhamentos','equipe_id'],['regulacao_principal_equipes','equipe_id'],['regulacao_profissionais','equipe_id'],['regulacao_profissional_equipes','equipe_id']];
    const ids=new Set();for(const [t,c] of teamSources)for(const v of await distinctValues(env.DB_REGULACAO,t,c)){const id=Number(v);if(id>0)ids.add(id)}
    const ops=[];for(const id of [...ids].sort((a,b)=>a-b)){ops.push(env.DB_REGULACAO.prepare(`INSERT OR IGNORE INTO regulacao_equipes(id,nome,ativo,created_by_principal) VALUES(?,?,1,NULL)`).bind(id,`Equipe ${id} (legado)`));summary.reconstruidas.equipes++}if(ops.length)await env.DB_REGULACAO.batch(ops);
    summary.avisos.push('Tabela regulacao_equipes não encontrada no Portal; IDs já usados no banco da Regulação foram reconstruídos com nomes provisórios. Renomeie-os em Administração → Equipes.');
  }

  if(await tableExists(env.DB,'regulacao_equipe_unidades')){
    const {results}=await env.DB.prepare('SELECT equipe_id,unidade_code FROM regulacao_equipe_unidades').all();
    const ops=[];for(const x of results||[]){ops.push(env.DB_REGULACAO.prepare('INSERT OR IGNORE INTO regulacao_equipe_unidades(equipe_id,unidade_code) VALUES(?,?)').bind(x.equipe_id,x.unidade_code));summary.equipe_unidades++}if(ops.length)await env.DB_REGULACAO.batch(ops);
  }

  if(await tableExists(env.DB,'regulacao_user_acessos')){
    const organizador=await hasColumn(env.DB,'regulacao_user_acessos','organizador');
    const gestor=await hasColumn(env.DB,'regulacao_user_acessos','gestor');
    const cols=['user_id','cadastrante','regulador','executor','administrador'];if(organizador)cols.push('organizador');if(gestor)cols.push('gestor');
    const {results}=await env.DB.prepare(`SELECT ${cols.join(',')} FROM regulacao_user_acessos`).all();
    const ops=[];for(const a of results||[]){ops.push(env.DB_REGULACAO.prepare(`INSERT INTO regulacao_principal_acessos(principal_id,cadastrante,regulador,organizador,executor,gestor,administrador,active,updated_by_principal,updated_at) VALUES(?,?,?,?,?,?,?,1,?,datetime('now')) ON CONFLICT(principal_id) DO UPDATE SET cadastrante=MAX(regulacao_principal_acessos.cadastrante,excluded.cadastrante),regulador=MAX(regulacao_principal_acessos.regulador,excluded.regulador),organizador=MAX(regulacao_principal_acessos.organizador,excluded.organizador),executor=MAX(regulacao_principal_acessos.executor,excluded.executor),gestor=MAX(regulacao_principal_acessos.gestor,excluded.gestor),administrador=MAX(regulacao_principal_acessos.administrador,excluded.administrador),active=1,updated_at=datetime('now')`).bind(`portal:${a.user_id}`,a.cadastrante?1:0,a.regulador?1:0,organizador&&a.organizador?1:0,a.executor?1:0,gestor&&a.gestor?1:0,a.administrador?1:0,user.principalId));summary.acessos++}if(ops.length)await env.DB_REGULACAO.batch(ops);
  }

  if(await tableExists(env.DB,'regulacao_user_unidades')){
    const {results}=await env.DB.prepare('SELECT user_id,unidade_code,pode_emitir,pode_executar FROM regulacao_user_unidades').all();const ops=[];for(const x of results||[]){ops.push(env.DB_REGULACAO.prepare(`INSERT INTO regulacao_principal_unidades(principal_id,unidade_code,pode_emitir,pode_executar,updated_by_principal,updated_at) VALUES(?,?,?,?,?,datetime('now')) ON CONFLICT(principal_id,unidade_code) DO UPDATE SET pode_emitir=MAX(regulacao_principal_unidades.pode_emitir,excluded.pode_emitir),pode_executar=MAX(regulacao_principal_unidades.pode_executar,excluded.pode_executar),updated_at=datetime('now')`).bind(`portal:${x.user_id}`,x.unidade_code,x.pode_emitir?1:0,x.pode_executar?1:0,user.principalId));summary.principal_unidades++}if(ops.length)await env.DB_REGULACAO.batch(ops);
  }

  if(await tableExists(env.DB,'regulacao_equipe_profissionais')){
    const {results}=await env.DB.prepare('SELECT user_id,equipe_id FROM regulacao_equipe_profissionais').all();const ops=[];for(const x of results||[]){ops.push(env.DB_REGULACAO.prepare(`INSERT OR IGNORE INTO regulacao_principal_equipes(principal_id,equipe_id,updated_by_principal) VALUES(?,?,?)`).bind(`portal:${x.user_id}`,x.equipe_id,user.principalId));summary.principal_equipes++}if(ops.length)await env.DB_REGULACAO.batch(ops);
  }

  await env.DB_REGULACAO.prepare(`INSERT INTO regulacao_migration_state(key,value,updated_at) VALUES('portal_operacional_importado','1',datetime('now')) ON CONFLICT(key) DO UPDATE SET value='1',updated_at=datetime('now')`).run();
  await logAudit(env,user,'migrate','portal_operational_catalog','2.26.0',summary);
  return json({ok:true,summary});
}
