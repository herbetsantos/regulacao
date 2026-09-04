// Funções compartilhadas entre as páginas do portal (exceto login.html).

// Topbar única, compartilhada por todas as páginas. Antes esse HTML estava
// duplicado em cada arquivo .html; agora existe só aqui. Cada página só
// precisa ter <div id="app-topbar"></div> no lugar do <header> antigo.
const PORTAL_THEME_ICONS = {
  auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z"/></svg>',
  light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>',
  dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.4A8.4 8.4 0 0 1 9.6 3.5 8.6 8.6 0 1 0 20.5 14.4Z"/></svg>',
  contrast: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z"/></svg>',
};

function portalThemeIconSvg(theme) {
  return PORTAL_THEME_ICONS[theme] || PORTAL_THEME_ICONS.light;
}

function portalThemeControlHtml() {
  return `
    <div class="theme-control" id="themeControl">
      <button class="theme-control__toggle" id="themeQuickToggle" type="button" aria-label="Alternar entre modo claro e escuro" title="Alternar claro/escuro">
        <span class="theme-control__icon" id="themeCurrentIcon" aria-hidden="true">${portalThemeIconSvg('light')}</span>
        <span class="theme-control__label" id="themeCurrentLabel">Claro</span>
      </button>
      <button class="theme-control__menu-button" id="themeMenuButton" type="button" aria-label="Escolher aparência" aria-haspopup="true" aria-expanded="false" title="Escolher aparência">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </button>
      <div class="theme-control__menu" id="themeMenu" hidden>
        <div class="theme-menu-label">Aparência</div>
        <div class="theme-choice-list">
          <button type="button" data-theme-choice="auto"><span class="theme-choice__icon">${portalThemeIconSvg('auto')}</span><span>Automático</span><span class="theme-choice__check" data-theme-check></span></button>
          <button type="button" data-theme-choice="light"><span class="theme-choice__icon">${portalThemeIconSvg('light')}</span><span>Claro</span><span class="theme-choice__check" data-theme-check></span></button>
          <button type="button" data-theme-choice="dark"><span class="theme-choice__icon">${portalThemeIconSvg('dark')}</span><span>Escuro</span><span class="theme-choice__check" data-theme-check></span></button>
          <button type="button" data-theme-choice="contrast"><span class="theme-choice__icon">${portalThemeIconSvg('contrast')}</span><span>Alto contraste</span><span class="theme-choice__check" data-theme-check></span></button>
        </div>
      </div>
    </div>`;
}

const TOPBAR_HTML = `
<header class="topbar">
  <div class="topbar__inner">
    <div class="topbar__left">
      <button class="hamburger-btn" id="hamburgerBtn" type="button" aria-label="Abrir menu" aria-expanded="false">
        <span class="hamburger-icon"></span>
      </button>
      <a class="brand" href="/portal.html"><img src="/assets/imagotipo.png" alt="Prefeitura de Cajamar — Saúde"></a>
      <nav class="nav" id="mainNav">
        <div class="nav__item">
          <button class="nav__link" id="ferramentasTrigger" type="button">
            <span class="label-text">FERRAMENTAS</span><span class="nav__caret"></span>
          </button>
          <div class="submenu" id="ferramentasMenu"></div>
        </div>
        <div class="nav__item">
          <a class="nav__link" data-nav="documentos" href="/documentos.html"><span class="label-text">DOCUMENTOS ÚTEIS</span></a>
        </div>
        <div class="nav__item">
          <a class="nav__link" data-nav="manuais" href="/manuais.html"><span class="label-text">MANUAIS DE USO</span></a>
        </div>
        <div class="nav__item">
          <a class="nav__link" data-nav="relatorios" id="relatoriosLink" href="/relatorios.html" style="display:none"><span class="label-text">RELATÓRIOS</span></a>
        </div>
        <div class="nav__item">
          <a class="nav__link" data-nav="admin" id="adminLink" href="/admin.html" style="display:none"><span class="label-text">ADMINISTRAÇÃO</span></a>
        </div>
        <div class="nav__mobile-foot">
          <div class="user-chip" id="userChipMobile"></div>
          <button class="btn btn--outline btn--sm" id="logoutBtnMobile" type="button">Sair</button>
        </div>
      </nav>
    </div>
    <div class="topbar__right">
      ${portalThemeControlHtml()}
      <div class="portal-account-wrap">
        <button class="portal-account-button" id="portalAccountButton" type="button" aria-haspopup="true" aria-expanded="false">
          <span class="user-chip__avatar" id="portalAccountAvatar">?</span>
          <span class="portal-account-button__name" id="portalAccountName">Usuário</span>
          <span class="portal-account-button__chevron">⌄</span>
        </button>
        <div class="portal-account-menu" id="portalAccountMenu" hidden>
          <a href="/comunicacao.html"><span>Comunicação interna</span><b class="menu-unread-badge" id="portalInternalBadge" hidden>0</b></a>
          <a href="/suporte.html"><span>Suporte</span><b class="menu-unread-badge" id="portalSupportBadge" hidden>0</b></a>
          <a href="/novidades.html"><span>Novidades da Versão</span></a>
          <a href="/assistente-rotinas.html"><span>Assistente de Rotinas</span></a>
          <a href="/chamados.html" id="portalTicketsLink" style="display:none"><span>Chamados</span></a>
          <div class="portal-account-menu__divider"></div>
          <button type="button" id="logoutBtn"><span aria-hidden="true">↪</span><span>Sair</span></button>
        </div>
      </div>
    </div>
  </div>
</header>`;

