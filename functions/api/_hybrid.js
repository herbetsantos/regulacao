// Identidade principal — 2.26.0.
// A única origem de login ativa é o Portal APS.
export function principalId(user){if(!user)return null;if(user.principalId)return user.principalId;if(user.id!=null)return `portal:${user.id}`;return null}
export function parsePrincipalId(value){const raw=String(value||'');const m=raw.match(/^portal:(\d+)$/);return m?{source:'portal',id:m[1]}:null}
