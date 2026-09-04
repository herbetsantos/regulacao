// Estrutura visual do módulo eMulti / Regulação de Vagas.
// O login continua pertencendo ao Portal Saúde Cajamar; este projeto recebe
// uma sessão por handoff e lê o mesmo banco de usuários/equipes.

const PORTAL_URL = 'https://apoioapscajamar.pages.dev';
const APP_VERSION = '2.18.2';
window.EMULTI_VERSION = APP_VERSION;

function formatGuideCode(guia) {
  if (!guia) return '';
  const raw = String(guia.codigo_guia || '').replace(/\D/g, '');
  if (raw.length >= 10) return raw.slice(0, 4) + raw.slice(-6);
  const yearMatch = String(guia.created_at || '').match(/^(\d{4})/);
  const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
  const id = String(guia.id || '').replace(/\D/g, '').padStart(6, '0').slice(-6);
  return `${year}${id}`;
}
window.formatGuideCode = formatGuideCode;

const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  queue: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 4h10M7 12h10M7 16h6"/></svg>',
  patients: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  newguide: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 11v6M9 14h6"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  admin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9 12l2 2 4-4"/></svg>',
  portal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 4l9 7M5 10v10h14V10M9 20v-6h6v6"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  key: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l3 3"/></svg>',
  links: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>',
  document: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
  tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5l-7.6 7.6a2.1 2.1 0 1 0 3 3l7.6-7.6a4 4 0 0 0 5-5L18 9l-2.4-2.4 2.3-2.3a4 4 0 0 0-3.2 2Z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  message: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>',
  hospital: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M9 21v-5h6v5M9 8h6M12 5v6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M10 14 21 3M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/></svg>',
};

function appIconSvg(name) {
  return ICONS[name] || ICONS.links;
}
window.appIconSvg = appIconSvg;
window.APP_ICON_KEYS = ['links', 'document', 'book', 'tools', 'calendar', 'message', 'hospital', 'chart', 'patients', 'queue', 'info', 'external'];
window.PORTAL_URL = PORTAL_URL;

const THEME_ICONS = {
  auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z"/></svg>',
  light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>',
  dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.4A8.4 8.4 0 0 1 9.6 3.5 8.6 8.6 0 1 0 20.5 14.4Z"/></svg>',
  contrast: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z"/></svg>',
};

function themeIconSvg(theme) {
  return THEME_ICONS[theme] || THEME_ICONS.light;
}

function themeControlHtml() {
  return `
    <div class="theme-control" id="themeControl">
      <button class="theme-control__toggle" id="themeQuickToggle" type="button" aria-label="Alternar entre modo claro e escuro" title="Alternar claro/escuro">
        <span class="theme-control__icon" id="themeCurrentIcon" aria-hidden="true">${themeIconSvg('light')}</span>
        <span class="theme-control__label" id="themeCurrentLabel">Claro</span>
      </button>
      <button class="theme-control__menu-button" id="themeMenuButton" type="button" aria-label="Escolher aparência" aria-haspopup="true" aria-expanded="false" title="Escolher aparência">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </button>
      <div class="theme-control__menu" id="themeMenu" hidden>
        <div class="theme-menu-label">Aparência</div>
        <div class="theme-choice-list">
          <button type="button" data-theme-choice="auto"><span class="theme-choice__icon">${themeIconSvg('auto')}</span><span>Automático</span><span class="theme-choice__check" data-theme-check></span></button>
          <button type="button" data-theme-choice="light"><span class="theme-choice__icon">${themeIconSvg('light')}</span><span>Claro</span><span class="theme-choice__check" data-theme-check></span></button>
          <button type="button" data-theme-choice="dark"><span class="theme-choice__icon">${themeIconSvg('dark')}</span><span>Escuro</span><span class="theme-choice__check" data-theme-check></span></button>
          <button type="button" data-theme-choice="contrast"><span class="theme-choice__icon">${themeIconSvg('contrast')}</span><span>Alto contraste</span><span class="theme-choice__check" data-theme-check></span></button>
        </div>
      </div>
    </div>`;
}

