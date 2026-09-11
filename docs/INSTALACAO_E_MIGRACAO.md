# Instalação, migração e homologação — eMulti / Regulação 2.26.2

## 1. Antes de qualquer atualização

Faça backup de:

- `portal-saude-db`;
- `regulacao-vagas-db`;
- commit atualmente publicado no GitHub.

Não apague tabelas antigas do Portal durante a homologação da linha 2.26.x.

## 2. Instalação nova

Para um ambiente novo, crie o `regulacao-vagas-db` usando:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/schema.sql
```

Configure os bindings:

```text
DB            → portal-saude-db
DB_REGULACAO  → regulacao-vagas-db
```

O binding `DB` é necessário apenas para autenticação/handoff e para a importação única de transição. A operação cotidiana utiliza `DB_REGULACAO`.

A instalação nova não cria login próprio do eMulti nem tabelas de evolução/acompanhamento clínico.

## 3. Atualização de banco para a linha 2.26.x


### Atualização 2.26.1 → 2.26.2

Não há alteração de banco. **Não execute nenhuma migration adicional.** O schema continua em `2.26.0`. A atualização corrige um export ausente em `functions/api/_db.js` que impedia o Cloudflare Pages de empacotar três rotas de pacientes.


### Atualização 2.26.0 → 2.26.1

Não há alteração de banco. **Não execute nenhuma migration adicional.** O schema continua em `2.26.0`. Basta publicar o código 2.26.1.

A tela de login passa a exibir somente o acesso pelo Portal APS e o imagotipo institucional é restaurado com contraste adequado.

### Se a base já está na 2.25.3

Execute somente:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/027_desmembramento_portal.sql
```

Depois valide:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/VALIDAR_2_26_0.sql
```

### Se a base está na 2.25.0, 2.25.1 ou 2.25.2

Garanta primeiro o modelo de múltiplas equipes:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/026_multiplas_equipes_profissional.sql
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/027_desmembramento_portal.sql
```

### Se a base ainda está na linha 2.20.x

Aplique, conforme o estado real do banco, a sequência necessária:

```text
025_consolidacao_2_25_0.sql
026_multiplas_equipes_profissional.sql
027_desmembramento_portal.sql
```

As migrations 019 e 020 só são necessárias para bancos que ainda não possuem as estruturas introduzidas nessas versões. **Nunca repita uma migration com `ALTER TABLE` já aplicada.**

### Importante

`database/update.sql` não é um script de migração. Ele existe apenas como marcador seguro de compatibilidade. Use sempre as migrations numeradas.

## 4. Publicação

Após a atualização do banco:

1. publique o código 2.26.2 no repositório GitHub;
2. aguarde o Cloudflare Pages utilizar o novo commit;
3. confirme no log que o hash publicado corresponde ao commit novo;
4. verifique se não há erro de resolução de imports nas Pages Functions.

## 5. Primeiro acesso e bootstrap

Entre no eMulti pelo Portal APS com o atual Super Administrador.

Se `regulacao_superusers` ainda estiver vazia, o primeiro handoff de um usuário `super_admin` do Portal cria o primeiro Superusuário local. Esse papel do Portal serve apenas para o bootstrap; depois, os privilégios são controlados pela própria Regulação.

## 6. Importação única do catálogo legado

Abra:

**Administração → Configurações → Importar catálogo legado do Portal**

A importação copia, quando disponíveis:

- identidades de usuários para referência local;
- unidades;
- equipes preservando IDs;
- vínculos equipe × unidade;
- responsabilidades e escopos legados.

Nada é apagado do Portal. A conclusão fica registrada no `regulacao-vagas-db` e uma segunda execução acidental é bloqueada.

Se o Portal não possuir as tabelas antigas esperadas, a rotina reconstrói os IDs/códigos já usados no banco da Regulação e cria nomes provisórios para revisão administrativa.

## 7. Checklist de homologação

Antes de liberar para uso, valide:

- login/handoff pelo Portal;
- Superusuário local;
- usuários e responsabilidades;
- unidades próprias da Regulação;
- equipes e seus IDs;
- profissional pertencendo a uma e a múltiplas equipes;
- criação e regulação de guia;
- fila e filtros;
- etiquetas;
- agenda individual;
- grupos, encontros e capacidade;
- escalas e conflitos de horário;
- resultado administrativo de atendimento;
- ausência de gravação de evolução clínica;
- Administração e seu desempenho;
- Correções administrativas.

Para Correções, teste pelo menos:

1. exclusão de uma equipe vazia criada por engano;
2. bloqueio da exclusão de uma equipe que já possua vínculo/histórico;
3. confirmação exigindo digitação exata do nome.

## 8. Correções administrativas

A área é exclusiva do Superusuário e suporta:

- equipe;
- especialidade;
- unidade;
- etiqueta.

Fluxo da API:

```text
GET /api/admin/correcoes?tipo=<tipo>&ref=<id-ou-codigo>
DELETE /api/admin/correcoes
```

A exclusão só é liberada após a pré-validação encontrar zero dependências. Caso exista histórico, use correção ou inativação em vez de apagar.

## 9. Depois da homologação

As rotas operacionais da linha 2.26.x já não dependem das tabelas administrativas do Portal. Mesmo assim, mantenha as tabelas legadas do `portal-saude-db` intactas durante esta versão. Uma limpeza física futura deve ocorrer apenas após validação em produção e backup confirmado.
