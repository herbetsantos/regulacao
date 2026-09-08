import { json } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';

async function tableExists(db,name){
  const row=await db.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=?").bind(name).first();
  return !!row;
}

async function columnExists(db,table,column){
  const r=await db.prepare(`PRAGMA table_info('${String(table).replaceAll("'","''")}')`).all();
  return (r.results||[]).some(c=>c.name===column);
}

export async function onRequestGet({request,env}){
  const {error}=await requireAdminAccess(request,env);
  if(error)return error;

  const required219=[
    'regulacao_local_users',
    'regulacao_local_sessions',
    'regulacao_login_attempts',
    'regulacao_principal_acessos',
    'regulacao_principal_unidades',
    'regulacao_principal_equipes',
    'regulacao_profissionais',
    'regulacao_profissional_vinculos',
    'regulacao_local_audit',
  ];

  const missingTables=[];
  for(const name of required219){
    if(!await tableExists(env.DB_REGULACAO,name))missingTables.push(name);
  }

  const requiredColumns=[
    ['regulacao_principal_acessos','organizador'],
    ['agenda_escalas','profissional_id'],
    ['agenda_individuais','profissional_id'],
  ];
  const missingColumns=[];
  for(const [table,column] of requiredColumns){
    if(await tableExists(env.DB_REGULACAO,table) && !await columnExists(env.DB_REGULACAO,table,column)){
      missingColumns.push(`${table}.${column}`);
    }
  }

  if(!await tableExists(env.DB_REGULACAO,'agenda_grupo_profissionais')){
    missingTables.push('agenda_grupo_profissionais');
  }

  let version=null;
  try{
    version=(await env.DB_REGULACAO.prepare('SELECT version FROM emulti_schema_version WHERE id=1').first())?.version||null;
  }catch{}

  const ready219=required219.every(x=>!missingTables.includes(x));
  const ready220=ready219 &&
    !missingTables.includes('agenda_grupo_profissionais') &&
    missingColumns.length===0;

  return json({
    version,
    ready_2_19:ready219,
    ready_2_20:ready220,
    missing_tables:missingTables,
    missing_columns:missingColumns,
  });
}
