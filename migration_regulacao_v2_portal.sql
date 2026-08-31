-- eMulti / Regulação de Vagas — migração v2
-- Rode no banco COMPARTILHADO do Portal:
--   wrangler d1 execute portal-saude-db --remote --file=./migration_regulacao_v2.sql
--
-- Regra funcional: cada profissional pode pertencer a somente UMA equipe.
-- Se o comando do índice único falhar, há vínculos duplicados existentes;
-- corrija-os na administração antes de repetir esta migração.

CREATE UNIQUE INDEX IF NOT EXISTS idx_regulacao_equipe_prof_user_unica
  ON regulacao_equipe_profissionais(user_id);

-- Mapeamento de ícones usado pela grade "Links úteis" do módulo eMulti.
-- Os links continuam sendo exatamente os mesmos da tabela links do Portal.
CREATE TABLE IF NOT EXISTS regulacao_link_icons (
  link_id INTEGER PRIMARY KEY,
  icon_key TEXT NOT NULL DEFAULT 'links',
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);
