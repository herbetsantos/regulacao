# Documentação — eMulti Regulação 2.18.2

Este diretório concentra a documentação técnica do projeto para manter a raiz do repositório limpa.

## Conteúdo

- `instalacao/INSTALL.md` — instalação, atualização e bancos D1.
- `NOVIDADES.md` — histórico funcional consolidado da aplicação.
- `ESTRUTURA_DO_REPOSITORIO.md` — organização e arquivos que pertencem a este repositório.

## Regra de arquitetura

O eMulti/Regulação é um ambiente independente do Portal Saúde, com repositório e URL próprios.

- `portal-saude-db` permanece como fonte central de identidade, usuários, sessões, unidades, vínculos e permissões.
- `regulacao-vagas-db` armazena os dados próprios do eMulti/Regulação.
- Arquivos funcionais do Portal Saúde que não fazem parte do eMulti não devem ser copiados para este repositório.
