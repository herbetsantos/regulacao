import { json, logAudit, requireSuperAdmin } from '../_utils.js';

async function count(db, sql, value) {
  try {
    const row = await db.prepare(sql).bind(value).first();
    return Number(row?.n || 0);
  } catch {
    // Tabelas legadas podem não existir em instalações novas.
    return 0;
  }
}

const DEFINITIONS = {
  equipe: {
    label: 'Equipe',
    async entity(db, ref) {
      const id = Number(ref);
      if (!id) return null;
      return db.prepare('SELECT id AS ref,nome AS nome FROM regulacao_equipes WHERE id=?').bind(id).first();
    },
    dependencies: [
      ['Usuários vinculados', 'SELECT COUNT(*) n FROM regulacao_principal_equipes WHERE equipe_id=?'],
      ['Profissionais vinculados', 'SELECT COUNT(*) n FROM regulacao_profissional_equipes WHERE equipe_id=?'],
      ['Profissionais legados', 'SELECT COUNT(*) n FROM regulacao_profissionais WHERE equipe_id=?'],
      ['Guias', 'SELECT COUNT(*) n FROM guias WHERE equipe_id=?'],
      ['Escalas', 'SELECT COUNT(*) n FROM agenda_escalas WHERE equipe_id=?'],
      ['Atendimentos individuais', 'SELECT COUNT(*) n FROM agenda_individuais WHERE equipe_id=?'],
      ['Grupos', 'SELECT COUNT(*) n FROM agenda_grupos WHERE equipe_id=?'],
      ['Atribuições', 'SELECT COUNT(*) n FROM guia_atribuicoes WHERE equipe_id=?'],
      ['Notificações', 'SELECT COUNT(*) n FROM notificacoes WHERE equipe_id=?'],
      ['Acompanhamentos legados', 'SELECT COUNT(*) n FROM acompanhamentos WHERE equipe_id=?'],
    ],
    async remove(db, ref) {
      const id = Number(ref);
      await db.prepare('DELETE FROM regulacao_equipe_unidades WHERE equipe_id=?').bind(id).run();
      await db.prepare('DELETE FROM regulacao_equipes WHERE id=?').bind(id).run();
    },
  },
  especialidade: {
    label: 'Especialidade',
    async entity(db, ref) {
      const id = Number(ref);
      if (!id) return null;
      return db.prepare('SELECT id AS ref,nome AS nome FROM especialidades WHERE id=?').bind(id).first();
    },
    dependencies: [
      ['Vínculos profissionais', 'SELECT COUNT(*) n FROM regulacao_profissional_vinculos WHERE especialidade_id=?'],
      ['Guias', 'SELECT COUNT(*) n FROM guias WHERE especialidade_id=?'],
      ['Escalas', 'SELECT COUNT(*) n FROM agenda_escalas WHERE especialidade_id=?'],
      ['Atendimentos individuais', 'SELECT COUNT(*) n FROM agenda_individuais WHERE especialidade_id=?'],
      ['Grupos', 'SELECT COUNT(*) n FROM agenda_grupos WHERE especialidade_id=?'],
      ['Acompanhamentos legados', 'SELECT COUNT(*) n FROM acompanhamentos WHERE especialidade_id=?'],
    ],
    async remove(db, ref) {
      await db.prepare('DELETE FROM especialidades WHERE id=?').bind(Number(ref)).run();
    },
  },
  unidade: {
    label: 'Unidade',
    async entity(db, ref) {
      const code = String(ref || '').trim();
      if (!code) return null;
      return db.prepare('SELECT code AS ref,nome AS nome FROM regulacao_unidades WHERE code=?').bind(code).first();
    },
    dependencies: [
      ['Equipes vinculadas', 'SELECT COUNT(*) n FROM regulacao_equipe_unidades WHERE unidade_code=?'],
      ['Usuários autorizados', 'SELECT COUNT(*) n FROM regulacao_principal_unidades WHERE unidade_code=?'],
      ['Vínculos profissionais', 'SELECT COUNT(*) n FROM regulacao_profissional_vinculos WHERE unidade_code=?'],
      ['Pacientes de referência', 'SELECT COUNT(*) n FROM pacientes WHERE unidade_referencia_code=?'],
      ['Guias solicitantes', 'SELECT COUNT(*) n FROM guias WHERE unidade_solicitante_code=?'],
      ['Guias executantes', 'SELECT COUNT(*) n FROM guias WHERE unidade_executante_code=?'],
      ['Escalas', 'SELECT COUNT(*) n FROM agenda_escalas WHERE unidade_code=?'],
      ['Atendimentos individuais', 'SELECT COUNT(*) n FROM agenda_individuais WHERE unidade_code=?'],
      ['Grupos', 'SELECT COUNT(*) n FROM agenda_grupos WHERE unidade_code=?'],
      ['Acompanhamentos legados', 'SELECT COUNT(*) n FROM acompanhamentos WHERE unidade_executante_code=?'],
    ],
    async remove(db, ref) {
      await db.prepare('DELETE FROM regulacao_unidades WHERE code=?').bind(String(ref)).run();
    },
  },
  etiqueta: {
    label: 'Etiqueta',
    async entity(db, ref) {
      const id = Number(ref);
      if (!id) return null;
      return db.prepare('SELECT id AS ref,nome AS nome FROM regulacao_etiquetas WHERE id=?').bind(id).first();
    },
    dependencies: [
      ['Guias etiquetadas', 'SELECT COUNT(*) n FROM guia_etiquetas WHERE etiqueta_id=?'],
    ],
    async remove(db, ref) {
      await db.prepare('DELETE FROM regulacao_etiquetas WHERE id=?').bind(Number(ref)).run();
    },
  },
};

