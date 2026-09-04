# O que foi reorganizado na v2.10.1

## Movidos para `docs/instalacao/`
- `INSTALAR_NOVOS_AMBIENTES.md`
- `INSTALL_REGULACAO.md`
- `INTEGRACAO_OUVIDORIA.md`

## Movido para `docs/`
- `NOVIDADES.md`

## Preservados em `docs/historico/`
- arquivos `AJUSTES_V*.md` que estavam na raiz do repositório anterior.

## Preservados em `database/migrations/legacy/`
- migrations históricas que estavam na raiz do repositório anterior.

## Migration atual
- `database/update_modules_v2_10.sql` passou a se chamar `database/migrations/010_producao_apoio_clinico.sql`.

## Mantidos na raiz por compatibilidade
- todas as páginas `.html` acessadas por URL;
- `_headers`;
- `wrangler.toml`;
- `README.md`;
- diretórios de runtime (`assets`, `css`, `js`, `functions`, `receituario`).

## Banco
O antigo `schema.sql` da raiz foi preservado apenas em `database/archive/`. Para qualquer instalação nova, use somente `database/schema.sql`.
