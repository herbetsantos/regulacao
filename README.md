# eMulti Regulação — Cajamar Saúde

Versão atual: **2.18.2**.

Atualizações estruturais do banco são aplicadas administrativamente no Cloudflare D1. O diagnóstico do sistema apenas confere a configuração; ele não altera automaticamente o schema.

Sistema integrado ao Portal Saúde para cadastro e regulação de guias, equipes eMulti, agenda de especialistas, atendimentos individuais e grupos.

## Bancos D1

- `DB` → `portal-saude-db`: identidade, usuários, unidades, equipes, vínculos e permissões.
- `DB_REGULACAO` → `regulacao-vagas-db`: pacientes, guias, fila, agenda, grupos e atendimentos.

## Atualizações de banco simplificadas

Os antigos arquivos `migration_*.sql` foram retirados do pacote. Este repositório mantém somente o banco próprio da Regulação:

- `database/schema.sql` para instalação nova;
- `database/update.sql` para atualização do `regulacao-vagas-db`.

O `portal-saude-db` pertence ao repositório do Portal Saúde.

As versões dos schemas ficam registradas em `emulti_schema_version` e podem ser conferidas em **Administração > Diagnóstico da configuração**.

## Novidades

O histórico de alterações fica centralizado na página **Novidades da Versão**, acessível pelo menu superior, e no arquivo único `docs/NOVIDADES.md`.

Consulte `docs/instalacao/INSTALL.md` para os comandos de instalação e atualização.


## 2.18.2

As listas de **Acessos e responsabilidades** e **Profissionais eMulti pré-carregados** agora usam paginação no backend. Há busca, filtros combináveis por unidade e função/especialidade e seleção de 10, 20, 50 ou 100 registros por página.

## 2.18.1

O Portal Saúde é o proprietário do schema compartilhado de usuários, chat, suporte e chamados. O chat usa o `portal-saude-db` compartilhado e não existe estrutura duplicada no `regulacao-vagas-db`.
