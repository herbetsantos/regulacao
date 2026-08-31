# eMulti — Regulação de Vagas

Módulo integrado ao Portal Saúde Cajamar para cadastro de pacientes, emissão e triagem de guias, filas e acompanhamentos das equipes eMulti.

## Regras principais

- um profissional pertence a **uma única equipe**;
- uma equipe pode ter **vários profissionais**;
- uma equipe pode atender **várias unidades**;
- o login, usuários, unidades, equipes e permissões vêm do banco do Portal;
- pacientes, guias, acompanhamentos e notificações ficam no banco próprio da Regulação.

## Interface

- cabeçalho enxuto com imagotipo à esquerda e nome/equipe do usuário à direita;
- menu lateral azul-claro recolhido por padrão e expandido ao passar o mouse;
- menu do usuário com Alterar senha, Links úteis, Sobre e Sair;
- Links úteis reutilizam os mesmos links do Portal e os ícones são escolhidos pelo administrador;
- Administração inclui diagnóstico de configuração, equipes, emissão de guias, especialidades e ícones.

Veja `INSTALL.md` para instalação e migrações.

### Aparência
A versão 2.3 oferece temas Claro, Escuro, Alto contraste e Automático. A preferência fica vinculada à conta no `portal-saude-db` e é compartilhada com o Portal Saúde. Veja `AJUSTES_V2.3.md` e `migration_theme_v3.sql`.
