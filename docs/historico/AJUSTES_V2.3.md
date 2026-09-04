# Ajustes v2.3 — Aparência compartilhada Portal + eMulti

Foram adicionados quatro modos de aparência: **Claro**, **Escuro**, **Alto contraste** e **Automático**.

- O modo **Claro** é o padrão e preserva a aparência atual.
- A escolha fica vinculada ao usuário no banco `portal-saude-db`.
- Portal e eMulti usam a mesma preferência.
- O modo **Automático** acompanha o sistema operacional.
- Preferências de contraste do sistema são respeitadas quando o modo Automático estiver ativo.
- Documentos e áreas de impressão permanecem claros; o Receituário mantém a folha A4 branca.

## Migração

Execute uma única vez no banco compartilhado:

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_theme_v3.sql
```
