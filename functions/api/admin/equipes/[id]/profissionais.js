// Endpoint legado. Na 2.26.0 o vínculo oficial é Profissional ↔ Equipes em regulacao_profissional_equipes.
import { json } from '../../../_utils.js';
import { requireGestorAccess } from '../../../_shared.js';
export async function onRequestGet({request,env,params}){const{error}=await requireGestorAccess(request,env);if(error)return error;const equipeId=Number(params.id);const{results}=await env.DB_REGULACAO.prepare(`SELECT p.id,p.nome,p.principal_id,pe.is_principal FROM regulacao_profissional_equipes pe JOIN regulacao_profissionais p ON p.id=pe.profissional_id AND p.ativo=1 WHERE pe.equipe_id=? ORDER BY p.nome`).bind(equipeId).all();return json({profissionais:results||[]})}
export async function onRequestPost(){return json({error:'Use Administração → Profissionais para vincular equipes. O vínculo legado usuário×equipe foi encerrado na 2.26.0.',codigo:'ENDPOINT_LEGADO'},410)}
export async function onRequestPut(){return json({error:'Use Administração → Profissionais para vincular equipes.',codigo:'ENDPOINT_LEGADO'},410)}
export async function onRequestDelete(){return json({error:'Use Administração → Profissionais para remover o vínculo de equipe.',codigo:'ENDPOINT_LEGADO'},410)}
