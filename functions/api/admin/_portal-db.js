// Mantido apenas para compatibilidade de imports antigos. Desde 2.26.0 o
// Portal não hospeda a estrutura operacional da Regulação.
export const PORTAL_TARGET_VERSION='auth-only';
export async function getPortalSchemaStatus(){return{schemaOk:true,tabelasFaltantes:[],modo:'auth-only'}}
export async function ensurePortalSchema(){return getPortalSchemaStatus()}
