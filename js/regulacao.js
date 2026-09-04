// Helpers compartilhados pelas páginas de /regulacao/*.
// Depende de js/common.js já carregado antes (escapeHtml, initPortalChrome).

function onlyDigits(v) { return String(v || '').replace(/\D/g, ''); }

function maskCPF(v) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim().replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim().replace(/-$/, '');
}

function formatDateBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const SITUACAO_LABELS = {
  aguardando_autorizacao: 'Aguardando autorização',
  lista_espera: 'Em lista de espera',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluído',
  negado: 'Negado',
};

const SITUACAO_BADGE = {
  aguardando_autorizacao: 'badge--user',
  lista_espera: 'badge--user',
  em_atendimento: 'badge--admin',
  concluido: 'badge--admin',
  negado: 'badge--inactive',
};

function situacaoBadgeHtml(situacao) {
  const label = SITUACAO_LABELS[situacao] || situacao;
  const cls = SITUACAO_BADGE[situacao] || 'badge--user';
  return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch { /* sem corpo */ }
  return { ok: res.ok, status: res.status, data };
}
