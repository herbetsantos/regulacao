# Versão 2.19.0 — Administração e autenticação híbrida

- Nova Administração por submenu.
- Credenciais próprias para usuários externos ao Portal APS.
- Novo cadastro de profissionais independente de login.
- Carga horária de Especialidades calculada a partir dos vínculos profissionais.
- Modelo de autorização unificado por principal.
- Compatibilidade preservada com usuários e vínculos existentes do Portal.

# Novidades do eMulti Regulação


## 2.18.2 — Listas administrativas escaláveis

- Acessos e responsabilidades agora têm paginação no backend.
- Filtros combináveis por unidade e função eMulti (Cadastrante, Regulador, Executor e Administrador).
- Busca por nome ou usuário e filtro de usuários sem função atribuída.
- Profissionais eMulti pré-carregados agora têm paginação, busca e filtros por unidade, função/especialidade e vínculo de acesso.
- Quantidade por página configurável em 10, 20, 50 ou 100 registros.
- O status “Sem acesso” ou “Acesso vinculado” passa a ficar visível na lista de profissionais.

## 2.18.1 — Chat e suporte aprimorados

- Comunicação interna e suporte passam a exibir presença online.
- Mensagens não lidas aparecem no menu da conta.
- Atendimento de suporte pode ser encerrado/reaberto pelo Super Administrador.
- Identificação visual dos participantes e origem Portal/eMulti preservada.
- Atualização quase em tempo real por consulta periódica ao banco compartilhado do Portal.


## 2.18.1 — Comunicação e suporte integrados
- Comunicação interna compartilhada com o Portal Saúde.
- Chat de suporte no menu da conta.
- Chamados integrados e acompanhamento pelo super_admin.
- Retenção inicial de 30 dias, configurada no Portal pelo super_admin.
- Estrutura inicial do Assistente de Rotinas.
- O repositório eMulti passa a manter somente SQL do regulacao-vagas-db; o portal-saude-db é mantido pelo repositório do Portal.
- Removida a ação web de atualização automática de schema D1.

# Novidades — eMulti Regulação

## v2.17.6

- Estrutura dos dois bancos D1 revisada com base nos schemas reais de `portal-saude-db` e `regulacao-vagas-db` informados pelo administrador.
- O sistema agora identifica também as estruturas da Agenda v2.17 e as tabelas complementares do pré-cadastro de profissionais.
- Novo botão **Atualizar bancos D1** em **Administração > Diagnóstico**. O próprio sistema cria apenas tabelas, índices e colunas ausentes, sem apagar pacientes, guias, usuários ou vínculos existentes.
- A atualização administrativa alcança os dois bancos: Portal e Regulação.
- O pré-cadastro mantém 28 profissionais, 78 lotações e 105 períodos semanais de referência, sem criar logins ou senhas.
- Vínculo com equipe eMulti ativa ou unidade autorizada continua sendo suficiente para entrada no módulo; as classes Cadastrante, Regulador, Executor e Administrador continuam sendo definidas separadamente.
- O vínculo com equipe não atribui automaticamente a classe Executor.
- Escalas dos especialistas continuam sob gestão exclusiva do Administrador.
- `schema.sql` e `update.sql` permanecem como arquivos de contingência/instalação, sem voltar ao modelo de dezenas de migrations.
- Controle de versão dos dois bancos consolidado em `emulti_schema_version`.

# Histórico de versões — eMulti Regulação

Este é o documento único de novidades e alterações do sistema. A partir da v2.17.4, arquivos separados `AJUSTES_V*.md` deixam de ser gerados.

## v2.17.4

- Centralização do histórico de alterações neste documento único (`NOVIDADES.md`).
- Nova página **Novidades da Versão**, acessível pelo menu superior da conta.
- Remoção dos arquivos individuais `AJUSTES_V*.md` do pacote.
- A página apresenta a versão atual em destaque e o histórico das versões anteriores.
- `APP_VERSION` atualizado para `2.17.4`.

