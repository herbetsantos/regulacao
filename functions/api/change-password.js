import { json, getAuthUser, getCookie, logAudit } from './_utils.js';

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

function randomHex(numBytes) {
  const arr = new Uint8Array(numBytes);
  crypto.getRandomValues(arr);
  return bufToHex(arr.buffer);
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBuf(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bufToHex(bits);
}

async function verifyPassword(password, saltHex, expectedHashHex) {
  const computed = await hashPassword(password, saltHex);
  if (computed.length !== expectedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  const user = await getAuthUser(request, env);
  if (!user) return json({ error: 'Não autenticado.' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Requisição inválida.' }, 400); }

  const currentPassword = body.currentPassword || '';
  const newPassword = body.newPassword || '';
  if (!currentPassword || !newPassword) return json({ error: 'Informe a senha atual e a nova senha.' }, 400);
  if (newPassword.length < 8) return json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, 400);
  if (currentPassword === newPassword) return json({ error: 'A nova senha deve ser diferente da senha atual.' }, 400);

  const row = await env.DB.prepare('SELECT password_hash, salt FROM users WHERE id = ?').bind(user.id).first();
  if (!row) return json({ error: 'Usuário não encontrado.' }, 404);

  const ok = await verifyPassword(currentPassword, row.salt, row.password_hash);
  if (!ok) return json({ error: 'Senha atual incorreta.' }, 401);

  const newSalt = randomHex(16);
  const newHash = await hashPassword(newPassword, newSalt);
  await env.DB.prepare(
    'UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0 WHERE id = ?'
  ).bind(newHash, newSalt, user.id).run();

  const currentToken = getCookie(request, 'session');
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?')
    .bind(user.id, currentToken || '')
    .run();

  await logAudit(env, user, 'change_password', 'user', user.id, 'Usuário trocou a própria senha pelo módulo eMulti.');
  return json({ ok: true });
}
