import { json } from '../../_utils.js';
import { requireRegulacaoAccess } from '../../_shared.js';

export async function onRequestGet({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  const id = Number(params.id);
  const grupo = await env.DB_REGULACAO.prepare(`
    SELECT ag.*, e.nome AS especialidade_nome
    FROM agenda_grupos ag JOIN especialidades e ON e.id = ag.especialidade_id
    WHERE ag.id = ?
  `).bind(id).first();
  if (!grupo) return json({ error: 'Grupo não encontrado.' }, 404);
  if (!access.administrador && !access.regulador && Number(grupo.profissional_user_id) !== Number(user.id)) return json({ error: 'Sem acesso a este grupo.' }, 403);
  const { results: encontros } = await env.DB_REGULACAO.prepare('SELECT * FROM agenda_grupo_encontros WHERE grupo_id = ? ORDER BY data_encontro, hora_inicio').bind(id).all();
  const { results: pacientes } = await env.DB_REGULACAO.prepare(`
    SELECT gp.*, g.codigo_guia, g.situacao, p.nome AS paciente_nome, p.cpf
    FROM agenda_grupo_pacientes gp
    JOIN guias g ON g.id = gp.guia_id JOIN pacientes p ON p.cpf = g.cpf
    WHERE gp.grupo_id = ? ORDER BY CASE gp.status WHEN 'ativo' THEN 0 ELSE 1 END, p.nome
  `).bind(id).all();
  return json({ grupo, encontros: encontros || [], pacientes: pacientes || [] });
}