# eMulti Regulação v2.17.3

- Vínculo de um usuário como profissional de uma equipe eMulti ativa passa a ser suficiente para autorizar a entrada no eMulti.
- Vínculo direto a uma unidade autorizada também passa a conceder entrada na ferramenta.
- As responsabilidades Cadastrante, Regulador, Executor e Administrador continuam independentes e definem o que o usuário pode fazer; o vínculo define o escopo/autorização de entrada.
- Ao vincular ou remover profissional de equipe, o sistema sincroniza automaticamente a permissão `regulacao_vagas` usada pelo Portal Saúde para exibir/abrir o eMulti.
- Ao vincular ou remover usuário de unidade, a mesma sincronização é feita automaticamente.
- Ao ativar ou desativar uma equipe, o acesso dos profissionais vinculados é recalculado.
- Nova migração de sincronização para vínculos já existentes: `migration_regulacao_acesso_por_vinculo_v2_17_3.sql` (executar em `portal-saude-db`).
- `APP_VERSION` atualizado para `2.17.3`.

# eMulti Regulação v2.17.2

- Pré-cadastro dos 28 profissionais eMulti presentes na escala fornecida, preservando especialidade, unidades e horários semanais de referência.
- O pré-cadastro não cria logins, senhas ou acessos. O Administrador pode vincular cada profissional a um usuário real do Portal quando a conta existir.
- Nova área **Profissionais eMulti pré-carregados** em Administração.
- A escala de origem é exibida como referência administrativa; alterações operacionais da escala continuam exclusivas do Administrador.
- Correção do flash visual de `2.14.0` na página Sobre: a versão deixou de estar gravada no HTML e agora é preenchida somente pela constante central `APP_VERSION`.
- `APP_VERSION` atualizado para `2.17.2`.

## Migração necessária
Execute em `portal-saude-db`:

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_regulacao_profissionais_base_v2_17_2.sql
```

# eMulti Regulação v2.17.1

## Escalas sob gestão exclusiva do Administrador

- Profissionais especialistas continuam podendo **consultar a própria escala**, mas não podem criar, alterar ou remover períodos.
- A API de escalas agora bloqueia inclusão e exclusão por usuários sem responsabilidade `Administrador`.
- O Administrador pode selecionar **equipe → profissional → especialidade** e configurar a escala do especialista.
- A seleção de especialidade é limitada às especialidades já vinculadas ao profissional.
- Para o especialista, a aba Escala fica em modo somente leitura.
- Atendimentos individuais e grupos continuam sendo operados pelos perfis já autorizados.
- Não há nova migração de banco: permanece válida a migração `migration_regulacao_agenda_v2_17.sql` da v2.17.0.

# eMulti Regulação v2.17.0

- Novo módulo **Agenda e Atendimentos**.
- Escala semanal do especialista por equipe, especialidade, unidade, dia e faixa de horário.
- Vigência opcional da escala.
- Administrador define a duração padrão de cada horário por especialidade.
- Atendimento individual pode reservar de 1 a 8 horários consecutivos.
- Ao agendar atendimento individual, a guia passa para **Em atendimento**.
- Grupos podem ser criados vazios, com capacidade e duração próprias.
- Rotina semanal pode gerar encontros futuros automaticamente entre duas datas.
- Encontros adicionais podem ser incluídos manualmente.
- Pacientes da lista de espera podem ser alocados a um grupo, passando para **Em atendimento**.
- Saída individual do grupo: **Conclusão**, **Abandono** ou **Remover e voltar à lista de espera**.
- Migração obrigatória: `migration_regulacao_agenda_v2_17.sql` no `regulacao-vagas-db`.

# eMulti Regulação v2.16.1

- Restaurada a paleta clara definida anteriormente.
- Menu lateral branco no tema claro.
- Fundo geral levemente mais escuro (`#f2f4f7`).
- Cards e painéis permanecem brancos para melhor contraste.
- Hover do menu lateral suavizado; item ativo permanece em azul claro.
- Texto “Regulação” no cabeçalho permanece branco.
- Temas escuro e alto contraste preservados.
- Sem migração de banco de dados.