function renderChrome() {
  const mount = document.getElementById('app-topbar');
  if (!mount) return;

  mount.innerHTML = `
    <header class="topbar app-topbar">
      <div class="topbar__inner app-topbar__inner">
        <a class="brand app-brand" href="/painel.html" aria-label="Painel do eMulti Regulação">
          <img src="/assets/imagotipo.png" alt="Prefeitura de Cajamar">
          <span class="app-brand__text"><strong>eMulti</strong><span class="app-brand__divider" aria-hidden="true"></span><span>Regulação</span></span>
        </a>
        <div class="app-topbar__actions">
          ${themeControlHtml()}
          <div class="account-wrap">
          <button class="account-button" id="accountButton" type="button" aria-haspopup="true" aria-expanded="false">
            <span class="account-button__identity">
              <strong id="accountName">Carregando…</strong>
              <small id="accountTeam">eMulti</small>
            </span>
            <span class="account-button__chevron">⌄</span>
          </button>
          <div class="account-menu" id="accountMenu" hidden>
            <a href="/minha-conta.html">${appIconSvg('key')}<span>Alterar senha</span></a>
            <a href="/links-uteis.html">${appIconSvg('links')}<span>Links úteis</span></a>
            <a href="/novidades.html">${appIconSvg('book')}<span>Novidades da Versão</span></a>
            <a href="/comunicacao.html">${appIconSvg('message')}<span>Comunicação interna</span><b class="menu-unread-badge" id="emultiInternalBadge" hidden>0</b></a>
            <a href="/suporte.html">${appIconSvg('message')}<span>Suporte</span><b class="menu-unread-badge" id="emultiSupportBadge" hidden>0</b></a>
            <a href="/assistente-rotinas.html">${appIconSvg('book')}<span>Assistente de Rotinas</span></a>
            <a href="/chamados.html" id="ticketsAccountLink" hidden>${appIconSvg('tools')}<span>Chamados</span></a>
            <a href="/termos-de-uso.html">${appIconSvg('document')}<span>Termos de Uso e Privacidade</span></a>
            <a href="/sobre.html">${appIconSvg('info')}<span>Sobre o eMulti Regulação</span></a>
            <div class="account-menu__divider"></div>
            <button type="button" id="logoutBtn">${appIconSvg('logout')}<span>Sair</span></button>
          </div>
          </div>
        </div>
      </div>
    </header>

    <aside class="side-nav" id="sideNav" aria-label="Menu principal">
      <button class="side-nav__toggle" id="sideNavToggle" type="button" aria-label="Expandir ou recolher menu" title="Expandir/recolher menu">☰</button>
      <div class="side-nav__items">
        <a class="side-nav__item" data-path="/painel.html" href="/painel.html" title="Painel">
          <span class="side-nav__icon">${appIconSvg('dashboard')}</span><span class="side-nav__label">Painel</span>
        </a>
        <a class="side-nav__item" id="navRegulacaoItem" data-path="/" href="/" title="Regulação">
          <span class="side-nav__icon">${appIconSvg('queue')}</span><span class="side-nav__label">Regulação</span>
        </a>
        <a class="side-nav__item" data-path="/paciente.html" href="/paciente.html" title="Pacientes">
          <span class="side-nav__icon">${appIconSvg('patients')}</span><span class="side-nav__label">Pacientes</span>
        </a>
        <a class="side-nav__item" data-path="/guia-nova.html" href="/guia-nova.html" title="Nova guia">
          <span class="side-nav__icon">${appIconSvg('newguide')}</span><span class="side-nav__label">Nova guia</span>
        </a>
        <a class="side-nav__item" id="navAgendaItem" data-path="/agenda.html" href="/agenda.html" title="Agenda e atendimentos" hidden>
          <span class="side-nav__icon">${appIconSvg('calendar')}</span><span class="side-nav__label">Agenda</span>
        </a>
        <button class="side-nav__item side-nav__button" id="bellBtn" type="button" title="Notificações">
          <span class="side-nav__icon">${appIconSvg('bell')}<span class="side-nav__badge" id="bellBadge" hidden>0</span></span>
          <span class="side-nav__label">Notificações</span>
        </button>
        <a class="side-nav__item" id="navAdminItem" data-path="/admin.html" href="/admin.html" title="Administração" hidden>
          <span class="side-nav__icon">${appIconSvg('admin')}</span><span class="side-nav__label">Administração</span>
        </a>
      </div>
      <div class="side-nav__bottom">
        <a class="side-nav__item" href="${PORTAL_URL}/portal.html" title="Voltar ao Portal Saúde">
          <span class="side-nav__icon">${appIconSvg('portal')}</span><span class="side-nav__label">Portal Saúde</span>
        </a>
      </div>
    </aside>

    <div class="bell-panel" id="bellPanel" hidden>
      <div class="bell-panel__head">
        <strong>Notificações</strong>
        <button type="button" id="bellClose" aria-label="Fechar">×</button>
      </div>
      <div class="bell-panel__list" id="bellList"><div class="empty-state">Nenhuma notificação.</div></div>
    </div>`;
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

function renderUser(user) {
  const nameEl = document.getElementById('accountName');
  const teamEl = document.getElementById('accountTeam');
  const access = user.regulacao || {};
  const tickets=document.getElementById('ticketsAccountLink'); if(tickets) tickets.hidden=user.role!=='super_admin';
  if (nameEl) nameEl.textContent = user.name || user.username || 'Usuário';
  if (teamEl) {
    if (user.equipe?.nome) teamEl.textContent = user.equipe.nome;
    else if (access.administrador) teamEl.textContent = 'Administração da Regulação';
    else if (access.cadastrante) teamEl.textContent = 'Cadastrante';
    else if (access.regulador) teamEl.textContent = 'Regulação';
    else if (access.executor) teamEl.textContent = 'Execução';
    else teamEl.textContent = 'eMulti';
  }

  const regulacaoItem = document.getElementById('navRegulacaoItem');
  if (regulacaoItem) regulacaoItem.hidden = !(access.regulador || access.administrador || access.cadastrante || access.executor);

  const agendaItem = document.getElementById('navAgendaItem');
  if (agendaItem) agendaItem.hidden = !(access.executor || access.administrador || access.regulador);

  const adminItem = document.getElementById('navAdminItem');
  if (adminItem) adminItem.hidden = !access.administrador;

  const novaGuia = document.querySelector('.side-nav__item[data-path="/guia-nova.html"]');
  if (novaGuia) novaGuia.hidden = !(access.cadastrante || access.administrador);

  const bellBtn = document.getElementById('bellBtn');
  if (bellBtn) bellBtn.hidden = !(access.regulador || access.executor || access.administrador);
}

function updateThemeControl() {
  if (!window.SaudeTheme) return;
  const pref = window.SaudeTheme.getPreference();
  const icon = document.getElementById('themeCurrentIcon');
  const label = document.getElementById('themeCurrentLabel');
  const quick = document.getElementById('themeQuickToggle');
  if (icon) icon.innerHTML = themeIconSvg(pref);
  if (label) label.textContent = window.SaudeTheme.getLabel(pref);
  if (quick) quick.title = `${window.SaudeTheme.getLabel(pref)} — clique para alternar Claro/Escuro`;
}

function setupThemeSwitcher() {
  const quick = document.getElementById('themeQuickToggle');
  const menuButton = document.getElementById('themeMenuButton');
  const menu = document.getElementById('themeMenu');
  if (!quick || !menuButton || !menu || !window.SaudeTheme) return;

  const close = () => {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  };
  const closeAccount = () => {
    const accountMenu = document.getElementById('accountMenu');
    const accountButton = document.getElementById('accountButton');
    if (accountMenu) accountMenu.hidden = true;
    if (accountButton) accountButton.setAttribute('aria-expanded', 'false');
  };

  quick.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    close();
    closeAccount();
    window.SaudeTheme.toggleLightDark();
    updateThemeControl();
  });

  menuButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeAccount();
    menu.hidden = !menu.hidden;
    menuButton.setAttribute('aria-expanded', String(!menu.hidden));
  });

  menu.addEventListener('click', (event) => {
    event.stopPropagation();
    if (event.target.closest('[data-theme-choice]')) setTimeout(close, 0);
  });
  document.addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  window.addEventListener('saude-theme-change', updateThemeControl);
  window.SaudeTheme.bindControls(menu);
  updateThemeControl();
}

