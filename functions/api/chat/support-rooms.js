import { json, requireSuperAdmin } from '../_utils.js';
export async function onRequestGet({request,env}){
  const {error,user}=await requireSuperAdmin(request,env); if(error)return error;
  const {results}=await env.DB.prepare(`SELECT r.id,r.created_by,r.status,r.updated_at,u.name,u.username,
    (SELECT body FROM chat_messages m WHERE m.room_id=r.id ORDER BY m.id DESC LIMIT 1) last_message,
    (SELECT COUNT(*) FROM chat_messages m WHERE m.room_id=r.id AND m.user_id<>? AND m.id>COALESCE((SELECT rs.last_read_message_id FROM chat_read_state rs WHERE rs.room_id=r.id AND rs.user_id=?),0)) unread_count,
    CASE WHEN EXISTS(SELECT 1 FROM chat_presence p WHERE p.user_id=r.created_by AND p.last_seen>=datetime('now','-45 seconds')) THEN 1 ELSE 0 END is_online
    FROM chat_rooms r JOIN users u ON u.id=r.created_by WHERE r.type='support' ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END,r.updated_at DESC LIMIT 200`).bind(user.id,user.id).all();
  return json({rooms:results||[]});
}
export async function onRequestPatch({request,env}){
  const {error,user}=await requireSuperAdmin(request,env); if(error)return error;
  const b=await request.json().catch(()=>null),id=Number(b?.room_id),action=String(b?.action||'');
  if(!id||!['close','reopen'].includes(action))return json({error:'Operação inválida.'},400);
  if(action==='close') await env.DB.prepare("UPDATE chat_rooms SET status='closed',updated_at=datetime('now') WHERE id=? AND type='support'").bind(id).run();
  else {
    const room=await env.DB.prepare("SELECT created_by FROM chat_rooms WHERE id=? AND type='support'").bind(id).first(); if(!room)return json({error:'Atendimento não encontrado.'},404);
    const other=await env.DB.prepare("SELECT id FROM chat_rooms WHERE type='support' AND created_by=? AND status='open' AND id<>?").bind(room.created_by,id).first();
    if(other)return json({error:'Este usuário já possui outro atendimento aberto.'},409);
    await env.DB.prepare("UPDATE chat_rooms SET status='open',updated_at=datetime('now') WHERE id=?").bind(id).run();
  }
  return json({ok:true,status:action==='close'?'closed':'open'});
}
