# Avaliação da eMulti / Regulação 2.25.0

## O que validar antes da publicação

1. Login pelo Portal APS e, quando habilitado, por credencial própria.
2. Usuário sem acesso à Regulação recebe bloqueio.
3. Perfis combináveis funcionam de forma independente.
4. Somente Super Administrador concede ou revoga Administrador.
5. Gestor administra profissionais, vínculos, especialidades, equipes e escalas.
6. Organizador cria agenda individual/grupos e move pacientes sem registrar execução clínica.
7. Executor registra realizado, falta, conclusão ou abandono somente no seu escopo.
8. Etiquetas podem ser adicionadas/removidas e filtradas na fila.
9. Não existe formulário ativo de evolução/conduta; tentativas de POST nas rotas clínicas legadas recebem bloqueio.
10. Dados preexistentes permanecem após a migração 025.

## Banco

Para avaliação visual do código, não execute SQL. Para homologação de uma base 2.20.x, faça backup e aplique `database/025_consolidacao_2_25_0.sql` uma única vez antes do deploy do código 2.25.0.
