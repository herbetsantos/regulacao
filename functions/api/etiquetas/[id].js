import { json, logAudit } from '../_utils.js';
import { requireGestorAccess } from '../_shared.js';

export async function onRequestPut({request,env,params}){
  const {user,error}=await requireGestorAccess(request,env);if(error)return error;
  const id=Number(params.id);if(!id)return json({error:'Etiqueta inválida.'},400);
  const atual=await env.DB_REGULACAO.prepare('SELECT * FROM regulacao_etiquetas WHERE id=?').bind(id).first();
  if(!atual)return json({error:'Etiqueta não encontrada.'},404);
  let b;try{b=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const nome=b.nome===undefined?atual.nome:String(b.nome||'').trim();
  if(nome.length<2||nome.length>60)return json({error:'Informe uma etiqueta entre 2 e 60 caracteres.'},400);
  const ativo=b.ativo===undefined?Number(atual.ativo):(b.ativo?1:0);
  const ordem=b.sort_order===undefined?Number(atual.sort_order):Number(b.sort_order||0);
  try{
    await env.DB_REGULACAO.prepare('UPDATE regulacao_etiquetas SET nome=?,ativo=?,sort_order=? WHERE id=?').bind(nome,ativo,ordem,id).run();
  }catch{return json({error:'Já existe uma etiqueta com esse nome.'},409)}
  await logAudit(env,user,'update','regulacao_etiqueta',id,{nome,ativo,sort_order:ordem});
  return json({ok:true});
}

export async function onRequestDelete({request,env,params}){
  const {user,error}=await requireGestorAccess(request,env);if(error)return error;
  const id=Number(params.id);if(!id)return json({error:'Etiqueta inválida.'},400);
  await env.DB_REGULACAO.prepare('UPDATE regulacao_etiquetas SET ativo=0 WHERE id=?').bind(id).run();
  await logAudit(env,user,'update','regulacao_etiqueta',id,{ativo:0});
  return json({ok:true});
}
