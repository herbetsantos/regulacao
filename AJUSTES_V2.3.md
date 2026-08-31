# Ajustes v2.3 — Aparência e acessibilidade

## Temas disponíveis

- **Claro**: mantém exatamente a proposta visual atual e é o padrão para usuários existentes/novos após a migração.
- **Escuro**: tema institucional escuro para uso prolongado em ambientes com pouca luz.
- **Alto contraste**: aumenta contraste, bordas e destaque de foco para acessibilidade.
- **Automático**: acompanha a preferência claro/escuro do sistema operacional e, quando o navegador informa preferência por maior contraste, usa o tema de alto contraste.

## Preferência compartilhada

A preferência é gravada na tabela `users` do banco compartilhado `portal-saude-db`. Assim, alterar a aparência no Portal Saúde ou no eMulti altera a preferência da mesma conta nos dois ambientes.

O `localStorage` é usado apenas como cache local para evitar mudança brusca de tema durante o carregamento. O banco continua sendo a fonte de verdade após a autenticação.

## Migração obrigatória

Execute uma única vez:

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_theme_v3.sql
```

A migração adiciona:

```text
users.theme = light | dark | contrast | auto
```

O valor padrão é `light`, preservando a aparência que o sistema já utilizava.

## Impressão

Áreas documentais e de impressão permanecem em tema claro. O Receituário continua com a folha A4 branca mesmo quando a interface estiver em modo Escuro ou Alto contraste.
