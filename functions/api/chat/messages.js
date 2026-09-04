import { json } from '../_utils.js';
import { auth,isSuper,cleanupMessages,internalRoom,supportRoom,listMessages } from './_common.js';

async function touchPresence(env,user,platform='portal'){
  await env.DB.prepare(`INSERT INTO chat_presence(user_id,platform,last_seen) VALUES(?,?,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET platform=excluded.platform,last_seen=datetime('now')`).bind(user.id,platform==='emulti'?'emulti':'portal').run();
}
async function markRead(env,roomId,userId){
  const row=await env.DB.prepare('SELECT COALESCE(MAX(id),0) id FROM chat_messages WHERE room_id=?').bind(roomId).first();
  await env.DB.prepare(`INSERT INTO chat_read_state(room_id,user_id,last_read_message_id,updated_at) VALUES(?,?,?,datetime('now')) ON CONFLICT(room_id,user_id) DO UPDATE SET last_read_message_id=excluded.last_read_message_id,updated_at=datetime('now')`).bind(roomId,userId,Number(row?.id||0)).run();
}
export async function onRequestGet({request,env}) {
  const {error,user}=await auth(request,env); if(error)return error; await cleanupMessages(env);
  const url=new URL(request.url),type=url.searchParams.get('type')||'internal',platform=url.searchParams.get('platform')==='emulti'?'emulti':'portal';
  await touchPresence(env,user,platform);
  let room;
  if(type==='internal') room=await internalRoom(env,user.id);
  else {
    const requested=Number(url.searchParams.get('room_id'));
    if(requested && isSuper(user)) room=await env.DB.prepare("SELECT id,created_by,status FROM chat_rooms WHERE id=? AND type='support'").bind(requested).first();
    else room=await supportRoom(env,user.id);
    if(!room)return json({error:'Conversa não encontrada.'},404);
  }
  await markRead(env,room.id,user.id);
  const online=(await env.DB.prepare(`SELECT p.user_id,p.platform,p.last_seen,u.name,u.username FROM chat_presence p JOIN users u ON u.id=p.user_id WHERE p.last_seen >= datetime('now','-45 seconds') ORDER BY u.name`).all()).results||[];
  return json({room_id:room.id,room_status:room.status||'open',messages:await listMessages(env,room.id),viewer:{id:user.id,role:user.role},online});
}
export async function onRequestPost({request,env}) {
  const {error,user}=await auth(request,env); if(error)return error;
  const b=await request.json().catch(()=>null),text=String(b?.body||'').trim(),type=b?.type==='support'?'support':'internal',platform=b?.platform==='emulti'?'emulti':'portal';
  if(!text)return json({error:'Digite uma mensagem.'},400); if(text.length>4000)return json({error:'Mensagem muito longa.'},400);
  await touchPresence(env,user,platform);
  let room;
  if(type==='internal') room=await internalRoom(env,user.id);
  else {
    const requested=Number(b?.room_id);
    if(requested && isSuper(user)) room=await env.DB.prepare("SELECT id,status FROM chat_rooms WHERE id=? AND type='support'").bind(requested).first();
    else room=await supportRoom(env,user.id);
  }
  if(!room)return json({error:'Conversa não encontrada.'},404);
  if(type==='support' && room.status==='closed')return json({error:'Este atendimento foi encerrado. Inicie um novo atendimento para enviar mensagens.'},409);
  await env.DB.prepare('INSERT INTO chat_messages(room_id,user_id,body,platform) VALUES(?,?,?,?)').bind(room.id,user.id,text,platform).run();
  await env.DB.prepare("UPDATE chat_rooms SET updated_at=datetime('now') WHERE id=?").bind(room.id).run();
  await markRead(env,room.id,user.id); await cleanupMessages(env);
  return json({ok:true,room_id:room.id},201);
}
