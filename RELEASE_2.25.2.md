# eMulti / Regulação 2.25.2

Revisão de desempenho da Administração.

## Principais mudanças
- consultas N+1 removidas das listas de usuários e profissionais;
- agregações únicas nas telas Equipes e Unidades;
- referências de filtros reaproveitadas entre paginação e pesquisa;
- cache curto entre abas administrativas;
- verificação estrutural do banco adiada para depois do primeiro conteúdo;
- sincronizações legadas retiradas do caminho crítico de leitura.

## Banco
Nenhuma migração adicional. O schema permanece **2.25.0**.
