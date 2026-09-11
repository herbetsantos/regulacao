// Catálogo e diagnóstico do banco próprio da Regulação — 2.26.3.
import { PACIENTE_ENDERECO_COLUMNS, getPacienteEnderecoColumnStatus } from './_address.js';

function messageOf(err){return String(err?.message||err||'')}
export function friendlyRegulacaoError(err){
  const mensagem=messageOf(err);
  const lower=mensagem.toLowerCase();
  if(lower.includes('no such table')||lower.includes('no such column')){
    return{error:'O banco da Regulação está desatualizado. Aplique as migrações pendentes antes de continuar.',codigo:'REGULACAO_SCHEMA_DESATUALIZADO'};
  }
  if(lower.includes('db_regulacao')||lower.includes('binding')){
    return{error:'O banco da Regulação não está disponível ou o binding DB_REGULACAO não está configurado.',codigo:'REGULACAO_DB_INDISPONIVEL'};
  }
  return{error:'Não foi possível acessar os dados da Regulação.',codigo:'REGULACAO_DB_ERRO'};
}
export function isMissingColumn(err,column='tipo'){const msg=messageOf(err).toLowerCase();return msg.includes('no such column')&&msg.includes(String(column).toLowerCase())}
export function isMissingTable(err,table){const msg=messageOf(err).toLowerCase();return msg.includes('no such table')&&(!table||msg.includes(String(table).toLowerCase()))}
export async function hasUnidadesTipoColumn(env){try{const{results}=await env.DB_REGULACAO.prepare("PRAGMA table_info('regulacao_unidades')").all();return(results||[]).some(c=>c.name==='tipo')}catch{return false}}
export async function listUnidadesAtivasComTipo(env){const{results}=await env.DB_REGULACAO.prepare('SELECT code,nome,tipo FROM regulacao_unidades WHERE ativo=1 ORDER BY nome').all();return{unidades:results||[],tipoFonte:'regulacao-vagas-db'}}
export async function getUnidadeAtivaComTipo(env,code){const unidade=await env.DB_REGULACAO.prepare('SELECT code,nome,tipo FROM regulacao_unidades WHERE code=? AND ativo=1').bind(code).first();return{unidade:unidade||null,tipoFonte:'regulacao-vagas-db'}}

const REGULACAO_TABLES=['especialidades','pacientes','guias','guia_atribuicoes','notificacoes','notificacao_lidas','agenda_escalas','agenda_grupos','agenda_grupo_encontros','agenda_grupo_pacientes','agenda_individuais','regulacao_etiquetas','guia_etiquetas','regulacao_execucoes_administrativas','regulacao_profissional_equipes','regulacao_principals','regulacao_superusers','regulacao_auth_sessions','regulacao_local_users','regulacao_login_attempts','regulacao_unidades','regulacao_equipes','regulacao_equipe_unidades','emulti_schema_version'];

