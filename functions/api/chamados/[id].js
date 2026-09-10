import { json,getAuthUser } from '../_utils.js';
export async function onRequestPut({request,env}){const u=await getAuthUser(request,env);if(!u)return json({error:'Não autenticado.'},401);return json({error:'Chamados são administrados no Portal APS.',codigo:'RECURSO_NO_PORTAL'},410)}
