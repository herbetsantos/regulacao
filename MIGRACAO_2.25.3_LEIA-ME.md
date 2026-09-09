# Migração para eMulti / Regulação 2.25.3

Esta versão altera o modelo de equipes para permitir múltiplos vínculos simultâneos por profissional/usuário.

## Se você já está na 2.25.0, 2.25.1 ou 2.25.2

1. Faça backup do `regulacao-vagas-db`.
2. Execute **uma vez**:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/026_multiplas_equipes_profissional.sql
```

3. Publique o código 2.25.3.
4. Abra Administração → Profissionais, edite a profissional desejada e marque as duas equipes.
5. Valide a Agenda nas duas equipes.

A migration 026 pode ser reexecutada tecnicamente sem duplicar vínculos, mas a rotina operacional recomendada é aplicá-la uma única vez e registrar a execução.

## Se a base ainda está na linha 2.20.x

Aplique primeiro `025_consolidacao_2_25_0.sql` e depois `026_multiplas_equipes_profissional.sql`.
