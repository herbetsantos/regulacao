// eMulti / Regulação 2.25.0
// Nova gravação de evolução clínica bloqueada. Dados legados permanecem preservados no banco.
import { json } from '../../_utils.js';
import { requireRegulacaoAccess } from '../../_shared.js';
export async function onRequestPost({request,env}){const {error}=await requireRegulacaoAccess(request,env);if(error)return error;return json({error:'Evolução clínica deve ser registrada no PEC e-SUS. O eMulti mantém somente informações administrativas da Regulação.',codigo:'REGISTRO_CLINICO_NO_PEC'},410)}