export async function getRegulacaoSchemaStatus(env){
  if(!env.DB_REGULACAO)return{bindingOk:false,schemaOk:false,tabelasExistentes:[],tabelasFaltantes:[...REGULACAO_TABLES],colunasPacienteEnderecoFaltantes:[...PACIENTE_ENDERECO_COLUMNS],colunasPacienteIntegracaoFaltantes:['cns'],colunasFluxoV210Faltantes:['guias.codigo_guia'],colunasAgendaFaltantes:['especialidades.duracao_padrao_min'],erro:'Binding DB_REGULACAO não configurado.'};
  try{
    const placeholders=REGULACAO_TABLES.map(()=>'?').join(',');const{results}=await env.DB_REGULACAO.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`).bind(...REGULACAO_TABLES).all();const existentes=new Set((results||[]).map(r=>r.name));const faltantes=REGULACAO_TABLES.filter(t=>!existentes.has(t));let colunasPacienteEnderecoFaltantes=[],colunasPacienteIntegracaoFaltantes=[],colunasFluxoV210Faltantes=[],colunasAgendaFaltantes=[];
    if(existentes.has('pacientes')){const enderecoStatus=await getPacienteEnderecoColumnStatus(env);colunasPacienteEnderecoFaltantes=enderecoStatus.faltantes;const info=await env.DB_REGULACAO.prepare("PRAGMA table_info('pacientes')").all();const cols=new Set((info.results||[]).map(c=>c.name));if(!cols.has('cns'))colunasPacienteIntegracaoFaltantes.push('cns')}
    if(existentes.has('guias')){const info=await env.DB_REGULACAO.prepare("PRAGMA table_info('guias')").all();const cols=new Set((info.results||[]).map(c=>c.name));if(!cols.has('codigo_guia'))colunasFluxoV210Faltantes.push('guias.codigo_guia')}
    if(existentes.has('especialidades')){const info=await env.DB_REGULACAO.prepare("PRAGMA table_info('especialidades')").all();const cols=new Set((info.results||[]).map(c=>c.name));if(!cols.has('duracao_padrao_min'))colunasAgendaFaltantes.push('especialidades.duracao_padrao_min')}
    return{bindingOk:true,schemaOk:faltantes.length===0&&colunasPacienteEnderecoFaltantes.length===0&&colunasPacienteIntegracaoFaltantes.length===0&&colunasFluxoV210Faltantes.length===0&&colunasAgendaFaltantes.length===0,tabelasExistentes:[...existentes],tabelasFaltantes:faltantes,colunasPacienteEnderecoFaltantes,colunasPacienteIntegracaoFaltantes,colunasFluxoV210Faltantes,colunasAgendaFaltantes,erro:null};
  }catch(err){return{bindingOk:true,schemaOk:false,tabelasExistentes:[],tabelasFaltantes:[...REGULACAO_TABLES],colunasPacienteEnderecoFaltantes:[...PACIENTE_ENDERECO_COLUMNS],colunasPacienteIntegracaoFaltantes:['cns'],colunasFluxoV210Faltantes:['guias.codigo_guia'],colunasAgendaFaltantes:['especialidades.duracao_padrao_min'],erro:messageOf(err)}}
}

// Reparo não destrutivo mínimo. Migrações versionadas continuam sendo o caminho oficial.
export async function ensureRegulacaoSchema(env){
  if(!env.DB_REGULACAO)throw new Error('Binding DB_REGULACAO não configurado.');
  const statements=[
    `CREATE TABLE IF NOT EXISTS regulacao_principals(principal_id TEXT PRIMARY KEY,portal_user_id INTEGER,username TEXT,name TEXT NOT NULL,portal_role TEXT,active INTEGER NOT NULL DEFAULT 1,first_seen_at TEXT NOT NULL DEFAULT(datetime('now')),last_seen_at TEXT NOT NULL DEFAULT(datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS regulacao_superusers(principal_id TEXT PRIMARY KEY,granted_by_principal TEXT,granted_at TEXT NOT NULL DEFAULT(datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS regulacao_auth_sessions(token TEXT PRIMARY KEY,principal_id TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')),last_seen_at TEXT NOT NULL DEFAULT(datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS regulacao_user_preferences(principal_id TEXT PRIMARY KEY,theme TEXT NOT NULL DEFAULT 'light',updated_at TEXT NOT NULL DEFAULT(datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS regulacao_unidades(code TEXT PRIMARY KEY,nome TEXT NOT NULL,tipo TEXT NOT NULL DEFAULT 'aps',ativo INTEGER NOT NULL DEFAULT 1,origem TEXT NOT NULL DEFAULT 'local',created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS regulacao_equipes(id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL COLLATE NOCASE UNIQUE,ativo INTEGER NOT NULL DEFAULT 1,created_by_principal TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS regulacao_equipe_unidades(equipe_id INTEGER NOT NULL,unidade_code TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')),PRIMARY KEY(equipe_id,unidade_code))`,
    `CREATE TABLE IF NOT EXISTS regulacao_migration_state(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT NOT NULL DEFAULT(datetime('now')))`,
  ];
  for(const sql of statements)await env.DB_REGULACAO.prepare(sql).run();
  return getRegulacaoSchemaStatus(env);
}
