-- Regulação de Vagas — setup no banco do PORTAL (portal-saude-db).
-- Este arquivo NÃO mexe no banco novo (regulacao-vagas-db) — ver
-- schema_regulacao.sql para isso. Aqui só tocamos no banco de login, porque
-- login/usuários/unidades continuam sendo a mesma fonte única de verdade
-- (módulo integrado, com projeto de deploy separado).
--
-- Rode com: wrangler d1 execute portal-saude-db --remote --file=./migration_regulacao_setup.sql

-- 1) Classifica cada unidade como 'aps' (atenção primária — pode ser
--    unidade RECEPTORA de guias) ou 'outra' (pode emitir guias, mas não
--    aparece como unidade de referência do paciente).
ALTER TABLE unidades ADD COLUMN tipo TEXT NOT NULL DEFAULT 'outra';

-- Unidades de atenção primária já cadastradas (UBS/USF/PSF/Postos).
-- Ajuste esta lista em Administração > Unidades > tipo, se necessário —
-- este UPDATE é só o ponto de partida.
UPDATE unidades SET tipo = 'aps' WHERE code IN (
  'portal', 'km43', 'beloplanalto', 'marialuiza', 'guaturinho',
  'parquesaoroberto', 'ponunduva', 'cajamarcento', 'jordanesia',
  'polvilho', 'manoelinacio'
);
-- upa, policlinica, cer2, ceo, caps, capsij permanecem 'outra' (unidades de
-- média/alta complexidade — só emitem/executam guias, não recebem como APS).

-- 2) Vínculo usuário ↔ unidade ↔ tipo de acesso — usado pelos AGENTES
--    OPERACIONAIS (cadastram/emitem guias por uma unidade específica) e
--    também para acesso de EXECUÇÃO direto a unidades que ainda não têm
--    equipe multidisciplinar formada (ex.: CER II, Policlínica hoje).
--    pode_emitir  = pode criar/ver guias como unidade SOLICITANTE.
--    pode_executar = pode ver/gerenciar a fila e os acompanhamentos como
--    unidade EXECUTANTE, SEM depender de pertencer a uma equipe.
--    admin/super_admin enxergam tudo e não precisam de linhas aqui.
CREATE TABLE IF NOT EXISTS regulacao_user_unidades (
  user_id INTEGER NOT NULL,
  unidade_code TEXT NOT NULL,
  pode_emitir INTEGER NOT NULL DEFAULT 0,
  pode_executar INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, unidade_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unidade_code) REFERENCES unidades(code)
);

-- 2b) Equipes multidisciplinares. Cada equipe atende por MAIS DE UMA
--     unidade executante (N:N via regulacao_equipe_unidades) e agrupa
--     profissionais de várias especialidades (N:N via
--     regulacao_equipe_profissionais). Pertencer a uma equipe dá acesso de
--     EXECUÇÃO (ver fila/triagem, gerenciar acompanhamentos) a todas as
--     unidades daquela equipe, sem precisar de uma linha em
--     regulacao_user_unidades para cada unidade.
CREATE TABLE IF NOT EXISTS regulacao_equipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO regulacao_equipes (nome) VALUES
  ('Estratégia 1'),
  ('Complementar 1'),
  ('Complementar 2'),
  ('Complementar 3');

-- 2c) Unidades atendidas por cada equipe. Preencher via SQL (ver
--     INSTALL.md) com as unidades reais de cada equipe — não sei essa
--     informação, então não estou pré-cadastrando vínculos aqui.
CREATE TABLE IF NOT EXISTS regulacao_equipe_unidades (
  equipe_id INTEGER NOT NULL,
  unidade_code TEXT NOT NULL,
  PRIMARY KEY (equipe_id, unidade_code),
  FOREIGN KEY (equipe_id) REFERENCES regulacao_equipes(id) ON DELETE CASCADE,
  FOREIGN KEY (unidade_code) REFERENCES unidades(code)
);
CREATE INDEX IF NOT EXISTS idx_regulacao_equipe_unidades_unidade ON regulacao_equipe_unidades(unidade_code);

-- 2d) Profissionais de cada equipe. Cada profissional pode pertencer a
--     somente UMA equipe. Preencher via interface ou SQL — ver INSTALL.md.
CREATE TABLE IF NOT EXISTS regulacao_equipe_profissionais (
  equipe_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (equipe_id, user_id),
  FOREIGN KEY (equipe_id) REFERENCES regulacao_equipes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_regulacao_equipe_prof_user ON regulacao_equipe_profissionais(user_id);

-- 3) Habilita a feature 'regulacao_vagas' por padrão para admin/super_admin
--    (usuários comuns dependem de o Super Admin ligar isso em Administração
--    > Perfis de acesso, igual às outras ferramentas).
INSERT OR IGNORE INTO role_permissions (role, feature_key, enabled) VALUES
  ('admin', 'regulacao_vagas', 1),
  ('admin_unidade', 'regulacao_vagas', 0);

-- 4) Item de menu (Ferramentas) apontando para o projeto separado de
--    Regulação de Vagas. Troque a URL abaixo pela URL real do seu deploy
--    (ex.: https://emulti.pages.dev/).
--    INSERT condicional (WHERE NOT EXISTS) — seguro rodar esta migração
--    mais de uma vez sem duplicar o item de menu.
INSERT INTO links (category, title, url, sort_order, feature_key)
SELECT 'ferramenta', 'Regulação de Vagas', 'https://emulti.pages.dev/', 4, 'regulacao_vagas'
WHERE NOT EXISTS (SELECT 1 FROM links WHERE title = 'Regulação de Vagas');

-- 5) Códigos de repasse de sessão (uso único, curta duração — 60s). Como o
--    Portal (apoioapscajamar.pages.dev) e a Regulação de Vagas estão em
--    domínios *.pages.dev DIFERENTES (não são subdomínios um do outro), o
--    cookie de sessão não é enviado automaticamente entre eles. Esse código
--    carrega só a identidade do usuário de um site pro outro — nunca a
--    senha, nem o próprio token de sessão. Ver functions/api/handoff.js
--    (aqui, no portal) e functions/_middleware.js (no projeto
--    emulti.pages.dev, onde o código é consumido).
CREATE TABLE IF NOT EXISTS handoff_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6) Regra eMulti: cada profissional pertence a somente UMA equipe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_regulacao_equipe_prof_user_unica
  ON regulacao_equipe_profissionais(user_id);

-- 7) Ícones dos links úteis do eMulti. Os links continuam vindo da tabela
--    links do Portal; esta tabela guarda apenas a apresentação no módulo.
CREATE TABLE IF NOT EXISTS regulacao_link_icons (
  link_id INTEGER PRIMARY KEY,
  icon_key TEXT NOT NULL DEFAULT 'links',
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);
