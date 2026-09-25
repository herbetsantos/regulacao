// GET /api/guias/:id/impressao
// Dados administrativos para impressão/PDF da guia.
// Não retorna evolução, conduta ou qualquer registro clínico de prontuário.

import { json } from '../../_utils.js';
import { requireRegulacaoAccess, getRegulacaoScope } from '../../_shared.js';

export async function onRequestGet({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return json({ error: 'Guia inválida.' }, 400);

  const guia = await env.DB_REGULACAO.prepare(`
    SELECT id,codigo_guia,unidade_solicitante_code,unidade_executante_code,equipe_id
    FROM guias WHERE id=?
  `).bind(id).first();
  if (!guia) return json({ error: 'Guia não encontrada.' }, 404);

  const scope = await getRegulacaoScope(env, user, access);
  const podeTriar = !!(access.regulador || access.administrador);
  const visivel = scope.isAdmin
    || scope.emissoras.includes(guia.unidade_solicitante_code)
    || (guia.unidade_executante_code && scope.executantes.includes(guia.unidade_executante_code))
    || (!guia.unidade_executante_code && podeTriar);
  if (!visivel) return json({ error: 'Você não tem acesso a esta guia.' }, 403);

  const safeAll = async (statement, ...binds) => {
    try {
      const r = await env.DB_REGULACAO.prepare(statement).bind(...binds).all();
      return r.results || [];
    } catch {
      return [];
    }
  };

  const [etiquetas, individuais, grupos, encontros, execucoes, transferencias] = await Promise.all([
    safeAll(`
      SELECT e.id,e.nome,ge.added_at
      FROM guia_etiquetas ge
      JOIN regulacao_etiquetas e ON e.id=ge.etiqueta_id
      WHERE ge.guia_id=?
      ORDER BY e.sort_order,e.nome
    `, id),
    safeAll(`
      SELECT ai.id,ai.data_atendimento,ai.hora_inicio,ai.duracao_minutos,ai.situacao,
             rp.nome AS profissional_nome,rp.registro_profissional,
             re.nome AS equipe_nome,ru.nome AS unidade_nome,esp.nome AS especialidade_nome
      FROM agenda_individuais ai
      LEFT JOIN regulacao_profissionais rp ON rp.id=ai.profissional_id
      LEFT JOIN regulacao_equipes re ON re.id=ai.equipe_id
      LEFT JOIN regulacao_unidades ru ON ru.code=ai.unidade_code
      LEFT JOIN especialidades esp ON esp.id=ai.especialidade_id
      WHERE ai.guia_id=?
      ORDER BY ai.data_atendimento,ai.hora_inicio,ai.id
    `, id),
    safeAll(`
      SELECT gp.grupo_id,gp.status,gp.entrada_em,gp.saida_em,gp.motivo_saida,
             ag.nome AS grupo_nome,ag.capacidade,ag.duracao_minutos,
             re.nome AS equipe_nome,ru.nome AS unidade_nome,esp.nome AS especialidade_nome,
             (
               SELECT GROUP_CONCAT(rp.nome, ' · ')
               FROM agenda_grupo_profissionais agp
               JOIN regulacao_profissionais rp ON rp.id=agp.profissional_id
               WHERE agp.grupo_id=ag.id
             ) AS profissionais
      FROM agenda_grupo_pacientes gp
      JOIN agenda_grupos ag ON ag.id=gp.grupo_id
      LEFT JOIN regulacao_equipes re ON re.id=ag.equipe_id
      LEFT JOIN regulacao_unidades ru ON ru.code=ag.unidade_code
      LEFT JOIN especialidades esp ON esp.id=ag.especialidade_id
      WHERE gp.guia_id=?
      ORDER BY gp.entrada_em,gp.grupo_id
    `, id),
    safeAll(`
      SELECT ge.id,ge.grupo_id,ge.data_encontro,ge.hora_inicio,ge.duracao_minutos,ge.situacao,
             ag.nome AS grupo_nome
      FROM agenda_grupo_encontros ge
      JOIN agenda_grupos ag ON ag.id=ge.grupo_id
      JOIN agenda_grupo_pacientes gp ON gp.grupo_id=ge.grupo_id AND gp.guia_id=?
      WHERE date(ge.data_encontro) >= date(gp.entrada_em)
        AND (gp.saida_em IS NULL OR date(ge.data_encontro) <= date(gp.saida_em))
      ORDER BY ge.data_encontro,ge.hora_inicio,ge.id
    `, id),
    safeAll(`
      SELECT tipo,referencia_id,resultado,observacao_administrativa,registrado_por_principal,registrado_em
      FROM regulacao_execucoes_administrativas
      WHERE guia_id=?
      ORDER BY registrado_em,id
    `, id),
    safeAll(`
      SELECT tipo,mensagem,created_at
      FROM notificacoes
      WHERE guia_id=? AND tipo='transferencia'
      ORDER BY created_at,id
    `, id),
  ]);

  return json({
    etiquetas,
    acompanhamento: {
      individuais,
      grupos,
      encontros,
      execucoes,
      transferencias,
    },
  });
}
