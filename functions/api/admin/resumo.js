import { json } from '../_utils.js';
import { requireGestorAccess } from '../_shared.js';

async function exists(db,name){
  return !!await db.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=?").bind(name).first();
}

export async function onRequestGet({request,env}){
  const {error}=await requireGestorAccess(request,env);
  if(error)return error;

  const required=[
    'regulacao_local_users',
    'regulacao_profissionais',
    'regulacao_profissional_vinculos',
    'regulacao_principal_acessos',
  ];
  const missing=[];
  for(const t of required)if(!await exists(env.DB_REGULACAO,t))missing.push(t);
  if(missing.length){
    return json({
      error:'A estrutura administrativa 2.25.0 ainda não foi aplicada ao regulacao-vagas-db.',
      missing_tables:missing,
    },409);
  }


  const q=async(sql)=>Number((await env.DB_REGULACAO.prepare(sql).first())?.n||0);

  const [locals,prof,semVinc,semHoras,espSemProf,principal]=await Promise.all([
    q('SELECT COUNT(*) n FROM regulacao_local_users WHERE active=1'),
    q('SELECT COUNT(*) n FROM regulacao_profissionais WHERE ativo=1'),
    q(`SELECT COUNT(*) n FROM regulacao_profissionais p
       WHERE p.ativo=1
       AND NOT EXISTS(
         SELECT 1 FROM regulacao_profissional_vinculos v
         WHERE v.profissional_id=p.id AND v.ativo=1
       )`),
    q(`SELECT COUNT(DISTINCT p.id) n
       FROM regulacao_profissionais p
       JOIN regulacao_profissional_vinculos v
         ON v.profissional_id=p.id AND v.ativo=1
       WHERE p.ativo=1 AND v.carga_horaria_semanal<=0`),
    q(`SELECT COUNT(*) n FROM especialidades e
       WHERE e.ativo=1
       AND NOT EXISTS(
         SELECT 1
         FROM regulacao_profissional_vinculos v
         JOIN regulacao_profissionais p
           ON p.id=v.profissional_id AND p.ativo=1
         WHERE v.especialidade_id=e.id AND v.ativo=1
       )`),
    q('SELECT COUNT(*) n FROM regulacao_principal_acessos WHERE active=1'),
  ]);

  const [unitRow,teamRow]=await Promise.all([
    env.DB.prepare('SELECT COUNT(*) n FROM unidades WHERE ativo=1').first(),
    env.DB.prepare('SELECT COUNT(*) n FROM regulacao_equipes WHERE ativo=1').first(),
  ]);

  return json({
    resumo:{
      usuarios_externos:locals,
      usuarios_com_acesso:principal,
      profissionais:prof,
      unidades:Number(unitRow?.n||0),
      equipes:Number(teamRow?.n||0),
    },
    alertas:{
      profissionais_sem_vinculo:semVinc,
      profissionais_sem_horas:semHoras,
      especialidades_sem_profissional:espSemProf,
    },
  });
}
