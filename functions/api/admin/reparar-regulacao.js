// POST /api/admin/reparar-regulacao
// Cria somente as tabelas/índices ausentes no DB_REGULACAO. Não apaga dados.

import { json, logAudit } from '../_utils.js';
import { requireAdminAccess } from '../_shared.js';
import { ensureRegulacaoSchema } from '../_db.js';

export async function onRequestPost({ request, env }) {
  const { user, error } = await requireAdminAccess(request, env);
  if (error) return error;

  try {
    const status = await ensureRegulacaoSchema(env);
    await logAudit(env, user, 'repair', 'regulacao_schema', 'DB_REGULACAO', {
      tabelas_faltantes_apos_reparo: status.tabelasFaltantes,
    });
    return json({
      ok: status.schemaOk,
      mensagem: status.schemaOk
        ? 'Estrutura do banco da Regulação verificada/corrigida sem apagar dados.'
        : 'A correção foi executada, mas ainda há estruturas pendentes.',
      status,
    });
  } catch (err) {
    return json({
      error: 'Não foi possível corrigir a estrutura do banco da Regulação.',
      detalhe: String(err?.message || ''),
    }, 503);
  }
}
