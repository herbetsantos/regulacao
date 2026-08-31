# Ajustes v2.1 — eMulti

## O que mudou

- Cabeçalho limpo: imagotipo à esquerda; nome e equipe do usuário à direita.
- Clique no nome do usuário: Alterar senha, Links úteis, Sobre e Sair.
- Menu principal movido para uma barra lateral azul-clara, recolhida por padrão e expandida ao passar o mouse.
- Notificações movidas para o menu lateral.
- Regra de equipe corrigida: cada profissional pode estar em somente uma equipe; cada equipe pode ter vários profissionais e várias unidades.
- Links úteis reutilizam a tabela `links` do Portal Saúde e aparecem em grade.
- O administrador escolhe o ícone de cada link na própria Administração do eMulti.
- Administração ampliada: diagnóstico, equipes, vínculos de unidades/profissionais, emissão de guias, especialidades e ícones.
- Cadastro de paciente agora possui botão “+ Novo paciente” e mensagens de configuração mais claras.
- Nova guia agora possui botão “Buscar paciente”, atalho para cadastrar paciente e aviso explícito quando o usuário não possui unidade emissora.

## Por que pacientes/guias podiam não cadastrar

No código anterior havia três pontos que podiam dar a impressão de que o cadastro não funcionava:

1. O formulário de novo paciente só aparecia depois de uma busca sem resultado; não havia botão de novo cadastro.
2. Usuário comum só pode criar guia se possuir vínculo em `regulacao_user_unidades` com `pode_emitir = 1`. Sem isso, não existe unidade solicitante disponível.
3. O cadastro de paciente depende de existirem unidades com `tipo = 'aps'`. Se a migração `migration_regulacao_setup.sql` não tiver sido aplicada corretamente, a lista de unidades fica vazia ou a API falha.

A nova tela **Administração > Diagnóstico da configuração** mostra esses problemas diretamente.

## Migração obrigatória desta revisão

Rode no banco do Portal (`portal-saude-db`):

```bash
wrangler d1 execute portal-saude-db --remote --file=./migration_regulacao_v2_portal.sql
```

Essa migração cria o índice que garante uma equipe por profissional e a tabela que guarda os ícones dos links úteis.

Se o banco `regulacao-vagas-db` ainda não tiver as tabelas de pacientes/guias, rode também:

```bash
wrangler d1 execute regulacao-vagas-db --remote --file=./schema_regulacao.sql
```

> Atenção: `schema_regulacao.sql` contém `DROP TABLE IF EXISTS`. Ele é apropriado para inicialização. Não rode novamente em um banco que já contenha dados reais sem antes fazer backup/migração de dados.

## Portal Saúde

O pacote do Portal desta revisão corrige também a allowlist da página de troca obrigatória de senha para `emulti.pages.dev` e inclui `migration_regulacao_v2.sql`.