async function preflight(env, tipo, ref) {
  const definition = DEFINITIONS[tipo];
  if (!definition) return { error: 'Tipo de correção não permitido.', status: 400 };
  const entity = await definition.entity(env.DB_REGULACAO, ref);
  if (!entity) return { error: `${definition.label} não encontrada.`, status: 404 };
  const dependencias = [];
  for (const [nome, sql] of definition.dependencies) {
    const quantidade = await count(env.DB_REGULACAO, sql, entity.ref);
    dependencias.push({ nome, quantidade });
  }
  const total_dependencias = dependencias.reduce((sum, x) => sum + x.quantidade, 0);
  return {
    tipo,
    label: definition.label,
    entidade: entity,
    dependencias,
    total_dependencias,
    pode_excluir: total_dependencias === 0,
  };
}

export async function onRequestGet({ request, env }) {
  const { error } = await requireSuperAdmin(request, env);
  if (error) return error;
  const url = new URL(request.url);
  const tipo = String(url.searchParams.get('tipo') || '').trim();
  const ref = String(url.searchParams.get('ref') || '').trim();
  if (!tipo || !ref) return json({ error: 'Informe tipo e referência.' }, 400);
  const result = await preflight(env, tipo, ref);
  if (result.error) return json({ error: result.error }, result.status || 400);
  return json(result);
}

export async function onRequestDelete({ request, env }) {
  const { user, error } = await requireSuperAdmin(request, env);
  if (error) return error;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400); }
  const tipo = String(body?.tipo || '').trim();
  const ref = String(body?.ref || '').trim();
  const confirmacao = String(body?.confirmacao || '').trim();
  const result = await preflight(env, tipo, ref);
  if (result.error) return json({ error: result.error }, result.status || 400);
  if (!result.pode_excluir) {
    return json({
      error: 'Exclusão bloqueada: o registro possui vínculos ou histórico. Use inativação/correção em vez de excluir.',
      ...result,
    }, 409);
  }
  if (confirmacao !== String(result.entidade.nome)) {
    return json({ error: 'Confirmação inválida. Digite exatamente o nome do registro para excluir.' }, 400);
  }
  const definition = DEFINITIONS[tipo];
  await definition.remove(env.DB_REGULACAO, result.entidade.ref);
  await logAudit(env, user, 'delete', `correcao_${tipo}`, result.entidade.ref, {
    nome: result.entidade.nome,
    dependencias: result.dependencias,
    motivo: 'exclusao_administrativa_segura',
  });
  return json({ ok: true, deleted: result.entidade, tipo });
}
