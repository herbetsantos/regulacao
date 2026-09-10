import { json } from '../_utils.js';
export async function onRequestGet(){return json({links:[],aviso:'Configuração de links pertence ao Portal APS.'})}
export async function onRequestPost(){return json({error:'Configuração de links pertence ao Portal APS.'},410)}
