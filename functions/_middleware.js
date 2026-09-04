import { getAuthUser, consumeHandoffToken, createSession, sessionCookieHeader } from './api/_utils.js';
import { getRegulacaoAccessProfile } from './api/_permissions.js';
const PORTAL_URL='https://apoioapscajamar.pages.dev';
export async function onRequest({request,env,next}){
  const url=new URL(request.url);
  const handoffToken=url.searchParams.get('handoff');
  if(handoffToken){const userId=await consumeHandoffToken(env,handoffToken);if(!userId)return Response.redirect(`/login.html?next=${encodeURIComponent(url.pathname)}`,302);const sessionToken=await createSession(env,userId);url.searchParams.delete('handoff');return new Response(null,{status:302,headers:{Location:url.toString(),'Set-Cookie':sessionCookieHeader(sessionToken)}})}
  if(url.pathname.startsWith('/api/'))return next();
  if(url.pathname==='/login.html'||url.pathname.startsWith('/assets/')||url.pathname.startsWith('/css/')||url.pathname.startsWith('/js/'))return next();
  const user=await getAuthUser(request,env);if(!user)return Response.redirect(`/login.html?next=${encodeURIComponent(url.pathname+url.search)}`,302);
  if(user.source==='local'&&user.mustChangePassword&&url.pathname!=='/minha-conta.html')return Response.redirect('/minha-conta.html?obrigatoria=1',302);
  try{const access=await getRegulacaoAccessProfile(env,user);if(!access.acesso)return new Response('Seu usuário não possui acesso ativo ao eMulti / Regulação.',{status:403,headers:{'content-type':'text/plain; charset=utf-8'}})}catch{return new Response('Não foi possível validar os acessos da Regulação.',{status:503})}
  return next();
}
