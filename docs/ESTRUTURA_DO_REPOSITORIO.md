# Estrutura do repositório — eMulti Regulação 2.18.2

Este pacote foi preparado para substituir uma raiz de repositório que havia acumulado arquivos de outros ambientes.

## Estrutura essencial

```text
assets/                 imagens usadas pelo eMulti
css/                    estilos
js/                     JavaScript do front-end
functions/              Cloudflare Pages Functions / APIs
database/               schema e atualização do regulacao-vagas-db
docs/                   documentação do projeto
*.html                  páginas funcionais do eMulti
_headers                 regras de cabeçalho do Pages
wrangler.toml            bindings e configuração Cloudflare
README.md                visão geral do projeto
.gitignore               arquivos locais que não devem ir ao Git
```

## Não misturar com o Portal Saúde

O Portal Saúde é outro projeto. Arquivos exclusivos dele, como páginas administrativas e utilitários que não constam neste pacote, não devem ser mantidos neste repositório apenas porque existiam em uma versão antiga ou misturada.

Ao limpar o repositório `regulacao`, a referência deve ser o conteúdo deste pacote, não uma junção com o repositório do Portal.

## Banco de dados

- `database/schema.sql`: instalação nova do `regulacao-vagas-db`.
- `database/update.sql`: atualização manual consolidada para o estado-base anterior à 2.18.2. Não deve ser executada novamente em um banco que já tenha a estrutura 2.18.2.

O `portal-saude-db` não deve ser recriado nem atualizado por estes SQLs.
