// Helpers compartilhados — eMulti / Regulação 2.26.0.
// Autorização, equipes e unidades são locais ao regulacao-vagas-db.

import { getAuthUser, json } from './_utils.js';
import { getRegulacaoAccessProfile, hasRegulacaoCapability } from './_permissions.js';

export async function requireRegulacaoAccess(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: json({ error:'Não autenticado.' },401) };
  let access;
  try { access = await getRegulacaoAccessProfile(env,user); }
  catch (err) { return { error:json({error:'Não foi possível consultar os acessos da Regulação.',detalhe:String(err?.message||'')},503) }; }
  if (!access.acesso) return { error:json({error:'Você não tem acesso à Regulação de Vagas.',codigo:'SEM_ACESSO_REGULACAO'},403) };
  return { user, access };
}

export async function requireRegulacaoCapability(request,env,capability,mensagem=null){
  const auth=await requireRegulacaoAccess(request,env);if(auth.error)return auth;
  if(!hasRegulacaoCapability(auth.access,capability))return{error:json({error:mensagem||`Você não possui a responsabilidade necessária (${capability}) para realizar esta ação.`,codigo:`SEM_PERMISSAO_${String(capability).toUpperCase()}`},403)};
  return auth;
}
export async function requireGestorAccess(request,env){const auth=await requireRegulacaoAccess(request,env);if(auth.error)return auth;if(!auth.access.gestor&&!auth.access.administrador)return{error:json({error:'Apenas Gestor ou Administrador pode acessar esta configuração.',codigo:'SEM_PERMISSAO_GESTAO'},403)};return auth}
export async function requireAdminAccess(request,env){return requireRegulacaoCapability(request,env,'administrador','Apenas administradores da Regulação podem acessar esta configuração.')}

export async function getRegulacaoScope(env,user,access=null){
  access=access||await getRegulacaoAccessProfile(env,user);
  if(access.administrador){const {results}=await env.DB_REGULACAO.prepare('SELECT code FROM regulacao_unidades WHERE ativo=1').all();const todas=(results||[]).map(r=>r.code);return{isAdmin:true,emissoras:todas,executantes:todas}}
  const pid=user.principalId||`portal:${user.id}`;
  const {results:diretos}=await env.DB_REGULACAO.prepare('SELECT unidade_code,pode_emitir,pode_executar FROM regulacao_principal_unidades WHERE principal_id=?').bind(pid).all();
  const {results:teams}=await env.DB_REGULACAO.prepare('SELECT equipe_id FROM regulacao_principal_equipes WHERE principal_id=? ORDER BY equipe_id').bind(pid).all();
  const equipeIds=(teams||[]).map(x=>Number(x.equipe_id)).filter(Boolean);
  let equipeUnits=[];
  if(equipeIds.length){const ph=equipeIds.map(()=>'?').join(',');const r=await env.DB_REGULACAO.prepare(`SELECT DISTINCT eu.unidade_code FROM regulacao_equipe_unidades eu JOIN regulacao_equipes e ON e.id=eu.equipe_id AND e.ativo=1 JOIN regulacao_unidades u ON u.code=eu.unidade_code AND u.ativo=1 WHERE eu.equipe_id IN (${ph})`).bind(...equipeIds).all();equipeUnits=(r.results||[]).map(x=>x.unidade_code)}
  const emissoras=access.cadastrante?(diretos||[]).filter(r=>r.pode_emitir).map(r=>r.unidade_code):[];
  const executantes=(access.regulador||access.organizador||access.executor)?Array.from(new Set([...(diretos||[]).filter(r=>r.pode_executar).map(r=>r.unidade_code),...equipeUnits])):[];
  return{isAdmin:false,emissoras,executantes};
}

export async function getUserEquipeIds(env,user){const pid=user.principalId||`portal:${user.id}`;const {results}=await env.DB_REGULACAO.prepare('SELECT equipe_id FROM regulacao_principal_equipes WHERE principal_id=? ORDER BY equipe_id').bind(pid).all();return(results||[]).map(r=>Number(r.equipe_id)).filter(Boolean)}
export async function isEquipeMember(env,user,equipeId,access=null){access=access||await getRegulacaoAccessProfile(env,user);if(access.administrador)return true;const ids=await getUserEquipeIds(env,user);return ids.some(id=>Number(id)===Number(equipeId))}
export async function getEquipeInfo(env,equipeId){const equipe=await env.DB_REGULACAO.prepare('SELECT id,nome FROM regulacao_equipes WHERE id=? AND ativo=1').bind(equipeId).first();if(!equipe)return null;const {results}=await env.DB_REGULACAO.prepare(`SELECT u.code,u.nome FROM regulacao_equipe_unidades eu JOIN regulacao_unidades u ON u.code=eu.unidade_code AND u.ativo=1 WHERE eu.equipe_id=? ORDER BY u.nome`).bind(equipeId).all();return{id:equipe.id,nome:equipe.nome,unidades:results||[]}}
export async function inserirNotificacao(env,{equipeId,guiaId,tipo,mensagem,createdBy}){await env.DB_REGULACAO.prepare('INSERT INTO notificacoes(equipe_id,guia_id,tipo,mensagem,created_by) VALUES(?,?,?,?,?)').bind(equipeId,guiaId??null,tipo,mensagem,createdBy??null).run()}
export function inClause(codes){if(!codes.length)return{clause:'(NULL)',binds:[]};return{clause:`(${codes.map(()=>'?').join(',')})`,binds:codes}}
export function isValidCPF(cpf){return typeof cpf==='string'&&/^\d{11}$/.test(cpf)}
export function onlyDigits(v){return String(v||'').replace(/\D/g,'')}
const SITUACOES_ATIVAS=['aguardando_autorizacao','lista_espera','em_atendimento'];
export function situacaoLabel(s){return{aguardando_autorizacao:'Aguardando autorização',lista_espera:'Em lista de espera',em_atendimento:'Em atendimento',concluido:'Concluído',negado:'Negado'}[s]||s}
export async function findGuiasAtivasMesmaEspecialidade(env,cpf,especialidadeId,excludeGuiaId=null){const{clause,binds}=inClause(SITUACOES_ATIVAS);let sql=`SELECT id,situacao,created_at FROM guias WHERE cpf=? AND especialidade_id=? AND situacao IN ${clause}`;const params=[cpf,especialidadeId,...binds];if(excludeGuiaId){sql+=' AND id != ?';params.push(excludeGuiaId)}sql+=' ORDER BY created_at DESC';const{results}=await env.DB_REGULACAO.prepare(sql).bind(...params).all();return results||[]}
