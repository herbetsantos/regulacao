> Revisão de código atual: **2.25.1** (schema Regulação 2.25.0).

# eMulti / Regulação — Cajamar Saúde

Versão de código consolidada: **2.25.1** · Schema da Regulação: **2.25.0**

Sistema gerencial para Regulação de Vagas e organização dos atendimentos eMulti. O **PEC e-SUS permanece como prontuário oficial**: evolução, conduta, procedimentos e demais registros clínicos não são gravados neste ambiente.

## Arquitetura

O projeto utiliza dois bancos D1:

```text
DB            → portal-saude-db
DB_REGULACAO  → regulacao-vagas-db
```

O `portal-saude-db` permanece como fonte de usuários do Portal, sessões/handoff e cadastro mestre de unidades. O `regulacao-vagas-db` armazena pacientes, guias, fila, autorizações funcionais, profissionais assistenciais, vínculos, escalas, agenda, grupos, etiquetas e resultados administrativos.

A Regulação aceita duas origens de identidade:

```text
portal:<id>  → conta do Portal APS
local:<uuid> → credencial própria da Regulação
```

O cadastro de **profissional assistencial é independente da conta de usuário**. Assim, um profissional pode constar nas listas e escalas mesmo antes de possuir login.

## Perfis funcionais

Os perfis são combináveis e independentes do papel geral do usuário no Portal:

- **Cadastrante:** cadastro de pacientes e emissão de guias nas unidades autorizadas.
- **Regulador:** análise, lista de espera, negativa e transferência administrativa.
- **Organizador:** agenda individual, grupos e alocação de pacientes.
- **Executor:** registra apenas resultados administrativos de execução, como realizado, falta e abandono.
- **Gestor:** administra profissionais, vínculos, especialidades, equipes e escalas.
- **Administrador:** gestão ampliada do ambiente e de acessos.

A concessão ou revogação da responsabilidade **Administrador** é exclusiva do **Super Administrador do Portal APS**.

## Administração 2.25.0

A Administração possui visão geral e áreas para acessos, profissionais, especialidades, equipes, unidades e configurações. Listas extensas usam paginação e filtros, incluindo unidade, função, especialidade e equipe conforme a tela.

O Gestor pode administrar a estrutura assistencial e escalas sem receber automaticamente poderes para regular, organizar ou executar. Administradores continuam responsáveis pela gestão ampliada de acessos.

## Etiquetas e execução administrativa

As guias podem receber etiquetas administrativas filtráveis, inicialmente:

- Prioridade;
- Retorno;
- Contato pendente;
- Documentação pendente;
- Atenção compartilhada.

Atendimentos individuais e grupos registram resultados administrativos em estrutura própria. Esses registros **não substituem evolução clínica** e não devem conter conteúdo de prontuário.

## Atualização da linha 2.20.x para 2.25.0

1. Faça backup do `regulacao-vagas-db`.
2. Aplique **uma única vez**:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/025_consolidacao_2_25_0.sql
```

3. Execute a validação somente leitura, se desejar:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/VALIDAR_2_25_0.sql
```

4. Publique o código 2.25.0.
5. Valide login, perfis, Administração, escalas, Agenda, grupos, etiquetas e fluxo da guia.

> `025_consolidacao_2_25_0.sql` contém `ALTER TABLE` e deve ser executado somente uma vez em uma base 2.20.x ainda não migrada.

## Instalação nova

`database/schema.sql` já representa o schema consolidado da 2.25.0. Não aplique a migração 025 depois de criar uma base nova usando esse schema.

## Compatibilidade clínica legada

Estruturas antigas de acompanhamento podem continuar presentes no banco para preservar histórico e compatibilidade de bases existentes. Na 2.25.0, as rotas de criação de acompanhamento/sessão clínica retornam bloqueio e a interface não oferece formulários de evolução. Novos registros clínicos devem ser feitos no PEC e-SUS.

## Documentação da versão

- `RELEASE_2.25.0.md`
- `CHANGELOG_2.25.0.md`
- `MIGRACAO_2.25.0_LEIA-ME.md`
- `database/VALIDAR_2_25_0.sql`
