// GET   /api/guias/:id  -> detalhe da guia
// PATCH /api/guias/:id  -> decisão regulatória e triagem/transferência de equipe
//
// 2.20.0:
// - Regulador: Lista de espera ou Negado + equipe/unidade;
// - Organizador: profissional/grupo e agenda ficam em /agenda;
// - Executor: realiza o cuidado e registra o desfecho.

import { json, logAudit } from '../_utils.js';
import {
  requireRegulacaoAccess, getRegulacaoScope, isEquipeMember, getEquipeInfo,
  inserirNotificacao,
} from '../_shared.js';

const SITUACOES_VALIDAS = ['aguardando_autorizacao', 'lista_espera', 'em_atendimento', 'concluido', 'negado'];

export async function onRequestGet({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const id = Number(params.id);

  const pacienteInfo = await env.DB_REGULACAO.prepare("PRAGMA table_info('pacientes')").all();
  const pacienteCols = new Set((pacienteInfo.results || []).map((c) => c.name));
  const opcionais = ['cns', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf'];
  const opcionaisSql = opcionais.map((c) =>
    pacienteCols.has(c) ? `p.${c} AS paciente_${c}` : `NULL AS paciente_${c}`
  ).join(', ');

  const guia = await env.DB_REGULACAO.prepare(`
    SELECT g.*,e.nome AS especialidade_nome,
           p.nome AS paciente_nome,p.data_nascimento AS paciente_data_nascimento,
           p.sexo AS paciente_sexo,p.tel1 AS paciente_tel1,p.tel2 AS paciente_tel2,
           p.tel3 AS paciente_tel3,p.unidade_referencia_code AS paciente_unidade_referencia_code,
           p.endereco AS paciente_endereco,${opcionaisSql}
    FROM guias g
    JOIN especialidades e ON e.id=g.especialidade_id
    JOIN pacientes p ON p.cpf=g.cpf
    WHERE g.id=?
  `).bind(id).first();

  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);

  const scope = await getRegulacaoScope(env, user, access);
  const podeTriar = !!(access.regulador || access.administrador);
  const visivel = scope.isAdmin
    || scope.emissoras.includes(guia.unidade_solicitante_code)
    || (guia.unidade_executante_code && scope.executantes.includes(guia.unidade_executante_code))
    || (!guia.unidade_executante_code && podeTriar);
  if (!visivel) return json({ error: 'Você não tem acesso a esta guia.' }, 403);

  const acompanhamento = await env.DB_REGULACAO.prepare(`
    SELECT a.*
    FROM acompanhamentos a
    JOIN acompanhamento_guias ag ON ag.acompanhamento_id=a.id
    WHERE ag.guia_id=?
    ORDER BY a.id DESC LIMIT 1
  `).bind(id).first();

  let equipeAtual = null;
  if (guia.equipe_id) equipeAtual = await getEquipeInfo(env, guia.equipe_id);

  let profissionalAtual = null;
  let grupoAtual = null;

  try {
    const individual = await env.DB_REGULACAO.prepare(`
      SELECT rp.id,rp.nome AS name,rp.registro_profissional AS cargo,
             ai.data_atendimento,ai.hora_inicio
      FROM agenda_individuais ai
      JOIN regulacao_profissionais rp ON rp.id=ai.profissional_id
      WHERE ai.guia_id=? AND ai.situacao<>'cancelado'
      ORDER BY ai.id DESC LIMIT 1
    `).bind(id).first();
    if (individual) profissionalAtual = individual;
  } catch {}

  try {
    grupoAtual = await env.DB_REGULACAO.prepare(`
      SELECT ag.id,ag.nome,ag.unidade_code,
             GROUP_CONCAT(rp.nome, ' · ') AS profissionais
      FROM agenda_grupo_pacientes gp
      JOIN agenda_grupos ag ON ag.id=gp.grupo_id AND ag.ativo=1
      LEFT JOIN agenda_grupo_profissionais agp ON agp.grupo_id=ag.id
      LEFT JOIN regulacao_profissionais rp ON rp.id=agp.profissional_id
      WHERE gp.guia_id=? AND gp.status='ativo'
      GROUP BY ag.id,ag.nome,ag.unidade_code
      ORDER BY ag.id DESC LIMIT 1
    `).bind(id).first();
  } catch {}

  return json({
    guia,
    acompanhamento: acompanhamento || null,
    equipeAtual,
    profissionalAtual,
    grupoAtual,
  });
}

function podeAlterarSituacao(access, situacao) {
  if (access.administrador) return true;
  if (access.regulador && ['lista_espera', 'negado'].includes(situacao)) return true;
  if (access.executor && ['em_atendimento', 'concluido'].includes(situacao)) return true;
  return false;
}

export async function onRequestPatch({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const id = Number(params.id);
  const guia = await env.DB_REGULACAO.prepare(`
    SELECT g.*,p.nome AS paciente_nome
    FROM guias g JOIN pacientes p ON p.cpf=g.cpf
    WHERE g.id=?
  `).bind(id).first();
  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);

  const scope = await getRegulacaoScope(env, user, access);
  const podeTriar = !!(access.regulador || access.administrador);
  const visivel = scope.isAdmin
    || scope.emissoras.includes(guia.unidade_solicitante_code)
    || (guia.unidade_executante_code && scope.executantes.includes(guia.unidade_executante_code))
    || (!guia.unidade_executante_code && podeTriar);
  if (!visivel) return json({ error: 'Você não tem acesso a esta guia.' }, 403);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'JSON inválido.' }, 400); }

  if (body.profissional_responsavel_id !== undefined) {
    return json({
      error: 'A atribuição de profissional deixou de ser uma ação da Regulação. Use Agenda e Atendimentos com perfil Organizador.'
    }, 409);
  }

  const alteraFluxo = body.equipe_id !== undefined || body.unidade_executante_code !== undefined;
  if (alteraFluxo && !access.regulador && !access.administrador) {
    return json({
      error: 'Apenas Reguladores podem triar, transferir ou definir a unidade executante.',
      codigo: 'SEM_PERMISSAO_REGULADOR'
    }, 403);
  }

  const updates = [];
  const binds = [];
  let notificacaoParaEquipeId = null;
  let notificacaoMensagem = null;

  if (body.situacao !== undefined) {
    const situacao = String(body.situacao);
    if (!SITUACOES_VALIDAS.includes(situacao)) return json({ error: 'Situação inválida.' }, 400);
    if (!podeAlterarSituacao(access, situacao)) {
      return json({
        error: access.regulador
          ? 'O Regulador pode encaminhar a guia para Lista de espera ou Negado. Agenda e execução pertencem aos demais perfis.'
          : 'Seu perfil não pode aplicar essa situação.',
        codigo: 'SEM_PERMISSAO_FLUXO'
      }, 403);
    }

    if (situacao === 'em_atendimento' && !access.administrador) {
      const [individual, grupo] = await Promise.all([
        env.DB_REGULACAO.prepare(`
          SELECT 1 ok FROM agenda_individuais
          WHERE guia_id=? AND situacao<>'cancelado' LIMIT 1
        `).bind(id).first(),
        env.DB_REGULACAO.prepare(`
          SELECT 1 ok FROM agenda_grupo_pacientes
          WHERE guia_id=? AND status='ativo' LIMIT 1
        `).bind(id).first(),
      ]);
      if (!individual && !grupo) {
        return json({ error: 'A guia ainda não possui atendimento individual ou grupo organizado na agenda.' }, 409);
      }
    }

    updates.push('situacao=?');
    binds.push(situacao);
  }

  if (body.equipe_id !== undefined) {
    const novaEquipeId = body.equipe_id === null ? null : Number(body.equipe_id);
    const equipeAtualId = guia.equipe_id;

    if (novaEquipeId !== equipeAtualId) {
      if (novaEquipeId === null) {
        return json({ error: 'Não é possível remover a equipe; transfira para outra equipe.' }, 400);
      }

      const equipeDestino = await getEquipeInfo(env, novaEquipeId);
      if (!equipeDestino) return json({ error: 'Equipe destino não encontrada.' }, 400);

      const ehTransferencia = equipeAtualId !== null && equipeAtualId !== undefined;
      if (ehTransferencia) {
        const podeTransferir = await isEquipeMember(env, user, equipeAtualId, access);
        if (!podeTransferir) {
          return json({ error: 'Só a equipe atual da guia, ou Administrador, pode transferi-la.' }, 403);
        }
      } else {
        const podeAssumir = await isEquipeMember(env, user, novaEquipeId, access);
        if (!podeAssumir) {
          return json({ error: 'Só a equipe que está assumindo a guia, ou Administrador, pode fazer a triagem.' }, 403);
        }
      }

      const unidadeExecutante = String(body.unidade_executante_code || '').trim();
      if (!unidadeExecutante) {
        return json({ error: 'Informe a unidade executante.' }, 400);
      }
      if (!equipeDestino.unidades.some((u) => u.code === unidadeExecutante)) {
        return json({ error: `A unidade informada não é atendida pela equipe ${equipeDestino.nome}.` }, 400);
      }

      updates.push('equipe_id=?', 'unidade_executante_code=?');
      binds.push(novaEquipeId, unidadeExecutante);

      if (ehTransferencia) {
        const equipeOrigem = await getEquipeInfo(env, equipeAtualId);
        const motivo = String(body.motivo_transferencia || '').trim();
        notificacaoParaEquipeId = novaEquipeId;
        notificacaoMensagem =
          `Guia ${guia.codigo_guia || '#' + id} (${guia.paciente_nome}) foi transferida ` +
          `da equipe ${equipeOrigem?.nome || '#' + equipeAtualId} para a sua equipe.` +
          (motivo ? ` Motivo: ${motivo}` : '');
      }
    } else if (body.unidade_executante_code !== undefined) {
      const code = String(body.unidade_executante_code || '').trim();
      if (!equipeAtualId) return json({ error: 'Defina a equipe antes da unidade executante.' }, 400);
      const equipeInfo = await getEquipeInfo(env, equipeAtualId);
      if (!code || !equipeInfo?.unidades.some((u) => u.code === code)) {
        return json({ error: 'A unidade informada não é atendida pela equipe desta guia.' }, 400);
      }
      updates.push('unidade_executante_code=?');
      binds.push(code);
    }
  } else if (body.unidade_executante_code !== undefined) {
    const code = String(body.unidade_executante_code || '').trim();
    if (!guia.equipe_id) return json({ error: 'Defina a equipe antes da unidade executante.' }, 400);
    const equipeInfo = await getEquipeInfo(env, guia.equipe_id);
    if (!code || !equipeInfo?.unidades.some((u) => u.code === code)) {
      return json({ error: 'A unidade informada não é atendida pela equipe desta guia.' }, 400);
    }
    updates.push('unidade_executante_code=?');
    binds.push(code);
  }

  if (!updates.length) return json({ error: 'Nada para atualizar.' }, 400);
  updates.push("updated_at=datetime('now')");
  binds.push(id);

  await env.DB_REGULACAO.prepare(
    `UPDATE guias SET ${updates.join(', ')} WHERE id=?`
  ).bind(...binds).run();

  if (notificacaoParaEquipeId) {
    await inserirNotificacao(env, {
      equipeId: notificacaoParaEquipeId,
      guiaId: id,
      tipo: 'transferencia',
      mensagem: notificacaoMensagem,
      createdBy: user.id,
    });
  }

  await logAudit(env, user, 'update', 'guia', id, body);
  const atualizada = await env.DB_REGULACAO.prepare(
    'SELECT * FROM guias WHERE id=?'
  ).bind(id).first();
  return json({ guia: atualizada });
}
