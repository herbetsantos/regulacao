import { json,getAuthUser } from '../_utils.js';
export async function onRequestGet({request,env}){const u=await getAuthUser(request,env);if(!u)return json({error:'Não autenticado.'},401);return json({error:'Chamados permanecem no Portal APS e não fazem parte do banco da Regulação.',codigo:'RECURSO_NO_PORTAL'},410)}
export async function onRequestPost({request,env}){const u=await getAuthUser(request,env);if(!u)return json({error:'Não autenticado.'},401);return json({error:'Abra o chamado pelo Portal APS.',codigo:'RECURSO_NO_PORTAL'},410)}
