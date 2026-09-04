# Banco de dados — Portal Saúde Cajamar

## Arquivos canônicos

- `schema.sql` — criação de um banco D1 **novo**, já no estado atual.
- `update.sql` — atualização consolidada para bases antigas. **Não é um script para ser executado repetidamente**; contém alterações históricas como `ALTER TABLE` que podem falhar se já tiverem sido aplicadas.

## Atualização do Portal atual

Para um Portal já operando na linha 2.9.x, a atualização específica dos novos ambientes é:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/migrations/010_producao_apoio_clinico.sql
```

## Migrations

- `migrations/010_producao_apoio_clinico.sql` — habilita as permissões opt-in de Produção e Apoio Clínico e atualiza o metadado do Portal para 2.10.1.
- `migrations/legacy/` — migrations históricas preservadas com os nomes originais. Não execute todas em sequência em um banco atual; várias já estão aplicadas e/ou consolidadas.

## Arquivo

- `archive/schema-legacy-root-pre-consolidacao.sql` — cópia do antigo `schema.sql` que ficava na raiz do repositório. Mantida somente para rastreabilidade. **Não usar em novas instalações.**

## Regra daqui para frente

Novas alterações de banco devem ser criadas em `database/migrations/`, documentadas em `docs/NOVIDADES.md` e incorporadas ao `database/schema.sql` para instalações novas.
