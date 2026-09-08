-- eMulti / Regulação — auditoria somente leitura da Administração 2.20.x
-- Execute no regulacao-vagas-db. Não altera dados.

SELECT id, version, updated_at
FROM emulti_schema_version
WHERE id=1;

WITH esperado(nome) AS (
  VALUES
    ('regulacao_local_users'),
    ('regulacao_local_sessions'),
    ('regulacao_login_attempts'),
    ('regulacao_principal_acessos'),
    ('regulacao_principal_unidades'),
    ('regulacao_principal_equipes'),
    ('regulacao_profissionais'),
    ('regulacao_profissional_vinculos'),
    ('regulacao_local_audit'),
    ('agenda_grupo_profissionais')
)
SELECT nome AS tabela_ausente
FROM esperado
WHERE NOT EXISTS (
  SELECT 1 FROM sqlite_master
  WHERE type='table' AND name=esperado.nome
);

SELECT
  (SELECT COUNT(*) FROM pragma_table_info('regulacao_principal_acessos') WHERE name='organizador') AS organizador,
  (SELECT COUNT(*) FROM pragma_table_info('agenda_escalas') WHERE name='profissional_id') AS agenda_escalas_profissional_id,
  (SELECT COUNT(*) FROM pragma_table_info('agenda_individuais') WHERE name='profissional_id') AS agenda_individuais_profissional_id,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='agenda_grupo_profissionais') AS agenda_grupo_profissionais;

PRAGMA quick_check;
PRAGMA foreign_key_check;
