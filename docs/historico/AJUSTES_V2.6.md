# Ajustes v2.6 — Integração com acessos próprios do eMulti

- `regulacao_vagas` deixou de herdar o teto do papel (`user`, `admin_unidade`, `admin`).
- A funcionalidade é individual: sem permissão explícita, fica desabilitada; com permissão explícita, qualquer usuário do Portal pode abrir o eMulti.
- As responsabilidades Cadastrante, Regulador, Executor e Administrador são definidas no eMulti e sincronizam automaticamente a permissão de abertura no Portal.
- `super_admin` mantém acesso total.

Execute `migration_regulacao_acessos_v2_6.sql` no `portal-saude-db`.
