// Lógica da página admin.html

const CATEGORY_LABEL = { ferramenta: 'ferramenta', documento: 'documento', manual: 'manual' };
// Funcionalidades que podem ser associadas a um item da categoria "ferramenta",
// usadas para filtrar o menu FERRAMENTAS conforme as permissões do usuário
// (ver Administração > Perfis de acesso e o card de Configurações do profissional).
const FERRAMENTA_FEATURE_OPTIONS = [
  { key: 'receituario', label: 'Receituário' },
  { key: 'malotes', label: 'Malotes e Remessas' },
  { key: 'facilitawhats', label: 'FacilitaWhats' },
  { key: 'mensageiro_esus', label: 'Mensageiro eSUS' },
];
let currentUser = null;

// Nomes das unidades ativas, usados para preencher o campo "Unidade de
// lotação" (select fixo) nos formulários de usuário — mesma fonte de dados
// da aba Unidades e do Receituário. Carregado uma vez na inicialização.
let UNIDADES_NOMES = [];

async function loadUnidadesNomes() {
  try {
    const res = await fetch('/api/unidades', { credentials: 'same-origin' });
    const data = await res.json();
    UNIDADES_NOMES = (data.unidades || []).filter((u) => u.ativo).map((u) => u.nome);
  } catch {
    UNIDADES_NOMES = [];
  }
}

// Monta as <option> do select de "Unidade de lotação". Se o valor atual do
// usuário não estiver mais na lista (unidade renomeada/desativada depois),
// ele é mantido como opção extra para não apagar o dado ao abrir o modal.
function unidadeLotacaoOptionsHtml(selected) {
  const nomes = [...UNIDADES_NOMES];
  if (selected && !nomes.includes(selected)) nomes.push(selected);
  return '<option value="">— selecione —</option>'
    + nomes.map((n) => `<option value="${escapeAttr(n)}" ${n === selected ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('');
}

function openModal(html, wide) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalBox').classList.toggle('modal--wide', !!wide);
  document.getElementById('modalBackdrop').classList.add('is-open');
}
function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('is-open');
  document.getElementById('modalBox').classList.remove('modal--wide');
  document.getElementById('modalBox').innerHTML = '';
}
document.getElementById('modalBackdrop').addEventListener('click', (e) => {
  if (e.target.id === 'modalBackdrop') closeModal();
});

// ---------- Abas ----------

function setupTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  const panels = document.querySelectorAll('.panel-section');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      panels.forEach((p) => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.querySelector(`.panel-section[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');
    });
  });
}

// ---------- Atualizações (home) ----------

function fmtUpdateDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return (y && m && d) ? `${d}/${m}/${y}` : iso;
}

async function loadUpdatesTable() {
  const wrap = document.getElementById('updatesTableWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch('/api/updates', { credentials: 'same-origin' });
  const data = await res.json();
  const items = data.updates || [];

  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Data</th><th>Título</th><th>Tag</th><th></th></tr></thead>
      <tbody>
        ${items.length ? items.map((it) => `
          <tr>
            <td>${escapeHtml(fmtUpdateDate(it.published_at))}</td>
            <td>${escapeHtml(it.title)}</td>
            <td>${it.tag ? `<span class="badge badge--admin">${escapeHtml(it.tag)}</span>` : ''}</td>
            <td class="actions-cell"><div class="row-actions">
              <button class="btn btn--outline btn--sm" data-edit-update="${it.id}">Editar</button>
              <button class="btn btn--danger btn--sm" data-delete-update="${it.id}">Excluir</button>
            </div></td>
          </tr>
        `).join('') : `<tr><td colspan="4" style="color:var(--muted)">Nenhuma atualização publicada.</td></tr>`}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-delete-update]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteUpdate(btn.dataset.deleteUpdate));
  });
  wrap.querySelectorAll('[data-edit-update]').forEach((btn) => {
    const item = items.find((i) => String(i.id) === btn.dataset.editUpdate);
    btn.addEventListener('click', () => openEditUpdateModal(item));
  });
}

async function updateImageValue(urlId, fileId) {
  const url = document.getElementById(urlId)?.value.trim() || '';
  const file = document.getElementById(fileId)?.files?.[0];
  if (!file) return url;
  if (file.size > 600 * 1024) throw new Error('A imagem deve ter no máximo 600 KB.');
  return await new Promise((resolve, reject) => { const r=new FileReader(); r.onload=()=>resolve(String(r.result||'')); r.onerror=()=>reject(new Error('Não foi possível ler a imagem.')); r.readAsDataURL(file); });
}

document.getElementById('addUpdateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('addUpdateMsg');
  msgEl.className = 'form-msg';
  const payload = {
    title: document.getElementById('upTitle').value.trim(),
    body: document.getElementById('upBody').value.trim(),
    tag: document.getElementById('upTag').value.trim(),
    published_at: document.getElementById('upDate').value,
    link_url: document.getElementById('upLinkUrl').value.trim(),
    link_label: document.getElementById('upLinkLabel').value.trim(),
    image_alt: document.getElementById('upImageAlt').value.trim(),
  };
  try { payload.image_url = await updateImageValue('upImageUrl','upImageFile'); } catch (err) { msgEl.className='form-msg is-error'; msgEl.textContent=err.message; return; }
  try {
    const res = await fetch('/api/updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao publicar atualização.');
    document.getElementById('addUpdateForm').reset();
    await loadUpdatesTable();
  } catch (err) {
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
});

