// Chrome de página (topbar) deste projeto — independente do portal, mas
// reaproveitando a mesma identidade visual (css/style.css copiado do
// portal) e a mesma sessão (via handoff, ver functions/_middleware.js).
//
// EDITE a constante PORTAL_URL abaixo com o domínio real do portal antes do
// deploy em produção.
const PORTAL_URL = 'https://apoioapscajamar.pages.dev'; // TODO: ajustar se mudar de domínio

const TOPBAR_HTML = `
<header class="topbar">
  <div class="topbar__inner">
    <div class="topbar__left">
      <button class="hamburger-btn" id="hamburgerBtn" type="button" aria-label="Abrir menu" aria-expanded="false">
        <span class="hamburger-icon"></span>
      </button>
      <a class="brand" href="/"><img src="/assets/imagotipo.png" alt="Prefeitura de Cajamar — Saúde"></a>
      <nav class="nav" id="mainNav">
        <div class="nav__item">
          <a class="nav__link" href="/"><span class="label-text">FILA DE GUIAS</span></a>
        </div>
        <div class="nav__item">
          <a class="nav__link" href="/paciente.html"><span class="label-text">PACIENTES</span></a>
        </div>
        <div class="nav__item">
          <a class="nav__link" href="/guia-nova.html"><span class="label-text">+ NOVA GUIA</span></a>
        </div>
        <div class="nav__item" id="navAdminItem" style="display:none">
          <a class="nav__link" href="/admin.html"><span class="label-text">ADMINISTRAÇÃO</span></a>
        </div>
        <div class="nav__item">
          <a class="nav__link" href="${PORTAL_URL}/portal.html"><span class="label-text">← VOLTAR AO PORTAL</span></a>
        </div>
        <div class="nav__mobile-foot">
          <div class="user-chip" id="userChipMobile"></div>
          <button class="btn btn--outline btn--sm" id="logoutBtnMobile" type="button">Sair</button>
        </div>
      </nav>
    </div>
    <div class="topbar__right">
      <button class="bell-btn" id="bellBtn" type="button" aria-label="Notificações" title="Notificações">
        🔔<span class="bell-badge" id="bellBadge" style="display:none">0</span>
      </button>
      <div class="bell-panel" id="bellPanel" style="display:none">
        <div class="bell-panel__head">Notificações</div>
        <div class="bell-panel__list" id="bellList"><div class="empty-state">Nenhuma notificação.</div></div>
      </div>
      <div class="user-chip" id="userChip"></div>
      <button class="btn btn--ghost-light btn--sm" id="logoutBtn" type="button">Sair</button>
    </div>
  </div>
</header>
<style>
  .bell-btn { position:relative; background:none; border:none; font-size:20px; cursor:pointer; padding:6px 8px; }
  .bell-badge { position:absolute; top:0; right:0; background:#c0392b; color:#fff; border-radius:999px; font-size:10px; padding:1px 5px; font-weight:700; }
  .bell-panel { position:absolute; top:56px; right:16px; width:320px; max-height:400px; overflow-y:auto; background:#fff; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,.18); z-index:50; }
  .bell-panel__head { padding:12px 16px; font-weight:700; border-bottom:1px solid #eee; }
  .bell-panel__list { padding:6px; }
  .bell-item { padding:10px 12px; border-radius:8px; font-size:13px; line-height:1.4; cursor:pointer; }
  .bell-item:hover { background:#f5f7fa; }
  .bell-item__time { color:#888; font-size:11px; margin-top:2px; }
</style>`;

function renderTopbar() {
  const mount = document.getElementById('app-topbar');
  if (!mount) return;
  mount.innerHTML = TOPBAR_HTML;
}

function setFavicon(url) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

// Confere a sessão chamando o /api/me DESTE projeto (que valida o mesmo
// cookie/tabela sessions do portal, via env.DB compartilhado). Se não
// estiver logado, manda pro login do PORTAL (não existe login.html aqui),
// com next= apontando de volta pra esta página.
async function requireLogin() {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    if (!res.ok) {
      const next = encodeURIComponent(window.location.href);
      window.location.href = `${PORTAL_URL}/login.html?next=${next}`;
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    window.location.href = `${PORTAL_URL}/login.html`;
    return null;
  }
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
}

