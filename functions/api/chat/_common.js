import { json, getAuthUser } from '../_utils.js';

export async function auth(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { error: json({ error: 'Não autenticado.' }, 401) };
  return { user };
}
export function isSuper(user) { return user?.role === 'super_admin'; }
export async function cleanupMessages(env) {
  try {
    const cfg = await env.DB.prepare('SELECT internal_retention_days, support_retention_days FROM chat_config WHERE id=1').first();
    const a = Math.max(1, Number(cfg?.internal_retention_days || 30));
    const b = Math.max(1, Number(cfg?.support_retention_days || 30));
    await env.DB.prepare(`DELETE FROM chat_messages WHERE room_id IN (SELECT id FROM chat_rooms WHERE type='internal') AND created_at < datetime('now', ?)` + `)`).bind('-'+a+' days').run();
    await env.DB.prepare(`DELETE FROM chat_messages WHERE room_id IN (SELECT id FROM chat_rooms WHERE type='support') AND created_at < datetime('now', ?)` + `)`).bind('-'+b+' days').run();
  } catch (_) {}
}
export async function internalRoom(env, userId) {
  let room = await env.DB.prepare("SELECT id FROM chat_rooms WHERE type='internal' LIMIT 1").first();
  if (!room) {
    await env.DB.prepare("INSERT OR IGNORE INTO chat_rooms(type,title,created_by) VALUES('internal','Comunicação interna',?)").bind(userId).run();
    room = await env.DB.prepare("SELECT id FROM chat_rooms WHERE type='internal' LIMIT 1").first();
  }
  return room;
}
export async function supportRoom(env, userId) {
  let room = await env.DB.prepare("SELECT id FROM chat_rooms WHERE type='support' AND created_by=? AND status='open' ORDER BY id DESC LIMIT 1").bind(userId).first();
  if (!room) {
    const r=await env.DB.prepare("INSERT INTO chat_rooms(type,title,created_by) VALUES('support','Suporte',?)").bind(userId).run();
    room={id:r.meta.last_row_id};
  }
  return room;
}
export async function listMessages(env, roomId) {
  const {results}=await env.DB.prepare(`SELECT m.id,m.body,m.platform,m.created_at,m.user_id,u.name,u.username,u.role FROM chat_messages m JOIN users u ON u.id=m.user_id WHERE m.room_id=? ORDER BY m.created_at ASC,m.id ASC LIMIT 500`).bind(roomId).all();
  return results || [];
}
