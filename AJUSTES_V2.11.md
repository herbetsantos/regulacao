# eMulti v2.11 — Fila operacional e cabeçalho

- Cabeçalho: lado esquerdo reduzido a logotipo + `eMulti | Regulação`.
- Fila de encaminhamentos redesenhada para grande volume.
- Colunas essenciais: código da guia, paciente/CPF, especialidade, solicitação (data + profissional requisitante), situação e ação.
- Busca rápida por código da guia, CPF ou nome do paciente.
- Filtros avançados recolhíveis: situação, especialidade, unidade solicitante, equipe, profissional requisitante, intervalo de datas e ordenação.
- Paginação server-side com 10, 20, 50 ou 100 itens por página e contagem total.
- API `/api/guias` agora aceita paginação e filtros adicionais sem carregar centenas de registros no navegador.
- Após uma ação de regulação, a tela oferece `Próxima na fila` (guia mais antiga aguardando autorização) ou `Voltar para pesquisa` preservando os filtros/página anteriores.
- Nenhuma migração SQL nova é necessária para esta versão.
