import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoAccess, getUserEquipeIds } from '../../_shared.js';
import { principalId } from '../../_hybrid.js';
import {
  canOrganizeAssistentialProfessional,
  defaultDuration,
  validDate,
  validTime,
  ensureWithinScale,
  ensureProfessionalAvailable,
} from '../_agenda.js';

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.executor && !access.administrador) {
    return json({ error: 'Sem acesso aos atendimentos individuais.' }, 403);
  }

  const url = new URL(request.url);
  const requestedProf = String(url.searchParams.get('profissional_id') || '').trim();

  let sql = `
    SELECT ai.*, g.codigo_guia, g.situacao AS guia_situacao,
           p.nome AS paciente_nome, e.nome AS especialidade_nome,
           rp.nome AS profissional_nome
    FROM agenda_individuais ai
    JOIN guias g ON g.id = ai.guia_id
    JOIN pacientes p ON p.cpf = g.cpf
    JOIN especialidades e ON e.id = ai.especialidade_id
    LEFT JOIN regulacao_profissionais rp ON rp.id=ai.profissional_id
    WHERE 1=1`;
  const binds = [];

  if (access.administrador) {
    if (requestedProf) {
      sql += ' AND ai.profissional_id=?';
      binds.push(requestedProf);
    }
  } else if (access.organizador) {
    const equipes = await getUserEquipeIds(env, user);
    if (!equipes.length) return json({ atendimentos: [] });
    sql += ` AND ai.equipe_id IN (${equipes.map(() => '?').join(',')})`;
    binds.push(...equipes.map(Number));
    if (requestedProf) {
      sql += ' AND ai.profissional_id=?';
      binds.push(requestedProf);
    }
  } else {
    sql += ' AND rp.principal_id=?';
    binds.push(principalId(user));
  }

  sql += ' ORDER BY ai.data_atendimento DESC, ai.hora_inicio DESC LIMIT 150';
  const stmt = env.DB_REGULACAO.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return json({ atendimentos: results || [] });
}

export async function onRequestPost({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.administrador) {
    return json({ error: 'Apenas Organizador ou Administrador pode agendar atendimento.' }, 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido.' }, 400); }

  const guiaId = Number(body.guia_id);
  const profissionalId = String(body.profissional_id || '').trim();
  const equipeId = Number(body.equipe_id);
  const unidadeCode = String(body.unidade_code || '').trim();
  const dataAtendimento = String(body.data_atendimento || '');
  const horaInicio = String(body.hora_inicio || '');
  const blocos = Math.max(1, Math.min(8, Number(body.blocos || 1)));

  const guia = await env.DB_REGULACAO.prepare(
    'SELECT * FROM guias WHERE id = ?'
  ).bind(guiaId).first();

  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);
  if (guia.situacao !== 'lista_espera') {
    return json({ error: 'Somente guias em Lista de espera podem ser agendadas.' }, 409);
  }
  if (!profissionalId || !equipeId || !unidadeCode) {
    return json({ error: 'Profissional, equipe e unidade são obrigatórios.' }, 400);
  }
  if (!validDate(dataAtendimento) || !validTime(horaInicio)) {
    return json({ error: 'Data ou horário inválido.' }, 400);
  }
  if (guia.equipe_id != null && Number(guia.equipe_id) !== equipeId) {
    return json({ error: 'A guia pertence a outra equipe. Transfira-a antes na Regulação.' }, 409);
  }

  const chk = await canOrganizeAssistentialProfessional(
    env, user, access, equipeId, profissionalId, guia.especialidade_id, unidadeCode
  );
  if (chk.error) return chk.error;

  const duracaoMinutos = (await defaultDuration(env, guia.especialidade_id)) * blocos;

  const scale = await ensureWithinScale(
    env, profissionalId, guia.especialidade_id, equipeId, unidadeCode,
    dataAtendimento, horaInicio, duracaoMinutos
  );
  if (scale.error) return scale.error;

  const available = await ensureProfessionalAvailable(
    env, profissionalId, dataAtendimento, horaInicio, duracaoMinutos
  );
  if (available.error) return available.error;

  const existing = await env.DB_REGULACAO.prepare(`
    SELECT id FROM agenda_individuais
    WHERE guia_id=? AND situacao<>'cancelado'
    LIMIT 1
  `).bind(guiaId).first();
  if (existing) return json({ error: 'Esta guia já possui atendimento individual agendado.' }, 409);

  const result = await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_individuais (
      guia_id, profissional_user_id, profissional_id, especialidade_id,
      equipe_id, unidade_code, data_atendimento, hora_inicio,
      duracao_minutos, observacao, created_by
    )
    VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    guiaId, profissionalId, guia.especialidade_id, equipeId, unidadeCode,
    dataAtendimento, horaInicio, duracaoMinutos,
    String(body.observacao || '').trim() || null, user.id
  ).run();

  await env.DB_REGULACAO.prepare(`
    UPDATE guias
    SET situacao='em_atendimento',
        equipe_id=?,
        unidade_executante_code=?,
        updated_at=datetime('now')
    WHERE id=?
  `).bind(equipeId, unidadeCode, guiaId).run();

  await logAudit(env, user, 'create', 'agenda_individual', result.meta.last_row_id, {
    guiaId, profissionalId, duracaoMinutos, equipeId, unidadeCode
  });

  return json({
    id: result.meta.last_row_id,
    duracao_minutos: duracaoMinutos
  }, 201);
}
