# Migração controlada para eMulti / Regulação 2.25.0

Esta migração é destinada a uma instalação existente na linha **2.20.x**.

1. Faça backup do `regulacao-vagas-db`.
2. Confirme que o código/banco atual pertence à linha 2.20.x.
3. Execute **uma única vez**:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/025_consolidacao_2_25_0.sql
```

4. Opcionalmente valide a estrutura:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/VALIDAR_2_25_0.sql
```

5. Publique o código 2.25.0.
6. Entre como Super Administrador e valide Administração, perfis, profissionais, escalas, filtros, etiquetas e Agenda.

A migração é aditiva e não apaga pacientes, guias, agendas, grupos nem estruturas clínicas legadas. Ela adiciona o perfil Gestor, etiquetas e registros administrativos de execução.

**Não reexecute a migração 025** depois que a coluna `gestor` tiver sido criada, pois o SQLite/D1 não aceita adicionar a mesma coluna duas vezes.

Em instalações novas, use `database/schema.sql`; nesse caso, não execute a migração 025.
