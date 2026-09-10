import { json } from '../../_utils.js';
export async function onRequestGet(){return json({error:'O pré-cadastro legado do Portal foi descontinuado. Use Administração → Profissionais.',codigo:'RECURSO_LEGADO'},410)}
export async function onRequestPost(){return json({error:'Use Administração → Profissionais.',codigo:'RECURSO_LEGADO'},410)}
export async function onRequestPut(){return json({error:'Use Administração → Profissionais.',codigo:'RECURSO_LEGADO'},410)}
