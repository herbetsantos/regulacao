import { json,getAuthUser } from './_utils.js';
export async function onRequestPost({request,env}){const u=await getAuthUser(request,env);if(!u)return json({error:'Não autenticado.'},401);return json({error:'A senha é gerenciada exclusivamente pelo Portal APS. Altere-a no Portal e depois retorne ao eMulti.',codigo:'SENHA_GERENCIADA_PELO_PORTAL'},409)}
