import { json } from '../../_utils.js';
export async function onRequestPut(){return json({error:'Credenciais próprias foram desativadas. Alterações de conta e senha devem ser feitas no Portal APS.',codigo:'LOGIN_PORTAL_OBRIGATORIO'},410)}
