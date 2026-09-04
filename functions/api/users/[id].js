import { json, requireAdminPanel, getAdminUnidades, hashPassword, randomHex, logAudit } from '../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);

  const target = await env.DB.prepare('SELECT id, role, unidade FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requisição inválida.' }, 400);
  }

  const { name, role, active, newPassword, unidade, forceChangePassword } = body;
  const targetIsAdminLevel = target.role !== 'user';
  const newRoleIsAdminLevel = role && role !== 'user';

  if (requester.role === 'admin_unidade') {
    if (targetIsAdminLevel) {
      return json({ error: 'Você não pode gerenciar contas de administrador.' }, 403);
    }
    if (newRoleIsAdminLevel) {
      return json({ error: 'Você não pode alterar o papel deste usuário.' }, 403);
    }
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (!target.unidade || !minhas.includes(target.unidade.toLowerCase())) {
      return json({ error: 'Você só pode gerenciar usuários das unidades sob sua gestão.' }, 403);
    }
    if (typeof unidade === 'string' && unidade.trim() && !minhas.includes(unidade.trim().toLowerCase())) {
      return json({ error: 'Você só pode mover o usuário para uma das unidades sob sua gestão.' }, 403);
    }
  } else if ((targetIsAdminLevel || newRoleIsAdminLevel) && requester.role !== 'super_admin') {
    return json({ error: 'Somente o Super Administrador pode gerenciar contas de administrador.' }, 403);
  }

  if (id === requester.id && role === 'user') {
    return json({ error: 'Você não pode remover seu próprio acesso de administrador.' }, 400);
  }
  if (id === requester.id && active === false) {
    return json({ error: 'Você não pode desativar seu próprio usuário.' }, 400);
  }

  // Nunca deixar o sistema sem nenhum Super Administrador — nem rebaixando a
  // própria conta, nem a de outro Super Admin, nem desativando o último.
  if (target.role === 'super_admin' && ((role && role !== 'super_admin') || active === false)) {
    const { count } = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND active = 1"
    ).first();
    if (count <= 1) {
      return json({ error: 'Não é possível remover ou desativar o último Super Administrador do sistema.' }, 400);
    }
  }

  const updates = [];
  const values = [];

  if (name && name.trim()) {
    updates.push('name = ?');
    values.push(name.trim());
  }
  if (['admin', 'user', 'super_admin', 'admin_unidade'].includes(role)) {
    updates.push('role = ?');
    values.push(role);
  }
  if (typeof active === 'boolean') {
    updates.push('active = ?');
    values.push(active ? 1 : 0);
  }
  if (typeof unidade === 'string') {
    updates.push('unidade = ?');
    values.push(unidade.trim() || null);
  }
  if (newPassword) {
    if (newPassword.length < 8) return json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, 400);
    const salt = randomHex(16);
    const hash = await hashPassword(newPassword, salt);
    updates.push('password_hash = ?', 'salt = ?');
    values.push(hash, salt);
    // Por padrão, uma senha definida pelo administrador é tratada como
    // temporária: o usuário é obrigado a trocá-la no próximo login. O
    // administrador pode desmarcar essa opção na tela (forceChangePassword: false).
    updates.push('must_change_password = ?');
    values.push(forceChangePassword === false ? 0 : 1);
  }

  if (updates.length === 0) return json({ error: 'Nada para atualizar.' }, 400);

  values.push(id);
  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  // Se a senha foi trocada pelo admin, derruba as sessões já abertas do
  // usuário-alvo (ele terá que logar de novo com a nova senha).
  if (newPassword) {
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
  }

  await logAudit(env, requester, 'update_user', 'user', id, {
    name: name || undefined,
    role: role || undefined,
    active: typeof active === 'boolean' ? active : undefined,
    unidade: typeof unidade === 'string' ? unidade : undefined,
    passwordChanged: !!newPassword,
  });

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const { user: requester, error } = await requireAdminPanel(request, env);
  if (error) return error;

  const id = Number(params.id);
  if (!id) return json({ error: 'ID inválido.' }, 400);
  if (id === requester.id) return json({ error: 'Você não pode excluir o seu próprio usuário.' }, 400);

  const target = await env.DB.prepare('SELECT id, username, role, unidade FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404);

  if (requester.role === 'admin_unidade') {
    const minhas = (await getAdminUnidades(env, requester.id)).map((u) => u.toLowerCase());
    if (target.role !== 'user' || !target.unidade || !minhas.includes(target.unidade.toLowerCase())) {
      return json({ error: 'Você só pode excluir usuários das unidades sob sua gestão.' }, 403);
    }
  } else if (target.role !== 'user' && requester.role !== 'super_admin') {
    return json({ error: 'Somente o Super Administrador pode excluir contas de administrador.' }, 403);
  }

  if (target.role === 'super_admin') {
    const { count } = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND active = 1"
    ).first();
    if (count <= 1) {
      return json({ error: 'Não é possível excluir o último Super Administrador do sistema.' }, 400);
    }
  }

  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

  await logAudit(env, requester, 'delete_user', 'user', id, {
    username: target.username, role: target.role,
  });

  return json({ ok: true });
}
