import { json, logAudit } from '../_utils.js';
import { requireRegulacaoAccess, requireGestorAccess } from '../_shared.js';

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const todos=url.searchParams.get('todos')==='1';
  const auth=todos?await requireGestorAccess(request,env):await requireRegulacaoAccess(request,env);
  if(auth.error)return auth.error;
  const sql=todos
    ? `SELECT e.id,e.nome,e.ativo,e.sort_order,COUNT(ge.guia_id) uso_count
       FROM regulacao_etiquetas e LEFT JOIN guia_etiquetas ge ON ge.etiqueta_id=e.id
       GROUP BY e.id,e.nome,e.ativo,e.sort_order ORDER BY e.sort_order,e.nome`
    : `SELECT id,nome,ativo,sort_order FROM regulacao_etiquetas WHERE ativo=1 ORDER BY sort_order,nome`;
  const {results}=await env.DB_REGULACAO.prepare(sql).all();
  return json({etiquetas:results||[]});
}

export async function onRequestPost({request,env}){
  const {user,error}=await requireGestorAccess(request,env);if(error)return error;
  let b;try{b=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const nome=String(b.nome||'').trim();
  if(nome.length<2||nome.length>60)return json({error:'Informe uma etiqueta entre 2 e 60 caracteres.'},400);
  const ordem=Number.isFinite(Number(b.sort_order))?Number(b.sort_order):null;
  try{
    const r=await env.DB_REGULACAO.prepare(`INSERT INTO regulacao_etiquetas(nome,sort_order,ativo,created_by_principal)
      VALUES(?,COALESCE(?,(SELECT COALESCE(MAX(sort_order),0)+10 FROM regulacao_etiquetas)),1,?)`)
      .bind(nome,ordem,user.principalId||null).run();
    await logAudit(env,user,'create','regulacao_etiqueta',r.meta.last_row_id,{nome,sort_order:ordem});
    return json({id:r.meta.last_row_id,nome},201);
  }catch{return json({error:'Já existe uma etiqueta com esse nome.'},409)}
}
