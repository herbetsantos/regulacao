# Ajustes v2.9.2

- Corrige a tela de detalhe da guia que ficava vazia por causa da regra global de `.panel-section`.
- Reorganiza a visualização em três quadros sempre visíveis:
  1. Dados pessoais do paciente;
  2. Dados do encaminhamento;
  3. Andamento da guia.
- Dados pessoais incluem CPF, CNS, nascimento, sexo, telefones, unidade de referência e endereço.
- Dados do encaminhamento incluem especialidade, CID-10, unidade solicitante, médico, motivo e datas.
- Andamento mostra situação, equipe responsável, unidade executante e tipo/estado do atendimento.
- Ações de alteração de situação, transferência, início de atendimento e registro de sessões permanecem no terceiro quadro e respeitam as permissões existentes.
- Continua exibindo nomes formais das unidades na interface.
- Nenhuma nova migração SQL é necessária em relação à v2.9.1.
