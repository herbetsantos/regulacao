# Ajustes v2.6 — Acessos próprios da Regulação e cadastro de cidadãos

## Novo modelo de acesso
O papel no Portal Saúde não define mais o que o usuário pode fazer no eMulti.
As responsabilidades são combináveis:

- **Cadastrante** — consulta/cadastra cidadãos e emite guias nas unidades autorizadas.
- **Regulador** — organiza a fila, faz triagem/transferências e cria atendimentos/grupos.
- **Executor** — registra sessões/evoluções dos atendimentos da própria equipe.
- **Administrador** — configura o eMulti e possui todas as capacidades operacionais.

`super_admin` continua com acesso total implícito como salvaguarda.

## Cadastro de cidadãos
A investigação confirmou que o schema `pacientes` e as unidades APS estavam corretos. O bloqueio observado ocorria antes do INSERT, na autorização genérica `regulacao_vagas` do usuário.
Na v2.6:

1. cadastro/edição exige explicitamente a responsabilidade **Cadastrante**;
2. consulta de cidadãos continua disponível aos demais perfis que tenham acesso ao eMulti;
3. as mensagens de erro informam se a falta é de acesso ao eMulti ou de responsabilidade de cadastro;
4. a Administração passa a configurar as responsabilidades separadamente do papel do Portal.

## Migração obrigatória
Execute `migration_regulacao_acessos_v2_6.sql` no **portal-saude-db** antes de publicar esta versão.
A migração é não destrutiva e preserva os vínculos existentes.
