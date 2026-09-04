-- ⚠️ IMPORTANTE: rode este arquivo só UMA VEZ. A linha "ALTER TABLE links ADD
-- COLUMN feature_key" dá erro se for executada de novo (SQLite não tem um
-- jeito de dizer "adiciona essa coluna só se ela ainda não existir"). Se isso
-- acontecer sem querer, o erro fica só nessa linha específica ("duplicate
-- column name") — é inofensivo, mas pode interromper a execução das linhas
-- seguintes do arquivo. Nesse caso, apague só essa linha do ALTER TABLE e
-- rode o restante do arquivo de novo (os INSERT/UPDATE são seguros de repetir).
--
-- Migração aditiva: modelo de permissões por funcionalidade.
-- NÃO contém nenhum DROP TABLE — pode rodar direto no D1 de produção, sem
-- afetar as tabelas existentes (users, sessions, links, user_unidades, etc.).
--
-- Rode com: wrangler d1 execute portal-saude-db --file=./migration_permissions.sql
--
-- O que este arquivo faz:
--   1. Cria a tabela role_permissions (teto de funcionalidades por papel).
--   2. Cria a tabela user_permissions (exceções por profissional, dentro do teto).
--   3. Adiciona a coluna feature_key em links (associa cada item do menu
--      Ferramentas a uma funcionalidade, pra filtrar por permissão).
--   4. Popula o teto padrão de cada papel (super_admin não entra — sempre
--      tem tudo liberado, isso é tratado direto no código).
--   5. Associa os itens de "Ferramentas" já cadastrados à funcionalidade
--      correspondente (feita por nome; se você já renomeou algum desses
--      itens, ajuste o WHERE title = '...' correspondente antes de rodar,
--      ou faça o ajuste depois pela aba Ferramentas mesmo).

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (role, feature_key)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INTEGER NOT NULL,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, feature_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE links ADD COLUMN feature_key TEXT;

-- Teto padrão por papel. Ajuste depois em Administração > Perfis de acesso.
-- 'user': tudo liberado, exceto Administração.
INSERT OR REPLACE INTO role_permissions (role, feature_key, enabled) VALUES
  ('user', 'receituario', 1),
  ('user', 'malotes', 1),
  ('user', 'facilitawhats', 1),
  ('user', 'mensageiro_esus', 1),
  ('user', 'documentos', 1),
  ('user', 'manuais', 1),
  ('user', 'relatorios', 1),
  ('user', 'administracao', 0);

-- 'admin_unidade': tudo liberado (já tinha acesso à Administração hoje).
INSERT OR REPLACE INTO role_permissions (role, feature_key, enabled) VALUES
  ('admin_unidade', 'receituario', 1),
  ('admin_unidade', 'malotes', 1),
  ('admin_unidade', 'facilitawhats', 1),
  ('admin_unidade', 'mensageiro_esus', 1),
  ('admin_unidade', 'documentos', 1),
  ('admin_unidade', 'manuais', 1),
  ('admin_unidade', 'relatorios', 1),
  ('admin_unidade', 'administracao', 1);

-- 'admin': tudo liberado.
INSERT OR REPLACE INTO role_permissions (role, feature_key, enabled) VALUES
  ('admin', 'receituario', 1),
  ('admin', 'malotes', 1),
  ('admin', 'facilitawhats', 1),
  ('admin', 'mensageiro_esus', 1),
  ('admin', 'documentos', 1),
  ('admin', 'manuais', 1),
  ('admin', 'relatorios', 1),
  ('admin', 'administracao', 1);

-- Associa os itens de Ferramentas já existentes à funcionalidade correspondente.
UPDATE links SET feature_key = 'malotes'         WHERE category = 'ferramenta' AND title LIKE '%Malote%';
UPDATE links SET feature_key = 'receituario'      WHERE category = 'ferramenta' AND title LIKE '%Prescri%';
UPDATE links SET feature_key = 'facilitawhats'    WHERE category = 'ferramenta' AND title LIKE '%Facilita%';
UPDATE links SET feature_key = 'mensageiro_esus'  WHERE category = 'ferramenta' AND (title LIKE '%esus%' OR title LIKE '%Mensageiro%');
