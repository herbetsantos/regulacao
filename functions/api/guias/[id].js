// GET   /api/guias/:id  -> detalhe (com acompanhamento vinculado, se houver)
// PATCH /api/guias/:id  -> atualiza situação e/ou faz a triagem/transferência
//                          de equipe (equipe_id + unidade_executante_code)

import { json, logAudit } from '../_utils.js';
import {
  requireRegulacaoAccess, getRegulacaoScope, isEquipeMember, getEquipeInfo,
  inserirNotificacao,
} from '../_shared.js';
import { getEquipeProfissionais, getProfissionalNaEquipe } from '../_professionals.js';

const SITUACOES_VALIDAS = ['aguardando_autorizacao', 'lista_espera', 'em_atendimento', 'concluido', 'negado'];

export async function onRequestGet({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const id = Number(params.id);

  // Campos de endereço/CNS foram adicionados gradualmente. Montar a projeção
  // conforme a estrutura existente evita que uma base ainda não reparada
  // deixe a tela inteira de detalhe em branco.
  const pacienteInfo = await env.DB_REGULACAO.prepare("PRAGMA table_info('pacientes')").all();
  const pacienteCols = new Set((pacienteInfo.results || []).map((c) => c.name));
  const opcionais = ['cns', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf'];
  const opcionaisSql = opcionais.map((c) =>
    pacienteCols.has(c) ? `p.${c} AS paciente_${c}` : `NULL AS paciente_${c}`
  ).join(', ');

  const guia = await env.DB_REGULACAO.prepare(
    `SELECT g.*, e.nome AS especialidade_nome,
            p.nome AS paciente_nome, p.data_nascimento AS paciente_data_nascimento, p.sexo AS paciente_sexo,
            p.tel1 AS paciente_tel1, p.tel2 AS paciente_tel2, p.tel3 AS paciente_tel3,
            p.unidade_referencia_code AS paciente_unidade_referencia_code, p.endereco AS paciente_endereco,
            ${opcionaisSql}
     FROM guias g
     JOIN especialidades e ON e.id = g.especialidade_id
     JOIN pacientes p ON p.cpf = g.cpf
     WHERE g.id = ?`
  ).bind(id).first();
  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);

  const scope = await getRegulacaoScope(env, user, access);
  const podeTriar = !!(access.regulador || access.administrador);
  const visivel = scope.isAdmin
    || scope.emissoras.includes(guia.unidade_solicitante_code)
    || (guia.unidade_executante_code && scope.executantes.includes(guia.unidade_executante_code))
    || (!guia.unidade_executante_code && podeTriar);
  if (!visivel) return json({ error: 'Você não tem acesso a esta guia.' }, 403);

  const acompanhamento = await env.DB_REGULACAO.prepare(
    `SELECT a.* FROM acompanhamentos a
     JOIN acompanhamento_guias ag ON ag.acompanhamento_id = a.id
     WHERE ag.guia_id = ?`
  ).bind(id).first();

  let equipeAtual = null;
  let profissionaisEquipe = [];
  if (guia.equipe_id) {
    equipeAtual = await getEquipeInfo(env, guia.equipe_id);
    profissionaisEquipe = await getEquipeProfissionais(env, guia.equipe_id);
    profissionaisEquipe = profissionaisEquipe
      .map((p) => ({ ...p, compativel: p.especialidade_ids.includes(Number(guia.especialidade_id)) }))
      .sort((a,b) => Number(b.compativel) - Number(a.compativel) || a.name.localeCompare(b.name, 'pt-BR'));
  }
  let profissionalAtual = null;
  try {
    const attr = await env.DB_REGULACAO.prepare(`SELECT * FROM guia_atribuicoes WHERE guia_id = ? AND encerrado_em IS NULL ORDER BY id DESC LIMIT 1`).bind(id).first();
    if (attr) {
      const prof = await env.DB.prepare('SELECT id, name FROM users WHERE id = ?').bind(attr.profissional_user_id).first();
      profissionalAtual = prof ? { ...prof, cargo:attr.cargo, atribuido_em:attr.atribuido_em } : { id:attr.profissional_user_id, cargo:attr.cargo };
    }
  } catch {}

  return json({ guia, acompanhamento: acompanhamento || null, equipeAtual, profissionaisEquipe, profissionalAtual });
}

export async function onRequestPatch({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const id = Number(params.id);
  const guia = await env.DB_REGULACAO.prepare(
    `SELECT g.*, p.nome AS paciente_nome FROM guias g JOIN pacientes p ON p.cpf = g.cpf WHERE g.id = ?`
  ).bind(id).first();
  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);

  const scope = await getRegulacaoScope(env, user, access);
  const podeTriar = !!(access.regulador || access.administrador);
  const visivel = scope.isAdmin
    || scope.emissoras.includes(guia.unidade_solicitante_code)
    || (guia.unidade_executante_code && scope.executantes.includes(guia.unidade_executante_code))
    || (!guia.unidade_executante_code && podeTriar);
  if (!visivel) return json({ error: 'Você não tem acesso a esta guia.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }

  const alteraFluxo = body.equipe_id !== undefined || body.unidade_executante_code !== undefined;
  if (alteraFluxo && !access.regulador && !access.administrador) {
    return json({ error: 'Apenas Reguladores podem triar, transferir ou definir a unidade executante.', codigo: 'SEM_PERMISSAO_REGULADOR' }, 403);
  }
  if (body.situacao !== undefined && !access.regulador && !access.executor && !access.administrador) {
    return json({ error: 'Apenas Reguladores ou Executores podem alterar a situação da guia.', codigo: 'SEM_PERMISSAO_FLUXO' }, 403);
  }

  const updates = [];
  const binds = [];
  let notificacaoParaEquipeId = null;
  let notificacaoMensagem = null;
  let atribuiuProfissional = false;

  // --- situação (sem mudança de comportamento) ---
  if (body.situacao !== undefined) {
    if (!SITUACOES_VALIDAS.includes(body.situacao)) return json({ error: 'Situação inválida.' }, 400);
    updates.push('situacao = ?');
    binds.push(body.situacao);
  }

  // --- equipe_id: triagem (equipe_id ainda nulo -> definido) ou
  //     transferência (equipe_id já definido -> trocado por outro) ---
  if (body.equipe_id !== undefined) {
    const novaEquipeId = body.equipe_id === null ? null : Number(body.equipe_id);
    const equipeAtualId = guia.equipe_id;

    if (novaEquipeId !== equipeAtualId) {
      if (novaEquipeId === null) {
        return json({ error: 'Não é possível remover a equipe de uma guia — transfira para outra equipe em vez disso.' }, 400);
      }

      const equipeDestino = await getEquipeInfo(env, novaEquipeId);
      if (!equipeDestino) return json({ error: 'Equipe destino não encontrada.' }, 400);

      const ehTransferencia = equipeAtualId !== null && equipeAtualId !== undefined;
      if (ehTransferencia) {
        // Só quem já é da equipe ATUAL (ou admin) pode transferir a guia
        // para outra equipe — é a equipe que está com a guia que decide
        // repassá-la (ex.: paciente mudou de endereço).
        const podeTransferir = await isEquipeMember(env, user, equipeAtualId, access);
        if (!podeTransferir) {
          return json({ error: 'Só um profissional da equipe atual desta guia (ou administrador) pode transferi-la para outra equipe.' }, 403);
        }
      } else {
        // Triagem inicial: só quem é da equipe DESTINO (ou admin) pode
        // assumir a guia — é a própria equipe que está triando.
        const podeAssumir = await isEquipeMember(env, user, novaEquipeId, access);
        if (!podeAssumir) {
          return json({ error: 'Só um profissional da equipe que está assumindo a guia (ou administrador) pode fazer isso.' }, 403);
        }
      }

      // Unidade executante precisa vir junto e pertencer à equipe destino.
      const unidadeExecutanteBody = (body.unidade_executante_code || '').trim();
      if (!unidadeExecutanteBody) {
        return json({ error: 'Informe a unidade executante (deve ser uma das unidades atendidas pela equipe destino).' }, 400);
      }
      const unidadeValida = equipeDestino.unidades.some((u) => u.code === unidadeExecutanteBody);
      if (!unidadeValida) {
        return json({ error: `A unidade informada não é atendida pela equipe ${equipeDestino.nome}.` }, 400);
      }

      updates.push('equipe_id = ?', 'unidade_executante_code = ?');
      binds.push(novaEquipeId, unidadeExecutanteBody);

      if (ehTransferencia) {
        const equipeOrigem = await getEquipeInfo(env, equipeAtualId);
        const motivo = (body.motivo_transferencia || '').trim();
        notificacaoParaEquipeId = novaEquipeId;
        notificacaoMensagem = `Guia ${guia.codigo_guia || '#' + id} (${guia.paciente_nome}) foi transferida da equipe ${equipeOrigem ? equipeOrigem.nome : `#${equipeAtualId}`} para a sua equipe.`
          + (motivo ? ` Motivo: ${motivo}` : '');
      }
    } else if (body.unidade_executante_code !== undefined) {
      // Mesma equipe, só reposicionando a unidade executante dentro dela.
      const code = (body.unidade_executante_code || '').trim();
      if (equipeAtualId === null || equipeAtualId === undefined) {
        return json({ error: 'Defina a equipe antes de escolher a unidade executante.' }, 400);
      }
      const equipeInfo = await getEquipeInfo(env, equipeAtualId);
      const unidadeValida = code && equipeInfo && equipeInfo.unidades.some((u) => u.code === code);
      if (!unidadeValida) {
        return json({ error: 'A unidade informada não é atendida pela equipe desta guia.' }, 400);
      }
      updates.push('unidade_executante_code = ?');
      binds.push(code);
    }
  } else if (body.unidade_executante_code !== undefined) {
    // Trocando só a unidade, sem tocar em equipe_id — precisa já ter uma.
    const code = (body.unidade_executante_code || '').trim();
    if (!guia.equipe_id) {
      return json({ error: 'Esta guia ainda não tem equipe definida — informe equipe_id junto com a unidade executante.' }, 400);
    }
    const equipeInfo = await getEquipeInfo(env, guia.equipe_id);
    const unidadeValida = code && equipeInfo && equipeInfo.unidades.some((u) => u.code === code);
    if (!unidadeValida) {
      return json({ error: 'A unidade informada não é atendida pela equipe desta guia.' }, 400);
    }
    updates.push('unidade_executante_code = ?');
    binds.push(code);
  }

  // --- profissional responsável ---
  if (body.profissional_responsavel_id !== undefined) {
    if (!access.regulador && !access.administrador) {
      return json({ error: 'Apenas Reguladores podem atribuir o encaminhamento a um profissional.' }, 403);
    }
    const equipeFinalId = body.equipe_id !== undefined ? Number(body.equipe_id) : Number(guia.equipe_id);
    const profissionalId = Number(body.profissional_responsavel_id);
    if (!equipeFinalId) return json({ error: 'Defina a equipe responsável antes do profissional.' }, 400);
    if (!profissionalId) return json({ error: 'Selecione o profissional responsável.' }, 400);
    const prof = await getProfissionalNaEquipe(env, equipeFinalId, profissionalId);
    if (!prof) return json({ error: 'O profissional selecionado não pertence à equipe responsável.' }, 400);
    if (!prof.cargo) return json({ error: 'O profissional selecionado ainda não possui cargo/profissão cadastrado.' }, 400);
    if (!prof.especialidade_ids.includes(Number(guia.especialidade_id))) {
      return json({ error: 'O profissional selecionado não está habilitado para a especialidade desta guia.' }, 400);
    }
    try {
      await env.DB_REGULACAO.prepare(`UPDATE guia_atribuicoes SET encerrado_em = datetime('now'), motivo_encerramento = 'Redistribuição'
        WHERE guia_id = ? AND encerrado_em IS NULL`).bind(id).run();
      await env.DB_REGULACAO.prepare(`INSERT INTO guia_atribuicoes
        (guia_id, profissional_user_id, equipe_id, cargo, atribuido_por) VALUES (?, ?, ?, ?, ?)`)
        .bind(id, profissionalId, equipeFinalId, prof.cargo, user.id).run();
      atribuiuProfissional = true;
    } catch (e) {
      return json({ error: 'A estrutura de atribuição profissional ainda não está pronta. Execute o reparo do banco em Administração > Diagnóstico.' }, 503);
    }
  }

  if (body.situacao === 'em_atendimento') {
    const equipeFinalId = body.equipe_id !== undefined ? Number(body.equipe_id) : Number(guia.equipe_id);
    const unidadeFinal = body.unidade_executante_code !== undefined ? String(body.unidade_executante_code || '').trim() : guia.unidade_executante_code;
    if (!equipeFinalId || !unidadeFinal) return json({ error: 'Para colocar a guia Em atendimento, equipe e unidade executante são obrigatórias.' }, 400);
    let atribuicao = null;
    try { atribuicao = await env.DB_REGULACAO.prepare('SELECT id FROM guia_atribuicoes WHERE guia_id = ? AND encerrado_em IS NULL').bind(id).first(); } catch {}
    if (!atribuicao && body.profissional_responsavel_id === undefined) {
      return json({ error: 'Para colocar a guia Em atendimento, atribua primeiro um profissional especialista.' }, 400);
    }
  }

  if (updates.length === 0 && !atribuiuProfissional) return json({ error: 'Nada para atualizar.' }, 400);
  if (updates.length === 0 && atribuiuProfissional) updates.push("updated_at = datetime('now')");

  if (!updates.some((u) => u.startsWith('updated_at'))) updates.push("updated_at = datetime('now')");
  binds.push(id);
  await env.DB_REGULACAO.prepare(`UPDATE guias SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();

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

  const atualizada = await env.DB_REGULACAO.prepare('SELECT * FROM guias WHERE id = ?').bind(id).first();
  return json({ guia: atualizada });
}
