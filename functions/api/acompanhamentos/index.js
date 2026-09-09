// eMulti / Regulação 2.25.0
// Acompanhamentos clínicos foram descontinuados. O PEC e-SUS é o prontuário oficial.
import { json } from '../_utils.js';
import { requireRegulacaoAccess } from '../_shared.js';
export async function onRequestPost({request,env}){const {error}=await requireRegulacaoAccess(request,env);if(error)return error;return json({error:'Registro clínico desativado no eMulti. Evolução, conduta e procedimentos devem ser registrados no PEC e-SUS.',codigo:'REGISTRO_CLINICO_NO_PEC'},410)}
