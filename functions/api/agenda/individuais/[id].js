import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoAccess, isEquipeMember } from '../../_shared.js';
import { principalId } from '../../_hybrid.js';

export async function onRequestPatch({request,env,params}){
  const {user,access,error}=await requireRegulacaoAccess(request,env);
  if(error)return error;
  const id=Number(params.id);
  const row=await env.DB_REGULACAO.prepare(`
    SELECT ai.*,rp.principal_id
    FROM agenda_individuais ai
    LEFT JOIN regulacao_profissionais rp ON rp.id=ai.profissional_id
    WHERE ai.id=?
  `).bind(id).first();
  if(!row)return json({error:'Atendimento não encontrado.'},404);

  let b;try{b=await request.json()}catch{return json({error:'JSON inválido.'},400)}
  const resultado=String(b.resultado||'').trim();
  if(!['realizado','falta','cancelado'].includes(resultado))return json({error:'Resultado inválido.'},400);

  if(resultado==='cancelado'){
    if(!access.organizador&&!access.administrador)return json({error:'Apenas Organizador ou Administrador pode cancelar e devolver o paciente à fila.'},403);
    if(!access.administrador){
      const membro=await isEquipeMember(env,user,Number(row.equipe_id),access);
      if(!membro)return json({error:'Atendimento fora da sua equipe.'},403);
    }
  }else{
    if(!access.executor&&!access.administrador)return json({error:'Apenas Executor ou Administrador pode registrar realização ou falta.'},403);
    if(!access.administrador&&row.principal_id!==principalId(user))return json({error:'Atendimento vinculado a outro profissional.'},403);
  }

  const situacaoAgenda=resultado==='realizado'?'realizado':resultado==='cancelado'?'cancelado':'realizado';
  await env.DB_REGULACAO.prepare('UPDATE agenda_individuais SET situacao=? WHERE id=?').bind(situacaoAgenda,id).run();
  await env.DB_REGULACAO.prepare(`
    INSERT INTO regulacao_execucoes_administrativas(tipo,referencia_id,guia_id,resultado,observacao_administrativa,registrado_por_principal)
    VALUES('individual',?,?,?,?,?)
  `).bind(String(id),row.guia_id,resultado,String(b.observacao_administrativa||'').trim()||null,principalId(user)).run();

  if(resultado==='realizado'){
    await env.DB_REGULACAO.prepare("UPDATE guias SET situacao='concluido',updated_at=datetime('now') WHERE id=?").bind(row.guia_id).run();
  }else{
    await env.DB_REGULACAO.prepare("UPDATE guias SET situacao='lista_espera',updated_at=datetime('now') WHERE id=?").bind(row.guia_id).run();
  }
  await logAudit(env,user,'update','agenda_individual',id,{resultado});
  return json({ok:true});
}
