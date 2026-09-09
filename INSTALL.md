# Implantação controlada — eMulti / Regulação 2.25.0

A versão 2.25.0 mantém os dois bancos já utilizados:

```text
DB            → portal-saude-db
DB_REGULACAO  → regulacao-vagas-db
```

Ela não cria um terceiro banco e não exige recriação dos bancos existentes.

## Atualização de uma instalação 2.20.x

### 1. Backup
Antes da alteração, faça backup/clone seguro do `regulacao-vagas-db` e preserve o commit atualmente publicado.

### 2. Migração do banco
Na raiz do projeto 2.25.0, execute **uma única vez**:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/025_consolidacao_2_25_0.sql
```

A migração adiciona:
- responsabilidade `gestor`;
- catálogo de etiquetas administrativas;
- relação entre guias e etiquetas;
- registros administrativos de execução.

Ela não apaga pacientes, guias, agendas, grupos nem estruturas clínicas legadas.

### 3. Validação somente leitura

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/VALIDAR_2_25_0.sql
```

Confirme principalmente:
- `schema_version = 2.25.0`;
- coluna `gestor` existente;
- três novas estruturas administrativas existentes;
- etiquetas iniciais cadastradas.

### 4. Publicação
Publique o conteúdo da versão 2.25.0 pelo fluxo GitHub/Cloudflare já utilizado pelo projeto.

### 5. Homologação
Teste com contas distintas:
- Cadastrante;
- Regulador;
- Organizador;
- Executor;
- Gestor;
- Administrador;
- Super Administrador.

Confira também filtros/paginação, escalas, grupos, atendimento individual, etiquetas e bloqueio de novas evoluções clínicas.

## Instalação nova

Para um banco novo, use `database/schema.sql`, que já representa a 2.25.0. **Não aplique a migração 025 depois do schema completo.**

## Arquivos legados

`database/019_admin_profissionais_acesso_hibrido.sql`, `database/020_organizacao_agenda.sql`, `database/update.sql` e validadores antigos permanecem no pacote apenas como histórico/compatibilidade. Para atualizar uma base 2.20.x já funcional para 2.25.0, use somente `database/025_consolidacao_2_25_0.sql`.
