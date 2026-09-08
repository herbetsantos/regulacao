-- eMulti / Regulação 2.20.0 — validação somente leitura

SELECT id, version, updated_at
FROM emulti_schema_version
WHERE id = 1;

SELECT
  (SELECT COUNT(*) FROM pragma_table_info('regulacao_principal_acessos') WHERE name='organizador') AS organizador,
  (SELECT COUNT(*) FROM pragma_table_info('agenda_escalas') WHERE name='profissional_id') AS escala_profissional_id,
  (SELECT COUNT(*) FROM pragma_table_info('agenda_individuais') WHERE name='profissional_id') AS individual_profissional_id,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='agenda_grupo_profissionais') AS grupo_profissionais;

PRAGMA quick_check;
PRAGMA foreign_key_check;
