# Instalação e atualização — eMulti Regulação 2.17.5

O projeto usa **dois bancos D1**: `portal-saude-db` para usuários, unidades, equipes e permissões; e `regulacao-vagas-db` para pacientes, guias, agenda e atendimentos.

Para simplificar, cada banco possui apenas dois arquivos SQL, sempre nos mesmos caminhos:

```text
database/
├── portal/
│   ├── schema.sql
│   └── update.sql
└── regulacao/
    ├── schema.sql
    └── update.sql
```

## Instalação nova

Use `schema.sql` de cada banco:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/portal/schema.sql
wrangler d1 execute regulacao-vagas-db --remote --file=./database/regulacao/schema.sql
```

O `database/portal/schema.sql` é um complemento do Portal Saúde e pressupõe que o schema-base do Portal já exista.

## Atualização da versão imediatamente anterior

Use somente `update.sql` de cada banco:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/portal/update.sql
wrangler d1 execute regulacao-vagas-db --remote --file=./database/regulacao/update.sql
```

Depois publique o projeto no Cloudflare Pages.

## Controle de versão

Os dois bancos registram a versão do schema na tabela `emulti_schema_version`. Em **Administração > Diagnóstico da configuração**, o sistema exibe a versão da aplicação, do banco do Portal e do banco da Regulação.

A partir da 2.17.5, migrations individuais não são distribuídas no ZIP. O histórico funcional fica em **Novidades da Versão** e em `NOVIDADES.md`.
