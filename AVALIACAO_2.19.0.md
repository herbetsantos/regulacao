# eMulti / Regulação 2.19.0 — build de avaliação

Esta versão reorganiza a Administração e introduz um modelo novo sem apagar as estruturas legadas.

## O que mudou

- Administração com submenu: Visão geral, Usuários e acessos, Profissionais, Especialidades, Equipes, Unidades e Configurações.
- Autenticação híbrida: Portal APS ou credencial própria da Regulação.
- Usuário do sistema separado de profissional assistencial.
- Profissional pode existir sem login.
- Vínculo assistencial passa a ser: profissional + unidade + especialidade + carga horária semanal.
- A carga horária exibida em Especialidades é calculada pela soma dos vínculos ativos.
- Profissionais pré-carregados da escala antiga são importados de forma compatível; quando há horários, a carga semanal é calculada pelos intervalos.
- Acesso e responsabilidades passam a poder ser armazenados no regulacao-vagas-db com principal `portal:<id>` ou `local:<uuid>`.

## Segurança

Credenciais próprias usam PBKDF2-SHA256, salt individual e 210.000 iterações. O primeiro acesso exige troca da senha temporária.

## Banco

A migração é aditiva e está em `database/019_admin_profissionais_acesso_hibrido.sql`. Não execute no ambiente atual apenas para avaliar o código.

## Compatibilidade

As estruturas antigas do Portal não são removidas. Quando ainda não existe autorização no novo modelo, usuários do Portal mantêm fallback para os vínculos/permissões legados.
