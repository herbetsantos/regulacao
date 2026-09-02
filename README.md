# eMulti — Regulação de Vagas

Módulo integrado ao Portal Saúde Cajamar para cadastro de pacientes, emissão e triagem de guias, filas e acompanhamentos das equipes eMulti.

## Regras principais

- um profissional pertence a **uma única equipe**;
- uma equipe pode ter **vários profissionais**;
- uma equipe pode atender **várias unidades**;
- o login, usuários, unidades e vínculos operacionais usam o banco do Portal; as responsabilidades do eMulti são independentes do papel do Portal;
- pacientes, guias, acompanhamentos e notificações ficam no banco próprio da Regulação.

## Interface

- cabeçalho enxuto com imagotipo à esquerda e nome/equipe do usuário à direita;
- menu lateral azul-claro recolhido por padrão e expandido ao passar o mouse;
- menu do usuário com Alterar senha, Links úteis, Sobre e Sair;
- Links úteis reutilizam os mesmos links do Portal e os ícones são escolhidos pelo administrador;
- Administração inclui diagnóstico de configuração, equipes, emissão de guias, especialidades e ícones.

Veja `INSTALL.md` para instalação e migrações.

### Aparência
A versão 2.3 oferece temas Claro, Escuro, Alto contraste e Automático. A preferência fica vinculada à conta no `portal-saude-db` e é compartilhada com o Portal Saúde. Veja `AJUSTES_V2.3.md` e `migration_theme_v3.sql`.


## Versão 2.4

Consulte `AJUSTES_V2.4.md` para a substituição do imagotipo branco no cabeçalho.

## Revisão 2.5 — cadastro de pacientes resiliente

A v2.5 remove duas dependências indevidas que podiam bloquear o cadastro de pacientes: a existência da coluna `unidades.tipo` e a configuração completa das tabelas de escopo do usuário. O eMulti agora possui fallback compatível para reconhecer as unidades APS conhecidas e um diagnóstico/reparo não destrutivo do `DB_REGULACAO` em **Administração**.

## Versão 2.6 — acessos independentes do Portal

A v2.6 separa o papel do usuário no Portal das responsabilidades no eMulti. Um usuário `user` comum pode ser Cadastrante, Regulador e/ou Executor. A Administração do eMulti permite combinar essas responsabilidades e sincroniza apenas a permissão de abertura da ferramenta com o Portal.

Antes do deploy, execute `migration_regulacao_acessos_v2_6.sql` no `portal-saude-db`.

## Aparência v2.7

O seletor de aparência foi movido para um controle compacto no cabeçalho, à esquerda do usuário. O botão principal alterna Claro/Escuro e a seta mantém acesso a Automático e Alto contraste. Não há nova migração de banco para esta versão.

## Endereço por CEP — v2.8

O cadastro de cidadãos integra a **BrasilAPI** para busca de endereço por CEP. A consulta é intermediada pelo endpoint interno `/api/cep/:cep`, e uma indisponibilidade externa nunca bloqueia o preenchimento manual ou o salvamento do cadastro.

Para persistir CEP, logradouro, número, complemento, bairro, município e UF separadamente, use **Administração > Diagnóstico > Corrigir estrutura do banco da Regulação** após o deploy, ou execute uma única vez `migration_regulacao_endereco_v2_8.sql` no `regulacao-vagas-db`.

## Integração e-SUS PEC — v2.9
A v2.9 inclui `POST /api/integracoes/esus/paciente`, destinado à extensão **eSUS PEC → eMulti**. O endpoint exige um usuário autenticado no eMulti com responsabilidade Cadastrante e usa CPF como identificador do cidadão. Se o CPF já existir, o cadastro não é sobrescrito automaticamente.


## v2.9.1
A interface passa a exibir nomes formais das unidades e mantém o campo Motivo do encaminhamento em altura inicial compacta. Não requer SQL adicional.

## v2.10

- Corrige a tela de detalhe da guia que podia ficar vazia.
- Organiza o detalhe em três quadros: dados pessoais, dados do encaminhamento e andamento da guia.
- Exibe CNS/endereço quando disponíveis sem derrubar a página em bases ainda não reparadas.
- Mantém nomes formais das unidades na interface.
- Não requer nova migração SQL além das já previstas nas versões anteriores.

## v2.10
Veja AJUSTES_V2.10.md.

## v2.11
Fila operacional paginada, filtros avançados, navegação para a próxima guia após regulação e cabeçalho com `eMulti | Regulação`.

## v2.12 — Rodapé, suporte e documentos institucionais
O chrome compartilhado agora exibe o rodapé com a versão do sistema e links para Suporte, Política de Privacidade e Termos de Uso. A versão é controlada pela constante `APP_VERSION` em `js/app-chrome.js`.


## v2.14
Revisão dos Termos de Uso e da Política de Privacidade, sem DPO nominal, e remoção definitiva do código residual do rodapé.
