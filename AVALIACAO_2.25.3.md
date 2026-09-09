# Avaliação técnica — 2.25.3

## Objetivo
Permitir vínculo simultâneo de um profissional com múltiplas equipes eMulti sem duplicar o cadastro profissional.

## Decisão de modelagem
Foi adotada relação N:N em `regulacao_profissional_equipes`. O campo `regulacao_profissionais.equipe_id` foi preservado como compatibilidade/primeira equipe. Para identidades de acesso, `regulacao_principal_equipes` passou de chave única por principal para chave composta `(principal_id,equipe_id)`.

## Efeito funcional
- a mesma profissional aparece na seleção de profissionais das duas equipes;
- pode ter escalas distintas por equipe/unidade;
- grupos e atendimentos continuam pertencendo a apenas uma equipe por registro;
- a autorização do usuário considera a união das unidades cobertas por todas as suas equipes.
