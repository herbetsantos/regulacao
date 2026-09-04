# eMulti / Regulação — Cajamar Saúde

Versão de avaliação: **2.19.0**

Esta evolução reorganiza a Administração, separa o profissional assistencial do usuário do sistema e introduz acesso híbrido: **Portal APS ou credencial própria da Regulação**.

## Bancos D1

```text
DB            → portal-saude-db
DB_REGULACAO  → regulacao-vagas-db
```

### `portal-saude-db`
Continua sendo a fonte central para:
- usuários internos do Portal APS;
- sessão/handoff do Portal;
- cadastro mestre de unidades;
- estruturas legadas ainda mantidas durante a transição.

### `regulacao-vagas-db`
Continua armazenando pacientes, guias, fila, agenda, grupos e atendimentos.

Na 2.19.0 passa também a armazenar:
- credenciais externas da Regulação;
- autorização funcional por principal;
- vínculos de unidade/equipe das autorizações;
- profissionais assistenciais independentes;
- vínculos `profissional + unidade + especialidade + carga horária semanal`.

## Identidade

```text
portal:<id>       → conta do Portal APS
local:<uuid>      → credencial própria da Regulação
```

O profissional assistencial é um cadastro separado e pode existir sem possuir login.

## Administração

A Administração foi dividida em:

1. Visão geral
2. Usuários e acessos
3. Profissionais
4. Especialidades
5. Equipes
6. Unidades
7. Configurações

## Carga horária das especialidades

A carga horária de uma especialidade não é digitada manualmente.

Ela é calculada pela soma dos vínculos assistenciais ativos:

```text
profissional + unidade + especialidade + horas/semana
```

Assim, um profissional pode distribuir corretamente sua jornada entre unidades e/ou especialidades sem duplicação indevida.

## Avaliação

Consulte `AVALIACAO_2.19.0.md`.

**Não execute SQL no D1 apenas para avaliar os arquivos e a proposta.**

Quando a versão for aprovada, a migração deverá ser feita de forma controlada no Cloudflare D1 usando:

- `database/019_admin_profissionais_acesso_hibrido.sql`
- `database/VALIDAR_2_19_0.sql`

Não use `database/update.sql` para instalar a evolução 2.19.0.
