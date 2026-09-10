import { json, logAudit, requireSuperAdmin } from '../../_utils.js';
import { requireGestorAccess } from '../../_shared.js';

export async function onRequestPut({request,env,params}){
  const {user,error}=await requireGestorAccess(request,env);if(error)return error;
  const equipeId=Number(params.id);if(!equipeId)return json({error:'Equipe inválida.'},400);
  const atual=await env.DB_REGULACAO.prepare('SELECT id,nome,ativo FROM regulacao_equipes WHERE id=?').bind(equipeId).first();if(!atual)return json({error:'Equipe não encontrada.'},404);
  let body;try{body=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const nome=body.nome==null?atual.nome:String(body.nome).trim();const ativo=body.ativo==null?Number(atual.ativo):(body.ativo?1:0);if(!nome)return json({error:'Nome da equipe é obrigatório.'},400);
  const duplicada=await env.DB_REGULACAO.prepare('SELECT id FROM regulacao_equipes WHERE lower(nome)=lower(?) AND id!=?').bind(nome,equipeId).first();if(duplicada)return json({error:'Já existe outra equipe com esse nome.'},409);
  await env.DB_REGULACAO.prepare("UPDATE regulacao_equipes SET nome=?,ativo=?,updated_at=datetime('now') WHERE id=?").bind(nome,ativo,equipeId).run();
  await logAudit(env,user,'update','equipe',equipeId,{nome,ativo});return json({ok:true,equipe:{id:equipeId,nome,ativo}});
}

export async function onRequestDelete({request,env,params}){
  const {user,error}=await requireSuperAdmin(request,env);if(error)return error;
  const equipeId=Number(params.id);if(!equipeId)return json({error:'Equipe inválida.'},400);
  const equipe=await env.DB_REGULACAO.prepare('SELECT id,nome FROM regulacao_equipes WHERE id=?').bind(equipeId).first();
  if(!equipe)return json({error:'Equipe não encontrada.'},404);
  let body={};try{body=await request.json()}catch{}
  if(String(body?.confirmacao||'').trim()!==String(equipe.nome))return json({error:'Confirmação obrigatória. Digite exatamente o nome da equipe para excluir.'},400);

  const checks=[
    ['usuarios','regulacao_principal_equipes','equipe_id'],
    ['profissionais','regulacao_profissional_equipes','equipe_id'],
    ['profissionais_legado','regulacao_profissionais','equipe_id'],
    ['guias','guias','equipe_id'],
    ['escalas','agenda_escalas','equipe_id'],
    ['atendimentos','agenda_individuais','equipe_id'],
    ['grupos','agenda_grupos','equipe_id'],
    ['atribuicoes','guia_atribuicoes','equipe_id'],
    ['notificacoes','notificacoes','equipe_id'],
    ['acompanhamentos_legado','acompanhamentos','equipe_id'],
  ];
  const dependencias={};
  for(const [key,table,col] of checks){
    try{const row=await env.DB_REGULACAO.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${col}=?`).bind(equipeId).first();dependencias[key]=Number(row?.n||0)}catch{dependencias[key]=0}
  }
  const total=Object.values(dependencias).reduce((a,b)=>a+b,0);
  if(total>0)return json({error:'Exclusão bloqueada: a equipe já possui vínculos ou histórico. Desative-a em vez de excluir.',dependencias},409);

  await env.DB_REGULACAO.prepare('DELETE FROM regulacao_equipe_unidades WHERE equipe_id=?').bind(equipeId).run();
  await env.DB_REGULACAO.prepare('DELETE FROM regulacao_equipes WHERE id=?').bind(equipeId).run();
  await logAudit(env,user,'delete','equipe',equipeId,{nome:equipe.nome,dependencias});
  return json({ok:true,deleted:{id:equipeId,nome:equipe.nome}});
}
