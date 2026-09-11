# Instalação, migração e homologação — eMulti / Regulação 2.26.3

## 1. Arquitetura de autenticação

A Regulação possui duas formas de acesso:

- **credencial interna**, mantida exclusivamente no `regulacao-vagas-db`;
- **Apoio APS Cajamar**, como autenticação integrada por handoff.

O `portal-saude-db` não controla equipes, profissionais, permissões ou demais regras operacionais da Regulação.

## 2. Instalação nova

1. configure os bindings `DB` e `DB_REGULACAO` no `wrangler.toml`;
2. aplique `database/schema.sql` em `regulacao-vagas-db`;
3. publique o projeto no Cloudflare Pages;
4. entre com um usuário autorizado;
5. configure unidades, equipes, responsabilidades e profissionais na Administração.

O schema novo já inclui as tabelas de credenciais internas e registra a versão `2.26.3`.

## 3. Atualização de uma base 2.26.0/2.26.1/2.26.2

Aplique somente:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/028_restaurar_acesso_interno.sql
```

Depois publique a aplicação 2.26.3.

A migration 028 é aditiva: preserva credenciais internas antigas que ainda existam, registra esses usuários em `regulacao_principals`, mantém seus temas e atualiza o marcador do schema.

## 4. Atualização a partir da 2.25.3

Se a migration 026 já foi aplicada, execute em ordem:

```bash
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/027_desmembramento_portal.sql
npx wrangler d1 execute regulacao-vagas-db --remote --file=./database/028_restaurar_acesso_interno.sql
```

Em seguida publique a 2.26.3. Não repita migrations que já tenham sido executadas no ambiente.

## 5. Importação do catálogo antigo do Portal

A importação operacional criada na 2.26 continua sendo uma ação de transição e deve ser executada uma única vez quando necessária. Ela copia unidades/equipes legadas preservando IDs e códigos. Depois da importação, a operação cotidiana utiliza o `regulacao-vagas-db`.

Não apague tabelas do `portal-saude-db` durante a homologação. O sistema simplesmente deixa de depender delas para operação da Regulação.

## 6. Acesso interno

Na Administração é possível criar uma credencial interna para um usuário ou diretamente para um profissional sem login. A senha inicial é temporária e deve possuir pelo menos 10 caracteres. No primeiro acesso, o usuário é direcionado para **Minha conta** e precisa definir uma nova senha antes de usar as demais funções.

Usuários autenticados pelo Apoio APS Cajamar não alteram sua senha dentro da Regulação; a senha continua sendo gerenciada pelo Portal.

## 7. Homologação mínima

Após a publicação, confira:

1. login com uma credencial interna;
2. troca obrigatória de senha no primeiro acesso;
3. login integrado pelo Apoio APS Cajamar;
4. abertura do painel com ambos os tipos de usuário;
5. responsabilidades, unidades e equipes do usuário;
6. criação de conta interna pela Administração;
7. vínculo de um profissional a mais de uma equipe;
8. criação e consulta de guia;
9. fila, etiquetas, agenda e grupos;
10. **Administração → Correções** com bloqueio de exclusão quando houver dependências.

No D1, confirme também:

```sql
SELECT version FROM emulti_schema_version WHERE id=1;
PRAGMA quick_check;
PRAGMA foreign_key_check;
```

A versão esperada do schema é `2.26.3` e o `quick_check` deve retornar `ok`.

## 8. Ordem de publicação recomendada

Em ambiente já existente, aplique a migration 028 **antes** de publicar a 2.26.3. O login integrado possui tolerância temporária quando a tabela local ainda não existe, mas o acesso interno só fica disponível após a migration.
