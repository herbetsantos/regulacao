import { json } from './_utils.js';
import { requireRegulacaoAccess } from './_shared.js';
export async function onRequestGet({request,env}){const{error}=await requireRegulacaoAccess(request,env);if(error)return error;return json({links:[],aviso:'Links compartilhados do Portal foram removidos da integração da eMulti 2.26.0.'})}