function setupAccountMenu() {
  const button = document.getElementById('accountButton');
  const menu = document.getElementById('accountMenu');
  if (!button || !menu) return;

  const close = () => {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const themeMenu = document.getElementById('themeMenu');
    const themeButton = document.getElementById('themeMenuButton');
    if (themeMenu) themeMenu.hidden = true;
    if (themeButton) themeButton.setAttribute('aria-expanded', 'false');
    menu.hidden = !menu.hidden;
    button.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

function setupActiveNav() {
  const path = window.location.pathname || '/';
  document.querySelectorAll('.side-nav__item[data-path]').forEach((el) => {
    const target = el.dataset.path;
    const active = target === '/' ? path === '/' || path === '/index.html' : path === target;
    el.classList.toggle('is-active', active);
  });
}

function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    // A sessão deste domínio é host-only; limpar o Portal também encerra a
    // sessão principal. Se a chamada cross-origin falhar, o usuário volta ao
    // login e o módulo deixa de reutilizar a sessão atual no próximo handoff.
    try {
      await fetch('/api/logout-local', { method: 'POST', credentials: 'same-origin' });
    } catch { /* continua para o portal */ }
    window.location.href = `${PORTAL_URL}/login.html`;
  });
}

function timeAgo(iso) {
  if (!iso) return '';
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const diffMs = Date.now() - new Date(normalized).getTime();
  const min = Math.max(0, Math.floor(diffMs / 60000));
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
    const { notificacoes = [] } = await res.json();
    const badge = document.getElementById('bellBadge');
    const list = document.getElementById('bellList');
    if (!badge || !list) return;

    badge.hidden = notificacoes.length === 0;
    badge.textContent = notificacoes.length > 9 ? '9+' : String(notificacoes.length);

    list.innerHTML = notificacoes.length ? notificacoes.map((n) => `
      <button class="bell-item" type="button" data-id="${n.id}" data-guia-id="${n.guia_id || ''}">
        <span>${escapeHtml(n.mensagem)}</span>
        <small>${timeAgo(n.created_at)}</small>
      </button>`).join('') : '<div class="empty-state">Nenhuma notificação.</div>';

    list.querySelectorAll('.bell-item').forEach((el) => {
      el.addEventListener('click', async () => {
        await fetch(`/api/notificacoes/${el.dataset.id}/marcar-lida`, { method: 'POST', credentials: 'same-origin' });
        if (el.dataset.guiaId) window.location.href = `/guia-detalhe.html?id=${el.dataset.guiaId}`;
        else carregarNotificacoes();
      });
    });
  } catch { /* notificação não pode bloquear a página */ }
}

