// eMulti / Regulação 2.26.0
// Acompanhamentos clínicos legados não são mais expostos pelo módulo.
// O PEC e-SUS permanece como prontuário oficial.
import { json } from '../_utils.js';
import { requireRegulacaoAccess } from '../_shared.js';

export async function onRequestGet({request,env}){
  const {error}=await requireRegulacaoAccess(request,env);if(error)return error;
  return json({
    error:'Consulta de evolução/acompanhamento clínico desativada no eMulti. Consulte o prontuário oficial no PEC e-SUS.',
    codigo:'REGISTRO_CLINICO_NO_PEC'
  },410);
}
