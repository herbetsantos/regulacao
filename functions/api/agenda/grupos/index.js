import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoAccess } from '../../_shared.js';
import { canManageProfessional, defaultDuration, validDate, validTime } from '../_agenda.js';

function datesBetween(start, end, dow) {
  const out = [];
  let d = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (d <= last) {
    const current = d.getDay() === 0 ? 7 : d.getDay();
    if (current === dow) out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export async function onRequestGet({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  let sql = `
    SELECT ag.*, e.nome AS especialidade_nome,
      (SELECT COUNT(*) FROM agenda_grupo_pacientes gp WHERE gp.grupo_id = ag.id AND gp.status = 'ativo') AS pacientes_ativos,
      (SELECT COUNT(*) FROM agenda_grupo_encontros ge WHERE ge.grupo_id = ag.id AND ge.situacao = 'programado') AS encontros_futuros
    FROM agenda_grupos ag JOIN especialidades e ON e.id = ag.especialidade_id
    WHERE ag.ativo = 1`;
  const binds = [];
  if (!access.administrador && !access.regulador) { sql += ' AND ag.profissional_user_id = ?'; binds.push(user.id); }
  sql += ' ORDER BY ag.created_at DESC';
  const stmt = env.DB_REGULACAO.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return json({ grupos: results || [] });
}

export async function onRequestPost({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.executor && !access.administrador) return json({ error: 'Apenas Executor ou Administrador pode criar grupos.' }, 403);
  let body; try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const nome = String(body.nome || '').trim();
  const profissionalId = Number(body.profissional_user_id || user.id);
  const especialidadeId = Number(body.especialidade_id);
  const equipeId = Number(body.equipe_id);
  const unidadeCode = String(body.unidade_code || '').trim();
  const capacidade = Math.max(1, Math.min(100, Number(body.capacidade || 8)));
  const blocos = Math.max(1, Math.min(8, Number(body.blocos || 1)));
  if (!nome || !especialidadeId || !equipeId || !unidadeCode) return json({ error: 'Nome, especialidade, equipe e unidade são obrigatórios.' }, 400);
  const chk = await canManageProfessional(env, user, access, equipeId, profissionalId, especialidadeId, unidadeCode);
  if (chk.error) return chk.error;
  const duracaoMinutos = (await defaultDuration(env, especialidadeId)) * blocos;
  const result = await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_grupos (nome, profissional_user_id, especialidade_id, equipe_id, unidade_code, capacidade, duracao_minutos, observacao, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(nome, profissionalId, especialidadeId, equipeId, unidadeCode, capacidade, duracaoMinutos, String(body.observacao || '').trim() || null, user.id).run();
  const grupoId = result.meta.last_row_id;

  const dataInicio = String(body.data_inicio || '');
  if (dataInicio) {
    const dataFim = String(body.data_fim || dataInicio);
    const diaSemana = Number(body.dia_semana);
    const horaInicio = String(body.hora_inicio || '');
    if (!validDate(dataInicio) || !validDate(dataFim) || !validTime(horaInicio) || diaSemana < 1 || diaSemana > 7 || dataFim < dataInicio) {
      await env.DB_REGULACAO.prepare('DELETE FROM agenda_grupos WHERE id = ?').bind(grupoId).run();
      return json({ error: 'Rotina do grupo inválida.' }, 400);
    }
    for (const data of datesBetween(dataInicio, dataFim, diaSemana)) {
      await env.DB_REGULACAO.prepare(`
        INSERT INTO agenda_grupo_encontros (grupo_id, data_encontro, hora_inicio, duracao_minutos, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).bind(grupoId, data, horaInicio, duracaoMinutos, user.id).run();
    }
  }
  await logAudit(env, user, 'create', 'agenda_grupo', grupoId, { nome, profissionalId, especialidadeId, capacidade, duracaoMinutos });
  return json({ id: grupoId }, 201);
}
