# Atualização para eMulti / Regulação 2.25.2

A 2.25.2 é uma revisão de desempenho de código. **Não há nova migração SQL.**

- Se o banco já recebeu `025_consolidacao_2_25_0.sql`, publique apenas o código 2.25.2.
- Não execute novamente a migration 025.
- Após o deploy, faça uma recarga forçada uma vez para carregar os assets com `?v=2.25.2`.
