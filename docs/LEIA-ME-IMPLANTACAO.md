# Portal Saúde Cajamar 2.10.1 — referência de implantação

Este pacote contém o projeto completo do **Portal Saúde Cajamar 2.10.1**, incluindo arquivos operacionais, Cloudflare Pages Functions, banco D1 e documentação do projeto.

## Para reimplante sobre o Portal existente

- Preserve o banco D1 `portal-saude-db` existente.
- Não recrie usuários, sessões ou unidades.
- Não execute `database/update.sql` novamente em uma base já atualizada.
- Para a passagem para 2.10.1, a migration específica é `database/migrations/010_producao_apoio_clinico.sql`.
- Se essa migration já foi aplicada e `app_db_meta` mostra `portal_saude | 2.10.1`, não a execute novamente.

Consulte `docs/instalacao/REIMPLANTE_V2.10.1.md` para a sequência detalhada.
