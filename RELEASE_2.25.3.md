# eMulti / Regulação 2.25.3

## Múltiplas equipes por profissional

- profissional assistencial pode pertencer simultaneamente a uma ou mais equipes;
- usuário vinculado ao profissional recebe escopo operacional das equipes selecionadas;
- Administração → Profissionais e Administração → Acessos usam seleção múltipla de equipes;
- filtros de profissionais por equipe passam a consultar a relação N:N;
- Agenda, grupos e escalas reconhecem o profissional em todas as equipes vinculadas;
- o campo legado `regulacao_profissionais.equipe_id` é mantido apenas como equipe principal de compatibilidade;
- a fonte de verdade passa a ser `regulacao_profissional_equipes`;
- `regulacao_principal_equipes` passa a usar chave composta `(principal_id, equipe_id)`.

## Banco

Nova migration: `database/026_multiplas_equipes_profissional.sql`.

Ela preserva os vínculos atuais, guias, agendas, escalas e grupos.
