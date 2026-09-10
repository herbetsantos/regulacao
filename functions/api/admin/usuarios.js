import { json } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
export async function onRequestGet({request,env}){const{error}=await requireAdminAccess(request,env);if(error)return error;const{results}=await env.DB_REGULACAO.prepare('SELECT principal_id,portal_user_id id,username,name,portal_role role,active FROM regulacao_principals ORDER BY name').all();return json({usuarios:results||[],fonte:'regulacao_principals'})}
