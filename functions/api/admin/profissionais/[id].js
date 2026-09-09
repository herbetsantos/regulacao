import { json,logAudit } from '../../_utils.js';
import { requireGestorAccess } from '../../_shared.js';

export async function onRequestPut({request,env,params}){
  const {user,error}=await requireGestorAccess(request,env);if(error)return error;
  const id=String(params.id||'');
  const cur=await env.DB_REGULACAO.prepare('SELECT * FROM regulacao_profissionais WHERE id=?').bind(id).first();
  if(!cur)return json({error:'Profissional não encontrado.'},404);
  let b;try{b=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const nome=b.nome==null?cur.nome:String(b.nome).trim();
  const registro=b.registro_profissional===undefined?cur.registro_profissional:(String(b.registro_profissional||'').trim()||null);
  const pid=b.principal_id===undefined?cur.principal_id:(b.principal_id?String(b.principal_id):null);
  const ativo=b.ativo===undefined?cur.ativo:(b.ativo?1:0);
  if(pid){const other=await env.DB_REGULACAO.prepare('SELECT id,nome FROM regulacao_profissionais WHERE principal_id=? AND id<>? AND ativo=1').bind(pid,id).first();if(other)return json({error:`Esta conta já está vinculada a ${other.nome}.`},409)}
  let equipeIds;
  if(Array.isArray(b.equipe_ids))equipeIds=[...new Set(b.equipe_ids.map(Number).filter(Boolean))];
  else if(b.equipe_id!==undefined)equipeIds=b.equipe_id?[Number(b.equipe_id)]:[];
  else {const r=await env.DB_REGULACAO.prepare('SELECT equipe_id FROM regulacao_profissional_equipes WHERE profissional_id=? ORDER BY is_principal DESC,equipe_id').bind(id).all();equipeIds=(r.results||[]).map(x=>Number(x.equipe_id));if(!equipeIds.length&&cur.equipe_id)equipeIds=[Number(cur.equipe_id)]}
  const principalEquipe=equipeIds[0]||null;
  const ops=[
    env.DB_REGULACAO.prepare("UPDATE regulacao_profissionais SET nome=?,registro_profissional=?,principal_id=?,equipe_id=?,ativo=?,updated_at=datetime('now') WHERE id=?").bind(nome,registro,pid,principalEquipe,ativo,id),
    env.DB_REGULACAO.prepare('DELETE FROM regulacao_profissional_equipes WHERE profissional_id=?').bind(id),
  ];
  equipeIds.forEach((equipeId,i)=>ops.push(env.DB_REGULACAO.prepare('INSERT INTO regulacao_profissional_equipes(profissional_id,equipe_id,is_principal) VALUES(?,?,?)').bind(id,equipeId,i===0?1:0)));
  if(cur.principal_id&&cur.principal_id!==pid)ops.push(env.DB_REGULACAO.prepare('DELETE FROM regulacao_principal_equipes WHERE principal_id=?').bind(cur.principal_id));
  if(pid){ops.push(env.DB_REGULACAO.prepare('DELETE FROM regulacao_principal_equipes WHERE principal_id=?').bind(pid));equipeIds.forEach(equipeId=>ops.push(env.DB_REGULACAO.prepare('INSERT INTO regulacao_principal_equipes(principal_id,equipe_id,updated_by_principal) VALUES(?,?,?)').bind(pid,equipeId,pid)))}
  await env.DB_REGULACAO.batch(ops);
  await logAudit(env,user,'update','regulacao_profissional',id,{nome,pid,equipe_ids:equipeIds,ativo});return json({ok:true})
}