# eMulti Regulação v2.16.0

- Novo Painel orientado às responsabilidades.
- Blocos para Cadastrante, Regulador, Executor e Administrador, combináveis.
- Indicadores rápidos por fluxo.
- Menu lateral com Painel e expansão por clique.
- Fila renomeada para Regulação e Pesquisa de Guias.
- Filtro `meus=1` para guias criadas pelo usuário.
- Sem migração de banco.

# Ajustes v2.15.6

- Tabela da fila reorganizada com cabeçalho destacado, alinhamento à esquerda e divisórias entre colunas e linhas.
- Botão **Exportar CSV** exporta todos os resultados dos filtros atuais, percorrendo a paginação automaticamente.
- Botão **Importar CSV** disponível para Cadastrante/Administrador.
- O CSV exportado contém as colunas necessárias para servir como modelo de importação.
- A importação cria novas guias por meio da API existente e respeita permissões, pacientes cadastrados, unidades autorizadas, especialidades válidas e prevenção de duplicidade ativa.
- Nenhuma migração de banco de dados é necessária.

# Ajustes v2.15.5

- Unidade executante passou a ser uma seleção explicitamente obrigatória nos fluxos de definição/transferência e início de atendimento.
- Ao selecionar uma equipe, nenhuma unidade é mais escolhida automaticamente; o campo começa em “Selecione a unidade executante”.
- O formulário de transferência continua impedindo o envio sem equipe, unidade e profissional.
- O início do atendimento continua impedindo o envio sem equipe, unidade, data e horário.
- Quando um atendimento já está iniciado, a unidade previamente gravada continua sendo exibida apenas para representar o dado existente.
- Sem alteração de banco de dados.

# Ajustes v2.15.4

- Reorganização visual da página de detalhes da guia.
- Identificador completo da guia destacado no topo.
- Paciente, especialidade e situação reunidos em um resumo superior.
- Dados pessoais, encaminhamento e andamento convertidos para cartões de leitura rápida.
- Melhor tratamento para campos longos como endereço, unidade e motivo.
- Layout responsivo em 4, 2 ou 1 coluna conforme a largura da tela.
- Nenhuma alteração de banco de dados.

# Ajustes v2.15.3

- Corrigido erro de aspas em `functions/api/guias/index.js` que fazia o Wrangler interromper a compilação com `Expected ")" but found ...`.
- A consulta por guia continua aceitando o número completo sem hífen e os 6 dígitos finais.
- Não requer nova migração se a migração da v2.15.2 já foi executada.

# Ajustes v2.15.2

- Identificador público da guia passa a ser exibido sem hífen: `AAAA000001`.
- O ano é baseado em `guias.created_at` (ano do cadastro).
- A pesquisa aceita o número completo (`2026000001`) ou apenas os 6 dígitos finais (`000001`).
- Compatibilidade de pesquisa mantida para códigos antigos com hífen.
- Incluída migração para padronizar códigos já existentes.

# eMulti Regulação v2.14

- Termos de Uso revisados para o contexto institucional da regulação municipal em saúde.
- Política de Privacidade ampliada com tratamento de dados pessoais e sensíveis, finalidades, integrações, segurança, retenção e direitos dos titulares.
- Sem indicação nominal de Encarregado/DPO; direcionamento temporário aos canais oficiais da Prefeitura.
- Política de Privacidade permanece integrada à mesma página dos Termos, com navegação interna.
- Página Sobre mantém o nome “Sobre o eMulti Regulação”.
- Versão do sistema centralizada em 2.14.0.
- Código residual do antigo rodapé global removido.
- Sem alteração de banco de dados.

# eMulti v2.13

