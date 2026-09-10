import { json,getCookie,clearSessionCookieHeader } from './_utils.js';
export async function onRequestPost({request,env}){const token=getCookie(request,'emulti_session');if(token)await env.DB_REGULACAO.prepare('DELETE FROM regulacao_auth_sessions WHERE token=?').bind(token).run().catch(()=>{});return json({ok:true},200,{'Set-Cookie':clearSessionCookieHeader()})}