function setupNotificacoes() {
  const btn = document.getElementById('bellBtn');
  const panel = document.getElementById('bellPanel');
  const closeBtn = document.getElementById('bellClose');
  if (!btn || !panel) return;

  const close = () => { panel.hidden = true; };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) carregarNotificacoes();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  panel.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', close);

  carregarNotificacoes();
  setInterval(carregarNotificacoes, 60000);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }


async function updateEmultiChatBadges(){try{const r=await fetch('/api/chat/status?platform=emulti',{credentials:'same-origin'});if(!r.ok)return;const d=await r.json();for(const [id,n] of [['emultiInternalBadge',d.internal_unread],['emultiSupportBadge',d.support_unread]]){const el=document.getElementById(id);if(el){el.hidden=!Number(n);el.textContent=Number(n)>99?'99+':String(n||0);}}}catch{}}
async function initPortalChrome() {
  setFavicon('/assets/favicon.png');
  renderChrome();
  setupThemeSwitcher();
  setupAccountMenu();
  setupActiveNav();

  const user = await requireLogin();
  if (!user) return null;

  if (window.SaudeTheme) {
    window.SaudeTheme.syncFromUser(user);
    window.SaudeTheme.bindControls(document.getElementById('themeMenu'));
    updateThemeControl();
  }
  renderUser(user);
  setupLogout();
  const bellBtn = document.getElementById('bellBtn');
  if (bellBtn && !bellBtn.hidden) setupNotificacoes();
  updateEmultiChatBadges();
  setInterval(updateEmultiChatBadges, 10000);
  return user;
}