- Rodapé global removido para preservar área útil.
- Menu do usuário ampliado com Suporte, Termos de Uso e Privacidade e Sobre o eMulti Regulação.
- Termos de Uso e Política de Privacidade consolidados em uma única página com navegação interna.
- Página Sobre renomeada para Sobre o eMulti Regulação e versão vinculada ao APP_VERSION.
- APP_VERSION atualizado para 2.13.0.

Não requer migração de banco de dados.

# eMulti v2.12

- Rodapé institucional global em todas as páginas autenticadas.
- Controle de versão centralizado em `js/app-chrome.js` (`APP_VERSION`).
- Links para Suporte, Política de Privacidade e Termos de Uso.
- Nova página `suporte.html` com orientações de diagnóstico e solicitação de apoio.
- Nova página `politica-privacidade.html` com política operacional inicial.
- Nova página `termos-de-uso.html` com termos operacionais iniciais.
- Os documentos legais são rascunhos operacionais e devem passar por validação institucional/jurídica antes de serem considerados definitivos.
- Nenhuma migração SQL necessária.

# eMulti v2.11 — Fila operacional e cabeçalho

- Cabeçalho: lado esquerdo reduzido a logotipo + `eMulti | Regulação`.
- Fila de encaminhamentos redesenhada para grande volume.
- Colunas essenciais: código da guia, paciente/CPF, especialidade, solicitação (data + profissional requisitante), situação e ação.
- Busca rápida por código da guia, CPF ou nome do paciente.
- Filtros avançados recolhíveis: situação, especialidade, unidade solicitante, equipe, profissional requisitante, intervalo de datas e ordenação.
- Paginação server-side com 10, 20, 50 ou 100 itens por página e contagem total.
- API `/api/guias` agora aceita paginação e filtros adicionais sem carregar centenas de registros no navegador.
- Após uma ação de regulação, a tela oferece `Próxima na fila` (guia mais antiga aguardando autorização) ou `Voltar para pesquisa` preservando os filtros/página anteriores.
- Nenhuma migração SQL nova é necessária para esta versão.

# eMulti v2.10

- Código público da guia no formato `AAAA-000001`, mantendo `id` apenas interno.
- Profissionais eMulti passam a ter cargo/profissão e especialidades vinculadas dentro da equipe.
- Histórico de atribuições de cada guia a um profissional responsável.
- Para colocar a guia em **Em atendimento**, equipe, unidade executante e profissional especialista precisam estar definidos.
- **Iniciar atendimento** só aparece quando a guia está em `Em atendimento`. Data e horário de início são obrigatórios.
- Sessões registram explicitamente o profissional executor.
- Administração permite cadastrar/editar cargo e especialidades de cada profissional da equipe.

## Banco
A tela Administração > Diagnóstico > Corrigir estrutura do banco da Regulação atualiza o `regulacao-vagas-db` de forma não destrutiva.
A estrutura profissional no `portal-saude-db` é verificada e criada automaticamente ao abrir/usar a gestão de equipes. Também foram incluídas migrações SQL para aplicação manual.

# Ajustes v2.9.2

- Corrige a tela de detalhe da guia que ficava vazia por causa da regra global de `.panel-section`.
- Reorganiza a visualização em três quadros sempre visíveis:
  1. Dados pessoais do paciente;
  2. Dados do encaminhamento;
  3. Andamento da guia.
- Dados pessoais incluem CPF, CNS, nascimento, sexo, telefones, unidade de referência e endereço.
- Dados do encaminhamento incluem especialidade, CID-10, unidade solicitante, médico, motivo e datas.
- Andamento mostra situação, equipe responsável, unidade executante e tipo/estado do atendimento.
- Ações de alteração de situação, transferência, início de atendimento e registro de sessões permanecem no terceiro quadro e respeitam as permissões existentes.
- Continua exibindo nomes formais das unidades na interface.
- Nenhuma nova migração SQL é necessária em relação à v2.9.1.

# Ajustes v2.9.1

