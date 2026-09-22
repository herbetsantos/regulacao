# Instalação, migração e homologação — eMulti / Regulação 2.27.0

## 1. Arquitetura de autenticação

A Regulação possui duas formas de acesso:

- **credencial interna**, mantida exclusivamente no `regulacao-vagas-db`;
- **Apoio APS Cajamar**, como autenticação integrada por handoff.

O `portal-saude-db` não controla equipes, profissionais, permissões ou demais regras operacionais da Regulação.

## 2. Arquitetura de publicação

A partir da 2.27.0, o eMulti é publicado como **Cloudflare Worker + Static Assets**.

- `functions/` continua sendo a fonte das rotas de API e middleware;
- `wrangler pages functions build` compila essas rotas para `dist/worker/index.js`;
- `scripts/build-assets.mjs` copia somente HTML, `assets/`, `css/`, `js/` e arquivos públicos auxiliares para `dist/client`;
- `assets.run_worker_first = true` garante que o middleware de autenticação execute antes dos arquivos estáticos;
- `database/`, `docs/` e o código-fonte de `functions/` não são publicados como assets.

Os bindings permanecem:

```text
DB            → portal-saude-db
DB_REGULACAO  → regulacao-vagas-db
```

## 3. Instalação nova

1. instale as dependências com `npm install`;
2. confira os bindings `DB` e `DB_REGULACAO` no `wrangler.toml`;
3. aplique `database/schema.sql` em `regulacao-vagas-db`;
4. execute `npm run build`;
5. publique com `npm run deploy`;
6. entre com um usuário autorizado;
7. configure unidades, equipes, responsabilidades e profissionais na Administração.

O schema continua na versão `2.26.3`. A 2.27.0 não exige migration de banco.

## 4. Atualização de uma base já em 2.26.3

Não execute nova migration. Atualize o código e publique a 2.27.0:

```bash
npm install
npm run build
npm run deploy
```

## 5. Atualização de uma base 2.26.0/2.26.1/2.26.2

Aplique primeiro:

```bash
wrangler d1 execute regulacao-vagas-db --remote --file=./database/028_restaurar_acesso_interno.sql
```

Depois execute o build e a publicação da 2.27.0.

## 6. Atualização a partir da 2.25.3

Se a migration 026 já foi aplicada, execute em ordem:

```bash
wrangler d1 execute regulacao-vagas-db --remote --file=./database/027_desmembramento_portal.sql
wrangler d1 execute regulacao-vagas-db --remote --file=./database/028_restaurar_acesso_interno.sql
```

Não repita migrations já executadas.

## 7. Importação do catálogo antigo do Portal

A importação criada na 2.26 é uma ação de transição e deve ser executada uma única vez quando necessária. Ela copia unidades/equipes legadas preservando IDs e códigos. Depois disso, a operação cotidiana utiliza o `regulacao-vagas-db`.

Não apague tabelas do `portal-saude-db` durante a homologação.

## 8. Acesso interno

Na Administração é possível criar uma credencial interna para um usuário ou diretamente para um profissional sem login. A senha inicial é temporária e deve possuir pelo menos 10 caracteres. No primeiro acesso, o usuário é direcionado para **Minha conta** e precisa definir uma nova senha antes de usar as demais funções.

Usuários autenticados pelo Apoio APS Cajamar continuam gerenciando sua senha no Portal.

## 9. Homologação mínima

Após a publicação, confira:

1. login com credencial interna;
2. troca obrigatória de senha;
3. login integrado pelo Apoio APS Cajamar;
4. abertura de páginas protegidas sem exposição direta por asset;
5. responsabilidades, unidades e equipes do usuário;
6. criação de conta interna pela Administração;
7. profissional vinculado a múltiplas equipes;
8. criação e consulta de guia;
9. fila, etiquetas, agenda, grupos e atendimentos individuais;
10. **Administração → Correções** com bloqueio de exclusão quando houver dependências.

No D1:

```sql
SELECT version FROM emulti_schema_version WHERE id=1;
PRAGMA quick_check;
PRAGMA foreign_key_check;
```

A versão esperada do schema continua sendo `2.26.3`; `quick_check` deve retornar `ok`.

## 10. Validação do build

Antes do deploy, `npm run build` deve criar:

```text
dist/
├─ client/
│  ├─ *.html
│  ├─ assets/
│  ├─ css/
│  └─ js/
└─ worker/
   └─ index.js
```

A presença de `database/`, `docs/` ou `functions/` dentro de `dist/client` deve ser tratada como erro de build.


## 11. Ambiente de homologação 2.27.0

O ambiente `homologacao` usa um Worker separado (`emulti-homologacao`) e um D1 próprio para a Regulação:

```text
DB            → portal-saude-db
DB_REGULACAO  → regulacao-vagas-db-homolog
```

O banco de produção `regulacao-vagas-db` não é alterado pelos comandos abaixo.

### Inicializar o D1 de homologação

Execute uma única vez:

```bash
npm run db:init:homologacao
```

Depois valide:

```bash
npm run db:check:homologacao
```

A versão esperada é `2.26.3`, `PRAGMA quick_check` deve retornar `ok` e `PRAGMA foreign_key_check` não deve retornar violações.

### Publicar o Worker de homologação

```bash
npm run deploy:homologacao
```

O deploy usa `wrangler deploy --env homologacao` e não modifica o Worker de produção.

### Atenção

Não execute `npm run db:init:homologacao` contra o ambiente padrão. O comando já contém `--env homologacao` para reduzir o risco de inicialização acidental do D1 de produção.