function renderTopbarUser(user) {
  const chipHtml = `<span class="user-chip__avatar">${initials(user.name)}</span><span>${user.name}</span>`;
  const chip = document.getElementById('userChip');
  if (chip) chip.innerHTML = chipHtml;
  const chipMobile = document.getElementById('userChipMobile');
  if (chipMobile) chipMobile.innerHTML = chipHtml;

  if (user.role === 'admin' || user.role === 'super_admin') {
    const adminItem = document.getElementById('navAdminItem');
    if (adminItem) adminItem.style.display = '';
  }
}

function setupLogout() {
  const doLogout = async () => {
    // O endpoint de logout também vive só no portal (apaga a sessão
    // compartilhada) — chamamos via URL absoluta.
    await fetch(`${PORTAL_URL}/api/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = `${PORTAL_URL}/login.html`;
  };
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', doLogout);
  const btnMobile = document.getElementById('logoutBtnMobile');
  if (btnMobile) btnMobile.addEventListener('click', doLogout);
}

function setupMobileNav() {
  const hamburger = document.getElementById('hamburgerBtn');
  const nav = document.getElementById('mainNav');
  if (!hamburger || !nav) return;
  const closeNav = () => {
    nav.classList.remove('is-mobile-open');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
  };
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !nav.classList.contains('is-mobile-open');
    nav.classList.toggle('is-mobile-open', willOpen);
    hamburger.classList.toggle('is-open', willOpen);
    hamburger.setAttribute('aria-expanded', String(willOpen));
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a.nav__link')) closeNav(); });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target) && e.target !== hamburger) closeNav(); });
}

// --- Notificações (sininho) ---
// Busca as não lidas ao carregar e a cada 60s. Clicar numa notificação
// chama POST /api/notificacoes/:id/marcar-lida (único endpoint que existe
// pra isso — sem corpo, sem PATCH) e, se a notificação tiver guia_id, leva
// direto pra guia.
function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

async function carregarNotificacoes() {
  try {
    const res = await fetch('/api/notificacoes', { credentials: 'same-origin' });
    if (!res.ok) return;
    const { notificacoes } = await res.json();

    const badge = document.getElementById('bellBadge');
    const list = document.getElementById('bellList');
    if (!badge || !list) return;

    if (notificacoes.length === 0) {
      badge.style.display = 'none';
      list.innerHTML = '<div class="empty-state">Nenhuma notificação.</div>';
      return;
    }

    badge.style.display = '';
    badge.textContent = notificacoes.length > 9 ? '9+' : String(notificacoes.length);
    list.innerHTML = notificacoes.map((n) => `
      <div class="bell-item" data-id="${n.id}" data-guia-id="${n.guia_id || ''}">
        <div>${escapeHtml(n.mensagem)}</div>
        <div class="bell-item__time">${timeAgo(n.created_at)}</div>
      </div>
    `).join('');

    list.querySelectorAll('.bell-item').forEach((el) => {
      el.addEventListener('click', async () => {
        await fetch(`/api/notificacoes/${el.dataset.id}/marcar-lida`, {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (el.dataset.guiaId) window.location.href = `/guia-detalhe.html?id=${el.dataset.guiaId}`;
        else carregarNotificacoes();
      });
    });
  } catch { /* falha silenciosa — não trava a página por causa do sininho */ }
}

function setupNotificacoes() {
  const bellBtn = document.getElementById('bellBtn');
  const panel = document.getElementById('bellPanel');
  if (!bellBtn || !panel) return;

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = panel.style.display === 'none' ? '' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== bellBtn) panel.style.display = 'none';
  });

  carregarNotificacoes();
  setInterval(carregarNotificacoes, 60000);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

async function initPortalChrome() {
  setFavicon('/assets/favicon.png');
  renderTopbar();
  const user = await requireLogin();
  if (!user) return null;
  renderTopbarUser(user);
  setupLogout();
  setupMobileNav();
  setupNotificacoes();
  return user;
}
