import { json, logAudit } from '../../../_utils.js';
import { requireRegulacaoAccess, isEquipeMember } from '../../../_shared.js';
import {
  validDate,
  validTime,
  ensureWithinScale,
  ensureProfessionalAvailable,
} from '../../_agenda.js';

export async function onRequestPost({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.administrador) {
    return json({ error: 'Apenas Organizador ou Administrador pode programar encontros.' }, 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido.' }, 400); }

  const grupoId = Number(params.id);
  const data = String(body.data_encontro || '');
  const hora = String(body.hora_inicio || '');

  const grupo = await env.DB_REGULACAO.prepare(
    'SELECT * FROM agenda_grupos WHERE id=? AND ativo=1'
  ).bind(grupoId).first();

  if (!grupo) return json({ error: 'Grupo não encontrado.' }, 404);

  if (!access.administrador) {
    const membro = await isEquipeMember(env, user, Number(grupo.equipe_id), access);
    if (!membro) return json({ error: 'Grupo fora da sua equipe.' }, 403);
  }

  if (!validDate(data) || !validTime(hora)) {
    return json({ error: 'Data ou horário inválido.' }, 400);
  }

  const duracao = Math.max(5, Number(body.duracao_minutos || grupo.duracao_minutos));

  const { results: profissionais } = await env.DB_REGULACAO.prepare(`
    SELECT profissional_id
    FROM agenda_grupo_profissionais
    WHERE grupo_id=?
  `).bind(grupoId).all();

  if (!(profissionais || []).length) {
    return json({ error: 'O grupo ainda não possui profissionais vinculados.' }, 409);
  }

  for (const p of profissionais || []) {
    const scale = await ensureWithinScale(
      env, p.profissional_id, grupo.especialidade_id, grupo.equipe_id,
      grupo.unidade_code, data, hora, duracao
    );
    if (scale.error) return scale.error;

    const available = await ensureProfessionalAvailable(
      env, p.profissional_id, data, hora, duracao, grupoId
    );
    if (available.error) return available.error;
  }

  const result = await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_grupo_encontros(
      grupo_id,data_encontro,hora_inicio,duracao_minutos,observacao,created_by
    )
    VALUES(?,?,?,?,?,?)
  `).bind(
    grupoId, data, hora, duracao,
    String(body.observacao || '').trim() || null,
    user.id
  ).run();

  await logAudit(env, user, 'create', 'grupo_encontro', result.meta.last_row_id, {
    grupoId, data, hora, duracao
  });

  return json({ id: result.meta.last_row_id }, 201);
}
