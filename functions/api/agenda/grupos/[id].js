import { json } from '../../_utils.js';
import { requireRegulacaoAccess, isEquipeMember } from '../../_shared.js';
import { principalId } from '../../_hybrid.js';

export async function onRequestGet({ request, env, params }) {
  const { user, access, error } = await requireRegulacaoAccess(request, env);
  if (error) return error;
  if (!access.organizador && !access.executor && !access.administrador) {
    return json({ error: 'Sem acesso a grupos.' }, 403);
  }

  const id = Number(params.id);
  const grupo = await env.DB_REGULACAO.prepare(`
    SELECT ag.*, e.nome AS especialidade_nome
    FROM agenda_grupos ag
    JOIN especialidades e ON e.id=ag.especialidade_id
    WHERE ag.id=?
  `).bind(id).first();

  if (!grupo) return json({ error: 'Grupo não encontrado.' }, 404);

  if (!access.administrador) {
    if (access.organizador) {
      const membro = await isEquipeMember(env, user, Number(grupo.equipe_id), access);
      if (!membro) return json({ error: 'Grupo fora da sua equipe.' }, 403);
    } else {
      const vinc = await env.DB_REGULACAO.prepare(`
        SELECT 1 ok
        FROM agenda_grupo_profissionais agp
        JOIN regulacao_profissionais rp ON rp.id=agp.profissional_id
        WHERE agp.grupo_id=? AND rp.principal_id=?
        LIMIT 1
      `).bind(id, principalId(user)).first();
      if (!vinc) return json({ error: 'Você não está vinculado a este grupo.' }, 403);
    }
  }

  const [enc, pac, prof] = await Promise.all([
    env.DB_REGULACAO.prepare(`
      SELECT * FROM agenda_grupo_encontros
      WHERE grupo_id=?
      ORDER BY data_encontro,hora_inicio
    `).bind(id).all(),
    env.DB_REGULACAO.prepare(`
      SELECT gp.*,g.codigo_guia,g.situacao,p.nome AS paciente_nome,p.cpf
      FROM agenda_grupo_pacientes gp
      JOIN guias g ON g.id=gp.guia_id
      JOIN pacientes p ON p.cpf=g.cpf
      WHERE gp.grupo_id=?
      ORDER BY CASE gp.status WHEN 'ativo' THEN 0 ELSE 1 END,p.nome
    `).bind(id).all(),
    env.DB_REGULACAO.prepare(`
      SELECT agp.profissional_id,agp.papel,agp.responsavel,
             rp.nome,rp.registro_profissional,rp.principal_id
      FROM agenda_grupo_profissionais agp
      JOIN regulacao_profissionais rp ON rp.id=agp.profissional_id
      WHERE agp.grupo_id=?
      ORDER BY agp.responsavel DESC,rp.nome
    `).bind(id).all(),
  ]);

  return json({
    grupo,
    encontros: enc.results || [],
    pacientes: pac.results || [],
    profissionais: prof.results || [],
    permissions: {
      pode_organizar: !!(access.organizador || access.administrador),
      pode_executar: !!(access.executor || access.administrador),
    },
  });
}
