import { json } from '../../_utils.js';
export async function onRequestGet(){return json({error:'Credenciais próprias foram desativadas na 2.26.1. O login é exclusivo pelo Portal APS.',codigo:'LOGIN_PORTAL_OBRIGATORIO'},410)}
export async function onRequestPost(){return json({error:'Crie/gerencie a conta no Portal APS e depois vincule-a na Regulação.',codigo:'LOGIN_PORTAL_OBRIGATORIO'},410)}
