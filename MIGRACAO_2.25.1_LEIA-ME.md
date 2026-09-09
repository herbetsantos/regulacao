# Atualização para eMulti / Regulação 2.25.1

## Se você já está na 2.25.0
Não execute outra migração SQL. Substitua/publice o código da 2.25.1. O schema continua em 2.25.0.

## Se você ainda está em 2.20.x
1. Faça backup do `regulacao-vagas-db`.
2. Execute uma única vez `database/025_consolidacao_2_25_0.sql`.
3. Publique o código da 2.25.1.
4. Teste acessos, Regulação, Administração, Agenda e etiquetas.

## Cache
A 2.25.1 adiciona versionamento dos assets (`?v=2.25.1`) e `_headers`. Se o navegador já tiver carregado a versão anterior, faça uma recarga forçada após o primeiro deploy.
