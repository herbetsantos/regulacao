# Avaliação técnica — eMulti / Regulação 2.25.1

## Objetivo
Revisão corretiva da linha 2.25.0 após homologação visual inicial. O schema de banco permanece 2.25.0; esta versão corrige interface, cache e completa fluxos administrativos sem exigir uma nova migração para quem já aplicou `025_consolidacao_2_25_0.sql`.

## Correções confirmadas
- **Novidades da Versão:** corrigido conflito global de `.panel-section` que ocultava o conteúdo.
- **Identificação da versão:** código e interface passam a exibir `2.25.1`, com cache-busting nos assets e regras `_headers` para evitar páginas antigas após deploy.
- **Fila de Regulação:** redistribuição das colunas, melhor aproveitamento horizontal e exibição de etiquetas junto da especialidade.
- **Administração:** painéis internos voltam a aparecer e ficam operacionais; a causa principal era a mesma regra CSS que ocultava as seções.
- **Agenda e Atendimentos:** painéis voltam a ser exibidos e a aba inicial é escolhida conforme a responsabilidade do usuário.
- **Etiquetas de guias:** criada gestão administrativa de etiquetas (criar, renomear, ordenar, ativar/desativar), aplicação na guia, visualização na fila e filtro.
- **Criar acesso:** profissional sem login passa a oferecer fluxo direto para criar credencial temporária, vincular a conta ao profissional e atribuir responsabilidades iniciais.

## Banco de dados
- Instalação nova: `database/schema.sql` permanece identificado como schema 2.25.0.
- Atualização 2.20.x: aplicar `database/025_consolidacao_2_25_0.sql` uma única vez.
- Atualização 2.25.0 -> 2.25.1: **nenhuma nova migração SQL**.

## Validações executadas
- sintaxe dos arquivos JavaScript;
- sintaxe dos scripts JavaScript embutidos nas páginas HTML;
- verificação de IDs duplicados no HTML;
- busca de referências visuais antigas `v2.20.2` em HTML/JS/CSS;
- criação de banco novo a partir do schema;
- migração de uma base 2.20.2 para o schema 2.25.0 preservando uma guia de teste;
- `PRAGMA quick_check` e `PRAGMA foreign_key_check`.

## Observação de homologação
A validação local cobre estrutura, sintaxe e banco. Após publicar no Cloudflare, recomenda-se homologar com contas reais de cada responsabilidade e fazer uma recarga forçada uma única vez em navegadores que já tenham acessado versões anteriores.
