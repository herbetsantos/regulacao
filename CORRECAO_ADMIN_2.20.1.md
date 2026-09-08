# Correção da Administração — eMulti / Regulação 2.20.1

## Falhas encontradas

### 1. Navegação dependia de IDs expostos como variáveis globais pelo navegador
O `admin.html` usava identificadores como `newExternal`, `accessQ`, `profUnit` e outros sem obtê-los explicitamente com `document.getElementById()`.

Esse comportamento não é uma base segura para o funcionamento da página. Uma exceção antes de `setupTabs()` podia deixar todo o submenu sem resposta.

**Correção:** todos os elementos passaram a ser obtidos explicitamente e os listeners são registrados de forma defensiva.

### 2. Um erro em uma API podia dar a impressão de que o submenu inteiro não funcionava
A troca de aba não possuía tratamento central de erro.

**Correção:** cada opção agora é ativada primeiro e seu carregador roda dentro de tratamento de erro. Se uma API falhar, a opção continua abrindo e mostra a causa dentro do próprio painel.

### 3. Código 2.20.x pode estar publicado antes das migrations 019/020
A Administração 2.19+ depende de novas tabelas no `regulacao-vagas-db`.
A 2.20 adiciona também `organizador` e estruturas para profissionais/grupos na agenda.

**Correção:** foi criado o endpoint somente leitura `/api/admin/estrutura` e um banner de diagnóstico na própria Administração.

### 4. Configurações dependiam cegamente de `window.APP_ICON_KEYS`
Agora existe fallback seguro para as opções de ícone.

### 5. Arquivo temporário
`functions/api/_shared.js.tmp` foi removido do pacote.

## Banco

Esta correção de código **não executa SQL automaticamente**.

Antes de qualquer migration, execute no Cloudflare D1:

`database/AUDITAR_ADMIN_2_20_0.sql`

A partir do resultado deve ser decidido, em sequência controlada, se é necessário aplicar:
1. `019_admin_profissionais_acesso_hibrido.sql`
2. `020_organizacao_agenda.sql`

Nunca execute a migration 020 duas vezes, pois ela contém `ALTER TABLE`.
