import { json } from '../_utils.js'; import { auth } from './_common.js';
export async function onRequestGet({request,env}){
  const {error,user}=await auth(request,env); if(error)return error;
  const platform=new URL(request.url).searchParams.get('platform')==='emulti'?'emulti':'portal';
  await env.DB.prepare(`INSERT INTO chat_presence(user_id,platform,last_seen) VALUES(?,?,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET platform=excluded.platform,last_seen=datetime('now')`).bind(user.id,platform).run();
  const internal=await env.DB.prepare("SELECT id FROM chat_rooms WHERE type='internal' LIMIT 1").first();
  let internalUnread=0,supportUnread=0,openSupport=0;
  if(internal){const x=await env.DB.prepare(`SELECT COUNT(*) c FROM chat_messages m WHERE m.room_id=? AND m.user_id<>? AND m.id>COALESCE((SELECT last_read_message_id FROM chat_read_state WHERE room_id=? AND user_id=?),0)`).bind(internal.id,user.id,internal.id,user.id).first();internalUnread=Number(x?.c||0);}
  if(user.role==='super_admin'){
    const x=await env.DB.prepare(`SELECT COUNT(*) c FROM chat_messages m JOIN chat_rooms r ON r.id=m.room_id WHERE r.type='support' AND m.user_id<>? AND m.id>COALESCE((SELECT rs.last_read_message_id FROM chat_read_state rs WHERE rs.room_id=r.id AND rs.user_id=?),0)`).bind(user.id,user.id).first(); supportUnread=Number(x?.c||0);
    const y=await env.DB.prepare("SELECT COUNT(*) c FROM chat_rooms WHERE type='support' AND status='open'").first();openSupport=Number(y?.c||0);
  } else {
    const r=await env.DB.prepare("SELECT id FROM chat_rooms WHERE type='support' AND created_by=? AND status='open' ORDER BY id DESC LIMIT 1").bind(user.id).first();
    if(r){const x=await env.DB.prepare(`SELECT COUNT(*) c FROM chat_messages m WHERE m.room_id=? AND m.user_id<>? AND m.id>COALESCE((SELECT last_read_message_id FROM chat_read_state WHERE room_id=? AND user_id=?),0)`).bind(r.id,user.id,r.id,user.id).first();supportUnread=Number(x?.c||0);openSupport=1;}
  }
  const online=await env.DB.prepare("SELECT COUNT(*) c FROM chat_presence WHERE last_seen>=datetime('now','-45 seconds')").first();
  return json({internal_unread:internalUnread,support_unread:supportUnread,total_unread:internalUnread+supportUnread,online_count:Number(online?.c||0),open_support:openSupport});
}
