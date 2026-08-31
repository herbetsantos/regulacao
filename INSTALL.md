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

A página **`/admin.html`** (menu "Administração", visível para quem possui a responsabilidade **Administrador da Regulação**) permite:
- Criar equipes e vincular unidades (só APS) e profissionais a cada uma
- Definir responsabilidades Cadastrante, Regulador, Executor e Administrador
- Vincular unidades autorizadas para emissão aos Cadastrantes
- Cadastrar novas especialidades

O que ainda depende de SQL direto: editar o nome de uma equipe existente,
desativar equipe/especialidade, e qualquer ajuste na tabela `unidades` em
si (classificação `aps`/`outra`) — isso continua no banco do portal.

## O que já funciona

- Cadastro/busca de paciente, criação de guia com aviso de duplicidade
- Fila de guias com filtros, incluindo a **fila de triagem** (guias ainda
  sem equipe/unidade, visíveis aos **Reguladores**; Executores veem as guias já direcionadas ao seu escopo)
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

Administradores da Regulação podem emitir por qualquer unidade; Cadastrantes só podem criar guia pelas unidades explicitamente configuradas para emissão.

## Aparência (v2.3)

Antes de usar a sincronização de **Claro / Escuro / Alto contraste / Automático**, execute uma única vez no banco compartilhado do Portal:

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_theme_v3.sql
```

A coluna `users.theme` tem `light` como padrão, portanto a atualização não muda automaticamente a aparência atual dos usuários. A mesma preferência é lida e gravada pelo Portal e pelo eMulti.

## Correção do cadastro de pacientes — v2.5

A partir da v2.5, o cadastro de pacientes não fica mais bloqueado apenas porque a instalação antiga do Portal ainda não possui `unidades.tipo` ou porque as tabelas de vínculos de equipes/agentes ainda não foram criadas.

Após publicar, entre como administrador em **Administração > Diagnóstico da configuração**:

- se aparecer **Banco da Regulação: OK**, teste o cadastro normalmente;
- se o banco estiver vinculado mas faltarem tabelas, use **Corrigir estrutura do banco da Regulação**. O procedimento não contém `DROP` e não apaga dados existentes;
- se aparecer **binding DB_REGULACAO não configurado**, vincule `regulacao-vagas-db` ao binding `DB_REGULACAO` no Cloudflare Pages. Esse é o único caso que não pode ser corrigido pela própria interface.

Também é possível aplicar manualmente, de forma segura:

```bash
wrangler d1 execute regulacao-vagas-db --remote --file=./migration_regulacao_safe_v2_5.sql
```

**Não use uma versão antiga do `schema_regulacao.sql` que contenha `DROP TABLE`.** O arquivo incluído neste pacote já foi alterado para ser não destrutivo.

## Acessos próprios do eMulti — v2.6

Antes de publicar a v2.6, execute no banco compartilhado **portal-saude-db**:

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_regulacao_acessos_v2_6.sql
```

A migração é não destrutiva. Ela cria `regulacao_user_acessos` e converte vínculos antigos de forma conservadora:

- `pode_emitir=1` → Cadastrante;
- profissional já vinculado a equipe → Executor;
- `pode_executar=1` legado → Regulador + Executor;
- administradores do Portal existentes → Administrador eMulti (somente como compatibilidade inicial);
- `super_admin` → acesso total implícito, sem depender da tabela.

Depois da migração, use **Administração > Acessos e responsabilidades** no eMulti para revisar cada usuário. O `role` do Portal deixa de determinar o acesso operacional ao eMulti.

### Cadastro de cidadãos

Para cadastrar ou editar um cidadão, o usuário precisa da responsabilidade **Cadastrante**. Para emitir uma guia, além de ser Cadastrante, precisa possuir ao menos uma unidade autorizada em **Unidades autorizadas para emissão**. Reguladores e Executores continuam podendo consultar cidadãos, mas não alterá-los, salvo se acumularem também a responsabilidade Cadastrante.
