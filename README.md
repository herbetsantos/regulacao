# eMulti Regulação — Cajamar Saúde

Versão atual: **2.17.5**.

Sistema integrado ao Portal Saúde para cadastro e regulação de guias, equipes eMulti, agenda de especialistas, atendimentos individuais e grupos.

## Bancos D1

- `DB` → `portal-saude-db`: identidade, usuários, unidades, equipes, vínculos e permissões.
- `DB_REGULACAO` → `regulacao-vagas-db`: pacientes, guias, fila, agenda, grupos e atendimentos.

## Atualizações de banco simplificadas

Os antigos arquivos `migration_*.sql` foram retirados do pacote. Agora cada banco possui somente:

- `database/<banco>/schema.sql` para instalação nova;
- `database/<banco>/update.sql` para atualizar a versão imediatamente anterior.

As versões dos schemas ficam registradas em `emulti_schema_version` e podem ser conferidas em **Administração > Diagnóstico da configuração**.

## Novidades

O histórico de alterações fica centralizado na página **Novidades da Versão**, acessível pelo menu superior, e no arquivo único `NOVIDADES.md`.

Consulte `INSTALL.md` para os comandos de instalação e atualização.
