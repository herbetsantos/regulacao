# Ajustes v2.15.6

- Tabela da fila reorganizada com cabeçalho destacado, alinhamento à esquerda e divisórias entre colunas e linhas.
- Botão **Exportar CSV** exporta todos os resultados dos filtros atuais, percorrendo a paginação automaticamente.
- Botão **Importar CSV** disponível para Cadastrante/Administrador.
- O CSV exportado contém as colunas necessárias para servir como modelo de importação.
- A importação cria novas guias por meio da API existente e respeita permissões, pacientes cadastrados, unidades autorizadas, especialidades válidas e prevenção de duplicidade ativa.
- Nenhuma migração de banco de dados é necessária.
