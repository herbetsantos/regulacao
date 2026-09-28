import { json, logAudit } from '../../_utils.js';
import { requireRegulacaoAccess, isEquipeMember } from '../../_shared.js';
import {
  canOrganizeAssistentialProfessional,
  defaultDuration,
  validDate,
  validTime,
  ensureWithinScale,
  ensureProfessionalAvailable,
} from '../../agenda/_agenda.js';

async function loadGuia(env, id) {
  return env.DB_REGULACAO.prepare('SELECT * FROM guias WHERE id=?').bind(Number(id)).first();
}

export async function onRequestPost({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.administrador) {
    return json({ error: 'Apenas Organizador ou Administrador pode organizar o atendimento.' }, 403);
  }

  const id = Number(params.id);
  const guia = await loadGuia(env, id);
  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);
  if (guia.situacao !== 'lista_espera') {
    return json({ error: 'Somente guias em Lista de espera podem iniciar um novo atendimento.' }, 409);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido.' }, 400); }

  const tipo = String(body.tipo || '').trim();
  if (!['individual', 'grupo'].includes(tipo)) {
    return json({ error: 'Selecione o tipo de atendimento: individual ou grupo.' }, 400);
  }

  if (tipo === 'individual') {
    const profissionalId = String(body.profissional_id || '').trim();
    const equipeId = Number(body.equipe_id);
    const unidadeCode = String(body.unidade_code || '').trim();
    const dataAtendimento = String(body.data_atendimento || '');
    const horaInicio = String(body.hora_inicio || '');

    if (!profissionalId || !equipeId || !unidadeCode || !validDate(dataAtendimento) || !validTime(horaInicio)) {
      return json({ error: 'Profissional, equipe, unidade, data e horário são obrigatórios.' }, 400);
    }
    if (guia.equipe_id == null) {
      return json({ error: 'A guia ainda não possui equipe responsável. Defina a responsabilidade antes de organizar o atendimento.' }, 409);
    }
    if (Number(guia.equipe_id) !== equipeId) {
      return json({ error: 'A guia pertence a outra equipe. Transfira-a antes de organizar o atendimento.' }, 409);
    }
    if (!guia.unidade_executante_code) {
      return json({ error: 'A guia ainda não possui unidade executante. Defina a unidade antes de organizar o atendimento.' }, 409);
    }
    if (String(guia.unidade_executante_code) !== unidadeCode) {
      return json({ error: 'A unidade selecionada é diferente da unidade executante definida na guia.' }, 409);
    }

    const chk = await canOrganizeAssistentialProfessional(
      env, user, access, equipeId, profissionalId, guia.especialidade_id, unidadeCode
    );
    if (chk.error) return chk.error;

    const duracaoMinutos = await defaultDuration(env, guia.especialidade_id);
    const scale = await ensureWithinScale(
      env, profissionalId, guia.especialidade_id, equipeId, unidadeCode,
      dataAtendimento, horaInicio, duracaoMinutos
    );
    if (scale.error) return scale.error;

    const available = await ensureProfessionalAvailable(
      env, profissionalId, dataAtendimento, horaInicio, duracaoMinutos,
      null, scale.intervalo_entre_atendimentos_min
    );
    if (available.error) return available.error;

    const [existingIndividual, existingGroup] = await Promise.all([
      env.DB_REGULACAO.prepare(`
        SELECT id FROM agenda_individuais
        WHERE guia_id=? AND situacao<>'cancelado'
        LIMIT 1
      `).bind(id).first(),
      env.DB_REGULACAO.prepare(`
        SELECT grupo_id FROM agenda_grupo_pacientes
        WHERE guia_id=? AND status='ativo'
        LIMIT 1
      `).bind(id).first(),
    ]);
    if (existingIndividual || existingGroup) {
      return json({ error: 'Esta guia já possui uma organização assistencial ativa.' }, 409);
    }

    const results = await env.DB_REGULACAO.batch([
      env.DB_REGULACAO.prepare(`
        INSERT INTO agenda_individuais (
          guia_id, profissional_user_id, profissional_id, especialidade_id,
          equipe_id, unidade_code, data_atendimento, hora_inicio,
          duracao_minutos, observacao, created_by
        )
        VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, profissionalId, guia.especialidade_id, equipeId, unidadeCode,
        dataAtendimento, horaInicio, duracaoMinutos,
        String(body.observacao || '').trim() || null, user.id
      ),
      env.DB_REGULACAO.prepare(`
        UPDATE guias
        SET situacao='em_atendimento',
            equipe_id=?,
            unidade_executante_code=?,
            updated_at=datetime('now')
        WHERE id=?
      `).bind(equipeId, unidadeCode, id),
    ]);

    const agendaId = results[0]?.meta?.last_row_id || null;
    await logAudit(env, user, 'create', 'guia_atendimento', id, {
      tipo,
      agenda_individual_id: agendaId,
      profissionalId,
      equipeId,
      unidadeCode,
      dataAtendimento,
      horaInicio,
      duracaoMinutos,
    });

    return json({
      ok: true,
      tipo,
      id: agendaId,
      duracao_minutos: duracaoMinutos,
    }, 201);
  }

  const grupoId = Number(body.grupo_id);
  if (!grupoId) return json({ error: 'Selecione o grupo de atendimento.' }, 400);

  const grupo = await env.DB_REGULACAO.prepare(`
    SELECT * FROM agenda_grupos
    WHERE id=? AND ativo=1
  `).bind(grupoId).first();
  if (!grupo) return json({ error: 'Grupo não encontrado ou inativo.' }, 404);

  if (!access.administrador) {
    const membro = await isEquipeMember(env, user, Number(grupo.equipe_id), access);
    if (!membro) return json({ error: 'Grupo fora da sua equipe.' }, 403);
  }

  if (Number(guia.especialidade_id) !== Number(grupo.especialidade_id)) {
    return json({ error: 'A especialidade da guia é diferente da especialidade do grupo.' }, 409);
  }
  if (guia.equipe_id == null) {
    return json({ error: 'A guia ainda não possui equipe responsável. Defina a responsabilidade antes de organizar o atendimento.' }, 409);
  }
  if (Number(guia.equipe_id) !== Number(grupo.equipe_id)) {
    return json({ error: 'A guia pertence a outra equipe. Transfira-a antes de incluí-la no grupo.' }, 409);
  }
  if (!guia.unidade_executante_code) {
    return json({ error: 'A guia ainda não possui unidade executante. Defina a unidade antes de incluí-la no grupo.' }, 409);
  }
  if (String(guia.unidade_executante_code) !== String(grupo.unidade_code)) {
    return json({ error: 'O grupo está em unidade diferente da unidade executante definida na guia.' }, 409);
  }

  const ocupacao = await env.DB_REGULACAO.prepare(`
    SELECT COUNT(*) AS c
    FROM agenda_grupo_pacientes
    WHERE grupo_id=? AND status='ativo'
  `).bind(grupoId).first();
  if (Number(ocupacao?.c || 0) >= Number(grupo.capacidade)) {
    return json({ error: 'O grupo atingiu sua capacidade.' }, 409);
  }

  const [outraAlocacao, individualAtivo] = await Promise.all([
    env.DB_REGULACAO.prepare(`
      SELECT grupo_id
      FROM agenda_grupo_pacientes
      WHERE guia_id=? AND status='ativo'
      LIMIT 1
    `).bind(id).first(),
    env.DB_REGULACAO.prepare(`
      SELECT id FROM agenda_individuais
      WHERE guia_id=? AND situacao<>'cancelado'
      LIMIT 1
    `).bind(id).first(),
  ]);
  if (outraAlocacao || individualAtivo) {
    return json({ error: 'Esta guia já possui uma organização assistencial ativa.' }, 409);
  }

  await env.DB_REGULACAO.batch([
    env.DB_REGULACAO.prepare(`
      INSERT INTO agenda_grupo_pacientes(grupo_id,guia_id,status,added_by)
      VALUES(?,?,'ativo',?)
      ON CONFLICT(grupo_id,guia_id) DO UPDATE SET
        status='ativo',
        entrada_em=datetime('now'),
        saida_em=NULL,
        motivo_saida=NULL,
        added_by=excluded.added_by
    `).bind(grupoId, id, user.id),
    env.DB_REGULACAO.prepare(`
      UPDATE guias
      SET situacao='em_atendimento',
          equipe_id=?,
          unidade_executante_code=?,
          updated_at=datetime('now')
      WHERE id=?
    `).bind(grupo.equipe_id, grupo.unidade_code, id),
  ]);

  await logAudit(env, user, 'create', 'guia_atendimento', id, {
    tipo,
    grupoId,
    equipeId: grupo.equipe_id,
    unidadeCode: grupo.unidade_code,
  });

  return json({ ok: true, tipo, grupo_id: grupoId }, 201);
}
