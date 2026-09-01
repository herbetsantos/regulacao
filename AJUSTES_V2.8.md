# Ajustes v2.8 — Endereço por CEP com BrasilAPI

## O que mudou

- O cadastro de cidadãos ganhou campos estruturados de endereço: CEP, logradouro, número, complemento, bairro, município e UF.
- Ao informar um CEP válido, o eMulti consulta a BrasilAPI pelo backend (`/api/cep/:cep`) e preenche automaticamente logradouro, bairro, município e UF.
- Número e complemento continuam sob responsabilidade do usuário.
- Endereços fora de Cajamar/SP geram apenas um aviso de conferência; o cadastro não é bloqueado.
- Se a BrasilAPI estiver indisponível ou o CEP não for encontrado, o endereço pode ser preenchido manualmente e o cadastro continua funcionando.
- O campo legado `endereco` continua sendo gravado em formato legível para manter compatibilidade.

## Banco de dados

A v2.8 adiciona, sem apagar dados, as colunas abaixo à tabela `pacientes` do `regulacao-vagas-db`:

- `cep`
- `logradouro`
- `numero`
- `complemento`
- `bairro`
- `municipio`
- `uf`

Há duas formas de aplicar:

1. Recomendado: **Administração > Diagnóstico > Corrigir estrutura do banco da Regulação**. O reparo verifica o schema e adiciona somente os campos ausentes.
2. Alternativa: executar uma única vez `migration_regulacao_endereco_v2_8.sql` no `regulacao-vagas-db`.

Mesmo sem a migração, o backend mantém compatibilidade e salva o endereço completo na coluna legada `endereco`, mas a estrutura por campos só fica persistida após a atualização do schema.

## BrasilAPI

A integração usa o endpoint público `GET /api/cep/v1/{cep}` da BrasilAPI. A chamada externa é feita pela Cloudflare Function do eMulti, não diretamente pelo navegador. Somente o CEP é enviado à BrasilAPI; CPF, nome e demais dados do cidadão não são enviados ao serviço. Há timeout e mensagens de fallback para preenchimento manual.
