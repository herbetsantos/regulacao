import { json } from '../_utils.js';
import { requireGestorAccess } from '../_shared.js';

export async function onRequestGet({request,env}){
  const {error}=await requireGestorAccess(request,env);if(error)return error;
  const [unitsResp,metricsResp,accessResp]=await Promise.all([
    env.DB_REGULACAO.prepare('SELECT code,nome,tipo,ativo FROM regulacao_unidades ORDER BY ativo DESC,nome').all(),
    env.DB_REGULACAO.prepare(`SELECT v.unidade_code,COUNT(DISTINCT p.id) profissionais,COUNT(DISTINCT v.especialidade_id) especialidades,ROUND(COALESCE(SUM(v.carga_horaria_semanal),0),2) horas FROM regulacao_profissional_vinculos v JOIN regulacao_profissionais p ON p.id=v.profissional_id AND p.ativo=1 WHERE v.ativo=1 AND v.unidade_code IS NOT NULL GROUP BY v.unidade_code`).all(),
    env.DB_REGULACAO.prepare('SELECT unidade_code,COUNT(DISTINCT principal_id) cadastrantes FROM regulacao_principal_unidades WHERE pode_emitir=1 GROUP BY unidade_code').all(),
  ]);
  const metrics=new Map((metricsResp.results||[]).map(r=>[r.unidade_code,r]));
  const access=new Map((accessResp.results||[]).map(r=>[r.unidade_code,Number(r.cadastrantes||0)]));
  const unidades=(unitsResp.results||[]).map(u=>{const m=metrics.get(u.code)||{};return{...u,profissionais:Number(m.profissionais||0),especialidades:Number(m.especialidades||0),horas:Number(m.horas||0),cadastrantes:access.get(u.code)||0}});
  return json({unidades});
}
