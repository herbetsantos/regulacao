# eMulti / Regulação 2.25.0 — versão consolidada

## Escopo
Versão gerencial da Regulação de Vagas. O PEC e-SUS permanece como prontuário oficial; evolução, conduta, procedimentos e demais registros clínicos não devem ser gravados neste ambiente.

## Perfis
- Cadastrante: cadastro de pacientes e emissão de guias nas unidades autorizadas.
- Regulador: análise, encaminhamento à lista de espera, negativa e transferência administrativa.
- Organizador: agenda individual e grupos, sem registro clínico.
- Executor: registra resultados administrativos do atendimento (realizado, falta, abandono/cancelamento), sem evolução clínica.
- Gestor: administra profissionais, vínculos, especialidades, equipes e escalas.
- Administrador: gestão ampliada do ambiente. Concessão/revogação de Administrador é exclusiva do Super Administrador do Portal.

## Novidades 2.25.0
- perfil Gestor independente e combinável;
- proteção de concessão e revogação do perfil Administrador;
- paginação e filtros na Administração, incluindo unidade e função;
- etiquetas administrativas pré-definidas e filtráveis nas guias;
- registro administrativo de execução, separado de prontuário;
- bloqueio das rotas de nova evolução clínica;
- versão interna e diagnóstico alinhados à 2.25.0.

## Migração
Para banco existente na linha 2.20.x, aplique `database/025_consolidacao_2_25_0.sql` uma única vez antes do deploy. A migração é aditiva e não remove dados legados.
