import { json } from '../_utils.js';
import { requireGestorAccess } from '../_shared.js';

export async function onRequestGet({request,env}){
  const {error}=await requireGestorAccess(request,env);if(error)return error;
  const [teamsResp,teamUnitsResp,allUnitsResp,profResp,userResp]=await Promise.all([
    env.DB.prepare('SELECT id,nome,ativo FROM regulacao_equipes ORDER BY nome').all(),
    env.DB.prepare(`SELECT eu.equipe_id,u.code,u.nome FROM regulacao_equipe_unidades eu JOIN unidades u ON u.code=eu.unidade_code ORDER BY eu.equipe_id,u.nome`).all(),
    env.DB.prepare('SELECT code,nome,tipo FROM unidades WHERE ativo=1 ORDER BY nome').all(),
    env.DB_REGULACAO.prepare(`SELECT pe.equipe_id,COUNT(DISTINCT p.id) profissionais,ROUND(COALESCE(SUM(CASE WHEN v.ativo=1 THEN v.carga_horaria_semanal ELSE 0 END),0),2) horas FROM regulacao_profissional_equipes pe JOIN regulacao_profissionais p ON p.id=pe.profissional_id AND p.ativo=1 LEFT JOIN regulacao_profissional_vinculos v ON v.profissional_id=p.id GROUP BY pe.equipe_id`).all(),
    env.DB_REGULACAO.prepare('SELECT equipe_id,COUNT(*) usuarios FROM regulacao_principal_equipes GROUP BY equipe_id').all(),
  ]);
  const unitMap=new Map();for(const r of teamUnitsResp.results||[]){if(!unitMap.has(r.equipe_id))unitMap.set(r.equipe_id,[]);unitMap.get(r.equipe_id).push({code:r.code,nome:r.nome})}
  const profMap=new Map((profResp.results||[]).map(r=>[Number(r.equipe_id),r]));
  const userMap=new Map((userResp.results||[]).map(r=>[Number(r.equipe_id),Number(r.usuarios||0)]));
  const equipes=(teamsResp.results||[]).map(t=>{const m=profMap.get(Number(t.id))||{};return{...t,unidades:unitMap.get(t.id)||[],profissionais:Number(m.profissionais||0),horas:Number(m.horas||0),usuarios:userMap.get(Number(t.id))||0}});
  return json({equipes,unidades_disponiveis:allUnitsResp.results||[]});
}
