import { json, logAudit } from '../../../_utils.js';
import { requireGestorAccess } from '../../../_shared.js';
import { getUnidadeAtivaComTipo } from '../../../_db.js';

export async function onRequestPost({request,env,params}){
  const {user,error}=await requireGestorAccess(request,env);if(error)return error;
  const equipeId=Number(params.id);const equipe=await env.DB_REGULACAO.prepare('SELECT id FROM regulacao_equipes WHERE id=?').bind(equipeId).first();if(!equipe)return json({error:'Equipe não encontrada.'},404);
  let body;try{body=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const unidadeCode=String(body?.unidade_code||'').trim();if(!unidadeCode)return json({error:'Informe a unidade.'},400);
  const {unidade}=await getUnidadeAtivaComTipo(env,unidadeCode);if(!unidade)return json({error:'Unidade não encontrada.'},400);
  await env.DB_REGULACAO.prepare('INSERT OR IGNORE INTO regulacao_equipe_unidades(equipe_id,unidade_code) VALUES(?,?)').bind(equipeId,unidadeCode).run();
  await logAudit(env,user,'create','equipe_unidade',equipeId,{unidadeCode});return json({ok:true});
}
export async function onRequestDelete({request,env,params}){
  const {user,error}=await requireGestorAccess(request,env);if(error)return error;
  const equipeId=Number(params.id),unidadeCode=new URL(request.url).searchParams.get('unidade_code');if(!unidadeCode)return json({error:'Informe unidade_code.'},400);
  await env.DB_REGULACAO.prepare('DELETE FROM regulacao_equipe_unidades WHERE equipe_id=? AND unidade_code=?').bind(equipeId,unidadeCode).run();
  await logAudit(env,user,'delete','equipe_unidade',equipeId,{unidadeCode});return json({ok:true});
}
