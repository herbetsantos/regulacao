# Reimplante organizado — Portal Saúde Cajamar 2.10.1

Esta versão reorganiza o repositório e incorpora a preparação do Portal para Produção e Apoio Clínico. As URLs públicas existentes foram preservadas.

## 1. Antes de substituir arquivos

1. Crie uma branch no GitHub, por exemplo `atualizacao-2.10.1`.
2. Faça backup do repositório atual.
3. **Não exclua nem recrie o banco D1 `portal-saude-db`.**
4. Não apague variáveis/secrets configurados diretamente no Cloudflare.
5. Guarde a versão atualmente publicada para rollback.

## 2. Atualizar o código

Substitua o conteúdo do repositório pelo conteúdo deste pacote na branch de atualização.

As páginas HTML continuam na raiz para preservar URLs existentes como `/portal.html`, `/admin.html`, `/relatorios.html`, `/suporte.html` etc.

A reorganização concentra:

- documentação em `docs/`;
- banco e migrations em `database/`;
- código de backend em `functions/`;
- scripts de frontend em `js/`;
- estilos em `css/`;
- imagens em `assets/`.

## 3. Banco existente: execute somente a migration desta atualização

Se o Portal já está em produção na linha 2.9.x, as migrations históricas já foram aplicadas. **Não execute novamente `database/update.sql` apenas por causa deste reimplante.**

Execute:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/migrations/010_producao_apoio_clinico.sql
```

Essa migration é específica para os acessos opt-in dos ambientes Produção e Apoio Clínico.

> `database/update.sql` permanece no repositório como atualização consolidada para bases mais antigas. Ele contém alterações históricas não idempotentes e só deve ser usado após conferir a versão de origem do banco.

## 4. Deploy do Portal

Se o Cloudflare Pages já está integrado ao GitHub, o deploy pode ser automático após push/merge para a branch configurada.

Via Wrangler:

```bash
wrangler pages deploy . --project-name=portal-saude-cajamar
```

## 5. Produção e Apoio Clínico

Depois que o Portal estiver validado:

1. publique o ambiente Produção em projeto/repositório próprio;
2. publique o ambiente Apoio Clínico em projeto/repositório próprio;
3. cadastre as respectivas URLs em **Administração → Ferramentas**;
4. associe as funcionalidades `producao` e `apoio_clinico`;
5. o Super Administrador libera o acesso individualmente;
6. os ambientes externos devem respeitar as unidades relacionadas ao usuário no Portal.

Consulte `INSTALAR_NOVOS_AMBIENTES.md` nesta mesma pasta.

## 6. Testes antes do merge em `main`

- login com Super Administrador;
- login com Administrador de Unidade;
- login com usuário comum;
- senha temporária e troca obrigatória;
- filtros e paginação de usuários;
- vínculos por unidade;
- eMulti/Regulação;
- comunicação interna;
- suporte e chamados;
- relatórios;
- Ouvidoria IA administrativa;
- acesso negado ao Produção quando não habilitado;
- acesso liberado ao Produção quando habilitado;
- acesso negado ao Apoio Clínico quando não habilitado;
- acesso liberado ao Apoio Clínico quando habilitado;
- handoff entre URLs sem solicitar uma segunda senha.

## 7. Depois da validação

Faça merge da branch para `main`. Mantenha `docs/` e `database/migrations/` versionados no GitHub para rastreabilidade.
