-- eMulti Regulação — atualização do complemento no portal-saude-db
-- Versão suportada de origem: 2.17.4
-- Destino: 2.17.5
-- Não apaga dados.

CREATE TABLE IF NOT EXISTS emulti_schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Garante acesso ao eMulti aos usuários já vinculados a equipe/unidade ativa.
INSERT OR IGNORE INTO user_permissions (user_id, feature_key, enabled)
SELECT DISTINCT ep.user_id, 'regulacao_vagas', 1
FROM regulacao_equipe_profissionais ep
JOIN regulacao_equipes e ON e.id = ep.equipe_id AND e.ativo = 1
JOIN users u ON u.id = ep.user_id AND u.active = 1;
UPDATE user_permissions SET enabled=1
WHERE feature_key='regulacao_vagas' AND user_id IN (
  SELECT ep.user_id FROM regulacao_equipe_profissionais ep
  JOIN regulacao_equipes e ON e.id=ep.equipe_id AND e.ativo=1
  JOIN users u ON u.id=ep.user_id AND u.active=1
);
INSERT OR IGNORE INTO user_permissions (user_id, feature_key, enabled)
SELECT DISTINCT ru.user_id, 'regulacao_vagas', 1
FROM regulacao_user_unidades ru
JOIN unidades un ON un.code = ru.unidade_code AND un.ativo = 1
JOIN users u ON u.id = ru.user_id AND u.active = 1;
UPDATE user_permissions SET enabled=1
WHERE feature_key='regulacao_vagas' AND user_id IN (
  SELECT ru.user_id FROM regulacao_user_unidades ru
  JOIN unidades un ON un.code=ru.unidade_code AND un.ativo=1
  JOIN users u ON u.id=ru.user_id AND u.active=1
);

INSERT INTO emulti_schema_version (id, version, updated_at)
VALUES (1, '2.17.5', datetime('now'))
ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at;
