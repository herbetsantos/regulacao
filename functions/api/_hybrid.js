const PASSWORD_ITERATIONS = 210000;

export function principalId(user) {
  if (!user) return null;
  if (user.principalId) return user.principalId;
  if (user.source === 'local' && user.localUserId) return `local:${user.localUserId}`;
  if (user.id != null) return `portal:${user.id}`;
  return null;
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

export async function passwordDigest(password, saltHex = null, iterations = PASSWORD_ITERATIONS) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(password || '')),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const count = Number(iterations) || PASSWORD_ITERATIONS;
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: count },
    key,
    256
  );
  return { hash: toHex(new Uint8Array(bits)), salt: toHex(salt), iterations: count };
}

export async function passwordMatches(password, row) {
  if (!row?.password_hash || !row?.password_salt) return false;
  const computed = await passwordDigest(password, row.password_salt, row.password_iterations);
  const a = fromHex(computed.hash);
  const b = fromHex(row.password_hash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
