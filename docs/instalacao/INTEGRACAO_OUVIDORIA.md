# Integração Portal Saúde ↔ extensão OuvidorSUS

## 1. Aplicar a migração

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/migrations/legacy/migration_ouvidoria_v2_8.sql
```

A migração é aditiva e não toca nas tabelas atuais do Portal.

## 2. Criar a chave de leitura da extensão

No Cloudflare Dashboard, no projeto **Pages** do Portal, crie a variável/secret:

`OUVIDORIA_EXTENSION_TOKEN`

Use um valor aleatório longo. Não use a senha de usuário do Portal.

A chave concede somente leitura do endpoint de configuração da Ouvidoria; ela não concede acesso ao painel administrativo nem ao banco diretamente.

## 3. Endpoint consumido pela extensão

`GET /api/ouvidoria/extension-config`

Cabeçalho aceito:

`Authorization: Bearer <OUVIDORIA_EXTENSION_TOKEN>`

ou:

`X-Ouvidoria-Key: <OUVIDORIA_EXTENSION_TOKEN>`

O endpoint devolve somente profissionais ativos, regras ativas, fallback e limite de confiança.

## 4. Identificadores

O Portal usa `codigo` como chave interna estável do profissional, por exemplo `beatriz`.

O campo `nomeOuvidorSus` deve conter o nome exatamente como o profissional aparece no endpoint de usuários habilitados do OuvidorSUS. A extensão usa esse nome para localizar o usuário oficial e obter, apenas em memória, o identificador exigido pelo endpoint de atribuição. O CPF não precisa ser armazenado no Portal.

## 5. Próxima etapa da extensão

A extensão deve:
1. consultar o endpoint do Portal ao iniciar;
2. salvar a última configuração válida em `chrome.storage.local` como cache;
3. usar o cache se o Portal estiver temporariamente indisponível;
4. validar `nomeOuvidorSus` contra os usuários habilitados do OuvidorSUS;
5. classificar divisão/subtipo/confiança;
6. aplicar a regra de menor prioridade numérica compatível;
7. usar fallback quando a confiança ficar abaixo do limite;
8. manter manifestações somente em `chrome.storage.session`.
