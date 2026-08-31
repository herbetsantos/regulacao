# Ajustes v2.5 — cadastro de pacientes e diagnóstico do banco

Esta revisão corrige os principais pontos que podiam impedir o cadastro de pacientes no eMulti.

## Correções

- `/api/unidades` não depende mais das tabelas de vínculo da Regulação para carregar a lista de unidades usada no cadastro de pacientes.
- Instalações antigas do Portal sem a coluna `unidades.tipo` continuam funcionando: o eMulti usa temporariamente a mesma lista oficial de unidades APS definida na migração original.
- O `POST /api/pacientes` e o `PUT /api/pacientes/:cpf` passaram a validar unidades de forma compatível com instalações antigas.
- Erros do banco da Regulação agora retornam códigos e mensagens específicas (`DB_REGULACAO_AUSENTE`, `TABELA_PACIENTES_AUSENTE`, etc.).
- A Administração mostra quais tabelas do banco da Regulação estão ausentes.
- Quando o binding `DB_REGULACAO` existe mas faltam tabelas, o administrador recebe o botão **Corrigir estrutura do banco da Regulação**.
- O reparo é não destrutivo: cria somente tabelas e índices ausentes e semeia apenas especialidades faltantes.
- `schema_regulacao.sql` deixou de conter `DROP TABLE`; pode ser executado novamente sem apagar pacientes/guias existentes.
- Incluído `migration_regulacao_safe_v2_5.sql` para reparo manual seguro.

## Importante

O reparo automático não consegue criar um binding D1 inexistente. Se o diagnóstico informar `DB_REGULACAO` não configurado, vincule o banco `regulacao-vagas-db` ao binding `DB_REGULACAO` no projeto Cloudflare Pages e faça novo deploy.
