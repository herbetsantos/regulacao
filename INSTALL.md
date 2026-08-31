# Regulação de Vagas — projeto separado (Cloudflare Pages)

Projeto Cloudflare Pages **independente** do Portal Saúde Cajamar — deploy
próprio, mas lendo o **mesmo banco de login** (`portal-saude-db`) para
usuários/unidades/equipes, e um banco de conteúdo **exclusivo**
(`regulacao-vagas-db`) para pacientes/guias/acompanhamentos/notificações.

Login continua acontecendo só no Portal. Este projeto nunca pede
usuário/senha — ele recebe a sessão do Portal através de um código de
repasse de uso único (ver `functions/_middleware.js`). Veja também o
`INSTALL.md` do pacote `portal-patch/` (aplicado no repositório do Portal),
que é pré-requisito deste.

## Passo a passo

1. **Aplique primeiro o patch do portal** (`portal-patch/INSTALL.md`) —
   sem isso, não existe `/api/handoff` nem a migração com as equipes.

2. **Crie o banco de conteúdo:**
   ```
   wrangler d1 create regulacao-vagas-db
   ```
   Copie o `database_id` retornado e cole no `wrangler.toml` deste projeto
   (linha `SUBSTITUA-PELO-ID-RETORNADO-POR-WRANGLER-D1-CREATE`).

3. **Rode o schema:**
   ```
   wrangler d1 execute regulacao-vagas-db --remote --file=./schema_regulacao.sql
   ```

4. **Confirme o `database_id` do banco de login** no `wrangler.toml`
   (binding `DB`) — já vem preenchido com o id que vocês me passaram
   (`d20e8935-68c2-47cb-8a88-69162fb9feaa`), mas confira se é o mesmo do
   projeto do Portal.

5. **Ajuste `PORTAL_URL`** em dois arquivos:
   - `functions/_middleware.js` (constante `PORTAL_URL`)
   - `js/app-chrome.js` (constante `PORTAL_URL`)

   Hoje ambos apontam para `https://apoioapscajamar.pages.dev` — troque se
   o domínio do portal mudar.

6. **Crie o projeto no Cloudflare Pages** (nome do projeto:
   `emulti` — correspondente a `https://emulti.pages.dev`) e
   publique.

7. **Volte no patch do portal** e complete a allowlist (`login.html`,
   `trocar-senha-obrigatoria.html`) e a URL do menu (tabela `links`) com o
   domínio `*.pages.dev` que o Cloudflare atribuiu neste passo.

## Como o login funciona aqui (sem tela de login própria)

- Usuário clica em "Regulação de Vagas" no menu do Portal (ou é
  redirecionado pra cá depois de logar) → chega em `/?handoff=TOKEN`
- `functions/_middleware.js` consome o token (uso único, 60s de validade),
  cria uma sessão própria (mesma tabela `sessions` do banco compartilhado)
  e redireciona pra mesma URL sem o parâmetro, já autenticado
- Se o token for inválido/expirado, ou se o usuário chegar aqui sem sessão
  nenhuma (ex.: link direto, sem vir do portal), é mandado para
  `PORTAL_URL/login.html?next=<url completa daqui>` — depois do login, o
  Portal gera um novo handoff e traz o usuário de volta

## Configuração via interface (não precisa mais de SQL manual para isso)

A página **`/admin.html`** (menu "Administração", visível só para
`admin`/`super_admin`) permite:
- Criar equipes e vincular unidades (só APS) e profissionais a cada uma
- Cadastrar agentes operacionais (usuário × unidade × pode emitir/executar)
- Cadastrar novas especialidades

O que ainda depende de SQL direto: editar o nome de uma equipe existente,
desativar equipe/especialidade, e qualquer ajuste na tabela `unidades` em
si (classificação `aps`/`outra`) — isso continua no banco do portal.

## O que já funciona

- Cadastro/busca de paciente, criação de guia com aviso de duplicidade
- Fila de guias com filtros, incluindo a **fila de triagem** (guias ainda
  sem equipe/unidade, visíveis a qualquer profissional com acesso de
  execução — direto ou via equipe)
- Início de acompanhamento **individual ou em grupo**, podendo combinar
  guias de unidades diferentes dentro da mesma equipe, com
  `local_execucao` livre (escola, quadra, etc.)
- Transferência de guia entre equipes, com trava de permissão (só quem é
  da equipe atual pode transferir) e notificação para a equipe destino
- Notificações por usuário (`GET /api/notificacoes`,
  `POST /api/notificacoes/:id/marcar-lida`)

## O que ainda falta (backend pronto, front-end não)

- As páginas `paciente.html` e `guia-nova.html` cobrem o cadastro básico;
  não há, por exemplo, edição em massa ou histórico visual do paciente
  além da lista simples de guias.

## Revisão 2.1 — menu lateral, equipe única e Links úteis

Para esta revisão, rode também no banco **portal-saude-db**:

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_regulacao_v2_portal.sql
```

Essa migração faz duas coisas:

1. aplica a regra funcional de **um profissional = uma única equipe eMulti**;
2. cria a tabela `regulacao_link_icons`, usada somente para guardar o ícone que o administrador escolhe para cada link já cadastrado no Portal Saúde.

Os links não são duplicados no módulo eMulti: a tela **Links úteis** continua lendo a tabela `links` do Portal. Assim, alterações de título, URL, descrição ou ordem feitas no Portal aparecem automaticamente aqui.

### Se o cadastro de pacientes/guias não funcionar

Abra **Administração > Diagnóstico da configuração** no módulo eMulti. A tela verifica os pontos que normalmente bloqueiam o fluxo:

- `schema_regulacao.sql` não executado no banco `regulacao-vagas-db`;
- nenhuma unidade classificada com `tipo = 'aps'` no banco do Portal;
- equipes sem unidades ou profissionais vinculados;
- usuário comum sem vínculo em `regulacao_user_unidades` com `pode_emitir = 1`.

Administradores podem emitir por qualquer unidade; usuários comuns só podem criar guia pelas unidades explicitamente configuradas para emissão.
