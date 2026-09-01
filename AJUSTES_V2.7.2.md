# Ajustes v2.7.2

- Corrige o formulário de cadastro de pacientes que permanecia invisível após clicar em **+ Novo paciente** ou após uma busca sem resultado.
- A causa era a regra global `.panel-section { display: none; }`, herdada da antiga navegação administrativa.
- O formulário agora recebe `is-active` e `display: block` explicitamente ao ser aberto.
- Mantém as correções de tema da v2.7.1.
- Não requer migração SQL.
