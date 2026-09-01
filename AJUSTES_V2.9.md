# eMulti v2.9 — Integração com e-SUS PEC

- Novo endpoint autenticado `POST /api/integracoes/esus/paciente`.
- Exige responsabilidade **Cadastrante** (ou Administrador da Regulação).
- Recebe dados extraídos da tela de Visualização do cadastro do e-SUS PEC.
- Procura cidadão por CPF antes de inserir e não sobrescreve cadastro existente automaticamente.
- Tenta relacionar a unidade do PEC com as unidades APS do Portal por nome normalizado.
- Se não conseguir relacionar a unidade, devolve a lista de APS para escolha do usuário na extensão.
- Novo campo opcional `cns` em `pacientes`.
- Cadastro manual também passa a aceitar CNS.
- Auditoria registra a origem `esus_pec`, sem gravar o conteúdo clínico da tela.
- Nenhuma credencial do Portal/eMulti é armazenada na extensão; a integração usa a sessão normal do eMulti em uma aba autenticada.
