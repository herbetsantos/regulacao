import { json, logAudit } from '../../../_utils.js';
import { requireRegulacaoAccess } from '../../../_shared.js';
import { validDate, validTime } from '../../_agenda.js';

export async function onRequestPost({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const grupoId = Number(params.id), data = String(body.data_encontro || ''), hora = String(body.hora_inicio || '');
  const grupo = await env.DB_REGULACAO.prepare('SELECT * FROM agenda_grupos WHERE id = ?').bind(grupoId).first();
  if (!grupo) return json({ error: 'Grupo não encontrado.' }, 404);
  if (!access.administrador && Number(grupo.profissional_user_id) !== Number(user.id)) return json({ error: 'Sem acesso ao grupo.' }, 403);
  if (!validDate(data) || !validTime(hora)) return json({ error: 'Data ou horário inválido.' }, 400);
  const result = await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_grupo_encontros (grupo_id, data_encontro, hora_inicio, duracao_minutos, observacao, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(grupoId, data, hora, Number(body.duracao_minutos || grupo.duracao_minutos), String(body.observacao || '').trim() || null, user.id).run();
  await logAudit(env, user, 'create', 'grupo_encontro', result.meta.last_row_id, { grupoId });
  return json({ id: result.meta.last_row_id }, 201);
}
