import { json } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';

const APP_VERSION = '2.18.2';

async function readDbVersion(db) {
  if (!db) return { ok:false, version:null, updated_at:null };
  try {
    const row = await db.prepare('SELECT version, updated_at FROM emulti_schema_version WHERE id = 1').first();
    return { ok:!!row, version:row?.version || null, updated_at:row?.updated_at || null };
  } catch {
    return { ok:false, version:null, updated_at:null };
  }
}

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdminAccess(request, env);
  if (error) return error;
  const [portal, regulacao] = await Promise.all([
    readDbVersion(env.DB),
    readDbVersion(env.DB_REGULACAO),
  ]);
  return json({
    app_version: APP_VERSION,
    portal,
    regulacao,
    atualizado: portal.version === APP_VERSION && regulacao.version === APP_VERSION,
  });
}
