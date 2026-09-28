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

/*
 * Organização assistencial diretamente na guia.
 * A página guia-detalhe já carrega este arquivo; por isso a inicialização
 * é automática somente quando os elementos da tela de detalhes existem.
 */
(async function initGuideOrganization() {
  const form = document.getElementById('situacaoForm');
  const situation = document.getElementById('fSituacao');
  if (!form || !situation || !/guia-detalhe\.html$/.test(window.location.pathname)) return;

  const params = new URLSearchParams(window.location.search);
  const guiaId = Number(params.get('id'));
  if (!guiaId) return;

  const me = await apiFetch('/api/me');
  if (!me.ok) return;
  const user = me.data?.user || {};
  const access = user.regulacao || {};
  const podeOrganizar = !!(access.organizador || access.administrador);
  const somenteExecutor = !!(access.executor && !access.organizador && !access.administrador);
  if (!podeOrganizar && !somenteExecutor) return;

  if (podeOrganizar) {
    form.style.display = '';
    const observer = new MutationObserver(() => {
      if (form.style.display === 'none') form.style.display = '';
    });
    observer.observe(form, { attributes: true, attributeFilter: ['style'] });
    if (!access.administrador) {
      situation.innerHTML = `
        <option value="lista_espera">Em lista de espera</option>
        <option value="em_atendimento">Em atendimento</option>
      `;
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .guide-organization { margin-top:18px; padding-top:18px; border-top:1px solid #e7eaf0; }
    .guide-organization__title { color:var(--primary-dark,#0e2a73); font-size:15px; font-weight:700; margin-bottom:6px; }
    .guide-organization__desc { color:var(--muted,#667085); font-size:13px; line-height:1.45; margin-bottom:14px; }
    .guide-organization__grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    .guide-organization__wide { grid-column:1 / -1; }
    .guide-organization__choice { display:flex; gap:10px; align-items:center; padding:11px 13px; border:1px solid #dce3ed; border-radius:9px; background:var(--surface,#fff); cursor:pointer; }
    .guide-organization__choice:has(input:checked) { border-color:#b7c8ee; background:#f5f9ff; }
    .guide-organization__choice input { margin:0; }
    .guide-organization__panel { margin-top:12px; padding:14px; border:1px solid #e2e7ef; border-radius:10px; background:#fafbfd; }
    .guide-organization__summary { margin-top:10px; padding:10px 12px; border-radius:8px; background:#f5f9ff; border:1px solid #cfe1f6; font-size:12px; line-height:1.45; }
    .guide-organization__actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:14px; }
    .guide-organization__msg { font-size:13px; }
    .guide-organization__hint { margin-top:8px; color:var(--muted,#667085); font-size:12px; }
    @media (max-width:760px) { .guide-organization__grid { grid-template-columns:1fr; } .guide-organization__wide { grid-column:auto; } }
  `;
  document.head.appendChild(style);

  const block = document.createElement('section');
  block.className = 'guide-organization';
  block.id = 'guideOrganization';
  block.hidden = true;
  block.innerHTML = `
    <div class="guide-organization__title">Organização do atendimento</div>
    <div class="guide-organization__desc">Para colocar a guia em <strong>Em atendimento</strong>, informe obrigatoriamente como e onde o paciente será atendido. A agenda valida a escala e a disponibilidade no momento da confirmação.</div>
    <div class="guide-organization__grid">
      <div class="guide-organization__wide">
        <div class="field" style="margin-bottom:0">
          <label>Tipo de atendimento <span aria-hidden="true">*</span></label>
          <label class="guide-organization__choice"><input type="radio" name="guideAtendimentoTipo" value="individual"> <span><strong>Atendimento individual</strong><br><small>Define profissional, data e horário na agenda.</small></span></label>
          <label class="guide-organization__choice" style="margin-top:8px"><input type="radio" name="guideAtendimentoTipo" value="grupo"> <span><strong>Atendimento em grupo</strong><br><small>Inclui o paciente em um grupo ativo compatível.</small></span></label>
        </div>
      </div>
      <div id="guideIndividualPanel" class="guide-organization__panel guide-organization__wide" hidden>
        <div class="guide-organization__grid">
          <div class="field" style="margin-bottom:0"><label for="guideOrgProfessional">Profissional *</label><select id="guideOrgProfessional"><option value="">Carregando profissionais...</option></select></div>
          <div class="field" style="margin-bottom:0"><label for="guideOrgDate">Data *</label><input id="guideOrgDate" type="date"></div>
          <div class="field" style="margin-bottom:0"><label for="guideOrgTime">Horário *</label><input id="guideOrgTime" type="time"></div>
          <div class="field" style="margin-bottom:0"><label for="guideOrgUnit">Unidade executante</label><input id="guideOrgUnit" type="text" readonly></div>
        </div>
        <div class="guide-organization__hint">O horário informado será conferido automaticamente contra a escala ativa e os demais atendimentos do profissional.</div>
      </div>
      <div id="guideGroupPanel" class="guide-organization__panel guide-organization__wide" hidden>
        <div class="field" style="margin-bottom:0"><label for="guideOrgGroup">Grupo de atendimento *</label><select id="guideOrgGroup"><option value="">Carregando grupos...</option></select></div>
        <div id="guideGroupSummary" class="guide-organization__summary" hidden></div>
      </div>
    </div>
    <div class="guide-organization__actions">
      <button class="btn btn--accent btn--sm" type="button" id="btnOrganizarGuia">Confirmar atendimento</button>
      <span class="guide-organization__msg" id="guideOrganizationMsg"></span>
    </div>
  `;
  form.insertAdjacentElement('afterend', block);

  const professional = block.querySelector('#guideOrgProfessional');
  const date = block.querySelector('#guideOrgDate');
  const time = block.querySelector('#guideOrgTime');
  const unit = block.querySelector('#guideOrgUnit');
  const group = block.querySelector('#guideOrgGroup');
  const groupSummary = block.querySelector('#guideGroupSummary');
  const individualPanel = block.querySelector('#guideIndividualPanel');
  const groupPanel = block.querySelector('#guideGroupPanel');
  const msg = block.querySelector('#guideOrganizationMsg');
  const confirm = block.querySelector('#btnOrganizarGuia');

  const isoToday = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
  };
  date.min = isoToday();

  let guide = null;
  let guideGroups = [];
  let professionalsLoaded = false;
  let groupsLoaded = false;

  function setMsg(text, error = false) {
    msg.textContent = text || '';
    msg.style.color = error ? '#c0392b' : '#2e7d32';
  }

  function showOrganization() {
    if (!podeOrganizar) return;
    block.hidden = situation.value !== 'em_atendimento';
  }

  async function loadGuide() {
    const r = await apiFetch(`/api/guias/${guiaId}`);
    if (!r.ok) return null;
    guide = r.data?.guia || null;
    return guide;
  }

  async function loadProfessionals() {
    if (professionalsLoaded || !guide) return;
    if (!guide.equipe_id || !guide.unidade_executante_code) {
      professional.innerHTML = '<option value="">Defina equipe e unidade executante antes</option>';
      professionalsLoaded = true;
      return;
    }
    const qs = new URLSearchParams({
      equipe_id: guide.equipe_id,
      unidade_code: guide.unidade_executante_code,
      especialidade_id: guide.especialidade_id,
    });
    const r = await apiFetch(`/api/agenda/profissionais?${qs.toString()}`);
    if (!r.ok) {
      professional.innerHTML = `<option value="">${escapeHtml(r.data?.error || 'Não foi possível carregar profissionais.')}</option>`;
      professionalsLoaded = true;
      return;
    }
    const rows = r.data?.profissionais || [];
    professional.innerHTML = '<option value="">Selecione o profissional</option>' + rows.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nome)}${p.registro_profissional ? ` · ${escapeHtml(p.registro_profissional)}` : ''}</option>`).join('');
    if (!rows.length) professional.innerHTML = '<option value="">Nenhum profissional compatível encontrado</option>';
    professionalsLoaded = true;
  }

  async function loadGroups() {
    if (groupsLoaded || !guide) return;
    if (!guide.equipe_id || !guide.unidade_executante_code) {
      group.innerHTML = '<option value="">Defina equipe e unidade executante antes</option>';
      groupsLoaded = true;
      return;
    }
    const r = await apiFetch('/api/agenda/grupos');
    if (!r.ok) {
      group.innerHTML = `<option value="">${escapeHtml(r.data?.error || 'Não foi possível carregar grupos.')}</option>`;
      groupsLoaded = true;
      return;
    }
    guideGroups = (r.data?.grupos || []).filter((g) =>
      Number(g.especialidade_id) === Number(guide.especialidade_id) &&
      Number(g.equipe_id) === Number(guide.equipe_id) &&
      String(g.unidade_code) === String(guide.unidade_executante_code) &&
      Number(g.ativo) === 1 &&
      Number(g.pacientes_ativos || 0) < Number(g.capacidade || 0)
    );
    group.innerHTML = '<option value="">Selecione o grupo</option>' + guideGroups.map((g) => {
      const vagas = Math.max(0, Number(g.capacidade || 0) - Number(g.pacientes_ativos || 0));
      return `<option value="${escapeHtml(g.id)}">${escapeHtml(g.nome)} — ${vagas} vaga${vagas === 1 ? '' : 's'} disponível${vagas === 1 ? '' : 'eis'}</option>`;
    }).join('');
    if (!guideGroups.length) group.innerHTML = '<option value="">Nenhum grupo compatível com vaga disponível</option>';
    groupsLoaded = true;
  }

  async function updateGroupSummary() {
    const id = Number(group.value);
    if (!id) { groupSummary.hidden = true; groupSummary.textContent = ''; return; }
    const selected = guideGroups.find((g) => Number(g.id) === id);
    if (!selected) return;
    const vagas = Math.max(0, Number(selected.capacidade || 0) - Number(selected.pacientes_ativos || 0));
    let next = '';
    const detail = await apiFetch(`/api/agenda/grupos/${id}`);
    if (detail.ok) {
      const encontro = (detail.data?.encontros || []).find((e) => e.situacao === 'programado');
      if (encontro) next = ` · Próximo encontro: ${formatDateBR(encontro.data_encontro)} às ${escapeHtml(encontro.hora_inicio || '—')}`;
    }
    groupSummary.innerHTML = `<strong>${escapeHtml(selected.nome)}</strong><br>Profissionais: ${escapeHtml(selected.profissionais_nomes || '—')}<br>${vagas} vaga${vagas === 1 ? '' : 's'} disponível${vagas === 1 ? '' : 'eis'}${next}`;
    groupSummary.hidden = false;
  }

  async function prepareOrganization() {
    if (!guide) await loadGuide();
    if (!guide) return;
    unit.value = guide.unidade_executante_code || '—';
    if (situation.value !== 'em_atendimento') return;
    await Promise.all([loadProfessionals(), loadGroups()]);
  }

  block.querySelectorAll('input[name="guideAtendimentoTipo"]').forEach((radio) => {
    radio.addEventListener('change', async () => {
      const individual = radio.value === 'individual' && radio.checked;
      const groupSelected = radio.value === 'grupo' && radio.checked;
      individualPanel.hidden = !individual;
      groupPanel.hidden = !groupSelected;
      setMsg('');
      if (individual) await loadProfessionals();
      if (groupSelected) await loadGroups();
    });
  });

  group.addEventListener('change', updateGroupSummary);
  situation.addEventListener('change', async () => {
    showOrganization();
    if (situation.value === 'em_atendimento') await prepareOrganization();
  });

  form.addEventListener('submit', async (event) => {
    if (!podeOrganizar || situation.value !== 'em_atendimento') return;
    event.preventDefault();
    event.stopImmediatePropagation();

    setMsg('');
    await prepareOrganization();
    const tipo = block.querySelector('input[name="guideAtendimentoTipo"]:checked')?.value || '';
    if (!tipo) {
      setMsg('Selecione o tipo de atendimento.', true);
      block.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!guide?.equipe_id || !guide?.unidade_executante_code) {
      setMsg('A guia precisa ter equipe responsável e unidade executante definidas antes da organização.', true);
      return;
    }

    confirm.disabled = true;
    try {
      let r;
      if (tipo === 'individual') {
        if (!professional.value || !date.value || !time.value) {
          setMsg('Informe profissional, data e horário.', true);
          return;
        }
        r = await apiFetch('/api/agenda/individuais', {
          method: 'POST',
          body: JSON.stringify({
            guia_id: guiaId,
            profissional_id: professional.value,
            equipe_id: Number(guide.equipe_id),
            unidade_code: guide.unidade_executante_code,
            data_atendimento: date.value,
            hora_inicio: time.value,
            blocos: 1,
          }),
        });
      } else {
        if (!group.value) {
          setMsg('Selecione o grupo de atendimento.', true);
          return;
        }
        r = await apiFetch(`/api/agenda/grupos/${Number(group.value)}/pacientes`, {
          method: 'POST',
          body: JSON.stringify({ guia_id: guiaId }),
        });
      }
      if (!r.ok) {
        setMsg(r.data?.error || 'Não foi possível organizar o atendimento.', true);
        return;
      }
      setMsg(tipo === 'individual' ? 'Atendimento individual agendado. Atualizando a guia…' : 'Paciente incluído no grupo. Atualizando a guia…');
      setTimeout(() => window.location.reload(), 450);
    } finally {
      confirm.disabled = false;
    }
  }, true);

  if (somenteExecutor) {
    const option = situation.querySelector('option[value="em_atendimento"]');
    if (option) option.remove();
  }

  await loadGuide();
  if (guide?.situacao === 'lista_espera' && podeOrganizar) {
    situation.value = 'lista_espera';
  }
  showOrganization();
})();