- Campo **Motivo do encaminhamento** com altura inicial fixa de aproximadamente 110 px, mantendo redimensionamento vertical manual.
- Nomes formais das unidades exibidos na Nova Guia, fila de encaminhamentos, detalhe da guia, acompanhamento e seleção de guias para grupo.
- Os códigos internos das unidades continuam sendo usados apenas como chaves técnicas no banco/APIs.
- Nenhuma migração de banco é necessária para esta atualização.

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

# Ajustes v2.8 — Endereço por CEP com BrasilAPI

## O que mudou

- O cadastro de cidadãos ganhou campos estruturados de endereço: CEP, logradouro, número, complemento, bairro, município e UF.
- Ao informar um CEP válido, o eMulti consulta a BrasilAPI pelo backend (`/api/cep/:cep`) e preenche automaticamente logradouro, bairro, município e UF.
- Número e complemento continuam sob responsabilidade do usuário.
- Endereços fora de Cajamar/SP geram apenas um aviso de conferência; o cadastro não é bloqueado.
- Se a BrasilAPI estiver indisponível ou o CEP não for encontrado, o endereço pode ser preenchido manualmente e o cadastro continua funcionando.
- O campo legado `endereco` continua sendo gravado em formato legível para manter compatibilidade.

## Banco de dados

A v2.8 adiciona, sem apagar dados, as colunas abaixo à tabela `pacientes` do `regulacao-vagas-db`:

- `cep`
- `logradouro`
- `numero`
- `complemento`
- `bairro`
- `municipio`
- `uf`

Há duas formas de aplicar:

1. Recomendado: **Administração > Diagnóstico > Corrigir estrutura do banco da Regulação**. O reparo verifica o schema e adiciona somente os campos ausentes.
2. Alternativa: executar uma única vez `migration_regulacao_endereco_v2_8.sql` no `regulacao-vagas-db`.

Mesmo sem a migração, o backend mantém compatibilidade e salva o endereço completo na coluna legada `endereco`, mas a estrutura por campos só fica persistida após a atualização do schema.

## BrasilAPI

A integração usa o endpoint público `GET /api/cep/v1/{cep}` da BrasilAPI. A chamada externa é feita pela Cloudflare Function do eMulti, não diretamente pelo navegador. Somente o CEP é enviado à BrasilAPI; CPF, nome e demais dados do cidadão não são enviados ao serviço. Há timeout e mensagens de fallback para preenchimento manual.

# Ajustes v2.7.2

- Corrige o formulário de cadastro de pacientes que permanecia invisível após clicar em **+ Novo paciente** ou após uma busca sem resultado.
- A causa era a regra global `.panel-section { display: none; }`, herdada da antiga navegação administrativa.
- O formulário agora recebe `is-active` e `display: block` explicitamente ao ser aberto.
- Mantém as correções de tema da v2.7.1.
- Não requer migração SQL.

# Ajustes v2.7.1

## Correção de estabilidade da aparência

- Corrigido o comportamento que podia alterar a preferência para **Automático** sem ação do usuário.
- Uma falha ao consultar `users.theme` no D1 agora retorna erro temporário e **não é interpretada como `auto`**.
- Enquanto uma alteração de tema está sendo gravada, o cliente não aceita uma leitura remota antiga que possa desfazer a escolha.
- `/api/me` não força mais `light` quando a consulta de aparência falha; mantém a preferência local até a próxima sincronização válida.
- Não requer migração SQL.

# Ajustes v2.7 — controle de aparência no cabeçalho

- Aparência removida do menu do usuário.
- Novo controle compacto no cabeçalho, imediatamente à esquerda do nome do profissional.
- Clique no ícone/estado alterna rapidamente entre Claro e Escuro.
- A seta abre as quatro opções: Automático, Claro, Escuro e Alto contraste.
- A preferência continua sincronizada pela conta do usuário entre Portal Saúde e eMulti.
- O controle é responsivo e reduz-se ao ícone em telas menores.
- Não requer nova migração SQL.

# Ajustes v2.6.1

