# Produção e Apoio Clínico no Portal Saúde 2.10.1

1. Faça o deploy desta versão do Portal preservando o mesmo `portal-saude-db`.
2. Execute uma única vez:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/migrations/010_producao_apoio_clinico.sql
```

3. Faça o deploy dos projetos Produção e Apoio Clínico em URLs próprias.
4. Em **Administração → Ferramentas**, cadastre dois links externos:
   - Produção → URL do ambiente Produção → funcionalidade `Produção`;
   - Apoio Clínico → URL do ambiente Apoio Clínico → funcionalidade `Apoio Clínico / IA`.
5. Em **Administração → Usuários → Configurações**, o Super Administrador habilita individualmente quem pode abrir cada ambiente.

O Portal continua sendo a fonte de verdade para usuário, senha, sessão e unidades. Os módulos externos nunca devem conceder uma unidade que não exista em `user_unidades` para aquele usuário, exceto escopos globais explicitamente administrativos.