// Injeta o topbar e marca visualmente o item ativo.
// activeKey: 'documentos' | 'manuais' | 'admin' | 'ferramentas' (usado pelas
// páginas de ferramenta, ex. FacilitaWhats, Guias e Malotes) | undefined (home).
function renderTopbar(activeKey) {
  const mount = document.getElementById('app-topbar');
  if (!mount) return;
  mount.innerHTML = TOPBAR_HTML;
  if (activeKey === 'ferramentas') {
    document.getElementById('ferramentasTrigger').style.background = 'rgba(255,255,255,0.14)';
  } else if (activeKey) {
    const el = mount.querySelector(`[data-nav="${activeKey}"]`);
    if (el) el.style.background = 'rgba(255,255,255,0.14)';
  }
}

// Define o favicon da aba do navegador (chamado uma vez, em todas as páginas
// que carregam este script, já que o <link rel="icon"> não é duplicado no HTML).
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
      window.location.href = '/login.html';
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    window.location.href = '/login.html';
    return null;
  }
}

function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function renderTopbarUser(user) {
  const safeName = user.name || user.username || 'Usuário';
  const chipHtml = `
    <span class="user-chip__avatar">${initials(safeName)}</span>
    <span>${escapeHtml(safeName)}</span>
  `;
  const accountName = document.getElementById('portalAccountName');
  const accountAvatar = document.getElementById('portalAccountAvatar');
  if (accountName) accountName.textContent = safeName;
  if (accountAvatar) accountAvatar.textContent = initials(safeName);
  const ticketsLink=document.getElementById('portalTicketsLink'); if(ticketsLink) ticketsLink.style.display=user.role==='super_admin'?'':'none';
  const chipMobile = document.getElementById('userChipMobile');
  if (chipMobile) chipMobile.innerHTML = chipHtml;
  const perms = user.permissions || {};
  const adminLink = document.getElementById('adminLink');
  if (adminLink) adminLink.style.display = perms.administracao ? '' : 'none';

  // Documentos Úteis / Manuais de Uso ficam visíveis por padrão; só escondemos
  // se a permissão vier explicitamente desligada (evita esconder tudo caso a
  // migração de permissões ainda não tenha rodado no ambiente).
  const docLink = document.querySelector('[data-nav="documentos"]');
  if (docLink) docLink.style.display = perms.documentos === false ? 'none' : '';
  const manLink = document.querySelector('[data-nav="manuais"]');
  if (manLink) manLink.style.display = perms.manuais === false ? 'none' : '';
}

function updatePortalThemeControl() {
  if (!window.SaudeTheme) return;
  const pref = window.SaudeTheme.getPreference();
  const icon = document.getElementById('themeCurrentIcon');
  const label = document.getElementById('themeCurrentLabel');
  const quick = document.getElementById('themeQuickToggle');
  if (icon) icon.innerHTML = portalThemeIconSvg(pref);
  if (label) label.textContent = window.SaudeTheme.getLabel(pref);
  if (quick) quick.title = `${window.SaudeTheme.getLabel(pref)} — clique para alternar Claro/Escuro`;
}

function setupPortalThemeSwitcher() {
  const quick = document.getElementById('themeQuickToggle');
  const menuButton = document.getElementById('themeMenuButton');
  const menu = document.getElementById('themeMenu');
  if (!quick || !menuButton || !menu || !window.SaudeTheme) return;

  const close = () => {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  };
  const closeAccount = () => {
    const accountMenu = document.getElementById('portalAccountMenu');
    const accountButton = document.getElementById('portalAccountButton');
    if (accountMenu) accountMenu.hidden = true;
    if (accountButton) accountButton.setAttribute('aria-expanded', 'false');
  };

  quick.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    close();
    closeAccount();
    window.SaudeTheme.toggleLightDark();
    updatePortalThemeControl();
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
  window.addEventListener('saude-theme-change', updatePortalThemeControl);
  window.SaudeTheme.bindControls(menu);
  updatePortalThemeControl();
}

function setupPortalAccountMenu() {
  const button = document.getElementById('portalAccountButton');
  const menu = document.getElementById('portalAccountMenu');
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

function setupLogout() {
  const doLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/login.html';
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

  // Fecha o menu mobile ao navegar para uma página nova (links diretos)
  // ou ao tocar num item da lista de Ferramentas (abre em nova aba).
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a.nav__link, .submenu__link')) closeNav();
  });

  // Fecha o menu mobile ao clicar fora dele.
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && e.target !== hamburger) closeNav();
  });
}