- Corrige a tela Administração que aparecia vazia após a v2.6.
- As seções administrativas agora são exibidas simultaneamente na página.
- A correção é apenas de apresentação; não altera banco, permissões ou dados.

# Ajustes v2.6 — Acessos próprios da Regulação e cadastro de cidadãos

## Novo modelo de acesso
O papel no Portal Saúde não define mais o que o usuário pode fazer no eMulti.
As responsabilidades são combináveis:

- **Cadastrante** — consulta/cadastra cidadãos e emite guias nas unidades autorizadas.
- **Regulador** — organiza a fila, faz triagem/transferências e cria atendimentos/grupos.
- **Executor** — registra sessões/evoluções dos atendimentos da própria equipe.
- **Administrador** — configura o eMulti e possui todas as capacidades operacionais.

`super_admin` continua com acesso total implícito como salvaguarda.

## Cadastro de cidadãos
A investigação confirmou que o schema `pacientes` e as unidades APS estavam corretos. O bloqueio observado ocorria antes do INSERT, na autorização genérica `regulacao_vagas` do usuário.
Na v2.6:

1. cadastro/edição exige explicitamente a responsabilidade **Cadastrante**;
2. consulta de cidadãos continua disponível aos demais perfis que tenham acesso ao eMulti;
3. as mensagens de erro informam se a falta é de acesso ao eMulti ou de responsabilidade de cadastro;
4. a Administração passa a configurar as responsabilidades separadamente do papel do Portal.

## Migração obrigatória
Execute `migration_regulacao_acessos_v2_6.sql` no **portal-saude-db** antes de publicar esta versão.
A migração é não destrutiva e preserva os vínculos existentes.

# Ajustes v2.5 — cadastro de pacientes e diagnóstico do banco

Esta revisão corrige os principais pontos que podiam impedir o cadastro de pacientes no eMulti.

## Correções

- `/api/unidades` não depende mais das tabelas de vínculo da Regulação para carregar a lista de unidades usada no cadastro de pacientes.
- Instalações antigas do Portal sem a coluna `unidades.tipo` continuam funcionando: o eMulti usa temporariamente a mesma lista oficial de unidades APS definida na migração original.
- O `POST /api/pacientes` e o `PUT /api/pacientes/:cpf` passaram a validar unidades de forma compatível com instalações antigas.
- Erros do banco da Regulação agora retornam códigos e mensagens específicas (`DB_REGULACAO_AUSENTE`, `TABELA_PACIENTES_AUSENTE`, etc.).
- A Administração mostra quais tabelas do banco da Regulação estão ausentes.
- Quando o binding `DB_REGULACAO` existe mas faltam tabelas, o administrador recebe o botão **Corrigir estrutura do banco da Regulação**.
- O reparo é não destrutivo: cria somente tabelas e índices ausentes e semeia apenas especialidades faltantes.
- `schema_regulacao.sql` deixou de conter `DROP TABLE`; pode ser executado novamente sem apagar pacientes/guias existentes.
- Incluído `migration_regulacao_safe_v2_5.sql` para reparo manual seguro.

## Importante

O reparo automático não consegue criar um binding D1 inexistente. Se o diagnóstico informar `DB_REGULACAO` não configurado, vincule o banco `regulacao-vagas-db` ao binding `DB_REGULACAO` no projeto Cloudflare Pages e faça novo deploy.

# Ajustes v2.4

- O imagotipo do cabeçalho do eMulti foi substituído pela nova versão branca com transparência.
- A imagem é utilizada diretamente em `assets/imagotipo.png`, preservando o restante da interface e os temas já implementados.

# Ajustes v2.3 — Aparência e acessibilidade

## Temas disponíveis

- **Claro**: mantém exatamente a proposta visual atual e é o padrão para usuários existentes/novos após a migração.
- **Escuro**: tema institucional escuro para uso prolongado em ambientes com pouca luz.
- **Alto contraste**: aumenta contraste, bordas e destaque de foco para acessibilidade.
- **Automático**: acompanha a preferência claro/escuro do sistema operacional e, quando o navegador informa preferência por maior contraste, usa o tema de alto contraste.

