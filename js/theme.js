(function () {
  'use strict';

  const STORAGE_KEY = 'saude-cajamar-theme';
  const ALLOWED = new Set(['auto', 'light', 'dark', 'contrast']);
  const root = document.documentElement;
  const colorQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const contrastQuery = window.matchMedia ? window.matchMedia('(prefers-contrast: more)') : null;

  function normalize(value) {
    return ALLOWED.has(value) ? value : 'light';
  }

  const LABELS = {
    auto: 'Automático',
    light: 'Claro',
    dark: 'Escuro',
    contrast: 'Alto contraste',
  };

  function resolve(value) {
    const pref = normalize(value);
    if (pref === 'contrast') return 'contrast';
    if (pref === 'light' || pref === 'dark') return pref;
    if (contrastQuery && contrastQuery.matches) return 'contrast';
    return colorQuery && colorQuery.matches ? 'dark' : 'light';
  }

  function refreshControls(scope) {
    const current = getPreference();
    (scope || document).querySelectorAll('[data-theme-choice]').forEach((button) => {
      const active = button.dataset.themeChoice === current;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      const mark = button.querySelector('[data-theme-check]');
      if (mark) mark.textContent = active ? '✓' : '';
    });
  }

  function apply(value, persist) {
    const pref = normalize(value);
    const resolved = resolve(pref);
    root.dataset.theme = pref;
    root.dataset.themeResolved = resolved;
    root.style.colorScheme = resolved === 'dark' ? 'dark' : 'light';
    if (persist !== false) {
      try { localStorage.setItem(STORAGE_KEY, pref); } catch { /* armazenamento pode estar bloqueado */ }
    }
    refreshControls(document);
    window.dispatchEvent(new CustomEvent('saude-theme-change', { detail: { preference: pref, resolved } }));
    return pref;
  }

  function getPreference() {
    return normalize(root.dataset.theme || readLocal());
  }

  function readLocal() {
    try { return normalize(localStorage.getItem(STORAGE_KEY) || 'light'); }
    catch { return 'light'; }
  }

  let remoteSavePending = 0;
  let ignoreRemoteUntil = 0;

  async function saveRemote(pref) {
    remoteSavePending += 1;
    // Evita que uma leitura do valor antigo no D1 desfaça a escolha recém-feita.
    ignoreRemoteUntil = Date.now() + 3000;
    try {
      const res = await fetch('/api/theme', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: pref }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn('Preferência de aparência salva apenas neste navegador:', data.error || res.status);
      }
    } catch (err) {
      console.warn('Não foi possível sincronizar a aparência com a conta.', err);
    } finally {
      remoteSavePending = Math.max(0, remoteSavePending - 1);
    }
  }

  function setPreference(value, options) {
    const pref = apply(value, true);
    if (!options || options.sync !== false) saveRemote(pref);
    return pref;
  }

  function getResolved() {
    return root.dataset.themeResolved || resolve(getPreference());
  }

  function getLabel(value) {
    return LABELS[normalize(value)] || LABELS.light;
  }

  function toggleLightDark() {
    // O atalho sempre termina em uma preferência explícita. Se o usuário
    // estiver em Automático, considera o tema efetivamente exibido naquele
    // momento; em Alto contraste, o primeiro clique leva ao Escuro.
    const current = getResolved();
    return setPreference(current === 'dark' ? 'light' : 'dark');
  }

  function syncFromUser(user) {
    const serverPref = user && normalize(user.theme);
    if (user && ALLOWED.has(user.theme)) apply(serverPref, true);
    else apply(readLocal(), false);
    return getPreference();
  }

  function bindControls(scope) {
    const target = scope || document;
    target.querySelectorAll('[data-theme-choice]').forEach((button) => {
      if (button.dataset.themeBound === '1') return;
      button.dataset.themeBound = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setPreference(button.dataset.themeChoice);
      });
    });
    refreshControls(target);
  }

  let lastRemoteCheck = 0;
  async function refreshFromRemote() {
    const now = Date.now();
    if (remoteSavePending > 0 || now < ignoreRemoteUntil) return;
    if (now - lastRemoteCheck < 2000) return;
    lastRemoteCheck = now;
    try {
      const res = await fetch('/api/theme', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();
      if (ALLOWED.has(data?.theme) && data.theme !== getPreference()) apply(data.theme, true);
    } catch { /* página pública/offline: mantém o tema local */ }
  }

  function handleSystemChange() {
    if (getPreference() === 'auto') apply('auto', false);
  }
  [colorQuery, contrastQuery].forEach((query) => {
    if (!query) return;
    if (query.addEventListener) query.addEventListener('change', handleSystemChange);
    else if (query.addListener) query.addListener(handleSystemChange);
  });

  window.addEventListener('focus', refreshFromRemote);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshFromRemote(); });

  // Na passagem Portal → eMulti, o middleware pode informar o tema na URL
  // para que a primeira pintura já use a preferência correta, mesmo antes do /api/me.
  let bootPreference = readLocal();
  try {
    const currentUrl = new URL(window.location.href);
    const urlTheme = currentUrl.searchParams.get('theme');
    if (ALLOWED.has(urlTheme)) {
      bootPreference = urlTheme;
      try { localStorage.setItem(STORAGE_KEY, urlTheme); } catch { /* ignore */ }
      currentUrl.searchParams.delete('theme');
      history.replaceState(history.state, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
    }
  } catch { /* URL indisponível/ambiente restrito */ }

  // Executa imediatamente, antes do conteúdo ser pintado, reduzindo o flash de tema.
  apply(bootPreference, false);

  window.SaudeTheme = {
    getPreference,
    getResolved,
    getLabel,
    toggleLightDark,
    setPreference,
    syncFromUser,
    bindControls,
    refreshControls,
    refreshFromRemote,
  };
})();
