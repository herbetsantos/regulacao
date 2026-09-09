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
  if (!access.organizador && !access.executor && !access.gestor && !access.administrador) {
    return json({ error: 'Sem acesso aos grupos.' }, 403);
  }

  let sql = `
    SELECT ag.*, e.nome AS especialidade_nome,
      (SELECT COUNT(*) FROM agenda_grupo_pacientes gp
       WHERE gp.grupo_id=ag.id AND gp.status='ativo') AS pacientes_ativos,
      (SELECT COUNT(*) FROM agenda_grupo_encontros ge
       WHERE ge.grupo_id=ag.id AND ge.situacao='programado') AS encontros_futuros,
      (SELECT GROUP_CONCAT(rp.nome, ' · ')
       FROM agenda_grupo_profissionais agp
       JOIN regulacao_profissionais rp ON rp.id=agp.profissional_id
       WHERE agp.grupo_id=ag.id) AS profissionais_nomes
    FROM agenda_grupos ag
    JOIN especialidades e ON e.id=ag.especialidade_id
    WHERE ag.ativo=1`;
  const binds = [];

  if (access.administrador || access.gestor) {
    // visão global de gestão
  } else if (access.organizador) {
    const equipes = await getUserEquipeIds(env, user);
    if (!equipes.length) return json({ grupos: [] });
    sql += ` AND ag.equipe_id IN (${equipes.map(() => '?').join(',')})`;
    binds.push(...equipes.map(Number));
  } else {
    sql += `
      AND EXISTS (
        SELECT 1
        FROM agenda_grupo_profissionais agp2
        JOIN regulacao_profissionais rp2 ON rp2.id=agp2.profissional_id
        WHERE agp2.grupo_id=ag.id AND rp2.principal_id=?
      )`;
    binds.push(principalId(user));
  }

  sql += ' ORDER BY ag.created_at DESC';
  const stmt = env.DB_REGULACAO.prepare(sql);
  const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return json({ grupos: results || [] });
}

export async function onRequestPost({ request, env }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.administrador) {
    return json({ error: 'Apenas Organizador ou Administrador pode criar grupos.' }, 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido.' }, 400); }

  const nome = String(body.nome || '').trim();
  const especialidadeId = Number(body.especialidade_id);
  const equipeId = Number(body.equipe_id);
  const unidadeCode = String(body.unidade_code || '').trim();
  const capacidade = Math.max(1, Math.min(100, Number(body.capacidade || 8)));
  const blocos = Math.max(1, Math.min(8, Number(body.blocos || 1)));
  const profissionalIds = [
    ...new Set(
      (Array.isArray(body.profissional_ids) ? body.profissional_ids : [])
        .map((x) => String(x || '').trim())
        .filter(Boolean)
    )
  ];

  if (!nome || !especialidadeId || !equipeId || !unidadeCode || !profissionalIds.length) {
    return json({ error: 'Nome, especialidade, equipe, unidade e ao menos um profissional são obrigatórios.' }, 400);
  }

  for (const profissionalId of profissionalIds) {
    const chk = await canOrganizeAssistentialProfessional(
      env, user, access, equipeId, profissionalId, especialidadeId, unidadeCode
    );
    if (chk.error) return chk.error;
  }

  const duracaoMinutos = (await defaultDuration(env, especialidadeId)) * blocos;
  const dataInicio = String(body.data_inicio || '');
  const dataFim = String(body.data_fim || dataInicio);
  const diaSemana = Number(body.dia_semana);
  const horaInicio = String(body.hora_inicio || '');

  let encontros = [];
  if (dataInicio) {
    if (
      !validDate(dataInicio) || !validDate(dataFim) ||
      !validTime(horaInicio) ||
      diaSemana < 1 || diaSemana > 7 ||
      dataFim < dataInicio
    ) {
      return json({ error: 'Rotina do grupo inválida.' }, 400);
    }
    encontros = datesBetween(dataInicio, dataFim, diaSemana);
    if (!encontros.length) {
      return json({ error: 'A vigência informada não contém nenhum encontro no dia da semana selecionado.' }, 400);
    }

    for (const data of encontros) {
      for (const profissionalId of profissionalIds) {
        const scale = await ensureWithinScale(
          env, profissionalId, especialidadeId, equipeId, unidadeCode,
          data, horaInicio, duracaoMinutos
        );
        if (scale.error) return scale.error;

        const available = await ensureProfessionalAvailable(
          env, profissionalId, data, horaInicio, duracaoMinutos
        );
        if (available.error) return available.error;
      }
    }
  }

  const result = await env.DB_REGULACAO.prepare(`
    INSERT INTO agenda_grupos (
      nome, profissional_user_id, especialidade_id, equipe_id,
      unidade_code, capacidade, duracao_minutos, observacao, created_by
    )
    VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    nome, especialidadeId, equipeId, unidadeCode, capacidade,
    duracaoMinutos, String(body.observacao || '').trim() || null, user.id
  ).run();

  const grupoId = result.meta.last_row_id;

  const ops = [];
  profissionalIds.forEach((profissionalId, index) => {
    ops.push(
      env.DB_REGULACAO.prepare(`
        INSERT INTO agenda_grupo_profissionais(
          grupo_id,profissional_id,papel,responsavel,added_by
        ) VALUES(?,?,?,?,?)
      `).bind(
        grupoId, profissionalId,
        index === 0 ? 'Responsável de referência' : 'Equipe do grupo',
        index === 0 ? 1 : 0,
        String(user.principal_id || user.id)
      )
    );
  });

  for (const data of encontros) {
    ops.push(
      env.DB_REGULACAO.prepare(`
        INSERT INTO agenda_grupo_encontros(
          grupo_id,data_encontro,hora_inicio,duracao_minutos,created_by
        ) VALUES(?,?,?,?,?)
      `).bind(grupoId, data, horaInicio, duracaoMinutos, user.id)
    );
  }

  if (ops.length) await env.DB_REGULACAO.batch(ops);

  await logAudit(env, user, 'create', 'agenda_grupo', grupoId, {
    nome, profissionalIds, especialidadeId, capacidade,
    duracaoMinutos, equipeId, unidadeCode, encontros: encontros.length
  });

  return json({ id: grupoId, encontros_criados: encontros.length }, 201);
}