## Preferência compartilhada

A preferência é gravada na tabela `users` do banco compartilhado `portal-saude-db`. Assim, alterar a aparência no Portal Saúde ou no eMulti altera a preferência da mesma conta nos dois ambientes.

O `localStorage` é usado apenas como cache local para evitar mudança brusca de tema durante o carregamento. O banco continua sendo a fonte de verdade após a autenticação.

## Migração obrigatória

Execute uma única vez:

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_theme_v3.sql
```

A migração adiciona:

```text
users.theme = light | dark | contrast | auto
```

O valor padrão é `light`, preservando a aparência que o sistema já utilizava.

## Impressão

Áreas documentais e de impressão permanecem em tema claro. O Receituário continua com a folha A4 branca mesmo quando a interface estiver em modo Escuro ou Alto contraste.

# Ajustes v2.2

- Cabeçalho superior restaurado ao azul institucional original (`#203b8f`).
- Imagotipo do cabeçalho exibido integralmente em branco, preservando transparência e formato original por filtro CSS.
- Demais ajustes da versão 2.1 mantidos.

# Ajustes v2.1 — eMulti

## O que mudou

- Cabeçalho limpo: imagotipo à esquerda; nome e equipe do usuário à direita.
- Clique no nome do usuário: Alterar senha, Links úteis, Sobre e Sair.
- Menu principal movido para uma barra lateral azul-clara, recolhida por padrão e expandida ao passar o mouse.
- Notificações movidas para o menu lateral.
- Regra de equipe corrigida: cada profissional pode estar em somente uma equipe; cada equipe pode ter vários profissionais e várias unidades.
- Links úteis reutilizam a tabela `links` do Portal Saúde e aparecem em grade.
- O administrador escolhe o ícone de cada link na própria Administração do eMulti.
- Administração ampliada: diagnóstico, equipes, vínculos de unidades/profissionais, emissão de guias, especialidades e ícones.
- Cadastro de paciente agora possui botão “+ Novo paciente” e mensagens de configuração mais claras.
- Nova guia agora possui botão “Buscar paciente”, atalho para cadastrar paciente e aviso explícito quando o usuário não possui unidade emissora.

## Por que pacientes/guias podiam não cadastrar

No código anterior havia três pontos que podiam dar a impressão de que o cadastro não funcionava:

1. O formulário de novo paciente só aparecia depois de uma busca sem resultado; não havia botão de novo cadastro.
2. Usuário comum só pode criar guia se possuir vínculo em `regulacao_user_unidades` com `pode_emitir = 1`. Sem isso, não existe unidade solicitante disponível.
3. O cadastro de paciente depende de existirem unidades com `tipo = 'aps'`. Se a migração `migration_regulacao_setup.sql` não tiver sido aplicada corretamente, a lista de unidades fica vazia ou a API falha.

A nova tela **Administração > Diagnóstico da configuração** mostra esses problemas diretamente.

## Migração obrigatória desta revisão

Rode no banco do Portal (`portal-saude-db`):

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_regulacao_v2_portal.sql
```

Essa migração cria o índice que garante uma equipe por profissional e a tabela que guarda os ícones dos links úteis.

Se o banco `regulacao-vagas-db` ainda não tiver as tabelas de pacientes/guias, rode também:

```bash
wrangler d1 execute regulacao-vagas-db --remote --file=./schema_regulacao.sql
```

> Atenção: `schema_regulacao.sql` contém `DROP TABLE IF EXISTS`. Ele é apropriado para inicialização. Não rode novamente em um banco que já contenha dados reais sem antes fazer backup/migração de dados.

## Portal Saúde

O pacote do Portal desta revisão corrige também a allowlist da página de troca obrigatória de senha para `emulti.pages.dev` e inclui `migration_regulacao_v2.sql`.