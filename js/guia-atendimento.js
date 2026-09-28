(function(){
  const esc=(v)=>window.escapeHtml?escapeHtml(v??''):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hoje=()=>new Date().toISOString().slice(0,10);
  const dataBR=(v)=>{
    if(!v)return '—';
    const p=String(v).split('-');
    return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(v);
  };

  function injectStyles(){
    if(document.getElementById('guiaAtendimentoStyles'))return;
    const style=document.createElement('style');
    style.id='guiaAtendimentoStyles';
    style.textContent=`
      #guiaAtendimentoPlanner{margin-top:18px;padding:16px;border:1px solid var(--line,#dce3ed);border-radius:10px;background:var(--surface,#fff)}
      #guiaAtendimentoPlanner[hidden]{display:none}
      .guia-atendimento-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
      .guia-atendimento-grid .wide{grid-column:1/-1}
      .guia-atendimento-type{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;border:0;padding:0;margin:0}
      .guia-atendimento-type legend{font-size:12px;font-weight:700;color:var(--text,#122052);margin-bottom:8px;padding:0}
      .guia-atendimento-option{display:flex;align-items:center;gap:9px;padding:11px 13px;border:1px solid var(--line,#dce3ed);border-radius:9px;background:var(--surface,#fff);cursor:pointer;font-size:13px;font-weight:600}
      .guia-atendimento-option:has(input:checked){border-color:var(--primary,#203b90);background:color-mix(in srgb,var(--surface,#fff) 92%,var(--primary,#203b90) 8%)}
      .guia-atendimento-option input{margin:0}
      .guia-atendimento-sub{margin-top:14px;padding-top:14px;border-top:1px solid #e7eaf0}
      .guia-atendimento-sub[hidden]{display:none}
      .guia-atendimento-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .guia-atendimento-pill{display:inline-flex;align-items:center;padding:6px 9px;border-radius:999px;background:#f3f6fa;border:1px solid #dfe5ed;color:var(--text,#122052);font-size:12px;font-weight:600}
      .guia-atendimento-note{margin-top:10px;padding:10px 12px;border:1px solid #cfe1f6;border-radius:9px;background:#f5f9ff;color:var(--text,#122052);font-size:12px;line-height:1.45}
      .guia-atendimento-msg{margin-top:10px;font-size:12px}
      @media(max-width:700px){.guia-atendimento-grid,.guia-atendimento-type{grid-template-columns:1fr}.guia-atendimento-grid .wide{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  window.initGuiaAtendimento=function({guiaId,user,getGuia,getDetalhe}){
    const access=user?.regulacao||{};
    const podeOrganizar=!!(access.organizador||access.administrador);
    const form=document.getElementById('situacaoForm');
    const situacao=document.getElementById('fSituacao');
    if(!form||!situacao)return;

    if(access.executor&&!access.organizador&&!access.administrador){
      const atual=situacao.value;
      situacao.innerHTML='<option value="">Selecione</option><option value="concluido">Concluído</option>';
      if(atual==='concluido')situacao.value='concluido';
      return;
    }
    if(!podeOrganizar)return;

    injectStyles();
    form.style.display='';

    if(access.organizador&&!access.regulador&&!access.administrador){
      situacao.innerHTML='<option value="">Selecione</option><option value="em_atendimento">Em atendimento</option>';
    }else if(![...situacao.options].some(o=>o.value==='em_atendimento')){
      situacao.insertAdjacentHTML('beforeend','<option value="em_atendimento">Em atendimento</option>');
    }

    const planner=document.createElement('div');
    planner.id='guiaAtendimentoPlanner';
    planner.hidden=true;
    planner.innerHTML=`
      <div class="workflow-block__title">Organização do atendimento</div>
      <div class="panel-section__desc">Ao colocar a guia em atendimento, defina neste mesmo passo se será atendimento individual ou em grupo.</div>
      <fieldset class="guia-atendimento-type" id="guiaAtendimentoType" disabled>
        <legend>Tipo de atendimento *</legend>
        <label class="guia-atendimento-option"><input type="radio" name="guia_tipo_atendimento" value="individual" required> Atendimento individual</label>
        <label class="guia-atendimento-option"><input type="radio" name="guia_tipo_atendimento" value="grupo"> Atendimento em grupo</label>
      </fieldset>
      <div id="guiaIndividualBox" class="guia-atendimento-sub" hidden>
        <div class="guia-atendimento-grid">
          <div class="field">
            <label for="guiaAtendimentoProfissional">Profissional *</label>
            <select id="guiaAtendimentoProfissional" required><option value="">Selecione</option></select>
          </div>
          <div class="field">
            <label for="guiaAtendimentoData">Data *</label>
            <input id="guiaAtendimentoData" type="date" min="${hoje()}" required>
          </div>
          <div class="field">
            <label for="guiaAtendimentoHorario">Horário disponível *</label>
            <select id="guiaAtendimentoHorario" required disabled><option value="">Selecione profissional e data</option></select>
          </div>
          <div class="field">
            <label>Unidade executante</label>
            <input id="guiaAtendimentoUnidade" type="text" readonly value="—">
          </div>
        </div>
        <div id="guiaAtendimentoDuracao" class="guia-atendimento-summary"></div>
      </div>
      <div id="guiaGrupoBox" class="guia-atendimento-sub" hidden>
        <div class="guia-atendimento-grid">
          <div class="field wide">
            <label for="guiaAtendimentoGrupo">Grupo de atendimento *</label>
            <select id="guiaAtendimentoGrupo" required><option value="">Selecione</option></select>
          </div>
        </div>
        <div id="guiaGrupoInfo" class="guia-atendimento-note">Selecione um grupo para consultar o próximo encontro e as vagas.</div>
      </div>
      <div id="guiaAtendimentoContexto" class="guia-atendimento-note"></div>
      <div id="guiaAtendimentoMsg" class="guia-atendimento-msg" aria-live="polite"></div>
    `;
    const row=form.querySelector('.workflow-row');
    row?.insertAdjacentElement('afterend',planner);

    const fieldset=planner.querySelector('#guiaAtendimentoType');
    const individualBox=planner.querySelector('#guiaIndividualBox');
    const grupoBox=planner.querySelector('#guiaGrupoBox');
    const profSelect=planner.querySelector('#guiaAtendimentoProfissional');
    const dataInput=planner.querySelector('#guiaAtendimentoData');
    const horarioSelect=planner.querySelector('#guiaAtendimentoHorario');
    const unidadeInput=planner.querySelector('#guiaAtendimentoUnidade');
    const grupoSelect=planner.querySelector('#guiaAtendimentoGrupo');
    const grupoInfo=planner.querySelector('#guiaGrupoInfo');
    const contexto=planner.querySelector('#guiaAtendimentoContexto');
    const msg=planner.querySelector('#guiaAtendimentoMsg');
    const radios=[...planner.querySelectorAll('input[name="guia_tipo_atendimento"]')];

    let grupos=[];
    let carregandoSlots=0;

    function detalhe(){return getDetalhe?.()||{};}
    function guia(){return getGuia?.()||detalhe().guia||null;}
    function equipe(){return detalhe().equipeAtual||null;}
    function unidadeAtual(){return guia()?.unidade_executante_code||'';}
    function tipo(){return radios.find(r=>r.checked)?.value||'';}
    function setMsg(text,error=false){msg.textContent=text||'';msg.style.color=error?'#c0392b':'#2e7d32';}

    function setPlannerVisible(visible){
      planner.hidden=!visible;
      fieldset.disabled=!visible;
      if(!visible){
        radios.forEach(r=>r.checked=false);
        individualBox.hidden=true;
        grupoBox.hidden=true;
        setMsg('');
      }
    }

    function resetIndividual(){
      profSelect.innerHTML='<option value="">Selecione</option>';
      horarioSelect.innerHTML='<option value="">Selecione profissional e data</option>';
      horarioSelect.disabled=true;
      horarioSelect.value='';
      planner.querySelector('#guiaAtendimentoDuracao').innerHTML='';
    }

    async function carregarProfissionais(){
      const g=guia(),eq=equipe(),unit=unidadeAtual();
      resetIndividual();
      if(!g?.especialidade_id||!eq?.id||!unit){
        setMsg('Defina a equipe e a unidade executante antes de organizar o atendimento.',true);
        return;
      }
      const q=new URLSearchParams({equipe_id:String(eq.id),unidade_code:unit,especialidade_id:String(g.especialidade_id)});
      const r=await apiFetch('/api/agenda/profissionais?'+q.toString());
      if(!r.ok){setMsg(r.data?.error||'Não foi possível carregar os profissionais.',true);return;}
      const profissionais=r.data?.profissionais||[];
      profSelect.innerHTML='<option value="">Selecione o profissional</option>'+profissionais.map(p=>`<option value="${esc(p.id)}">${esc(p.nome)}${p.cargo?` · ${esc(p.cargo)}`:''}</option>`).join('');
      if(!profissionais.length)setMsg('Nenhum profissional compatível foi encontrado para esta equipe, unidade e especialidade.',true);
    }

    async function carregarHorarios(){
      const g=guia(),eq=equipe(),unit=unidadeAtual(),prof=profSelect.value,data=dataInput.value;
      horarioSelect.innerHTML='<option value="">Carregando horários…</option>';
      horarioSelect.disabled=true;
      planner.querySelector('#guiaAtendimentoDuracao').innerHTML='';
      if(!g?.especialidade_id||!eq?.id||!unit||!prof||!data){
        horarioSelect.innerHTML='<option value="">Selecione profissional e data</option>';
        return;
      }
      const token=++carregandoSlots;
      const q=new URLSearchParams({profissional_id:String(prof),especialidade_id:String(g.especialidade_id),equipe_id:String(eq.id),unidade_code:unit,data});
      const r=await apiFetch('/api/agenda/disponibilidade?'+q.toString());
      if(token!==carregandoSlots)return;
      if(!r.ok){horarioSelect.innerHTML='<option value="">Não foi possível consultar</option>';setMsg(r.data?.error||'Não foi possível consultar a disponibilidade.',true);return;}
      const slots=r.data?.slots||[];
      horarioSelect.innerHTML='<option value="">Selecione o horário</option>'+slots.map(s=>`<option value="${esc(s.hora_inicio)}">${esc(s.hora_inicio)}</option>`).join('');
      horarioSelect.disabled=false;
      planner.querySelector('#guiaAtendimentoDuracao').innerHTML=r.data?.duracao_minutos?`<span class="guia-atendimento-pill">Duração: ${esc(r.data.duracao_minutos)} min</span>`:'';
      if(!slots.length){horarioSelect.innerHTML='<option value="">Nenhum horário disponível</option>';setMsg('Não há horários disponíveis nessa data para este profissional.',true);}
      else setMsg('');
    }

    async function carregarGrupos(){
      const g=guia(),eq=equipe(),unit=unidadeAtual();
      grupoSelect.innerHTML='<option value="">Carregando grupos…</option>';
      grupoInfo.textContent='Selecione um grupo para consultar o próximo encontro e as vagas.';
      if(!g?.especialidade_id||!eq?.id||!unit){
        grupoSelect.innerHTML='<option value="">Defina equipe e unidade executante primeiro</option>';
        setMsg('Defina a equipe e a unidade executante antes de incluir a guia em um grupo.',true);
        return;
      }
      const r=await apiFetch('/api/agenda/grupos');
      if(!r.ok){grupoSelect.innerHTML='<option value="">Não foi possível carregar</option>';setMsg(r.data?.error||'Não foi possível carregar os grupos.',true);return;}
      grupos=(r.data?.grupos||[]).filter(gr=>Number(gr.especialidade_id)===Number(g.especialidade_id)&&Number(gr.equipe_id)===Number(eq.id)&&String(gr.unidade_code)===String(unit)&&Number(gr.pacientes_ativos||0)<Number(gr.capacidade||0));
      grupoSelect.innerHTML='<option value="">Selecione o grupo</option>'+grupos.map(gr=>`<option value="${esc(gr.id)}">${esc(gr.nome)} — ${esc(gr.pacientes_ativos||0)}/${esc(gr.capacidade||0)} vagas</option>`).join('');
      if(!grupos.length)grupoInfo.textContent='Nenhum grupo ativo com vaga disponível foi encontrado para esta especialidade, equipe e unidade.';
    }

    async function carregarGrupoDetalhe(){
      const id=grupoSelect.value;
      const gr=grupos.find(x=>String(x.id)===String(id));
      if(!id||!gr){grupoInfo.textContent='Selecione um grupo para consultar o próximo encontro e as vagas.';return;}
      grupoInfo.textContent='Carregando informações do grupo…';
      const r=await apiFetch(`/api/agenda/grupos/${encodeURIComponent(id)}`);
      if(!r.ok){grupoInfo.textContent=r.data?.error||'Não foi possível consultar o grupo.';return;}
      const encontros=(r.data?.encontros||[]).filter(x=>x.situacao!=='cancelado'&&String(x.data_encontro)>=hoje());
      const proximo=encontros[0];
      const profs=(r.data?.profissionais||[]).map(x=>x.nome).filter(Boolean).join(' · ');
      grupoInfo.innerHTML=`<strong>${esc(r.data?.grupo?.nome||gr.nome)}</strong><br>${proximo?`Próximo encontro: ${dataBR(proximo.data_encontro)} às ${esc(proximo.hora_inicio)}`:'Não há encontro futuro programado.'}<br>Vagas: ${esc(gr.pacientes_ativos||0)}/${esc(gr.capacidade||0)}${profs?`<br>Profissionais: ${esc(profs)}`:''}`;
    }

    function renderTipo(){
      const t=tipo();
      individualBox.hidden=t!=='individual';
      grupoBox.hidden=t!=='grupo';
      setMsg('');
      const g=guia(),eq=equipe(),unit=unidadeAtual();
      unidadeInput.value=unit||'—';
      contexto.innerHTML=g&&eq?`<strong>Responsabilidade:</strong> ${esc(eq.nome)} · <strong>Unidade:</strong> ${esc(unit||'não definida')}`:'Defina a responsabilidade da guia antes de organizar o atendimento.';
      if(t==='individual')carregarProfissionais();
      if(t==='grupo')carregarGrupos();
    }

    radios.forEach(r=>r.addEventListener('change',renderTipo));
    profSelect.addEventListener('change',carregarHorarios);
    dataInput.addEventListener('change',carregarHorarios);
    grupoSelect.addEventListener('change',carregarGrupoDetalhe);
    situacao.addEventListener('change',()=>{
      const g=guia();
      const ativo=situacao.value==='em_atendimento'&&g?.situacao!=='em_atendimento';
      setPlannerVisible(ativo);
      if(ativo){
        radios.forEach(r=>r.checked=false);
        individualBox.hidden=true;
        grupoBox.hidden=true;
        const eq=equipe(),unit=unidadeAtual();
        contexto.textContent=eq?`Equipe: ${eq.nome} · Unidade executante: ${unit||'não definida'}`:'Defina a equipe e a unidade executante antes de organizar o atendimento.';
      }
    });

    form.addEventListener('submit',async(e)=>{
      const g=guia();
      if(situacao.value!=='em_atendimento'||g?.situacao==='em_atendimento')return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const t=tipo();
      if(!t){setMsg('Selecione o tipo de atendimento.',true);return;}
      const eq=equipe(),unit=unidadeAtual();
      if(!eq?.id||!unit){setMsg('Defina a equipe e a unidade executante antes de organizar o atendimento.',true);return;}
      const body={tipo};
      if(t==='individual'){
        body.profissional_id=profSelect.value;
        body.equipe_id=Number(eq.id);
        body.unidade_code=unit;
        body.data_atendimento=dataInput.value;
        body.hora_inicio=horarioSelect.value;
      }else{
        body.grupo_id=Number(grupoSelect.value);
      }
      setMsg('Organizando atendimento…');
      const r=await apiFetch(`/api/guias/${encodeURIComponent(guiaId)}/atendimento`,{method:'POST',body:JSON.stringify(body)});
      if(!r.ok){setMsg(r.data?.error||'Não foi possível organizar o atendimento.',true);return;}
      setMsg('Atendimento organizado.');
      window.location.reload();
    },true);

    const tentarSincronizar=()=>{
      const g=guia();
      if(!g){setTimeout(tentarSincronizar,120);return;}
      const eq=equipe(),unit=unidadeAtual();
      unidadeInput.value=unit||'—';
      if(g.situacao==='em_atendimento'){
        planner.hidden=true;
        fieldset.disabled=true;
      }
    };
    tentarSincronizar();
  };
})();
