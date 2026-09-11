# Changelog consolidado — eMulti / Regulação

Este documento substitui os antigos arquivos separados de `RELEASE`, `AVALIACAO`, `NOVIDADES`, `PATCH` e relatórios intermediários.

## 2.26.3 — Acesso híbrido restaurado

- Restaurado o acesso interno próprio da Regulação por usuário e senha.
- Mantido o acesso integrado pelo Apoio APS Cajamar como opção adicional, sem reintroduzir dependência operacional do Portal.
- Tela de login redesenhada com a linguagem visual institucional compartilhada com o Portal APS e imagotipo oficial preservado.
- Credenciais internas passam a usar as sessões unificadas da Regulação (`emulti_session`).
- Criação e administração de contas internas restauradas na Administração.
- Profissionais sem login podem receber uma credencial interna e vínculo automático.
- Troca obrigatória de senha no primeiro acesso e após redefinição administrativa.
- Nova migration `028_restaurar_acesso_interno.sql`; schema passa a 2.26.3.
- Corrigido o uso de `principal_id` em registros administrativos para aceitar corretamente usuários internos e integrados.
- A 2.26.1 havia interpretado incorretamente o desmembramento como remoção do login interno; a 2.26.3 corrige essa decisão sem desfazer a separação de bancos.

## 2.26.2 — Correção do build das Pages Functions

- Corrigido o export ausente `friendlyRegulacaoError` em `functions/api/_db.js`.
- Corrigido o build das rotas `api/pacientes/index.js`, `api/pacientes/[cpf].js` e `api/integracoes/esus/paciente.js`.
- Mantida a correção de build; a política temporária de login exclusivo da 2.26.1 foi revertida na 2.26.3.
- Sem alteração no banco: o schema permanece 2.26.0 e nenhuma migration nova é necessária.

## 2.26.1 — Login institucional simplificado (revertido na 2.26.3)

- Tela de login alinhada ao modelo de autenticação exclusiva pelo Portal APS.
- Removidos campos de usuário/senha e qualquer ação de credencial própria da interface.
- Endpoints legados de credencial local permanecem bloqueados apenas para compatibilidade, sem permitir autenticação própria.
- Imagotipo institucional restaurado na tela de login, sobre fundo azul para preservar o contraste da versão branca.
- Cache-busting dos assets atualizado para 2.26.1.
- Sem alteração no banco: o schema permanece 2.26.0 e nenhuma migration nova é necessária.

## 2.26.0 — Regulação independente do Portal APS

- Portal APS passa a fornecer apenas login/handoff de identidade.
- Sessão e autorização da Regulação passam para o `regulacao-vagas-db`.
- Unidades e equipes tornam-se cadastros próprios da Regulação.
- Superusuário torna-se autorização local, independente do papel posterior no Portal.
- Importação única do catálogo legado do Portal, preservando IDs e códigos.
- Fallback para reconstruir IDs de equipes e códigos de unidades já utilizados quando o catálogo antigo não estiver disponível.
- Nova área **Administração → Correções**, exclusiva do Superusuário.
- Exclusão física segura de equipe, especialidade, unidade ou etiqueta somente quando não houver vínculos ou histórico.
- Importação de transição protegida contra execução duplicada.
- Nesta revisão, instalações novas deixaram de criar credencial local; essa parte foi revertida na 2.26.3. Estruturas clínicas continuam fora de novas instalações.
- Bases antigas preservam legado clínico apenas para compatibilidade, sem exposição nas APIs de operação.
- Corrigidos carregadores ausentes da Administração e imports relativos das Pages Functions.

### Validação da 2.26.0

- 82 arquivos JavaScript sem erro de sintaxe;
- 17 scripts embutidos em HTML sem erro;
- 153 imports relativos conferidos;
- 84 assets locais conferidos;
- instalação nova com `PRAGMA quick_check = ok`;
- migração 2.25.3 → 2.26.0 testada;
- importação Portal → Regulação simulada preservando IDs, códigos, vínculos e guia existente;
- `foreign_key_check = 0` no cenário de teste.

## 2.25.3 — Múltiplas equipes por profissional

- Um profissional pode participar simultaneamente de uma ou mais equipes.
- Administração passa a usar seleção múltipla de equipes.
- Agenda, grupos, escalas e escopos reconhecem todos os vínculos.
- `regulacao_profissional_equipes` passa a ser a fonte de verdade da relação profissional × equipe.
- Campo legado `regulacao_profissionais.equipe_id` permanece apenas como equipe principal de compatibilidade.
- Nova migration `026_multiplas_equipes_profissional.sql`.

## 2.25.2 — Desempenho da Administração

- Removidas consultas N+1 das listas de usuários e profissionais.
- Equipes e unidades passam a utilizar consultas agregadas.
- Dados de referência dos filtros são reaproveitados.
- Cache curto entre abas administrativas.
- Verificação estrutural do banco movida para depois do primeiro conteúdo.
- Sincronizações legadas retiradas do caminho crítico de leitura.
- Sem migration adicional; schema permanece 2.25.0.

## 2.25.1 — Correções funcionais e de interface

- Página **Novidades da Versão** corrigida.
- Referências visuais de versão antiga removidas e proteção contra cache adicionada.
- Tabela da fila de Regulação redistribuída.
- Painéis da Administração corrigidos.
- Agenda e Atendimentos corrigida para não abrir vazia indevidamente.
- Gestão completa de etiquetas administrativas.
- Botão **Criar acesso** para profissional sem login, com vínculo automático e senha temporária.
- Hotfix de imports relativos das Pages Functions de etiquetas.
- Sem migration adicional; schema permanece 2.25.0.

## 2.25.0 — Consolidação gerencial

- Consolidação da linha 2.20.x.
- Perfil **Gestor** independente e combinável.
- Perfis Cadastrante, Regulador, Organizador e Executor mantidos separados das funções do Portal.
- Paginação e filtros da Administração por unidade e função.
- Governança do perfil Administrador protegida pelo nível máximo de administração.
- Etiquetas administrativas para as guias.
- Registro administrativo de execução separado de prontuário.
- Novas gravações de evolução clínica bloqueadas no eMulti.
- PEC e-SUS reafirmado como prontuário oficial.
- Nova migration `025_consolidacao_2_25_0.sql`.

## 2.20.2 — Agenda, grupos e profissionais

- Fluxo de agenda individual e grupos.
- Compatibilidade de especialidade, equipe, unidade e escala.
- Inclusão de guia em lista de espera no grupo e alteração para Em atendimento.
- Retirada do grupo com retorno à Lista de espera quando aplicável.
- Conclusão administrativa por Executor.
- Bloqueio de encontro fora da escala ou em conflito de horário.

## 2.20.1 — Correção da Administração

- Elementos da página deixam de depender de variáveis globais implícitas do navegador.
- Troca de abas passa a ter tratamento de erro individual.
- Adicionado diagnóstico de estrutura do banco.
- Fallback para opções de ícone.
- Remoção de arquivo temporário `_shared.js.tmp`.

## 2.19.x — Base de desempenho e acesso híbrido

- Linha inicial de otimizações de desempenho.
- Estruturas de profissionais e acesso que serviram de base para as evoluções posteriores.
- O modelo de credencial local criado nessa fase foi temporariamente retirado na 2.26.0/2.26.1 e restaurado na 2.26.3 dentro do banco próprio da Regulação.
