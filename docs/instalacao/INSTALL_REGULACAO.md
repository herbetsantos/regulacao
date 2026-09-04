# Patch do Portal — repasse de sessão para o projeto separado

Este pacote **não adiciona telas novas ao portal**. Ele habilita o login do
Portal a "passar a sessão adiante" para o projeto separado
`regulacao-vagas-cajamar` (outro projeto Cloudflare Pages, outro domínio
`*.pages.dev`), sem duplicar senha e sem o usuário perceber uma segunda
tela de login.

## Por que não é só um cookie compartilhado

`apoioapscajamar.pages.dev` e `emulti.pages.dev` são dois
domínios `*.pages.dev` **diferentes** — não são subdomínio um do outro, e
`pages.dev` está na Public Suffix List, então o navegador nunca envia
cookie de um pro outro automaticamente. Por isso o mecanismo aqui é um
**código de repasse de uso único** (tabela `handoff_tokens`, válido por
60 segundos), não um cookie com `Domain=`.

Se um dia vocês configurarem um domínio próprio (ex.:
`portal.suaprefeitura.gov.br` e `regulacao.suaprefeitura.gov.br`), aí sim
compensa migrar para cookie compartilhado — mais simples. Deixei um comentário
no `wrangler.toml` sobre isso, mas não é o mecanismo ativo hoje.

## Arquivos deste pacote

| Arquivo | O que mudou |
|---|---|
| `functions/api/handoff.js` | **novo** — gera o código de repasse (autenticado, 60s de validade) |
| `functions/api/_permissions.js` | adiciona a feature `regulacao_vagas` |
| `login.html` | após login bem-sucedido, se o destino (`next=`) for uma URL externa na allowlist, gera o código via `/api/handoff` e anexa `?handoff=TOKEN` antes de redirecionar |
| `trocar-senha-obrigatoria.html` | mesmo mecanismo, para quem troca senha obrigatória antes de ir para o destino |
| `js/common.js` | o menu Ferramentas intercepta cliques em links de outro domínio e passa pelo mesmo fluxo de handoff antes de navegar |
| `migration_regulacao_setup.sql` | classificação de unidades (APS × outra), tabela `regulacao_user_unidades`, as 4 equipes multidisciplinares (`regulacao_equipes` + vínculos com unidades/profissionais), feature `regulacao_vagas`, item de menu, tabela `handoff_tokens` |
| `wrangler.toml` | comentário sobre `COOKIE_DOMAIN` opcional (não usado no cenário atual) |

`functions/api/_utils.js`, `login.js`, `logout.js` **não precisam mudar**
neste desenho (o cookie de sessão do portal continua host-only, sem
`Domain=` — o handoff não depende disso).

## Como aplicar

Recomendo `diff` antes de substituir cada arquivo, para não perder nenhuma
mudança que vocês tenham feito desde a última vez que me mostraram o
projeto:

```
diff functions/api/_permissions.js /caminho/do/seu/repo/functions/api/_permissions.js
diff login.html /caminho/do/seu/repo/login.html
diff trocar-senha-obrigatoria.html /caminho/do/seu/repo/trocar-senha-obrigatoria.html
diff js/common.js /caminho/do/seu/repo/js/common.js
```

`functions/api/handoff.js` é novo — copie direto.

Depois de conferir:

1. **Copie os arquivos** para o repositório do portal.

2. **Ajuste a allowlist** em `login.html` e `trocar-senha-obrigatoria.html`
   — a allowlist deve conter `'emulti.pages.dev'`, que é o domínio atual do módulo eMulti.

3. **Rode a migração** no banco existente:
   ```
   wrangler d1 execute portal-saude-db --remote --file=./database/migrations/legacy/migration_regulacao_setup.sql
   ```
   ⚠️ **Rode isso uma única vez.** A maior parte é segura pra rodar de novo
   (usa `IF NOT EXISTS`/`OR IGNORE`), mas a primeira linha (`ALTER TABLE
   unidades ADD COLUMN tipo...`) não é — testei: uma segunda execução
   acidental falha imediatamente nessa linha, sem duplicar equipe nem item
   de menu, mas ainda assim confirme que a primeira rodou com sucesso
   antes de tentar de novo.

   Isso cria, entre outras coisas, as 4 equipes (Estratégia 1, Complementar
   1/2/3) — mas **sem vínculo nenhum com unidades ou profissionais ainda**.
   Isso precisa ser preenchido manualmente:
   ```sql
   -- unidades atendidas pela equipe (troque os codes pelos reais)
   INSERT INTO regulacao_equipe_unidades (equipe_id, unidade_code)
   VALUES (1, 'jordanesia'), (1, 'polvilho');

   -- profissionais da equipe
   INSERT INTO regulacao_equipe_profissionais (equipe_id, user_id)
   VALUES (1, 42);

   -- agente operacional: pode emitir guia pela unidade X
   INSERT INTO regulacao_user_unidades (user_id, unidade_code, pode_emitir, pode_executar)
   VALUES (7, 'cer2', 1, 0);
   ```

4. **Ajuste a URL do item de menu** (tabela `links`, categoria
   `ferramenta`) para o domínio real do projeto separado, depois que ele
   existir:
   ```sql
   UPDATE links SET url = 'https://emulti.pages.dev/'
   WHERE title = 'Regulação de Vagas';
   ```

5. **Redeploy do portal.**

Depois disso, siga o `INSTALL.md` do pacote `regulacao-vagas-cajamar/` para
subir o projeto separado.

## Aparência compartilhada — v2.3

Para habilitar a preferência de aparência compartilhada com o eMulti, execute uma única vez:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/migrations/legacy/migration_theme_v3.sql
```

Opções gravadas em `users.theme`: `light`, `dark`, `contrast` e `auto`. O padrão é `light` para preservar o modo visual atual.

## Atualização v2.6 — responsabilidades eMulti independentes do papel do Portal

Execute no `portal-saude-db`:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/migrations/legacy/migration_regulacao_acessos_v2_6.sql
```

Depois publique o Portal v2.6 e o eMulti v2.6. A feature `regulacao_vagas` no Portal passa a ser individual e serve apenas para exibir/abrir a ferramenta; Cadastrante, Regulador, Executor e Administrador são definidos no eMulti.
