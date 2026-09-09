# Patch 2.25.3 — múltiplas equipes

Este patch deve ser aplicado sobre a **2.25.2**.

1. Faça backup do `regulacao-vagas-db`.
2. Copie os arquivos do patch para o repositório, preservando a estrutura de pastas.
3. Execute uma vez:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/026_multiplas_equipes_profissional.sql
```

4. Faça commit/push e aguarde o deploy do Cloudflare Pages.
5. Em Administração → Profissionais, edite a profissional e marque as duas equipes.
6. Confira a Agenda de cada equipe.

Não execute novamente `025_consolidacao_2_25_0.sql` se a base já está na 2.25.x.
