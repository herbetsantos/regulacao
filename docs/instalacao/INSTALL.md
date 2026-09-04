# Instalação e atualização — eMulti Regulação 2.18.2

O projeto usa dois bancos D1 da Cloudflare:

- `portal-saude-db`: identidade, usuários, sessões, unidades, vínculos e permissões. É propriedade do Portal Saúde.
- `regulacao-vagas-db`: pacientes, guias, acompanhamentos, notificações, agenda e grupos do eMulti.

Os bindings estão definidos em `wrangler.toml`:

- `DB` → `portal-saude-db`
- `DB_REGULACAO` → `regulacao-vagas-db`

## Instalação nova do banco da Regulação

Em um `regulacao-vagas-db` vazio, aplique apenas:

```text
database/schema.sql
```

Pelo terminal, o equivalente é:

```bash
wrangler d1 execute regulacao-vagas-db --remote --file=./database/schema.sql
```

Se você utiliza o console D1 do painel da Cloudflare, pode copiar o conteúdo de `database/schema.sql` e executá-lo diretamente no banco correto.

## Banco já existente / versão 2.18.2

Antes de aplicar qualquer atualização, confira:

```sql
SELECT * FROM emulti_schema_version;
```

Se a versão já for `2.18.2` e tabelas como `especialidades`, `guias`, `agenda_escalas`, `agenda_grupos` e `agenda_individuais` existirem, **não execute novamente `database/update.sql`**.

O arquivo `database/update.sql` é uma atualização manual consolidada preparada para o estado-base anterior informado. Ele contém `ALTER TABLE` e foi feito para ser executado uma única vez sobre esse estado compatível.

## Atualização dos arquivos da aplicação

1. Faça backup/commit do estado atual do repositório.
2. Substitua a raiz pelo conteúdo deste pacote organizado.
3. Preserve os IDs reais dos dois D1 no `wrangler.toml`.
4. Publique no Cloudflare Pages.
5. Teste entrada pelo Portal, permissões, unidades, guias, agenda, grupos e Administração.
6. Em **Administração > Diagnóstico**, confira a aplicação e os dois bancos.

## Observação sobre o Portal Saúde

O eMulti não deve criar um segundo cadastro de usuários nem um segundo mecanismo independente de autenticação. O acesso continua vinculado ao Portal Saúde e aos limites de unidade definidos nele.

O histórico funcional está em `docs/NOVIDADES.md`.
