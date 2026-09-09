# Avaliação técnica — eMulti / Regulação 2.25.2

## Escopo
Otimização da área Administração sem alterar regras funcionais ou schema.

## Reduções estruturais de consultas
- Usuários/acessos: de aproximadamente `3 × número de usuários` consultas adicionais para consultas agrupadas por tabela.
- Profissionais: de consultas de vínculo e conta por profissional para lotes limitados à página atual.
- Equipes: de até 3 consultas por equipe para consultas agregadas.
- Unidades: de 2 consultas por unidade para duas agregações globais.

## Interface
- cache em memória de 45 segundos para abas já carregadas;
- referências de filtros reutilizadas em paginação e busca;
- respostas antigas de pesquisas rápidas são descartadas;
- diagnóstico estrutural não concorre mais com o carregamento inicial.

## Banco
Schema permanece 2.25.0; nenhuma migration adicional.
