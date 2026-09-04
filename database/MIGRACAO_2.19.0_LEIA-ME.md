# Migração 2.19.0 — não aplicar durante a avaliação visual

A versão 2.19.0 usa uma migração **aditiva** no banco `regulacao-vagas-db`:

`019_admin_profissionais_acesso_hibrido.sql`

Ela não remove nem renomeia as tabelas atuais. As estruturas antigas continuam disponíveis como fallback.

Quando a versão for aprovada, o procedimento seguro será:

1. criar `/bookmark` no `regulacao-vagas-db`;
2. conferir a versão atual;
3. executar somente `019_admin_profissionais_acesso_hibrido.sql`;
4. executar `VALIDAR_2_19_0.sql`;
5. confirmar `quick_check = ok` e `foreign_key_check` sem linhas;
6. somente depois publicar o código 2.19.0.

**Não execute `update.sql` para instalar esta evolução.**
