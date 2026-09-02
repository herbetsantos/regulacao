# Ajustes v2.15.2

- Identificador público da guia passa a ser exibido sem hífen: `AAAA000001`.
- O ano é baseado em `guias.created_at` (ano do cadastro).
- A pesquisa aceita o número completo (`2026000001`) ou apenas os 6 dígitos finais (`000001`).
- Compatibilidade de pesquisa mantida para códigos antigos com hífen.
- Incluída migração para padronizar códigos já existentes.