function setupFerramentasDropdown() {
  const trigger = document.getElementById('ferramentasTrigger');
  const menu = document.getElementById('ferramentasMenu');
  if (!trigger || !menu) return;

  const close = () => { trigger.classList.remove('is-open'); menu.classList.remove('is-open'); };
  const toggle = () => { trigger.classList.toggle('is-open'); menu.classList.toggle('is-open'); };

  trigger.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

async function goToExternalWithHandoff(url, openMode) {
  const abrirNovaAba = openMode !== '_self';
  try {
    const res = await fetch('/api/handoff', { method: 'POST', credentials: 'same-origin' });
    if (res.ok) {
      const { token } = await res.json();
      const sep = url.includes('?') ? '&' : '?';
      const finalUrl = `${url}${sep}handoff=${encodeURIComponent(token)}`;
      if (abrirNovaAba) window.open(finalUrl, '_blank', 'noopener');
      else window.location.href = finalUrl;
      return;
    }
  } catch { /* cai no fallback abaixo */ }
  // fallback: vai sem o código (site vai pedir login de novo)
  if (abrirNovaAba) window.open(url, '_blank', 'noopener');
  else window.location.href = url;
}

async function loadFerramentasMenu(perms) {
  const menu = document.getElementById('ferramentasMenu');
  if (!menu) return;
  try {
    const res = await fetch('/api/links?category=ferramenta', { credentials: 'same-origin' });
    const data = await res.json();
    let links = data.links || [];
    // Um link sem feature_key associado (ainda não configurado) continua
    // aparecendo para todos, pra não sumir ferramenta nenhuma sem querer.
    if (perms) {
      links = links.filter((l) => !l.feature_key || perms[l.feature_key] !== false);
    }
    menu.innerHTML = links.length
      ? links.map((l) => {
          const isExternal = /^https?:\/\//i.test(l.url) && new URL(l.url, window.location.href).hostname !== window.location.hostname;
          const novaAba = l.open_mode !== '_self';
          const targetAttr = isExternal ? '' : ` target="${novaAba ? '_blank' : '_self'}" rel="noopener"`;
          return `
          <a class="submenu__link" href="${escapeAttr(l.url)}"${targetAttr}${isExternal ? ` data-external-tool="1" data-open-mode="${l.open_mode === '_self' ? '_self' : '_blank'}"` : ''}>
            <span class="cross">✚</span>${escapeHtml(l.title)}
          </a>`;
        }).join('')
      : `<div class="submenu__link" style="color:var(--muted)">Nenhuma ferramenta cadastrada</div>`;

    // Links para outro projeto (*.pages.dev diferente, ex.: Regulação de
    // Vagas) precisam do código de repasse — ver goToExternalWithHandoff.
    menu.querySelectorAll('a[data-external-tool]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        goToExternalWithHandoff(a.getAttribute('href'), a.dataset.openMode);
      });
    });
  } catch {
    menu.innerHTML = `<div class="submenu__link" style="color:var(--muted)">Não foi possível carregar</div>`;
  }
}

async function loadRelatoriosNav(perms) {
  const link = document.getElementById('relatoriosLink');
  if (!link) return;
  if (perms && perms.relatorios === false) {
    link.style.display = 'none';
    return;
  }
  try {
    const res = await fetch('/api/my-reports', { credentials: 'same-origin' });
    const data = await res.json();
    const reports = data.reports || [];
    link.style.display = reports.length > 0 ? '' : 'none';
  } catch {
    link.style.display = 'none';
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }


async function updatePortalChatBadges(){try{const r=await fetch('/api/chat/status?platform=portal',{credentials:'same-origin'});if(!r.ok)return;const d=await r.json();for(const [id,n] of [['portalInternalBadge',d.internal_unread],['portalSupportBadge',d.support_unread]]){const el=document.getElementById(id);if(el){el.hidden=!Number(n);el.textContent=Number(n)>99?'99+':String(n||0);}}}catch{}}
async function initPortalChrome(activeKey) {
  setFavicon('/assets/favicon.png');
  renderTopbar(activeKey);
  setupPortalThemeSwitcher();
  setupPortalAccountMenu();
  const user = await requireLogin();
  if (!user) return null;
  if (window.SaudeTheme) {
    window.SaudeTheme.syncFromUser(user);
    window.SaudeTheme.bindControls(document.getElementById('themeMenu'));
    updatePortalThemeControl();
  }
  renderTopbarUser(user);
  setupLogout();
  setupMobileNav();
  setupFerramentasDropdown();
  loadFerramentasMenu(user.permissions);
  loadRelatoriosNav(user.permissions);
  updatePortalChatBadges();
  setInterval(updatePortalChatBadges, 10000);
  return user;
}
