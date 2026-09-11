# eMulti / Regulação — Cajamar Saúde

**Versão da aplicação:** 2.26.2  
**Schema da Regulação:** 2.26.0

Sistema gerencial para Regulação de Vagas e organização dos atendimentos eMulti. O **PEC e-SUS permanece como prontuário oficial**: evolução, conduta, procedimentos e demais registros clínicos não são gravados neste ambiente.

## Arquitetura atual

A partir da 2.26.0, o Portal APS é utilizado somente para autenticação/handoff de identidade. Na 2.26.1, a interface de acesso foi alinhada definitivamente a essa arquitetura, sem formulário de credencial própria. A 2.26.2 corrige o empacotamento das Pages Functions sem alterar o banco. Toda a operação e autorização da Regulação fica no `regulacao-vagas-db`.

```text
Portal APS / portal-saude-db
└─ login + handoff de identidade

Regulação / regulacao-vagas-db
├─ sessão do módulo
├─ superusuários e responsabilidades
├─ unidades e equipes
├─ profissionais e vínculos
├─ pacientes, guias e fila
├─ agenda e grupos
├─ etiquetas
├─ preferências
└─ auditoria
```

Bindings Cloudflare:

```text
DB            → portal-saude-db      # login/handoff + importação única da transição
DB_REGULACAO  → regulacao-vagas-db   # operação normal da Regulação
```

Não existe credencial própria da Regulação. A tela de acesso oferece somente **Acessar pelo Portal APS**, e a senha permanece gerenciada pelo Portal APS.

## Perfis e responsabilidades

As responsabilidades são locais à Regulação e podem ser combinadas:

- **Cadastrante** — pacientes e guias nas unidades autorizadas;
- **Regulador** — análise, lista de espera, negativa e transferência;
- **Organizador** — agenda individual, grupos e alocação;
- **Executor** — resultado administrativo do atendimento, sem evolução clínica;
- **Gestor** — profissionais, vínculos, especialidades, equipes e escalas;
- **Administrador** — gestão ampliada do módulo;
- **Superusuário** — nível máximo local, responsável também por correções administrativas seguras.

No primeiro acesso após a migração 027, se ainda não existir Superusuário local, o primeiro usuário autenticado pelo Portal com papel `super_admin` é usado apenas para o bootstrap. Depois disso, as permissões são administradas exclusivamente no eMulti/Regulação.

## Catálogo operacional próprio

A Regulação mantém localmente:

- `regulacao_unidades`;
- `regulacao_equipes`;
- profissionais e múltiplos vínculos de equipe;
- permissões e escopos;
- agenda, grupos, etiquetas e auditoria.

Os IDs de equipes e códigos de unidades são preservados na migração para evitar quebra de guias, agendas, grupos e vínculos existentes.

## Correções administrativas

A área **Administração → Correções**, exclusiva do Superusuário, permite excluir fisicamente cadastros inseridos por engano apenas quando não existe vínculo nem histórico.

Tipos suportados:

- equipe;
- especialidade;
- unidade;
- etiqueta.

A API faz uma pré-validação de dependências e exige a digitação exata do nome do registro. Se houver qualquer utilização, a exclusão é bloqueada e o cadastro deve ser corrigido ou inativado.

## Banco e migrations

Para instalação nova, use:

```text
database/schema.sql
```

Principais migrations históricas ainda necessárias para atualização de bases antigas:

```text
019_admin_profissionais_acesso_hibrido.sql
020_organizacao_agenda.sql
025_consolidacao_2_25_0.sql
026_multiplas_equipes_profissional.sql
027_desmembramento_portal.sql
```

`database/update.sql` é apenas um marcador de compatibilidade. **Não use esse arquivo como migration.**

## Documentação

A documentação foi consolidada para evitar dezenas de arquivos de release, avaliação e patch:

- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — histórico consolidado das versões;
- [`docs/INSTALACAO_E_MIGRACAO.md`](docs/INSTALACAO_E_MIGRACAO.md) — instalação nova, atualização, homologação e recuperação.

A página `novidades.html` continua sendo a apresentação das mudanças para o usuário dentro do sistema e não depende de arquivos Markdown.
