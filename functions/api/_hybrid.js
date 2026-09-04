const PASSWORD_ITERATIONS = 210000;
const LOCAL_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function principalId(user) {
  if (!user) return null;
  if (user.principalId) return user.principalId;
  return user.source === 'local' ? `local:${user.localUserId || user.id}` : `portal:${user.id}`;
}

export function parsePrincipalId(value) {
  const raw = String(value || '');
  const i = raw.indexOf(':');
  if (i <= 0) return null;
  const source = raw.slice(0, i);
  const id = raw.slice(i + 1);
  if (!['portal', 'local'].includes(source) || !id) return null;
  return { source, id };
}

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(value) {
  const s = String(value || '');
  if (!/^[0-9a-f]+$/i.test(s) || s.length % 2) return new Uint8Array();
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export function randomToken(bytes = 32) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function passwordDigest(password, saltHex = null, iterations = PASSWORD_ITERATIONS) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password || '')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations:Number(iterations) || PASSWORD_ITERATIONS }, key, 256);
  return { hash:toHex(new Uint8Array(bits)), salt:toHex(salt), iterations:Number(iterations) || PASSWORD_ITERATIONS };
}

export async function passwordMatches(password, row) {
  const computed = await passwordDigest(password, row.password_salt, row.password_iterations);
  const a = fromHex(computed.hash), b = fromHex(row.password_hash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function localSessionCookieHeader(token, maxAgeSeconds = Math.floor(LOCAL_SESSION_TTL_MS / 1000)) {
  return `emulti_local_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}
export function clearLocalSessionCookieHeader() {
  return 'emulti_local_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}

export async function createLocalSession(env, localUserId) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + LOCAL_SESSION_TTL_MS).toISOString();
  await env.DB_REGULACAO.prepare(
    'INSERT INTO regulacao_local_sessions(token,local_user_id,expires_at) VALUES(?,?,?)'
  ).bind(token, String(localUserId), expiresAt).run();
  return token;
}

export async function getLocalUserBySession(env, token) {
  if (!token) return null;
  const row = await env.DB_REGULACAO.prepare(`
    SELECT s.expires_at, u.id local_user_id, u.legacy_numeric_id, u.username, u.name, u.active, u.must_change_password, u.theme
    FROM regulacao_local_sessions s
    JOIN regulacao_local_users u ON u.id=s.local_user_id
    WHERE s.token=?
  `).bind(token).first();
  if (!row || !row.active) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB_REGULACAO.prepare('DELETE FROM regulacao_local_sessions WHERE token=?').bind(token).run();
    return null;
  }
  return {
    id:Number(row.legacy_numeric_id),
    localUserId:String(row.local_user_id),
    principalId:`local:${row.local_user_id}`,
    source:'local',
    username:row.username,
    name:row.name,
    role:'external',
    active:true,
    mustChangePassword:!!row.must_change_password,
    theme:row.theme || 'light',
  };
}

function durationHours(start, end) {
  if (!start || !end) return 0;
  const a = String(start).match(/^(\d{1,2}):(\d{2})/);
  const b = String(end).match(/^(\d{1,2}):(\d{2})/);
  if (!a || !b) return 0;
  const mins = (Number(b[1]) * 60 + Number(b[2])) - (Number(a[1]) * 60 + Number(a[2]));
  return mins > 0 ? mins / 60 : 0;
}

function normalizeName(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export async function syncLegacyAccessModel(env) {
  let migrated = 0;
  try {
    const { results: accessRows } = await env.DB.prepare(`
      SELECT u.id,
             COALESCE(a.cadastrante,0) cadastrante,
             COALESCE(a.regulador,0) regulador,
             COALESCE(a.executor,0) executor,
             COALESCE(a.administrador,0) administrador
      FROM users u
      LEFT JOIN regulacao_user_acessos a ON a.user_id=u.id
      WHERE u.active=1
    `).all();
    for (const r of accessRows || []) {
      const pid = `portal:${r.id}`;
      const existing = await env.DB_REGULACAO.prepare('SELECT 1 ok FROM regulacao_principal_acessos WHERE principal_id=?').bind(pid).first();
      if (!existing && (r.cadastrante || r.regulador || r.executor || r.administrador)) {
        await env.DB_REGULACAO.prepare(`
          INSERT INTO regulacao_principal_acessos(principal_id,cadastrante,regulador,executor,administrador)
          VALUES(?,?,?,?,?)
        `).bind(pid, r.cadastrante, r.regulador, r.executor, r.administrador).run();
        migrated++;
      }
    }

    const { results: units } = await env.DB.prepare('SELECT user_id, unidade_code, pode_emitir, pode_executar FROM regulacao_user_unidades').all();
    for (const r of units || []) {
      await env.DB_REGULACAO.prepare(`
        INSERT OR IGNORE INTO regulacao_principal_unidades(principal_id,unidade_code,pode_emitir,pode_executar)
        VALUES(?,?,?,?)
      `).bind(`portal:${r.user_id}`, r.unidade_code, r.pode_emitir || 0, r.pode_executar || 0).run();
    }

    const { results: teams } = await env.DB.prepare('SELECT user_id, equipe_id FROM regulacao_equipe_profissionais').all();
    for (const r of teams || []) {
      await env.DB_REGULACAO.prepare(`
        INSERT OR IGNORE INTO regulacao_principal_equipes(principal_id,equipe_id) VALUES(?,?)
      `).bind(`portal:${r.user_id}`, r.equipe_id).run();
    }
  } catch {
    // Modelo antigo pode estar incompleto; a migração é best-effort.
  }
  return migrated;
}

export async function syncLegacyProfessionalModel(env) {
  let imported = 0;
  try {
    const { results: units } = await env.DB.prepare('SELECT code,nome FROM unidades WHERE ativo=1').all();
    const unitByName = new Map((units || []).map((u) => [normalizeName(u.nome), u]));
    const { results: specs } = await env.DB_REGULACAO.prepare('SELECT id,nome FROM especialidades').all();
    const specByName = new Map((specs || []).map((s) => [normalizeName(s.nome), s]));

    const { results: baseRows } = await env.DB.prepare(`
      SELECT p.id,p.nome,p.especialidade,p.user_id,p.ativo,
             l.id lotacao_id,l.unidade_nome,
             e.dia_semana,e.hora_inicio,e.hora_fim
      FROM regulacao_profissionais_base p
      LEFT JOIN regulacao_profissionais_base_lotacoes l ON l.profissional_base_id=p.id
      LEFT JOIN regulacao_profissionais_base_escalas e ON e.lotacao_id=l.id
      WHERE p.ativo=1
      ORDER BY p.id,l.id,e.dia_semana,e.hora_inicio
    `).all();

    const grouped = new Map();
    for (const r of baseRows || []) {
      if (!grouped.has(r.id)) grouped.set(r.id, { ...r, lotacoes:new Map() });
      const p = grouped.get(r.id);
      if (r.lotacao_id) {
        if (!p.lotacoes.has(r.lotacao_id)) p.lotacoes.set(r.lotacao_id, { unidade_nome:r.unidade_nome, horas:0 });
        p.lotacoes.get(r.lotacao_id).horas += durationHours(r.hora_inicio, r.hora_fim);
      }
    }

    for (const p of grouped.values()) {
      const existing = await env.DB_REGULACAO.prepare('SELECT id FROM regulacao_profissionais WHERE legacy_base_id=?').bind(p.id).first();
      let profId = existing?.id;
      if (!profId) {
        profId = crypto.randomUUID();
        let equipeId = null;
        if (p.user_id) {
          const eq = await env.DB.prepare('SELECT equipe_id FROM regulacao_equipe_profissionais WHERE user_id=? LIMIT 1').bind(p.user_id).first();
          equipeId = eq?.equipe_id ?? null;
        }
        await env.DB_REGULACAO.prepare(`
          INSERT INTO regulacao_profissionais(id,nome,principal_id,equipe_id,ativo,origem,legacy_base_id)
          VALUES(?,?,?,?,1,'escala_legada',?)
        `).bind(profId, p.nome, p.user_id ? `portal:${p.user_id}` : null, equipeId, p.id).run();
        imported++;
      }
      let spec = specByName.get(normalizeName(p.especialidade));
      if (!spec && p.especialidade) {
        const maxOrder = await env.DB_REGULACAO.prepare('SELECT COALESCE(MAX(sort_order),0) m FROM especialidades').first();
        const ins = await env.DB_REGULACAO.prepare('INSERT INTO especialidades(nome,sort_order,duracao_padrao_min) VALUES(?,?,30)').bind(p.especialidade, Number(maxOrder?.m || 0)+1).run();
        spec = { id:Number(ins.meta.last_row_id), nome:p.especialidade };
        specByName.set(normalizeName(p.especialidade), spec);
      }
      if (!spec) continue;
      for (const lot of p.lotacoes.values()) {
        const unit = unitByName.get(normalizeName(lot.unidade_nome));
        const existingLink = await env.DB_REGULACAO.prepare(`
          SELECT id FROM regulacao_profissional_vinculos
          WHERE profissional_id=? AND especialidade_id=?
            AND COALESCE(unidade_code,'')=COALESCE(?, '')
            AND COALESCE(unidade_nome_snapshot,'')=COALESCE(?, '')
        `).bind(profId, spec.id, unit?.code || null, lot.unidade_nome || null).first();
        if (!existingLink) {
          await env.DB_REGULACAO.prepare(`
            INSERT INTO regulacao_profissional_vinculos(
              id,profissional_id,unidade_code,unidade_nome_snapshot,especialidade_id,carga_horaria_semanal,origem
            ) VALUES(?,?,?,?,?,?, 'escala_legada')
          `).bind(crypto.randomUUID(), profId, unit?.code || null, lot.unidade_nome || null, spec.id, Number(lot.horas.toFixed(2))).run();
        }
      }
    }

    // Usuários especialistas antigos sem pré-cadastro entram como profissionais sem carga,
    // para que a Administração sinalize o que precisa ser completado.
    const { results: legacyTeamPros } = await env.DB.prepare(`
      SELECT u.id,u.name,ep.equipe_id,COALESCE(ep.cargo,'') cargo
      FROM regulacao_equipe_profissionais ep
      JOIN users u ON u.id=ep.user_id AND u.active=1
    `).all();
    for (const r of legacyTeamPros || []) {
      const pid = `portal:${r.id}`;
      let prof = await env.DB_REGULACAO.prepare('SELECT id FROM regulacao_profissionais WHERE principal_id=?').bind(pid).first();
      if (!prof) {
        const id = crypto.randomUUID();
        await env.DB_REGULACAO.prepare(`
          INSERT INTO regulacao_profissionais(id,nome,principal_id,equipe_id,ativo,origem)
          VALUES(?,?,?,?,1,'equipe_legada')
        `).bind(id, r.name, pid, r.equipe_id).run();
        imported++;
      }
    }
  } catch {
    // A sincronização será tentada novamente quando as tabelas legadas existirem.
  }
  return imported;
}
