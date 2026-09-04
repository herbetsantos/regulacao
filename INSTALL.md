# Implantação controlada — eMulti / Regulação 2.19.0

> **Esta pasta é uma versão de avaliação.**
>
> Não altere o D1 atual apenas para analisar a interface ou o código.

O fluxo do projeto considera **GitHub + VS Code online do GitHub + Cloudflare**.

## Bancos utilizados

```text
DB            → portal-saude-db
DB_REGULACAO  → regulacao-vagas-db
```

A 2.19.0 não cria um terceiro banco.

## O que muda no banco

Somente o `regulacao-vagas-db` recebe novas estruturas através de:

```text
database/019_admin_profissionais_acesso_hibrido.sql
```

A migração é aditiva:
- não apaga pacientes;
- não apaga guias;
- não remove estruturas legadas;
- não renomeia tabelas existentes;
- mantém fallback durante a transição.

## Procedimento depois da aprovação

No **Cloudflare → D1 → regulacao-vagas-db**:

1. crie um `/bookmark`;
2. guarde o código retornado;
3. confira a versão atual;
4. execute **somente** `database/019_admin_profissionais_acesso_hibrido.sql`;
5. execute `database/VALIDAR_2_19_0.sql`;
6. confirme:
   - `emulti_schema_version = 2.19.0`;
   - `PRAGMA quick_check` = `ok`;
   - `PRAGMA foreign_key_check` sem linhas;
7. somente então publique o código 2.19.0 pelo fluxo GitHub/Cloudflare.

## Importante

**Não execute `database/update.sql` para instalar a 2.19.0.**

O arquivo permanece por compatibilidade com versões anteriores, mas esta evolução possui uma migração específica e controlada.
