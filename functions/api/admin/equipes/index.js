import { json, logAudit } from '../../_utils.js';
import { requireGestorAccess } from '../../_shared.js';
import { getEquipeProfissionais, ensureProfissionalSchema } from '../../_professionals.js';

export async function onRequestGet({request,env}){
  const {error}=await requireGestorAccess(request,env);if(error)return error;
  await ensureProfissionalSchema(env);
  const {results:equipes}=await env.DB_REGULACAO.prepare('SELECT id,nome,ativo FROM regulacao_equipes ORDER BY nome ASC').all();
  const detalhadas=[];
  for(const eq of equipes||[]){
    const {results:unidades}=await env.DB_REGULACAO.prepare(`SELECT u.code,u.nome FROM regulacao_equipe_unidades eu JOIN regulacao_unidades u ON u.code=eu.unidade_code WHERE eu.equipe_id=? ORDER BY u.nome`).bind(eq.id).all();
    const profissionais=await getEquipeProfissionais(env,eq.id);
    detalhadas.push({...eq,unidades:unidades||[],profissionais});
  }
  return json({equipes:detalhadas});
}

export async function onRequestPost({request,env}){
  const {user,error}=await requireGestorAccess(request,env);if(error)return error;
  let body;try{body=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const nome=String(body?.nome||'').trim();if(!nome)return json({error:'Nome da equipe é obrigatório.'},400);
  const existente=await env.DB_REGULACAO.prepare('SELECT id FROM regulacao_equipes WHERE lower(nome)=lower(?)').bind(nome).first();if(existente)return json({error:'Já existe uma equipe com esse nome.'},409);
  const result=await env.DB_REGULACAO.prepare('INSERT INTO regulacao_equipes(nome,created_by_principal) VALUES(?,?)').bind(nome,user.principalId||`portal:${user.id}`).run();
  await logAudit(env,user,'create','equipe',result.meta.last_row_id,{nome});
  return json({id:result.meta.last_row_id,nome,ativo:1,unidades:[],profissionais:[]},201);
}
