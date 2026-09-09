> Revisão de código atual: **2.25.3** (schema Regulação 2.25.3).

# Implantação controlada — eMulti / Regulação 2.25.3

A revisão 2.25.3 mantém os dois bancos já utilizados e evolui o schema da Regulação para 2.25.3:

```text
DB            → portal-saude-db
DB_REGULACAO  → regulacao-vagas-db
```

Ela não cria um terceiro banco e não exige recriação dos bancos existentes.

## Atualização de uma instalação 2.20.x

> **Quem já aplicou a migração 025 não deve executá-la novamente.** Para atualizar da linha 2.25.0–2.25.2 para 2.25.3, execute somente `database/026_multiplas_equipes_profissional.sql` e depois publique o novo código.

### 1. Backup
Antes da alteração, faça backup/clone seguro do `regulacao-vagas-db` e preserve o commit atualmente publicado.

### 2. Migração do banco
Se você vem de 2.20.x, na raiz do projeto execute **uma única vez**:

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
