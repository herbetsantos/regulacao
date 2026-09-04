# Portal Saúde Cajamar

Versão do pacote: **2.10.1**  
Banco compartilhado: **Cloudflare D1 `portal-saude-db`**  
Plataforma: **Cloudflare Pages + Pages Functions + D1**

A versão 2.10.1 mantém o comportamento da 2.10.0 e reorganiza o repositório antes do reimplante. As páginas públicas permanecem na raiz para não alterar URLs existentes. Documentação e migrations foram separadas em pastas próprias.

## Estrutura

```text
portal-saude-cajamar/
├── assets/                  # imagens e identidade visual
├── css/                     # estilos
├── js/                      # JavaScript do frontend
├── functions/               # backend Cloudflare Pages Functions
│   ├── api/
│   └── receituario/
├── database/
│   ├── schema.sql           # banco novo no estado atual
│   ├── update.sql           # atualização consolidada de banco existente
│   ├── migrations/          # migrations incrementais
│   │   └── legacy/          # migrations históricas preservadas
│   └── archive/             # arquivos antigos somente para histórico
├── docs/
│   ├── instalacao/          # guias de instalação e integrações
│   ├── historico/           # AJUSTES antigos
│   └── NOVIDADES.md         # changelog consolidado
├── receituario/             # páginas do receituário
├── *.html                   # páginas públicas; mantidas na raiz por compatibilidade de URL
├── _headers
├── wrangler.toml
└── README.md
```

## Antes de reimplantar

Leia primeiro:

**`docs/instalacao/REIMPLANTE_V2.10.1.md`**

O reimplante não deve apagar nem recriar o `portal-saude-db` existente.

## Banco D1

### Instalação nova

```bash
wrangler d1 create portal-saude-db
wrangler d1 execute portal-saude-db --remote --file=./database/schema.sql
```

Depois configure o `database_id` em `wrangler.toml`.

### Atualização do banco que já está em produção

Se o Portal atual já está na linha **2.9.x** e suas migrations anteriores já foram aplicadas, **não rode novamente `database/update.sql`**. Esse arquivo é consolidado e contém alterações históricas que não são idempotentes.

Para a passagem de 2.9.x/2.10.0 para este pacote, aplique apenas:

```bash
wrangler d1 execute portal-saude-db --remote --file=./database/migrations/010_producao_apoio_clinico.sql
```

O arquivo `database/update.sql` foi preservado para cenários de atualização a partir de bases antigas e deve ser usado somente após conferir a versão de origem.

## Deploy

```bash
wrangler pages deploy . --project-name=portal-saude-cajamar
```

Se o projeto estiver conectado ao GitHub no Cloudflare Pages, o deploy pode ocorrer automaticamente após o merge/push para a branch configurada.

## Autenticação e permissões

- O Portal é a fonte de verdade para usuário, senha, sessão e vínculo com unidades.
- Senhas são armazenadas por hash, nunca em texto puro.
- Senha temporária pode exigir troca no primeiro acesso.
- O Super Administrador controla acesso aos ambientes externos.
- Um usuário pode possuir múltiplas responsabilidades dentro de cada ambiente.
- Ambientes externos devem respeitar as unidades relacionadas ao usuário no Portal.

## Ambientes externos

Cada ambiente possui código/repositório e URL próprios:

- **eMulti / Regulação**
- **Produção**
- **Apoio Clínico / IA**

O acesso entre URLs usa handoff de sessão de uso único, sem duplicação de senha.

Consulte:

- `docs/instalacao/INSTALL_REGULACAO.md`
- `docs/instalacao/INSTALAR_NOVOS_AMBIENTES.md`

## Ouvidoria IA

A configuração administrativa do OuvidorSUS continua integrada ao Portal. Consulte:

`docs/instalacao/INTEGRACAO_OUVIDORIA.md`

## Documentação e histórico

A raiz do projeto deve permanecer focada nos arquivos que participam diretamente do deploy. Documentação fica em `docs/`; scripts de banco ficam em `database/`.

Para ver o histórico de versões:

`docs/NOVIDADES.md`
