# Atualização 2.19.1 — sem SQL

Esta atualização é apenas de desempenho.

## Substituir/adicionar no GitHub

```text
index.html
js/app-chrome.js
functions/_middleware.js
functions/api/guias/index.js
functions/api/regulacao-bootstrap.js
NOVIDADES.md
README.md
```

## Cloudflare D1

Não executar migration.
Não alterar tabelas.
Não alterar `emulti_schema_version`.

O banco permanece no schema `2.19.0`.

Após o commit, aguarde o novo deployment automático do Cloudflare Pages.
