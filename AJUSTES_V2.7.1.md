# Ajustes v2.7.1

## Correção de estabilidade da aparência

- Corrigido o comportamento que podia alterar a preferência para **Automático** sem ação do usuário.
- Uma falha ao consultar `users.theme` no D1 agora retorna erro temporário e **não é interpretada como `auto`**.
- Enquanto uma alteração de tema está sendo gravada, o cliente não aceita uma leitura remota antiga que possa desfazer a escolha.
- `/api/me` não força mais `light` quando a consulta de aparência falha; mantém a preferência local até a próxima sincronização válida.
- Não requer migração SQL.
