# eMulti v2.10

- Código público da guia no formato `AAAA-000001`, mantendo `id` apenas interno.
- Profissionais eMulti passam a ter cargo/profissão e especialidades vinculadas dentro da equipe.
- Histórico de atribuições de cada guia a um profissional responsável.
- Para colocar a guia em **Em atendimento**, equipe, unidade executante e profissional especialista precisam estar definidos.
- **Iniciar atendimento** só aparece quando a guia está em `Em atendimento`. Data e horário de início são obrigatórios.
- Sessões registram explicitamente o profissional executor.
- Administração permite cadastrar/editar cargo e especialidades de cada profissional da equipe.

## Banco
A tela Administração > Diagnóstico > Corrigir estrutura do banco da Regulação atualiza o `regulacao-vagas-db` de forma não destrutiva.
A estrutura profissional no `portal-saude-db` é verificada e criada automaticamente ao abrir/usar a gestão de equipes. Também foram incluídas migrações SQL para aplicação manual.
