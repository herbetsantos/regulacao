(function(){
  function statusLabel(value){
    return ({
      aguardando_autorizacao:'Aguardando autorização',
      lista_espera:'Em lista de espera',
      em_atendimento:'Em atendimento',
      concluido:'Concluído',
      negado:'Negado',
      agendado:'Agendado',
      realizado:'Realizado',
      falta:'Falta',
      cancelado:'Cancelado',
      ativo:'Ativo',
      abandono:'Abandono',
      removido:'Removido',
      programado:'Programado',
    })[value] || value || '—';
  }

  function field(label,value,span=''){
    return `<div class="doc-field ${span}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? '—')}</strong></div>`;
  }

  function table(headers,rows){
    if(!rows.length)return '<p class="empty">Nenhum registro administrativo encontrado.</p>';
    return `<table><thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${escapeHtml(v ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function endereco(g){
    return [
      g.paciente_logradouro,
      g.paciente_numero ? `nº ${g.paciente_numero}` : '',
      g.paciente_complemento,
      g.paciente_bairro,
      [g.paciente_municipio,g.paciente_uf].filter(Boolean).join('/'),
      g.paciente_cep ? `CEP ${g.paciente_cep}` : '',
    ].filter(Boolean).join(' · ') || g.paciente_endereco || '—';
  }

  window.initGuiaImpressao=function({guiaId,user,getGuia,getDetalhe,nomeUnidade}){
    const dialog=document.getElementById('printDialog');
    const open=document.getElementById('btnImprimirGuia');
    const cancel=document.getElementById('btnCancelarImpressao');
    const generate=document.getElementById('btnGerarImpressao');
    if(!dialog||!open||!cancel||!generate)return;

    open.addEventListener('click',()=>dialog.showModal());
    cancel.addEventListener('click',()=>dialog.close());
    generate.addEventListener('click',async()=>{
      const g=getGuia();
      const d=getDetalhe();
      if(!g||!d)return;

      const incluirPaciente=document.getElementById('printPaciente').checked;
      const incluirGuia=document.getElementById('printGuia').checked;
      const incluirAcompanhamento=document.getElementById('printAcompanhamento').checked;
      if(!incluirPaciente&&!incluirGuia&&!incluirAcompanhamento){
        alert('Selecione pelo menos um bloco para impressão.');
        return;
      }
      dialog.close();

      const janela=window.open('','_blank');
      if(!janela){alert('Permita pop-ups para gerar a impressão.');return;}
      janela.document.write('<!doctype html><html><body style="font-family:Arial;padding:32px">Preparando documento…</body></html>');
      janela.document.close();

      let extra={etiquetas:[],acompanhamento:{individuais:[],grupos:[],encontros:[],execucoes:[],transferencias:[]}};
      if(incluirAcompanhamento){
        const r=await apiFetch(`/api/guias/${guiaId}/impressao`);
        if(!r.ok){janela.close();alert(r.data?.error||'Não foi possível carregar o acompanhamento.');return;}
        extra=r.data;
      }

      const codigo=formatGuideCode(g);
      const nomePreferido=g.paciente_nome_social||g.paciente_nome;
      const sexo=g.paciente_sexo==='F'?'Feminino':g.paciente_sexo==='M'?'Masculino':g.paciente_sexo==='I'?'Indeterminado':(g.paciente_sexo||'—');
      const section=(title,body)=>`<section><h2>${escapeHtml(title)}</h2>${body}</section>`;

      const paciente=incluirPaciente?section('Dados do paciente',`
        <div class="grid">
          ${field('Nome',nomePreferido,'span-2')}
          ${g.paciente_nome_social?field('Nome civil',g.paciente_nome,'span-2'):''}
          ${field('CPF',maskCPF(g.cpf))}
          ${field('CNS',g.paciente_cns||'—')}
          ${field('Nascimento',formatDateBR(g.paciente_data_nascimento))}
          ${field('Sexo',sexo)}
          ${field('Identidade de gênero',g.paciente_identidade_genero||'—','span-2')}
          ${field('Telefones',[g.paciente_tel1,g.paciente_tel2,g.paciente_tel3].filter(Boolean).map(maskPhone).join(' · ')||'—','span-2')}
          ${field('Unidade de referência',nomeUnidade(g.paciente_unidade_referencia_code),'span-2')}
          ${field('Endereço',endereco(g),'span-4')}
        </div>`):'';

      const guia=incluirGuia?section('Dados da guia',`
        <div class="grid">
          ${field('Número da guia',codigo)}
          ${field('Data da solicitação',formatDateTimeBR(g.created_at))}
          ${field('Especialidade',g.especialidade_nome)}
          ${field('CID-10',g.cid10||'—')}
          ${field('Unidade solicitante',nomeUnidade(g.unidade_solicitante_code),'span-2')}
          ${field('Profissional solicitante',g.medico_solicitante,'span-2')}
          ${field('Motivo do encaminhamento',g.motivo,'span-4')}
          ${field('Situação atual',statusLabel(g.situacao))}
          ${field('Equipe responsável',d.equipeAtual?.nome||'—')}
          ${field('Unidade executante',nomeUnidade(g.unidade_executante_code))}
        </div>`):'';

      let acompanhamento='';
      if(incluirAcompanhamento){
        const a=extra.acompanhamento||{};
        acompanhamento=section('Acompanhamento administrativo',`
          ${field('Etiquetas',(extra.etiquetas||[]).map(x=>x.nome).join(' · ')||'Sem etiquetas','span-4')}
          <h3>Atendimentos individuais</h3>
          ${table(['Data','Horário','Profissional','Unidade','Situação'],(a.individuais||[]).map(x=>[formatDateBR(x.data_atendimento),x.hora_inicio,x.profissional_nome,x.unidade_nome,statusLabel(x.situacao)]))}
          <h3>Vínculos com grupos</h3>
          ${table(['Grupo','Entrada','Saída','Profissionais','Situação'],(a.grupos||[]).map(x=>[x.grupo_nome,formatDateTimeBR(x.entrada_em),x.saida_em?formatDateTimeBR(x.saida_em):'—',x.profissionais,statusLabel(x.status)]))}
          <h3>Encontros de grupo</h3>
          ${table(['Grupo','Data','Horário','Duração','Situação'],(a.encontros||[]).map(x=>[x.grupo_nome,formatDateBR(x.data_encontro),x.hora_inicio,x.duracao_minutos?`${x.duracao_minutos} min`:'—',statusLabel(x.situacao)]))}
          <h3>Desfechos administrativos</h3>
          ${table(['Data','Tipo','Resultado','Observação'],(a.execucoes||[]).map(x=>[formatDateTimeBR(x.registrado_em),x.tipo,statusLabel(x.resultado),x.observacao_administrativa]))}
        `);
      }

      const emitidoPor=user?.name||user?.username||'Usuário autenticado';
      const geradoEm=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date());
      const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Espelho ${escapeHtml(codigo)}</title>
      <style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17233f;font-size:10pt;margin:0}
      header{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:3px solid #173b7a;padding-bottom:10px}
      header img{height:50px}h1{font-size:16pt;color:#173b7a;margin:16px 0 4px}h2{font-size:11pt;color:#173b7a;background:#eef4fb;border-left:4px solid #173b7a;padding:7px;margin:14px 0 8px}
      h3{font-size:9.5pt;color:#173b7a;margin:12px 0 6px}.grid{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #ccd5e2;border-left:1px solid #ccd5e2}.doc-field{padding:7px;border-right:1px solid #ccd5e2;border-bottom:1px solid #ccd5e2;min-height:44px}.doc-field.span-2{grid-column:span 2}.doc-field.span-4{grid-column:1/-1}.doc-field span{display:block;color:#667085;font-size:7pt;text-transform:uppercase;margin-bottom:3px}.doc-field strong{font-size:9pt}
      table{width:100%;border-collapse:collapse;font-size:8pt}th,td{border:1px solid #ccd5e2;padding:5px;text-align:left}th{background:#f4f7fb}.note{margin-top:14px;padding:8px;border:1px solid #d7dee9;background:#f6f8fb;color:#4b5b75;font-size:8pt}.footer{margin-top:14px;padding-top:8px;border-top:1px solid #ccd5e2;font-size:7pt;color:#667085}
      </style></head><body>
      <header><div><strong>Prefeitura de Cajamar · Secretaria Municipal de Saúde</strong><br>eMulti | Regulação de Vagas</div><div><strong>Guia ${escapeHtml(codigo)}</strong></div></header>
      <h1>Espelho do Acompanhamento</h1>
      <div>Documento administrativo emitido pelo sistema eMulti | Regulação.</div>
      ${paciente}${guia}${acompanhamento}
      <div class="note"><strong>Importante:</strong> este documento apresenta somente informações administrativas. Evolução, conduta e demais registros clínicos pertencem ao prontuário eletrônico do cidadão no PEC e-SUS.</div>
      <div class="footer">Emitido por ${escapeHtml(emitidoPor)} em ${escapeHtml(geradoEm)}</div>
      </body></html>`;

      janela.document.open();
      janela.document.write(html);
      janela.document.close();
      try{await janela.document.fonts?.ready;}catch{}
      janela.focus();
      janela.print();
    });
  };
})();