function openEditUpdateModal(item) {
  openModal(`
    <h3>Editar atualização</h3>
    <div id="editUpdateMsg" class="form-msg"></div>
    <div class="field">
      <label>Título</label>
      <input type="text" id="editUpTitle" value="${escapeAttr(item.title)}">
    </div>
    <div class="field">
      <label>Texto</label>
      <textarea id="editUpBody" rows="3" style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;font:inherit;resize:vertical">${escapeHtml(item.body)}</textarea>
    </div>
    <div class="field">
      <label>Categoria/tag (opcional)</label>
      <input type="text" id="editUpTag" value="${escapeAttr(item.tag || '')}">
    </div>
    <div class="field">
      <label>Data</label>
      <input type="date" id="editUpDate" value="${escapeAttr(item.published_at || '')}">
    </div>
    <div class="field">
      <label>Link/anexo (opcional)</label>
      <input type="url" id="editUpLinkUrl" value="${escapeAttr(item.link_url || '')}">
    </div>
    <div class="field">
      <label>Texto do link (opcional)</label>
      <input type="text" id="editUpLinkLabel" value="${escapeAttr(item.link_label || '')}">
    </div>
    <div class="field">
      <label>Imagem (URL/caminho ou data incorporada)</label>
      <input type="text" id="editUpImageUrl" value="${escapeAttr(item.image_url || '')}">
    </div>
    <div class="field">
      <label>Descrição da imagem</label>
      <input type="text" id="editUpImageAlt" value="${escapeAttr(item.image_alt || '')}">
    </div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelEditUpdate" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveEditUpdate" type="button">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelEditUpdate').addEventListener('click', closeModal);
  document.getElementById('saveEditUpdate').addEventListener('click', async () => {
    const msgEl = document.getElementById('editUpdateMsg');
    try {
      const res = await fetch(`/api/updates/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: document.getElementById('editUpTitle').value.trim(),
          body: document.getElementById('editUpBody').value.trim(),
          tag: document.getElementById('editUpTag').value.trim(),
          published_at: document.getElementById('editUpDate').value,
          link_url: document.getElementById('editUpLinkUrl').value.trim(),
          link_label: document.getElementById('editUpLinkLabel').value.trim(),
          image_url: document.getElementById('editUpImageUrl').value.trim(),
          image_alt: document.getElementById('editUpImageAlt').value.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      closeModal();
      await loadUpdatesTable();
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function confirmDeleteUpdate(id) {
  openModal(`
    <h3>Excluir atualização</h3>
    <p class="muted">Esta ação não pode ser desfeita. Deseja continuar?</p>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelDelete" type="button">Cancelar</button>
      <button class="btn btn--danger btn--sm" id="confirmDelete" type="button">Excluir</button>
    </div>
  `);
  document.getElementById('cancelDelete').addEventListener('click', closeModal);
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    await fetch(`/api/updates/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    closeModal();
    await loadUpdatesTable();
  });
}

// ---------- Solicitações de cadastro ----------

async function loadSignupRequestsTable() {
  const wrap = document.getElementById('signupRequestsWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch('/api/signup-requests', { credentials: 'same-origin' });
  const data = await res.json();
  const items = data.requests || [];

  const badge = document.getElementById('pendingBadge');
  if (items.length > 0) {
    badge.style.display = '';
    badge.textContent = items.length;
  } else {
    badge.style.display = 'none';
  }

  wrap.innerHTML = items.length ? `
    <table class="data-table">
      <thead><tr><th>Data</th><th>Nome</th><th>Usuário</th><th>Unidade</th><th></th></tr></thead>
      <tbody>
        ${items.map((it) => `
          <tr>
            <td>${escapeHtml(fmtUpdateDate((it.created_at || '').slice(0, 10)))}</td>
            <td>${escapeHtml(it.name)}</td>
            <td>${escapeHtml(it.username)}</td>
            <td>${escapeHtml(it.unidade)}</td>
            <td class="actions-cell"><div class="row-actions">
              <button class="btn btn--accent btn--sm" data-approve="${it.id}">Aprovar</button>
              <button class="btn btn--danger btn--sm" data-reject="${it.id}">Rejeitar</button>
            </div></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : `<div class="empty-state">Nenhuma solicitação pendente.</div>`;

  wrap.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', () => resolveSignupRequest(btn.dataset.approve, 'approve'));
  });
  wrap.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', () => resolveSignupRequest(btn.dataset.reject, 'reject'));
  });
}

function resolveSignupRequest(id, action) {
  if (action === 'reject') {
    openModal(`
      <h3>Rejeitar solicitação</h3>
      <p class="muted">A pessoa não será cadastrada. Deseja continuar?</p>
      <div class="modal__actions">
        <button class="btn btn--outline btn--sm" id="cancelReject" type="button">Cancelar</button>
        <button class="btn btn--danger btn--sm" id="confirmReject" type="button">Rejeitar</button>
      </div>
    `);
    document.getElementById('cancelReject').addEventListener('click', closeModal);
    document.getElementById('confirmReject').addEventListener('click', async () => {
      closeModal();
      await sendSignupResolution(id, 'reject');
    });
    return;
  }
  sendSignupResolution(id, 'approve');
}

async function sendSignupResolution(id, action) {
  try {
    const res = await fetch(`/api/signup-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao processar solicitação.');
    await loadSignupRequestsTable();
    if (action === 'approve') await loadUsersTable();
  } catch (err) {
    openModal(`<h3>Não foi possível concluir</h3><p class="muted">${escapeHtml(err.message)}</p><div class="modal__actions"><button class="btn btn--accent btn--sm" id="okClose" type="button">Entendi</button></div>`);
    document.getElementById('okClose').addEventListener('click', closeModal);
  }
}

// ---------- Links (ferramenta / documento / manual) ----------
async function loadLinksTable(category) {
  const wrap = document.querySelector(`.table-wrap[data-table="${category}"]`);
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  let items;
  try {
    const res = await fetch(`/api/links?category=${category}`, { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar.');
    items = data.links || [];
  } catch (err) {
    wrap.innerHTML = `<p class="muted">Não foi possível carregar (${escapeHtml(err.message)}).</p>`;
    return;
  }

  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Título</th><th>URL</th>${category === 'ferramenta' ? '<th>Funcionalidade</th>' : ''}<th>Abre em</th><th>Ordem</th><th></th></tr></thead>
      <tbody>
        ${items.length ? items.map((it) => `
          <tr>
            <td>${escapeHtml(it.title)}</td>
            <td class="muted-url" title="${escapeAttr(it.url)}">${escapeHtml(it.url)}</td>
            ${category === 'ferramenta' ? `<td>${escapeHtml((FERRAMENTA_FEATURE_OPTIONS.find((f) => f.key === it.feature_key) || {}).label || '—')}</td>` : ''}
            <td>${it.open_mode === '_self' ? 'Mesma aba' : 'Nova aba'}</td>
            <td>${it.sort_order}</td>
            <td class="actions-cell"><div class="row-actions">
              <button class="btn btn--outline btn--sm" data-edit="${it.id}">Editar</button>
              <button class="btn btn--danger btn--sm" data-delete="${it.id}">Excluir</button>
            </div></td>
          </tr>
        `).join('') : `<tr><td colspan="${category === 'ferramenta' ? 6 : 5}" style="color:var(--muted)">Nenhum item cadastrado.</td></tr>`}
      </tbody>
    </table>
    <form class="inline-form" data-add-form="${category}">
      <div class="field field--full">
        <label>Título</label>
        <input type="text" data-field="title" required>
      </div>
      <div class="field">
        <label>URL</label>
        <input type="url" data-field="url" placeholder="https://" required>
      </div>
      ${category === 'ferramenta' ? `
      <div class="field">
        <label>Funcionalidade (para o filtro de permissões)</label>
        <select data-field="feature_key">
          <option value="">— Nenhuma —</option>
          ${FERRAMENTA_FEATURE_OPTIONS.map((f) => `<option value="${f.key}">${escapeHtml(f.label)}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="field">
        <label>Abre em</label>
        <select data-field="open_mode">
          <option value="_blank">Nova aba</option>
          <option value="_self">Mesma aba</option>
        </select>
      </div>
      <div class="field">
        <label>Ordem de exibição</label>
        <input type="number" data-field="sort_order" value="${items.length + 1}">
      </div>
      <div class="field field--full">
        <label>Descrição (opcional)</label>
        <input type="text" data-field="description">
      </div>
      <div class="inline-form__actions">
        <button type="submit" class="btn btn--accent btn--sm">Adicionar item</button>
      </div>
      <div class="form-msg" data-add-msg style="grid-column:1/-1"></div>
    </form>
  `;

  wrap.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteLink(btn.dataset.delete, category));
  });
  wrap.querySelectorAll('[data-edit]').forEach((btn) => {
    const item = items.find((i) => String(i.id) === btn.dataset.edit);
    btn.addEventListener('click', () => openEditLinkModal(item, category));
  });

  const addForm = wrap.querySelector(`[data-add-form="${category}"]`);
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = addForm.querySelector('[data-add-msg]');
    msgEl.className = 'form-msg';
    const featureField = addForm.querySelector('[data-field="feature_key"]');
    const payload = {
      category,
      title: addForm.querySelector('[data-field="title"]').value.trim(),
      url: addForm.querySelector('[data-field="url"]').value.trim(),
      sort_order: Number(addForm.querySelector('[data-field="sort_order"]').value) || 0,
      description: addForm.querySelector('[data-field="description"]').value.trim(),
      feature_key: featureField ? (featureField.value || null) : null,
      open_mode: addForm.querySelector('[data-field="open_mode"]').value,
    };
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar item.');
      await loadLinksTable(category);
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function openEditLinkModal(item, category) {
  openModal(`
    <h3>Editar item</h3>
    <p class="muted">Categoria: ${CATEGORY_LABEL[category]}</p>
    <div id="editLinkMsg" class="form-msg"></div>
    <div class="field">
      <label>Título</label>
      <input type="text" id="editTitle" value="${escapeAttr(item.title)}">
    </div>
    <div class="field">
      <label>URL</label>
      <input type="url" id="editUrl" value="${escapeAttr(item.url)}">
    </div>
    ${category === 'ferramenta' ? `
    <div class="field">
      <label>Funcionalidade (para o filtro de permissões)</label>
      <select id="editFeatureKey">
        <option value="">— Nenhuma —</option>
        ${FERRAMENTA_FEATURE_OPTIONS.map((f) => `<option value="${f.key}" ${item.feature_key === f.key ? 'selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
      </select>
    </div>` : ''}
    <div class="field">
      <label>Abre em</label>
      <select id="editOpenMode">
        <option value="_blank" ${item.open_mode !== '_self' ? 'selected' : ''}>Nova aba</option>
        <option value="_self" ${item.open_mode === '_self' ? 'selected' : ''}>Mesma aba</option>
      </select>
    </div>
    <div class="field">
      <label>Ordem de exibição</label>
      <input type="number" id="editOrder" value="${item.sort_order}">
    </div>
    <div class="field">
      <label>Descrição (opcional)</label>
      <input type="text" id="editDesc" value="${escapeAttr(item.description || '')}">
    </div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelEditLink" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveEditLink" type="button">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelEditLink').addEventListener('click', closeModal);
  document.getElementById('saveEditLink').addEventListener('click', async () => {
    const msgEl = document.getElementById('editLinkMsg');
    const featureField = document.getElementById('editFeatureKey');
    try {
      const res = await fetch(`/api/links/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          category,
          title: document.getElementById('editTitle').value.trim(),
          url: document.getElementById('editUrl').value.trim(),
          sort_order: Number(document.getElementById('editOrder').value) || 0,
          description: document.getElementById('editDesc').value.trim(),
          feature_key: featureField ? (featureField.value || null) : null,
          open_mode: document.getElementById('editOpenMode').value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      closeModal();
      await loadLinksTable(category);
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function confirmDeleteLink(id, category) {
  openModal(`
    <h3>Excluir item</h3>
    <p class="muted">Esta ação não pode ser desfeita. Deseja continuar?</p>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelDelete" type="button">Cancelar</button>
      <button class="btn btn--danger btn--sm" id="confirmDelete" type="button">Excluir</button>
    </div>
  `);
  document.getElementById('cancelDelete').addEventListener('click', closeModal);
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    await fetch(`/api/links/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    closeModal();
    await loadLinksTable(category);
  });
}

// ---------- Relatórios: grupos de acesso ----------

let cachedReports = [];

async function loadReportGroupsTable() {
  const wrap = document.getElementById('reportGroupsWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch('/api/report-groups', { credentials: 'same-origin' });
  const data = await res.json();
  const groups = data.groups || [];

  wrap.innerHTML = groups.length ? `
    <table class="data-table">
      <thead><tr><th>Nome</th><th>Descrição</th><th></th></tr></thead>
      <tbody>
        ${groups.map((g) => `
          <tr>
            <td>${escapeHtml(g.name)}</td>
            <td>${escapeHtml(g.description || '—')}</td>
            <td class="actions-cell"><div class="row-actions">
              <button class="btn btn--outline btn--sm" data-edit-group="${g.id}">Editar</button>
              <button class="btn btn--outline btn--sm" data-group-reports="${g.id}">Relatórios deste grupo</button>
              <button class="btn btn--danger btn--sm" data-delete-group="${g.id}">Excluir</button>
            </div></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : `<div class="empty-state">Nenhum grupo criado ainda.</div>`;

  wrap.querySelectorAll('[data-edit-group]').forEach((btn) => {
    const g = groups.find((x) => String(x.id) === btn.dataset.editGroup);
    btn.addEventListener('click', () => openEditGroupModal(g));
  });
  wrap.querySelectorAll('[data-delete-group]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteGroup(btn.dataset.deleteGroup));
  });
  wrap.querySelectorAll('[data-group-reports]').forEach((btn) => {
    const g = groups.find((x) => String(x.id) === btn.dataset.groupReports);
    btn.addEventListener('click', () => openGroupReportsModal(g));
  });
}

document.getElementById('addGroupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('addGroupMsg');
  msgEl.className = 'form-msg';
  try {
    const res = await fetch('/api/report-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        name: document.getElementById('grpName').value.trim(),
        description: document.getElementById('grpDesc').value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar grupo.');
    document.getElementById('addGroupForm').reset();
    await loadReportGroupsTable();
  } catch (err) {
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
});

function openEditGroupModal(g) {
  openModal(`
    <h3>Editar grupo</h3>
    <div id="editGroupMsg" class="form-msg"></div>
    <div class="field">
      <label>Nome</label>
      <input type="text" id="editGrpName" value="${escapeAttr(g.name)}">
    </div>
    <div class="field">
      <label>Descrição</label>
      <input type="text" id="editGrpDesc" value="${escapeAttr(g.description || '')}">
    </div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelEditGroup" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveEditGroup" type="button">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelEditGroup').addEventListener('click', closeModal);
  document.getElementById('saveEditGroup').addEventListener('click', async () => {
    const msgEl = document.getElementById('editGroupMsg');
    try {
      const res = await fetch(`/api/report-groups/${g.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: document.getElementById('editGrpName').value.trim(),
          description: document.getElementById('editGrpDesc').value.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      closeModal();
      await loadReportGroupsTable();
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function confirmDeleteGroup(id) {
  openModal(`
    <h3>Excluir grupo</h3>
    <p class="muted">Usuários deste grupo perdem acesso aos relatórios vinculados a ele. Deseja continuar?</p>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelDelete" type="button">Cancelar</button>
      <button class="btn btn--danger btn--sm" id="confirmDelete" type="button">Excluir</button>
    </div>
  `);
  document.getElementById('cancelDelete').addEventListener('click', closeModal);
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    await fetch(`/api/report-groups/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    closeModal();
    await loadReportGroupsTable();
  });
}

async function openGroupReportsModal(g) {
  openModal(`
    <h3>Relatórios do grupo "${escapeHtml(g.name)}"</h3>
    <div id="groupReportsMsg" class="form-msg"></div>
    <div id="groupReportsList" class="skeleton-loading">Carregando…</div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelGroupReports" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveGroupReports" type="button" style="display:none">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelGroupReports').addEventListener('click', closeModal);

  const listEl = document.getElementById('groupReportsList');
  const saveBtn = document.getElementById('saveGroupReports');
  const msgEl = document.getElementById('groupReportsMsg');

  try {
    const res = await fetch(`/api/report-groups/${g.id}/reports`, { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar relatórios.');
    const reports = data.reports || [];

    listEl.innerHTML = reports.length ? `
      <div class="checkbox-list">
        ${reports.map((r) => `
          <label style="display:flex;align-items:center;gap:8px;padding:4px 0">
            <input type="checkbox" value="${r.id}" ${r.atribuido ? 'checked' : ''} style="width:auto">
            ${escapeHtml(r.title)}
          </label>
        `).join('')}
      </div>
    ` : `<p class="muted">Nenhum relatório cadastrado ainda. Adicione relatórios na lista abaixo antes.</p>`;
    saveBtn.style.display = '';
    saveBtn.addEventListener('click', async () => {
      const reportIds = [...listEl.querySelectorAll('input[type=checkbox]:checked')].map((c) => Number(c.value));
      try {
        const putRes = await fetch(`/api/report-groups/${g.id}/reports`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ reportIds }),
        });
        const putData = await putRes.json();
        if (!putRes.ok) throw new Error(putData.error || 'Erro ao salvar.');
        closeModal();
      } catch (err) {
        msgEl.className = 'form-msg is-error';
        msgEl.textContent = err.message;
      }
    });
  } catch (err) {
    listEl.innerHTML = '';
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
}

// ---------- Relatórios: cadastro ----------

// ---------- Unidades ----------
// Cadastro central de unidades de saúde: usado no Receituário e nas telas de
// atribuição da aba Usuários. Cadastrar/editar/excluir é restrito ao Super
// Administrador; os demais administradores veem a lista em modo consulta.

async function loadUnidadesTable() {
  const wrap = document.getElementById('unidadesTableWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch('/api/unidades', { credentials: 'same-origin' });
  const data = await res.json();
  const unidades = data.unidades || [];
  const podeEditar = currentUser.role === 'super_admin';

  wrap.innerHTML = unidades.length ? `
    <table class="data-table">
      <thead><tr><th>Nome</th><th>CNES</th><th>Endereço</th><th>Telefone</th><th>Status</th>${podeEditar ? '<th></th>' : ''}</tr></thead>
      <tbody>
        ${unidades.map((u) => `
          <tr>
            <td>${escapeHtml(u.nome)}</td>
            <td>${escapeHtml(u.cnes || '—')}</td>
            <td>${escapeHtml(u.endereco || '—')}</td>
            <td>${escapeHtml(u.tel || '—')}</td>
            <td>${u.ativo ? 'Ativa' : '<span class="muted">Inativa</span>'}</td>
            ${podeEditar ? `
              <td class="actions-cell"><div class="row-actions">
                <button class="btn btn--outline btn--sm" data-edit-unidade="${escapeAttr(u.code)}">Editar</button>
                <button class="btn btn--danger btn--sm" data-delete-unidade="${escapeAttr(u.code)}">Excluir</button>
              </div></td>
            ` : ''}
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : `<div class="empty-state">Nenhuma unidade cadastrada ainda.</div>`;

  if (podeEditar) {
    wrap.querySelectorAll('[data-edit-unidade]').forEach((btn) => {
      const u = unidades.find((x) => x.code === btn.dataset.editUnidade);
      btn.addEventListener('click', () => openEditUnidadeModal(u));
    });
    wrap.querySelectorAll('[data-delete-unidade]').forEach((btn) => {
      const u = unidades.find((x) => x.code === btn.dataset.deleteUnidade);
      btn.addEventListener('click', () => confirmDeleteUnidade(u));
    });
  }
}

document.getElementById('addUnidadeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('addUnidadeMsg');
  msgEl.className = 'form-msg';
  try {
    const res = await fetch('/api/unidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        nome: document.getElementById('uniNome').value.trim(),
        cnes: document.getElementById('uniCnes').value.trim(),
        endereco: document.getElementById('uniEndereco').value.trim(),
        tel: document.getElementById('uniTel').value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar unidade.');
    document.getElementById('addUnidadeForm').reset();
    await loadUnidadesTable();
    await loadUnidadesNomes();
  } catch (err) {
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
});

function openEditUnidadeModal(u) {
  openModal(`
    <h3>Editar unidade</h3>
    <div id="editUnidadeMsg" class="form-msg"></div>
    <div class="field">
      <label>Nome</label>
      <input type="text" id="editUniNome" value="${escapeAttr(u.nome)}">
    </div>
    <div class="field">
      <label>CNES</label>
      <input type="text" id="editUniCnes" value="${escapeAttr(u.cnes || '')}">
    </div>
    <div class="field">
      <label>Telefone</label>
      <input type="text" id="editUniTel" value="${escapeAttr(u.tel || '')}">
    </div>
    <div class="field">
      <label>Endereço</label>
      <input type="text" id="editUniEndereco" value="${escapeAttr(u.endereco || '')}">
    </div>
    <div class="field">
      <label style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="editUniAtivo" style="width:auto" ${u.ativo ? 'checked' : ''}>
        Unidade ativa (aparece no Receituário e nos seletores de atribuição)
      </label>
    </div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelEditUnidade" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveEditUnidade" type="button">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelEditUnidade').addEventListener('click', closeModal);
  document.getElementById('saveEditUnidade').addEventListener('click', async () => {
    const msgEl = document.getElementById('editUnidadeMsg');
    try {
      const res = await fetch(`/api/unidades/${encodeURIComponent(u.code)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          nome: document.getElementById('editUniNome').value.trim(),
          cnes: document.getElementById('editUniCnes').value.trim(),
          tel: document.getElementById('editUniTel').value.trim(),
          endereco: document.getElementById('editUniEndereco').value.trim(),
          ativo: document.getElementById('editUniAtivo').checked,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      closeModal();
      await loadUnidadesTable();
    await loadUnidadesNomes();
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function confirmDeleteUnidade(u) {
  openModal(`
    <h3>Excluir unidade</h3>
    <p class="muted">Isso remove "${escapeHtml(u.nome)}" do Receituário e de qualquer atribuição de usuário já feita a ela. Se for só uma pausa temporária, prefira desativar em vez de excluir. Deseja continuar?</p>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelDelete" type="button">Cancelar</button>
      <button class="btn btn--danger btn--sm" id="confirmDelete" type="button">Excluir</button>
    </div>
  `);
  document.getElementById('cancelDelete').addEventListener('click', closeModal);
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    await fetch(`/api/unidades/${encodeURIComponent(u.code)}`, { method: 'DELETE', credentials: 'same-origin' });
    closeModal();
    await loadUnidadesTable();
    await loadUnidadesNomes();
  });
}

async function loadReportsTable() {
  const wrap = document.getElementById('reportsWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const res = await fetch('/api/reports', { credentials: 'same-origin' });
  const data = await res.json();
  cachedReports = data.reports || [];

  wrap.innerHTML = cachedReports.length ? `
    <table class="data-table">
      <thead><tr><th>Título</th><th>Como abre</th><th>Ordem</th><th></th></tr></thead>
      <tbody>
        ${cachedReports.map((r) => `
          <tr>
            <td>${escapeHtml(r.title)}</td>
            <td>${r.display_mode === 'new_tab' ? 'Nova aba' : 'Incorporado'}</td>
            <td>${r.sort_order}</td>
            <td class="actions-cell"><div class="row-actions">
              <button class="btn btn--outline btn--sm" data-edit-report="${r.id}">Editar</button>
              <button class="btn btn--danger btn--sm" data-delete-report="${r.id}">Excluir</button>
            </div></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : `<div class="empty-state">Nenhum relatório cadastrado ainda.</div>`;

  wrap.querySelectorAll('[data-edit-report]').forEach((btn) => {
    const r = cachedReports.find((x) => String(x.id) === btn.dataset.editReport);
    btn.addEventListener('click', () => openEditReportModal(r));
  });
  wrap.querySelectorAll('[data-delete-report]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteReport(btn.dataset.deleteReport));
  });
}

document.getElementById('addReportForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('addReportMsg');
  msgEl.className = 'form-msg';
  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        title: document.getElementById('repTitle').value.trim(),
        description: document.getElementById('repDesc').value.trim(),
        embed_url: document.getElementById('repUrl').value.trim(),
        display_mode: document.getElementById('repMode').value,
        sort_order: Number(document.getElementById('repOrder').value) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao adicionar relatório.');
    document.getElementById('addReportForm').reset();
    await loadReportsTable();
  } catch (err) {
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
});

function openEditReportModal(r) {
  openModal(`
    <h3>Editar relatório</h3>
    <div id="editReportMsg" class="form-msg"></div>
    <div class="field">
      <label>Título</label>
      <input type="text" id="editRepTitle" value="${escapeAttr(r.title)}">
    </div>
    <div class="field">
      <label>Descrição</label>
      <input type="text" id="editRepDesc" value="${escapeAttr(r.description || '')}">
    </div>
    <div class="field">
      <label>Link do relatório</label>
      <input type="url" id="editRepUrl" value="${escapeAttr(r.embed_url)}">
    </div>
    <div class="field">
      <label>Como abrir</label>
      <select id="editRepMode">
        <option value="embed" ${r.display_mode === 'embed' ? 'selected' : ''}>Incorporado no portal</option>
        <option value="new_tab" ${r.display_mode === 'new_tab' ? 'selected' : ''}>Nova aba</option>
      </select>
    </div>
    <div class="field">
      <label>Ordem de exibição</label>
      <input type="number" id="editRepOrder" value="${r.sort_order}">
    </div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelEditReport" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveEditReport" type="button">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelEditReport').addEventListener('click', closeModal);
  document.getElementById('saveEditReport').addEventListener('click', async () => {
    const msgEl = document.getElementById('editReportMsg');
    try {
      const res = await fetch(`/api/reports/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title: document.getElementById('editRepTitle').value.trim(),
          description: document.getElementById('editRepDesc').value.trim(),
          embed_url: document.getElementById('editRepUrl').value.trim(),
          display_mode: document.getElementById('editRepMode').value,
          sort_order: Number(document.getElementById('editRepOrder').value) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      closeModal();
      await loadReportsTable();
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function confirmDeleteReport(id) {
  openModal(`
    <h3>Excluir relatório</h3>
    <p class="muted">Esta ação não pode ser desfeita. Deseja continuar?</p>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelDelete" type="button">Cancelar</button>
      <button class="btn btn--danger btn--sm" id="confirmDelete" type="button">Excluir</button>
    </div>
  `);
  document.getElementById('cancelDelete').addEventListener('click', closeModal);
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    await fetch(`/api/reports/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    closeModal();
    await loadReportsTable();
  });
}

// ---------- Perfis de acesso (teto de funcionalidades por papel) ----------

const ROLE_PERMS_LABEL = { user: 'Usuário', admin_unidade: 'Administrador de Unidade', admin: 'Administrador' };

async function loadRolePermsTable() {
  const wrap = document.getElementById('rolePermsWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  let data;
  try {
    const res = await fetch('/api/role-permissions', { credentials: 'same-origin' });
    data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar.');
  } catch (err) {
    wrap.innerHTML = `<p class="muted">Não foi possível carregar os perfis de acesso (${escapeHtml(err.message)}). Confira se a migração database/migrations/legacy/migration_permissions.sql já foi executada no banco D1.</p>`;
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Funcionalidade</th>
            ${data.roles.map((r) => `<th>${escapeHtml(ROLE_PERMS_LABEL[r] || r)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.features.map((f) => `
            <tr>
              <td>${escapeHtml(f.label)}</td>
              ${data.roles.map((r) => `
                <td style="text-align:center">
                  <input type="checkbox" data-role="${r}" data-feature="${f.key}" ${data.permissions[r][f.key] ? 'checked' : ''} style="width:auto">
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div id="rolePermsMsg" class="form-msg" style="margin-top:12px"></div>
    <div class="modal__actions" style="justify-content:flex-start;padding:0;border:none;margin-top:12px">
      <button class="btn btn--accent btn--sm" id="saveRolePerms" type="button">Salvar alterações</button>
    </div>
  `;

  document.getElementById('saveRolePerms').addEventListener('click', async () => {
    const msgEl = document.getElementById('rolePermsMsg');
    msgEl.className = 'form-msg';
    const permissions = {};
    data.roles.forEach((r) => { permissions[r] = {}; });
    wrap.querySelectorAll('input[type=checkbox][data-role]').forEach((c) => {
      permissions[c.dataset.role][c.dataset.feature] = c.checked;
    });
    try {
      const putRes = await fetch('/api/role-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ permissions }),
      });
      const putData = await putRes.json();
      if (!putRes.ok) throw new Error(putData.error || 'Erro ao salvar.');
      msgEl.className = 'form-msg is-ok';
      msgEl.textContent = 'Perfis de acesso atualizados com sucesso.';
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

// ---------- Usuários ----------

function roleLabel(role) {
  if (role === 'super_admin') return 'Super Administrador';
  if (role === 'admin') return 'Administrador';
  if (role === 'admin_unidade') return 'Administrador de Unidade';
  return 'Usuário';
}
function roleBadgeClass(role) {
  return role === 'user' ? 'badge--user' : 'badge--admin';
}

const usersListState = { page: 1, pageSize: 20, q: '', unidade: '', role: '', status: '' };
let usersSearchTimer = null;

function usersPaginationHtml(meta) {
  const total = Number(meta?.total || 0);
  const page = Number(meta?.page || 1);
  const pages = Number(meta?.pages || 0);
  const size = Number(meta?.page_size || usersListState.pageSize);
  if (!total) return '<span class="muted">Nenhum registro encontrado.</span>';
  const first = (page - 1) * size + 1;
  const last = Math.min(total, page * size);
  return `
    <div class="muted">Exibindo ${first}–${last} de ${total}</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <label class="muted" for="usersPageSize">Por página</label>
      <select id="usersPageSize" style="width:auto">
        ${[10,20,50,100].map((n)=>`<option value="${n}" ${n===size?'selected':''}>${n}</option>`).join('')}
      </select>
      <button class="btn btn--outline btn--sm" type="button" id="usersPrevPage" ${page<=1?'disabled':''}>Anterior</button>
      <span class="muted">Página ${page} de ${pages || 1}</span>
      <button class="btn btn--outline btn--sm" type="button" id="usersNextPage" ${!pages || page>=pages?'disabled':''}>Próxima</button>
    </div>`;
}

async function loadUsersTable() {
  const wrap = document.getElementById('usersTableWrap');
  const pager = document.getElementById('usersPagination');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  const params = new URLSearchParams({
    page: String(usersListState.page),
    page_size: String(usersListState.pageSize),
  });
  if (usersListState.q) params.set('q', usersListState.q);
  if (usersListState.unidade) params.set('unidade', usersListState.unidade);
  if (usersListState.role) params.set('role', usersListState.role);
  if (usersListState.status) params.set('status', usersListState.status);

  const res = await fetch(`/api/users?${params.toString()}`, { credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) {
    wrap.innerHTML = `<div class="form-msg is-error">${escapeHtml(data.error || 'Não foi possível carregar usuários.')}</div>`;
    if (pager) pager.innerHTML = '';
    return;
  }
  const users = data.users || [];
  const meta = data.pagination || {};
  usersListState.page = Number(meta.page || 1);
  usersListState.pageSize = Number(meta.page_size || usersListState.pageSize);
  const canManageAdmins = currentUser && currentUser.role === 'super_admin';

  wrap.innerHTML = users.length ? `
    <div style="overflow:auto">
    <table class="data-table">
      <thead><tr><th>Nome</th><th>Usuário</th><th>Unidade</th><th>Função</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${users.map((u) => {
          const isAdminLevel = u.role !== 'user';
          const locked = isAdminLevel && !canManageAdmins;
          return `
          <tr>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.username)}</td>
            <td>${escapeHtml(u.unidade || '—')}</td>
            <td><span class="badge ${roleBadgeClass(u.role)}">${roleLabel(u.role)}</span></td>
            <td>${u.active ? '<span class="badge badge--user">Ativo</span>' : '<span class="badge badge--inactive">Inativo</span>'}</td>
            <td class="actions-cell"><div class="row-actions">
              ${locked ? '<span class="muted" style="font-size:12.5px">Só Super Admin</span>' : `
                <button class="btn btn--outline btn--sm" data-edit-user="${u.id}">Editar</button>
                ${u.role !== 'super_admin' ? `<button class="btn btn--outline btn--sm" data-config-user="${u.id}">Configurações</button>` : ''}
                <button class="btn btn--danger btn--sm" data-delete-user="${u.id}">Excluir</button>
              `}
            </div></td>
          </tr>
        `;}).join('')}
      </tbody>
    </table></div>
  ` : '<div class="empty-state">Nenhum usuário encontrado com os filtros selecionados.</div>';

  if (pager) {
    pager.innerHTML = usersPaginationHtml(meta);
    document.getElementById('usersPageSize')?.addEventListener('change', (e) => {
      usersListState.pageSize = Number(e.target.value) || 20;
      usersListState.page = 1;
      loadUsersTable();
    });
    document.getElementById('usersPrevPage')?.addEventListener('click', () => {
      if (usersListState.page > 1) { usersListState.page--; loadUsersTable(); }
    });
    document.getElementById('usersNextPage')?.addEventListener('click', () => {
      usersListState.page++; loadUsersTable();
    });
  }

  wrap.querySelectorAll('[data-edit-user]').forEach((btn) => {
    const u = users.find((x) => String(x.id) === btn.dataset.editUser);
    btn.addEventListener('click', () => openEditUserModal(u));
  });
  wrap.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteUser(btn.dataset.deleteUser));
  });
  wrap.querySelectorAll('[data-config-user]').forEach((btn) => {
    const u = users.find((x) => String(x.id) === btn.dataset.configUser);
    btn.addEventListener('click', () => openUserConfigModal(u));
  });
}

function setupUsersListFilters() {
  const unit = document.getElementById('usersUnitFilter');
  if (unit) {
    unit.innerHTML = '<option value="">Todas as unidades</option>' +
      UNIDADES_NOMES.map((n) => `<option value="${escapeAttr(n)}">${escapeHtml(n)}</option>`).join('');
    unit.addEventListener('change', () => {
      usersListState.unidade = unit.value;
      usersListState.page = 1;
      loadUsersTable();
    });
  }
  const role = document.getElementById('usersRoleFilter');
  role?.addEventListener('change', () => {
    usersListState.role = role.value;
    usersListState.page = 1;
    loadUsersTable();
  });
  const status = document.getElementById('usersStatusFilter');
  status?.addEventListener('change', () => {
    usersListState.status = status.value;
    usersListState.page = 1;
    loadUsersTable();
  });
  const search = document.getElementById('usersSearch');
  search?.addEventListener('input', () => {
    clearTimeout(usersSearchTimer);
    usersSearchTimer = setTimeout(() => {
      usersListState.q = search.value.trim();
      usersListState.page = 1;
      loadUsersTable();
    }, 300);
  });
  document.getElementById('usersClearFilters')?.addEventListener('click', () => {
    usersListState.q = '';
    usersListState.unidade = '';
    usersListState.role = '';
    usersListState.status = '';
    usersListState.page = 1;
    if (search) search.value = '';
    if (unit) unit.value = '';
    if (role) role.value = '';
    if (status) status.value = '';
    loadUsersTable();
  });
}

// ---------- Configurações do profissional (card único) ----------
// Substitui os antigos botões separados "Unidades (Receituário)", "Grupos de
// relatórios" e "Unidades que gerencia" por um único card com todas as seções
// relevantes para o papel do usuário, incluindo as funcionalidades habilitadas
// (respeitando sempre o teto definido em Administração > Perfis de acesso).

async function openUserConfigModal(u) {
  const canManageAdmins = currentUser && currentUser.role === 'super_admin';

  openModal(`
    <h3>Configurações de ${escapeHtml(u.name)}</h3>
    <p class="muted">${escapeHtml(u.username)} — ${roleLabel(u.role)}</p>
    <div id="userCfgMsg" class="form-msg"></div>
    <div id="userCfgBody" class="skeleton-loading">Carregando…</div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelUserCfg" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveUserCfg" type="button" style="display:none">Salvar alterações</button>
    </div>
  `, true);
  document.getElementById('cancelUserCfg').addEventListener('click', closeModal);

  const body = document.getElementById('userCfgBody');
  const msgEl = document.getElementById('userCfgMsg');
  const saveBtn = document.getElementById('saveUserCfg');

  const showUnidades = u.role === 'user';
  const showReportGroups = u.role === 'user';
  const showGestao = u.role === 'admin_unidade' && canManageAdmins;

  try {
    const [permRes, unidadesRes, repGroupsRes, gestaoRes] = await Promise.all([
      fetch(`/api/users/${u.id}/permissions`, { credentials: 'same-origin' }),
      showUnidades ? fetch(`/api/users/${u.id}/unidades`, { credentials: 'same-origin' }) : Promise.resolve(null),
      showReportGroups ? fetch(`/api/users/${u.id}/report-groups`, { credentials: 'same-origin' }) : Promise.resolve(null),
      showGestao ? fetch(`/api/users/${u.id}/admin-unidades`, { credentials: 'same-origin' }) : Promise.resolve(null),
    ]);

    const permData = await permRes.json();
    if (!permRes.ok) throw new Error(permData.error || 'Erro ao carregar funcionalidades.');
    const unidadesData = unidadesRes ? await unidadesRes.json() : null;
    if (unidadesRes && !unidadesRes.ok) throw new Error(unidadesData.error || 'Erro ao carregar unidades.');
    const repGroupsData = repGroupsRes ? await repGroupsRes.json() : null;
    if (repGroupsRes && !repGroupsRes.ok) throw new Error(repGroupsData.error || 'Erro ao carregar grupos.');
    const gestaoData = gestaoRes ? await gestaoRes.json() : null;
    if (gestaoRes && !gestaoRes.ok) throw new Error(gestaoData.error || 'Erro ao carregar unidades geridas.');

    // ---- Funcionalidades ----
    const featuresHtml = `
      <div class="panel-section__title" style="font-size:15px">Funcionalidades habilitadas</div>
      <p class="muted" style="margin:2px 0 8px">Marque o que ${escapeHtml(u.name)} pode usar. Itens em cinza não estão liberados para o papel "${roleLabel(u.role)}". <strong>Regulação de Vagas</strong> mantém suas responsabilidades internas no eMulti. <strong>Produção</strong> e <strong>Apoio Clínico / IA</strong> têm acesso ao ambiente liberado exclusivamente pelo Super Administrador; os perfis internos são configurados no próprio ambiente.</p>
      <div class="checkbox-list" id="userCfgFeatures">
        ${permData.features.map((f) => {
          const dentroDoTeto = !!permData.ceiling[f.key];
          const gerenciadoExterno = !!f.managedExternally;
          const superPodeGerenciar = !!f.managedBySuperAdmin && currentUser?.role === 'super_admin';
          const marcado = dentroDoTeto && (permData.overrides.hasOwnProperty(f.key) ? permData.overrides[f.key] : !gerenciadoExterno);
          const habilitado = dentroDoTeto && (!gerenciadoExterno || superPodeGerenciar);
          const sufixo = f.key === 'regulacao_vagas'
            ? ' <span class="muted" style="font-size:12px">(responsabilidades no eMulti)</span>'
            : (f.managedBySuperAdmin
                ? ' <span class="muted" style="font-size:12px">(acesso ao ambiente — Super Admin)</span>'
                : (dentroDoTeto ? '' : ' <span class="muted" style="font-size:12px">(fora do perfil)</span>'));
          return `
            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;${habilitado ? '' : 'color:var(--muted)'}">
              <input type="checkbox" value="${f.key}" ${marcado ? 'checked' : ''} ${habilitado ? '' : 'disabled'} style="width:auto">
              ${escapeHtml(f.label)}${sufixo}
            </label>
          `;
        }).join('')}
      </div>
    `;

    // ---- Unidades (Receituário) ----
    let unidadesHtml = '';
    if (showUnidades && unidadesData) {
      unidadesHtml = `
        <div class="panel-section__title" style="font-size:15px;margin-top:22px">Unidades (Receituário)</div>
        <p class="muted" style="margin:2px 0 8px">Unidades que ${escapeHtml(u.name)} pode selecionar ao emitir receitas.</p>
        <div class="checkbox-list" id="userCfgUnidades">
          ${unidadesData.unidades.map((un) => `
            <label style="display:flex;align-items:center;gap:8px;padding:4px 0">
              <input type="checkbox" value="${escapeAttr(un.code)}" ${un.atribuida ? 'checked' : ''} style="width:auto">
              ${escapeHtml(un.nome)}
            </label>
          `).join('')}
        </div>
      `;
    }

    // ---- Grupos de relatórios ----
    let repGroupsHtml = '';
    if (showReportGroups && repGroupsData) {
      repGroupsHtml = repGroupsData.groups.length ? `
        <div class="panel-section__title" style="font-size:15px;margin-top:22px">Grupos de relatórios</div>
        <p class="muted" style="margin:2px 0 8px">Grupos aos quais ${escapeHtml(u.name)} deve pertencer.</p>
        <div class="checkbox-list" id="userCfgRepGroups">
          ${repGroupsData.groups.map((g) => `
            <label style="display:flex;align-items:center;gap:8px;padding:4px 0">
              <input type="checkbox" value="${g.id}" ${g.atribuido ? 'checked' : ''} style="width:auto">
              ${escapeHtml(g.name)}
            </label>
          `).join('')}
        </div>
      ` : `
        <div class="panel-section__title" style="font-size:15px;margin-top:22px">Grupos de relatórios</div>
        <p class="muted">Nenhum grupo de acesso criado ainda. Crie um na aba Relatórios.</p>
        <div id="userCfgRepGroups" style="display:none"></div>
      `;
    }

    // ---- Unidades que gerencia (admin_unidade) ----
    let gestaoHtml = '';
    if (showGestao && gestaoData) {
      // União da lista canônica de unidades com o que já estava atribuído
      // (preserva valores antigos em texto livre, ex.: "Secretaria", que não
      // fazem parte do cadastro de unidades do Receituário).
      const opcoesGestao = [...gestaoData.unidades];
      gestaoData.atribuidas.forEach((a) => {
        if (!opcoesGestao.some((o) => o.toLowerCase() === a.toLowerCase())) opcoesGestao.push(a);
      });
      gestaoHtml = `
        <div class="panel-section__title" style="font-size:15px;margin-top:22px">Unidades que gerencia</div>
        <p class="muted" style="margin:2px 0 8px">Unidades sob a gestão de ${escapeHtml(u.name)}.</p>
        <div class="checkbox-list" id="userCfgGestao">
          ${opcoesGestao.map((un) => `
            <label style="display:flex;align-items:center;gap:8px;padding:4px 0">
              <input type="checkbox" value="${escapeAttr(un)}" ${gestaoData.atribuidas.map((a) => a.toLowerCase()).includes(un.toLowerCase()) ? 'checked' : ''} style="width:auto">
              ${escapeHtml(un)}
            </label>
          `).join('')}
        </div>
        <div class="field" style="margin-top:10px">
          <label for="userCfgNovaUnidade">Adicionar outra unidade (se ainda não estiver na lista)</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="userCfgNovaUnidade" style="flex:1" placeholder="Digite o nome exato da unidade">
            <button type="button" id="userCfgAddUnidadeBtn" class="btn btn--outline btn--sm">Adicionar</button>
          </div>
        </div>
      `;
    }

    body.innerHTML = featuresHtml + unidadesHtml + repGroupsHtml + gestaoHtml;
    saveBtn.style.display = '';

    if (showGestao && gestaoData) {
      document.getElementById('userCfgAddUnidadeBtn').addEventListener('click', () => {
        const input = document.getElementById('userCfgNovaUnidade');
        const valor = input.value.trim();
        if (!valor) return;
        const list = document.getElementById('userCfgGestao');
        const jaExiste = [...list.querySelectorAll('input[type=checkbox]')].some((c) => c.value.toLowerCase() === valor.toLowerCase());
        if (!jaExiste) {
          const label = document.createElement('label');
          label.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0';
          label.innerHTML = `<input type="checkbox" value="${escapeAttr(valor)}" checked style="width:auto"> ${escapeHtml(valor)}`;
          list.appendChild(label);
        }
        input.value = '';
      });
    }

    saveBtn.addEventListener('click', async () => {
      msgEl.className = 'form-msg';
      saveBtn.disabled = true;
      try {
        // Funcionalidades — só envia chaves dentro do teto do papel.
        const featureChecks = [...document.getElementById('userCfgFeatures').querySelectorAll('input[type=checkbox]:not([disabled])')];
        const permissionsPayload = {};
        featureChecks.forEach((c) => { permissionsPayload[c.value] = c.checked; });
        await putJson(`/api/users/${u.id}/permissions`, { permissions: permissionsPayload });

        if (showUnidades) {
          const codigos = [...document.getElementById('userCfgUnidades').querySelectorAll('input[type=checkbox]:checked')].map((c) => c.value);
          await putJson(`/api/users/${u.id}/unidades`, { unidades: codigos });
        }
        if (showReportGroups && repGroupsData.groups.length) {
          const groupIds = [...document.getElementById('userCfgRepGroups').querySelectorAll('input[type=checkbox]:checked')].map((c) => Number(c.value));
          await putJson(`/api/users/${u.id}/report-groups`, { groupIds });
        }
        if (showGestao) {
          const unidadesGeridas = [...document.getElementById('userCfgGestao').querySelectorAll('input[type=checkbox]:checked')].map((c) => c.value);
          await putJson(`/api/users/${u.id}/admin-unidades`, { unidades: unidadesGeridas });
        }

        closeModal();
      } catch (err) {
        msgEl.className = 'form-msg is-error';
        msgEl.textContent = err.message;
      } finally {
        saveBtn.disabled = false;
      }
    });
  } catch (err) {
    body.innerHTML = '';
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
}

// Pequeno atalho para PUT JSON, usado pelo card de Configurações do profissional.
async function putJson(url, payload) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
  return data;
}

function openEditUserModal(u) {
  const canManageAdmins = currentUser && currentUser.role === 'super_admin';
  // Ninguém edita o próprio papel de Super Admin por aqui — evita o risco de
  // rebaixar a própria conta (ou a de outro Super Admin) e o sistema ficar
  // sem nenhum. O backend também bloqueia isso, esse é só um reforço na UI.
  const isSelfSuperAdmin = currentUser && currentUser.id === u.id && u.role === 'super_admin';
    const roleOptions = canManageAdmins
    ? `
      <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuário</option>
      <option value="admin_unidade" ${u.role === 'admin_unidade' ? 'selected' : ''}>Administrador de Unidade</option>
      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
      <option value="super_admin" ${u.role === 'super_admin' ? 'selected' : ''}>Super Administrador</option>
    `
    : `<option value="user" selected>Usuário</option>`;

  openModal(`
    <h3>Editar usuário</h3>
    <p class="muted">${escapeHtml(u.username)}</p>
    <div id="editUserMsg" class="form-msg"></div>
    <div class="field">
      <label>Nome completo</label>
      <input type="text" id="editUName" value="${escapeAttr(u.name)}">
    </div>
    <div class="field">
      <label>Unidade de lotação</label>
      <select id="editUUnidade">${unidadeLotacaoOptionsHtml(u.unidade || '')}</select>
    </div>
    <div class="field">
      <label>Papel</label>
      <select id="editURole" ${(canManageAdmins && !isSelfSuperAdmin) ? '' : 'disabled'}>
        ${roleOptions}
      </select>
      ${isSelfSuperAdmin ? '<p class="muted" style="font-size:12.5px;margin-top:4px">Você não pode alterar o papel da sua própria conta de Super Administrador.</p>' : ''}
      ${(!canManageAdmins && !isSelfSuperAdmin) ? '<p class="muted" style="font-size:12.5px;margin-top:4px">Somente o Super Administrador pode alterar para Administrador.</p>' : ''}
    </div>
    <div class="field">
      <label><input type="checkbox" id="editUActive" ${u.active ? 'checked' : ''} style="width:auto;margin-right:6px"> Usuário ativo</label>
    </div>
    <div class="field">
      <label>Nova senha (opcional)</label>
      <input type="text" id="editUPassword" placeholder="Deixe em branco para manter a atual" minlength="8">
    </div>
    <div class="field">
      <label><input type="checkbox" id="editUForceChange" checked style="width:auto;margin-right:6px"> Exigir troca de senha no próximo login (recomendado ao definir uma senha temporária)</label>
    </div>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelEditUser" type="button">Cancelar</button>
      <button class="btn btn--accent btn--sm" id="saveEditUser" type="button">Salvar alterações</button>
    </div>
  `);
  document.getElementById('cancelEditUser').addEventListener('click', closeModal);
  document.getElementById('saveEditUser').addEventListener('click', async () => {
    const msgEl = document.getElementById('editUserMsg');
    const newPassword = document.getElementById('editUPassword').value;
    if (newPassword && newPassword.length < 8) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = 'A nova senha deve ter pelo menos 8 caracteres.';
      return;
    }
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: document.getElementById('editUName').value.trim(),
          unidade: document.getElementById('editUUnidade').value.trim(),
          role: document.getElementById('editURole').value,
          active: document.getElementById('editUActive').checked,
          newPassword: newPassword || undefined,
          forceChangePassword: document.getElementById('editUForceChange').checked,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      closeModal();
      await loadUsersTable();
    } catch (err) {
      msgEl.className = 'form-msg is-error';
      msgEl.textContent = err.message;
    }
  });
}

function confirmDeleteUser(id) {
  openModal(`
    <h3>Excluir usuário</h3>
    <p class="muted">Esta ação não pode ser desfeita. O usuário perderá o acesso imediatamente. Deseja continuar?</p>
    <div class="modal__actions">
      <button class="btn btn--outline btn--sm" id="cancelDelete" type="button">Cancelar</button>
      <button class="btn btn--danger btn--sm" id="confirmDelete" type="button">Excluir</button>
    </div>
  `);
  document.getElementById('cancelDelete').addEventListener('click', closeModal);
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    closeModal();
    if (!res.ok && data.error) {
      openModal(`<h3>Não foi possível excluir</h3><p class="muted">${escapeHtml(data.error)}</p><div class="modal__actions"><button class="btn btn--accent btn--sm" id="okClose" type="button">Entendi</button></div>`);
      document.getElementById('okClose').addEventListener('click', closeModal);
    } else {
      await loadUsersTable();
    }
  });
}

document.getElementById('addUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('addUserMsg');
  msgEl.className = 'form-msg';
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        name: document.getElementById('uName').value.trim(),
        username: document.getElementById('uUsername').value.trim(),
        unidade: document.getElementById('uUnidade').value.trim(),
        password: document.getElementById('uPassword').value,
        role: document.getElementById('uRole').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário.');
    document.getElementById('addUserForm').reset();
    msgEl.className = 'form-msg is-ok';
    msgEl.textContent = 'Usuário criado com sucesso.';
    await loadUsersTable();
  } catch (err) {
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
});

// ---------- Minha conta ----------

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('changePassMsg');
  msgEl.className = 'form-msg';
  try {
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        currentPassword: document.getElementById('curPass').value,
        newPassword: document.getElementById('newPass').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao trocar senha.');
    msgEl.className = 'form-msg is-ok';
    msgEl.textContent = 'Senha alterada com sucesso.';
    document.getElementById('changePasswordForm').reset();
  } catch (err) {
    msgEl.className = 'form-msg is-error';
    msgEl.textContent = err.message;
  }
});

// ---------- Auditoria ----------

function fmtAuditWhen(iso) {
  if (!iso) return '';
  // created_at vem como "YYYY-MM-DD HH:MM:SS" (UTC, formato do SQLite datetime('now')).
  const [datePart, timePart] = iso.split(' ');
  const [y, m, d] = (datePart || '').split('-');
  return y ? `${d}/${m}/${y} ${timePart || ''}` : iso;
}

const AUDIT_ACTION_LABEL = {
  create_user: 'Criou usuário',
  update_user: 'Editou usuário',
  delete_user: 'Excluiu usuário',
  create_link: 'Criou link',
  update_link: 'Editou link',
  delete_link: 'Excluiu link',
  update_role_permissions: 'Alterou perfis de acesso',
  approve_signup_request: 'Aprovou solicitação de cadastro',
  reject_signup_request: 'Rejeitou solicitação de cadastro',
  change_password: 'Trocou a própria senha',
};

async function loadAuditLogTable() {
  const wrap = document.getElementById('auditLogWrap');
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';

  let data;
  try {
    const res = await fetch('/api/audit-log?limit=100', { credentials: 'same-origin' });
    data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Não foi possível carregar a auditoria.');
  } catch (err) {
    wrap.innerHTML = `<p class="muted">Não foi possível carregar a auditoria (${escapeHtml(err.message)}). Confira se a migração database/migrations/legacy/migration_security.sql já foi executada no banco D1.</p>`;
    return;
  }

  const entries = data.entries || [];
  wrap.innerHTML = entries.length ? `
    <table class="data-table">
      <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>Detalhes</th></tr></thead>
      <tbody>
        ${entries.map((e) => `
          <tr>
            <td>${escapeHtml(fmtAuditWhen(e.created_at))}</td>
            <td>${escapeHtml(e.actor_username || '—')}</td>
            <td>${escapeHtml(AUDIT_ACTION_LABEL[e.action] || e.action)}</td>
            <td>${escapeHtml(e.entity_type)}${e.entity_id ? ' #' + escapeHtml(String(e.entity_id)) : ''}</td>
            <td class="muted" style="font-size:12px;max-width:320px;word-break:break-word">${escapeHtml(e.details || '')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p class="muted">Nenhum registro de auditoria ainda.</p>';
}


// ---------- Ouvidoria IA ----------

let OUVIDORIA_PROFISSIONAIS = [];
let OUVIDORIA_REGRAS = [];

function ouvidoriaProfOptions(selected = '', includeInactive = false) {
  const items = OUVIDORIA_PROFISSIONAIS.filter((p) => includeInactive || p.ativo);
  return '<option value="">— selecione —</option>' + items.map((p) =>
    `<option value="${escapeAttr(p.codigo)}" ${p.codigo === selected ? 'selected' : ''}>${escapeHtml(p.nome)}${p.ativo ? '' : ' (inativo)'}</option>`
  ).join('');
}

function refreshOuvidoriaSelects() {
  const ruleSel = document.getElementById('ovRegraProfissional');
  if (ruleSel) ruleSel.innerHTML = ouvidoriaProfOptions('');
  for (const id of ['ovFallback1', 'ovFallback2']) {
    const el = document.getElementById(id);
    if (el) {
      const current = el.value;
      el.innerHTML = '<option value="">— nenhum —</option>' + OUVIDORIA_PROFISSIONAIS.filter((p) => p.ativo).map((p) =>
        `<option value="${escapeAttr(p.codigo)}" ${p.codigo === current ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`
      ).join('');
    }
  }
}

async function loadOuvidoriaProfissionais() {
  const wrap = document.getElementById('ouvidoriaProfissionaisWrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';
  try {
    const res = await fetch('/api/ouvidoria/profissionais', { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao carregar profissionais.');
    OUVIDORIA_PROFISSIONAIS = data.profissionais || [];
    wrap.innerHTML = OUVIDORIA_PROFISSIONAIS.length ? `
      <table class="data-table">
        <thead><tr><th>Profissional</th><th>Nome no OuvidorSUS</th><th>E-mail</th><th>Situação</th><th></th></tr></thead>
        <tbody>${OUVIDORIA_PROFISSIONAIS.map((p) => `
          <tr>
            <td><strong>${escapeHtml(p.nome)}</strong><br><span class="muted" style="font-size:12px">${escapeHtml(p.codigo)}</span></td>
            <td>${p.nome_ouvidorsus ? escapeHtml(p.nome_ouvidorsus) : '<span class="muted">Não vinculado</span>'}</td>
            <td>${p.email ? escapeHtml(p.email) : '<span class="muted">Não informado</span>'}</td>
            <td><span class="status-badge ${p.ativo ? 'status-badge--active' : ''}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td style="white-space:nowrap">
              <button class="btn btn--outline btn--sm" data-ov-edit-prof="${escapeAttr(p.codigo)}">Editar</button>
              <button class="btn btn--outline btn--sm" data-ov-delete-prof="${escapeAttr(p.codigo)}">Excluir</button>
            </td>
          </tr>`).join('')}</tbody>
      </table>` : '<p class="muted">Nenhum profissional cadastrado.</p>';

    wrap.querySelectorAll('[data-ov-edit-prof]').forEach((btn) => btn.addEventListener('click', () => {
      const p = OUVIDORIA_PROFISSIONAIS.find((x) => x.codigo === btn.dataset.ovEditProf);
      if (p) openOuvidoriaProfModal(p);
    }));
    wrap.querySelectorAll('[data-ov-delete-prof]').forEach((btn) => btn.addEventListener('click', () => deleteOuvidoriaProfissional(btn.dataset.ovDeleteProf)));
    refreshOuvidoriaSelects();
  } catch (err) {
    wrap.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`;
  }
}

function openOuvidoriaProfModal(p) {
  openModal(`
    <div class="modal__head"><div><div class="modal__title">Editar profissional</div><div class="modal__subtitle">Código técnico: ${escapeHtml(p.codigo)}</div></div><button class="modal__close" onclick="closeModal()">×</button></div>
    <form id="editOvProfForm">
      <div class="field"><label>Nome no Portal</label><input id="editOvProfNome" value="${escapeAttr(p.nome || '')}" required></div>
      <div class="field"><label>Nome exato no OuvidorSUS</label><input id="editOvProfNomeSus" value="${escapeAttr(p.nome_ouvidorsus || '')}"></div>
      <div class="field"><label>E-mail</label><input type="email" id="editOvProfEmail" value="${escapeAttr(p.email || '')}"></div>
      <div class="field"><label>Observação / função</label><textarea id="editOvProfObs" rows="3">${escapeHtml(p.observacao || '')}</textarea></div>
      <label style="display:flex;gap:8px;align-items:center;margin:12px 0"><input type="checkbox" id="editOvProfAtivo" ${p.ativo ? 'checked' : ''}> Profissional ativo</label>
      <div id="editOvProfMsg" class="form-msg"></div>
      <div class="modal__actions"><button type="button" class="btn btn--outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn--accent">Salvar</button></div>
    </form>`, true);
  document.getElementById('editOvProfForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('editOvProfMsg');
    try {
      const res = await fetch(`/api/ouvidoria/profissionais/${encodeURIComponent(p.codigo)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          nome: document.getElementById('editOvProfNome').value.trim(),
          nomeOuvidorSus: document.getElementById('editOvProfNomeSus').value.trim(),
          email: document.getElementById('editOvProfEmail').value.trim(),
          observacao: document.getElementById('editOvProfObs').value.trim(),
          ativo: document.getElementById('editOvProfAtivo').checked,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível salvar.');
      closeModal();
      await Promise.all([loadOuvidoriaProfissionais(), loadOuvidoriaRegras(), loadOuvidoriaConfiguracao()]);
    } catch (err) { msg.textContent = err.message; msg.className = 'form-msg is-error'; }
  });
}

async function deleteOuvidoriaProfissional(codigo) {
  const p = OUVIDORIA_PROFISSIONAIS.find((x) => x.codigo === codigo);
  if (!p || !confirm(`Excluir definitivamente ${p.nome}? Se estiver vinculado a regra/fallback, a exclusão será bloqueada.`)) return;
  const res = await fetch(`/api/ouvidoria/profissionais/${encodeURIComponent(codigo)}`, { method: 'DELETE', credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) { alert(data.error || 'Não foi possível excluir.'); return; }
  await loadOuvidoriaProfissionais();
}

async function loadOuvidoriaRegras() {
  const wrap = document.getElementById('ouvidoriaRegrasWrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="skeleton-loading">Carregando…</div>';
  try {
    const res = await fetch('/api/ouvidoria/regras', { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao carregar regras.');
    OUVIDORIA_REGRAS = data.regras || [];
    wrap.innerHTML = OUVIDORIA_REGRAS.length ? `
      <table class="data-table">
        <thead><tr><th>Prioridade</th><th>Regra</th><th>Divisão / subtipo</th><th>Responsável</th><th>Situação</th><th></th></tr></thead>
        <tbody>${OUVIDORIA_REGRAS.map((r) => `
          <tr>
            <td>${r.prioridade}</td>
            <td><strong>${escapeHtml(r.titulo)}</strong>${r.descricao ? `<br><span class="muted" style="font-size:12px">${escapeHtml(r.descricao)}</span>` : ''}</td>
            <td>${escapeHtml(r.divisao)}<br><span class="muted" style="font-size:12px">${escapeHtml(r.subtipo || 'geral')}</span></td>
            <td>${escapeHtml(r.profissional_nome || r.profissional_codigo)}</td>
            <td>${r.ativo ? 'Ativa' : 'Inativa'}</td>
            <td style="white-space:nowrap"><button class="btn btn--outline btn--sm" data-ov-edit-rule="${r.id}">Editar</button> <button class="btn btn--outline btn--sm" data-ov-delete-rule="${r.id}">Excluir</button></td>
          </tr>`).join('')}</tbody>
      </table>` : '<p class="muted">Nenhuma regra cadastrada.</p>';
    wrap.querySelectorAll('[data-ov-edit-rule]').forEach((btn) => btn.addEventListener('click', () => {
      const r = OUVIDORIA_REGRAS.find((x) => String(x.id) === btn.dataset.ovEditRule);
      if (r) openOuvidoriaRegraModal(r);
    }));
    wrap.querySelectorAll('[data-ov-delete-rule]').forEach((btn) => btn.addEventListener('click', () => deleteOuvidoriaRegra(Number(btn.dataset.ovDeleteRule))));
  } catch (err) { wrap.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`; }
}

function openOuvidoriaRegraModal(r) {
  openModal(`
    <div class="modal__head"><div><div class="modal__title">Editar regra</div></div><button class="modal__close" onclick="closeModal()">×</button></div>
    <form id="editOvRuleForm">
      <div class="field"><label>Título</label><input id="editOvRuleTitulo" value="${escapeAttr(r.titulo || '')}" required></div>
      <div class="field"><label>Divisão</label><input id="editOvRuleDivisao" value="${escapeAttr(r.divisao || '')}" required></div>
      <div class="field"><label>Subtipo</label><input id="editOvRuleSubtipo" value="${escapeAttr(r.subtipo || 'geral')}" required></div>
      <div class="field"><label>Prioridade</label><input type="number" min="1" max="9999" id="editOvRulePrioridade" value="${r.prioridade}" required></div>
      <div class="field"><label>Responsável</label><select id="editOvRuleProf">${ouvidoriaProfOptions(r.profissional_codigo, true)}</select></div>
      <div class="field"><label>Critério / orientação</label><textarea id="editOvRuleDescricao" rows="3">${escapeHtml(r.descricao || '')}</textarea></div>
      <label style="display:flex;gap:8px;align-items:center;margin:12px 0"><input type="checkbox" id="editOvRuleAtiva" ${r.ativo ? 'checked' : ''}> Regra ativa</label>
      <div id="editOvRuleMsg" class="form-msg"></div>
      <div class="modal__actions"><button type="button" class="btn btn--outline" onclick="closeModal()">Cancelar</button><button type="submit" class="btn btn--accent">Salvar</button></div>
    </form>`, true);
  document.getElementById('editOvRuleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('editOvRuleMsg');
    try {
      const res = await fetch(`/api/ouvidoria/regras/${r.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          titulo: document.getElementById('editOvRuleTitulo').value.trim(),
          divisao: document.getElementById('editOvRuleDivisao').value.trim(),
          subtipo: document.getElementById('editOvRuleSubtipo').value.trim(),
          prioridade: Number(document.getElementById('editOvRulePrioridade').value),
          profissionalCodigo: document.getElementById('editOvRuleProf').value,
          descricao: document.getElementById('editOvRuleDescricao').value.trim(),
          ativo: document.getElementById('editOvRuleAtiva').checked,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível salvar.');
      closeModal(); await loadOuvidoriaRegras();
    } catch (err) { msg.textContent = err.message; msg.className = 'form-msg is-error'; }
  });
}

async function deleteOuvidoriaRegra(id) {
  const r = OUVIDORIA_REGRAS.find((x) => x.id === id);
  if (!r || !confirm(`Excluir a regra “${r.titulo}”?`)) return;
  const res = await fetch(`/api/ouvidoria/regras/${id}`, { method: 'DELETE', credentials: 'same-origin' });
  const data = await res.json();
  if (!res.ok) { alert(data.error || 'Não foi possível excluir.'); return; }
  await loadOuvidoriaRegras();
}

async function loadOuvidoriaConfiguracao() {
  try {
    const res = await fetch('/api/ouvidoria/configuracao', { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao carregar configuração.');
    refreshOuvidoriaSelects();
    document.getElementById('ovConfidence').value = Math.round(Number(data.config?.confidence_threshold ?? 0.8) * 100);
    const fallbacks = data.fallbacks || [];
    document.getElementById('ovFallback1').value = fallbacks.find((f) => f.ordem === 1)?.profissional_codigo || '';
    document.getElementById('ovFallback2').value = fallbacks.find((f) => f.ordem === 2)?.profissional_codigo || '';
  } catch (err) {
    const msg = document.getElementById('ouvidoriaConfigMsg');
    if (msg) { msg.textContent = err.message; msg.className = 'form-msg is-error'; }
  }
}

function setupOuvidoriaForms() {
  document.getElementById('addOuvidoriaProfissionalForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('addOuvidoriaProfissionalMsg');
    try {
      const payload = {
        codigo: document.getElementById('ovProfCodigo').value.trim(),
        nome: document.getElementById('ovProfNome').value.trim(),
        nomeOuvidorSus: document.getElementById('ovProfNomeSus').value.trim(),
        email: document.getElementById('ovProfEmail').value.trim(),
        observacao: document.getElementById('ovProfObs').value.trim(),
      };
      const res = await fetch('/api/ouvidoria/profissionais', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Não foi possível cadastrar.');
      e.target.reset(); msg.textContent = 'Profissional cadastrado.'; msg.className = 'form-msg is-success';
      await loadOuvidoriaProfissionais();
    } catch (err) { msg.textContent = err.message; msg.className = 'form-msg is-error'; }
  });

  document.getElementById('addOuvidoriaRegraForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('addOuvidoriaRegraMsg');
    try {
      const payload = {
        titulo: document.getElementById('ovRegraTitulo').value.trim(),
        divisao: document.getElementById('ovRegraDivisao').value.trim(),
        subtipo: document.getElementById('ovRegraSubtipo').value.trim(),
        prioridade: Number(document.getElementById('ovRegraPrioridade').value),
        profissionalCodigo: document.getElementById('ovRegraProfissional').value,
        descricao: document.getElementById('ovRegraDescricao').value.trim(),
      };
      const res = await fetch('/api/ouvidoria/regras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Não foi possível cadastrar a regra.');
      e.target.reset(); document.getElementById('ovRegraSubtipo').value = 'geral'; document.getElementById('ovRegraPrioridade').value = '100';
      msg.textContent = 'Regra cadastrada.'; msg.className = 'form-msg is-success'; await loadOuvidoriaRegras();
    } catch (err) { msg.textContent = err.message; msg.className = 'form-msg is-error'; }
  });

  document.getElementById('ouvidoriaConfigForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('ouvidoriaConfigMsg');
    const f1 = document.getElementById('ovFallback1').value;
    const f2 = document.getElementById('ovFallback2').value;
    if (f1 && f2 && f1 === f2) { msg.textContent = 'Escolha profissionais diferentes para o 1º e o 2º fallback.'; msg.className = 'form-msg is-error'; return; }
    try {
      const fallbacks = [f1, f2].filter(Boolean).map((profissionalCodigo) => ({ profissionalCodigo }));
      const res = await fetch('/api/ouvidoria/configuracao', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ confidenceThreshold: Number(document.getElementById('ovConfidence').value) / 100, fallbacks }),
      });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Não foi possível salvar.');
      msg.textContent = 'Configuração salva.'; msg.className = 'form-msg is-success'; await loadOuvidoriaConfiguracao();
    } catch (err) { msg.textContent = err.message; msg.className = 'form-msg is-error'; }
  });
}

async function loadOuvidoriaAdmin() {
  setupOuvidoriaForms();
  await loadOuvidoriaProfissionais();
  await Promise.all([loadOuvidoriaRegras(), loadOuvidoriaConfiguracao()]);
}

// ---------- Inicialização ----------

(async () => {
  const user = await initPortalChrome('admin');
  if (!user) return;

  if (!['admin', 'super_admin', 'admin_unidade'].includes(user.role)) {
    document.getElementById('notAdminMsg').style.display = 'block';
    return;
  }

  currentUser = user;

  await loadUnidadesNomes();
  document.getElementById('uUnidade').innerHTML = unidadeLotacaoOptionsHtml('');

  if (currentUser.role === 'super_admin') {
    const opt = document.createElement('option');
    opt.value = 'admin_unidade';
    opt.textContent = 'Administrador de Unidade';
    document.getElementById('uRole').appendChild(opt);
  } else {
    document.querySelectorAll('#uRole option[value="admin"], #uRole option[value="super_admin"]').forEach((opt) => opt.remove());
  }

  document.getElementById('adminShell').style.display = 'flex';

  if (currentUser.role !== 'super_admin') {
    const perfisTab = document.querySelector('.admin-tab[data-tab="perfis"]');
    if (perfisTab) perfisTab.style.display = 'none';
    const auditoriaTab = document.querySelector('.admin-tab[data-tab="auditoria"]');
    if (auditoriaTab) auditoriaTab.style.display = 'none';
  } else {
    // Só o Super Administrador pode cadastrar novas unidades.
    document.getElementById('addUnidadeForm').style.display = '';
  }

  if (currentUser.role === 'admin_unidade') {
    // Admin de unidade só cuida de usuários — esconde as demais abas.
    document.querySelectorAll('.admin-tab').forEach((tab) => {
      if (!['solicitacoes', 'usuarios', 'conta'].includes(tab.dataset.tab)) {
        tab.style.display = 'none';
      }
    });
    document.querySelectorAll('.panel-section').forEach((p) => p.classList.remove('is-active'));
    document.querySelector('.admin-tab[data-tab="usuarios"]').classList.add('is-active');
    document.querySelector('.panel-section[data-panel="usuarios"]').classList.add('is-active');
  }

  setupTabs();
  if (currentUser.role !== 'admin_unidade') {
    loadUpdatesTable();
    loadLinksTable('ferramenta');
    loadLinksTable('documento');
    loadLinksTable('manual');
    loadReportGroupsTable();
    loadReportsTable();
    loadUnidadesTable();
    loadOuvidoriaAdmin();
  }
  if (currentUser.role === 'super_admin') {
    loadRolePermsTable();
    loadAuditLogTable();
  }
  loadSignupRequestsTable();
  setupUsersListFilters();
  loadUsersTable();
})();


// v2.9.1 — retenção de chat, exclusiva do super_admin
(async function setupChatRetention(){
  try { const me=await (await fetch('/api/me')).json(); if(me.user?.role!=='super_admin') return; const tab=document.getElementById('chatConfigTab'); if(tab)tab.style.display=''; const c=await (await fetch('/api/chat/config')).json(); if(c.config){document.getElementById('internalRetention').value=c.config.internal_retention_days||30;document.getElementById('supportRetention').value=c.config.support_retention_days||30;} const form=document.getElementById('chatConfigForm'); if(form)form.addEventListener('submit',async e=>{e.preventDefault();const r=await fetch('/api/chat/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({internal_retention_days:Number(document.getElementById('internalRetention').value),support_retention_days:Number(document.getElementById('supportRetention').value)})});const d=await r.json();const m=document.getElementById('chatConfigMsg');m.textContent=r.ok?'Prazos atualizados.':(d.error||'Erro.');m.className='form-msg '+(r.ok?'is-success':'is-error');}); } catch(_){}
})();
