# Instalação e atualização — eMulti Regulação 2.17.6

O projeto usa dois bancos D1 da Cloudflare:

- `portal-saude-db`: usuários, unidades, equipes, vínculos e permissões.
- `regulacao-vagas-db`: pacientes, guias, fila, agenda, grupos e atendimentos.

## Atualização normal

A partir da v2.17.6, o fluxo recomendado ficou mais simples:

1. Publique a nova versão no Cloudflare Pages.
2. Entre no eMulti como Administrador.
3. Abra **Administração > Diagnóstico**.
4. Clique em **Atualizar bancos D1** quando o botão estiver disponível.

O sistema verifica a estrutura real dos dois D1 e cria somente o que estiver faltando. O processo não apaga pacientes, guias, usuários ou vínculos existentes.

## Arquivos SQL

Os SQL continuam no pacote apenas para instalação e contingência:

```text
database/
├── portal/
│   ├── schema.sql
│   └── update.sql
└── regulacao/
    ├── schema.sql
    └── update.sql
```

`schema.sql` representa a estrutura vigente. O schema do Portal é complementar ao Portal Saúde já existente.

Os `update.sql` foram reconstruídos com base na estrutura real dos bancos informada em 02/09/2026. O `portal/update.sql` é reexecutável. O `regulacao/update.sql` é uma alternativa manual para o estado-base informado e deve ser usado uma única vez; para uso normal, prefira o botão administrativo, que verifica as colunas antes de alterá-las.

## Controle de versão

Após a atualização, **Administração > Diagnóstico** mostra a versão da aplicação, do Portal DB e do Regulação DB. Os bancos registram a versão em `emulti_schema_version`.

Não são mais distribuídas migrations individuais. O histórico funcional fica em **Novidades da Versão** e em `NOVIDADES.md`.
