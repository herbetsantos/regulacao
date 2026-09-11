import { json } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
export async function onRequestGet({request,env}){const{error}=await requireAdminAccess(request,env);if(error)return error;let version=null;try{version=(await env.DB_REGULACAO.prepare('SELECT version FROM emulti_schema_version WHERE id=1').first())?.version||null}catch{}return json({emulti:'2.26.4',regulacao_db:version,portal_integration:'optional-login-only',internal_login:true})}
