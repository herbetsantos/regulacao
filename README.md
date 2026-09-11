# eMulti / Regulação — Cajamar Saúde

**Versão da aplicação:** 2.26.3  
**Schema da Regulação:** 2.26.3

Sistema gerencial para Regulação de Vagas e organização dos atendimentos eMulti. O **PEC e-SUS permanece como prontuário oficial**; evolução, conduta e demais registros clínicos não são gravados neste ambiente.

## Arquitetura atual

A Regulação é operacionalmente independente do Apoio APS Cajamar. Existem duas formas de autenticação:

1. **Acesso interno da Regulação** — usuário e senha mantidos no `regulacao-vagas-db`.
2. **Acesso integrado pelo Apoio APS Cajamar** — o Portal autentica o usuário e entrega sua identidade por handoff.

Depois da autenticação, equipes, unidades, profissionais, responsabilidades, permissões, guias, agenda, grupos, etiquetas, preferências e auditoria são administrados pela própria Regulação.

```text
Apoio APS Cajamar / portal-saude-db
└─ login integrado + handoff de identidade

Regulação / regulacao-vagas-db
├─ credenciais internas
├─ sessões do módulo
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
DB            → portal-saude-db      # login integrado/handoff + importação única da transição
DB_REGULACAO  → regulacao-vagas-db   # operação da Regulação + acesso interno
```

## Acesso e governança

As duas formas de login entram no mesmo modelo de autorização da Regulação. As responsabilidades podem ser combinadas:

- **Cadastrante** — pacientes e guias nas unidades autorizadas;
- **Regulador** — análise, lista de espera, negativa e transferência;
- **Organizador** — agenda individual, grupos e alocação;
- **Executor** — resultado administrativo do atendimento, sem evolução clínica;
- **Gestor** — profissionais, vínculos, especialidades, equipes e escalas;
- **Administrador** — gestão ampliada do módulo;
- **Superusuário** — nível máximo local, incluindo correções administrativas seguras.

Contas internas novas ou com senha redefinida recebem senha temporária e são obrigadas a alterá-la no primeiro acesso. A senha de usuários autenticados pelo Apoio APS Cajamar continua sendo administrada no Portal.

No bootstrap da arquitetura 2.26, se ainda não existir Superusuário local, o primeiro `super_admin` autenticado pelo Apoio APS Cajamar pode inicializar essa função. Depois disso, o papel do Portal não concede nem revoga privilégios da Regulação.

## Catálogo operacional próprio

A Regulação mantém localmente `regulacao_unidades`, `regulacao_equipes`, profissionais, múltiplos vínculos de equipe, permissões, agenda, grupos, etiquetas e auditoria. IDs de equipes e códigos de unidades são preservados na migração para não quebrar referências existentes.

## Correções administrativas

A área **Administração → Correções**, exclusiva do Superusuário, permite excluir fisicamente equipe, especialidade, unidade ou etiqueta inserida por engano somente quando não houver vínculo nem histórico. A API valida dependências e exige confirmação pelo nome do registro; quando houver uso, a exclusão é bloqueada e o cadastro deve ser corrigido ou inativado.

## Banco e migrations

Para instalação nova, use `database/schema.sql`.

Para bases existentes, aplique apenas as migrations ainda pendentes, em ordem. Na linha atual, as mais recentes são:

```text
025_consolidacao_2_25_0.sql
026_multiplas_equipes_profissional.sql
027_desmembramento_portal.sql
028_restaurar_acesso_interno.sql
```

A migration `028_restaurar_acesso_interno.sql` restaura as credenciais internas dentro do banco próprio da Regulação e atualiza o marcador do schema para 2.26.3. `database/update.sql` é apenas um marcador de compatibilidade e **não deve ser usado como migration**.

## Documentação

- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — histórico consolidado;
- [`docs/INSTALACAO_E_MIGRACAO.md`](docs/INSTALACAO_E_MIGRACAO.md) — instalação, atualização e homologação.

A página `novidades.html` apresenta as mudanças dentro do sistema.
