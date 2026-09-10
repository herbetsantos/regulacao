-- Validação somente leitura — eMulti / Regulação 2.26.0
SELECT version AS schema_version FROM emulti_schema_version WHERE id=1;

SELECT name
FROM sqlite_master
WHERE type='table'
  AND name IN (
    'regulacao_principals',
    'regulacao_superusers',
    'regulacao_auth_sessions',
    'regulacao_user_preferences',
    'regulacao_unidades',
    'regulacao_equipes',
    'regulacao_equipe_unidades',
    'regulacao_migration_state'
  )
ORDER BY name;

SELECT COUNT(*) AS principals FROM regulacao_principals;
SELECT COUNT(*) AS superusers FROM regulacao_superusers;
SELECT COUNT(*) AS unidades FROM regulacao_unidades;
SELECT COUNT(*) AS equipes FROM regulacao_equipes;
SELECT value AS portal_operacional_importado
FROM regulacao_migration_state
WHERE key='portal_operacional_importado';

PRAGMA quick_check;
PRAGMA foreign_key_check;
