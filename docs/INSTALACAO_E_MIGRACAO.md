# Instalação, migração e homologação — eMulti / Regulação 2.27.2

## 1. Arquitetura atual

A Regulação possui duas formas de acesso:

- **credencial interna**, mantida no `regulacao-vagas-db`;
- **Apoio APS Cajamar**, como autenticação integrada por handoff.

O `portal-saude-db` é usado para autenticação/handoff e transição. Equipes, profissionais, permissões, pacientes, guias, agenda, grupos, etiquetas e auditoria pertencem ao `regulacao-vagas-db`.

Bindings:

```text
DB            → portal-saude-db
DB_REGULACAO  → regulacao-vagas-db
```

Não existe banco D1 secundário de homologação. Quando o Worker `regulacao-homologacao` for usado para validar código, ele aponta para o mesmo `regulacao-vagas-db` de produção.

## 2. Instalação nova

1. configure os bindings `DB` e `DB_REGULACAO` no `wrangler.toml`;
2. aplique `database/schema.sql` em `regulacao-vagas-db`;
3. execute `npm install` e `npm run build`;
4. publique o Worker;
5. entre com um usuário autorizado;
6. configure unidades, equipes, responsabilidades, profissionais, especialidades e escalas na Administração.

O schema consolidado registra a versão `2.27.2`.

## 3. Atualização de base existente

Aplique somente as migrations ainda pendentes, em ordem. Na linha atual:

```text
025_consolidacao_2_25_0.sql
026_multiplas_equipes_profissional.sql
027_desmembramento_portal.sql
028_restaurar_acesso_interno.sql
029_agenda_intervalos_almoco.sql
030_paciente_diversidade.sql
```

Não repita uma migration já aplicada.

A migration 029 adiciona os campos de agenda para intervalo entre atendimentos e horário de almoço. A migration 030 adiciona nome social, identidade de gênero e sexo Indeterminado, preservando os pacientes existentes.

## 4. Validação do D1 único

No Cloudflare D1, confirme:

```sql
SELECT version FROM emulti_schema_version WHERE id=1;
PRAGMA quick_check;
PRAGMA foreign_key_check;
```

Resultado esperado:

- versão do schema: `2.27.2`;
- `quick_check`: `ok`;
- `foreign_key_check`: nenhuma linha.

Para validar a migration 030 de forma protegida, use o workflow manual **Aplicar migration 030 em producao**. Ele verifica primeiro se a migration já foi aplicada e não mantém opção de banco de homologação.

## 5. Build e publicação

O projeto é publicado como **Cloudflare Worker + Static Assets**.

```bash
npm install
npm run build
wrangler deploy
```

O build deve gerar:

```text
dist/worker/index.js
dist/client/*.html
dist/client/assets/
dist/client/css/
dist/client/js/
```

`database/`, `docs/` e `functions/` não devem ser publicados como Static Assets.

O cache-busting dos arquivos JS/CSS/assets é gerado automaticamente com a versão do `package.json`.

## 6. Homologação de código

A branch de homologação pode ser usada para conferir interface e build, mas compartilha o mesmo banco operacional. Portanto:

- não cadastre dados fictícios que não possam permanecer na produção;
- não execute testes destrutivos;
- não existe etapa de copiar banco de homologação para produção;
- migrations são aplicadas diretamente no único D1, com validação prévia.

## 7. Checklist funcional 2.27.2

Após a publicação, confira:

1. login com credencial interna;
2. troca obrigatória de senha no primeiro acesso;
3. login integrado pelo Apoio APS;
4. painel e permissões corretas para ambos os tipos de usuário;
5. profissionais com múltiplos vínculos de equipe;
6. cadastro e edição de paciente com nome social, identidade de gênero e sexo Indeterminado;
7. integração e-SUS PEC para cadastro de paciente;
8. criação, consulta, regulação e transferência de guia;
9. unidade executante obrigatória quando aplicável;
10. etiquetas;
11. agenda com múltiplos dias, intervalo entre atendimentos e horário de almoço;
12. atendimentos individuais e grupos;
13. impressão do **Espelho do Acompanhamento** com seleção de blocos;
14. Administração → Correções com bloqueio de exclusão quando houver dependências;
15. página **Novidades da Versão** exibindo a versão atual.

## 8. Observação clínica

O eMulti | Regulação mantém apenas informações administrativas. Evolução, conduta e demais registros clínicos permanecem no PEC e-SUS.
