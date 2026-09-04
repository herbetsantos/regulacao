# Ajustes v2.7.1

## Correção de estabilidade da aparência

- Corrigido o comportamento que podia alterar a preferência para **Automático** sem ação do usuário.
- Falhas temporárias no D1 não são mais convertidas em `auto`.
- Proteção contra leitura remota antiga logo após a troca de tema.
- `/api/me` e login não substituem a preferência local quando não conseguem consultar `users.theme`.
- Não requer migração SQL.
