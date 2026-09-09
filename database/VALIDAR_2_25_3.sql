-- Validação somente leitura — eMulti / Regulação 2.25.3
SELECT 'schema_version' item, version valor FROM emulti_schema_version WHERE id=1;
SELECT 'principal_equipes_pk' item, group_concat(name || ':' || pk, ',') valor FROM pragma_table_info('regulacao_principal_equipes') WHERE name IN ('principal_id','equipe_id');
SELECT 'tabela_profissional_equipes' item, COUNT(*) valor FROM sqlite_master WHERE type='table' AND name='regulacao_profissional_equipes';
SELECT 'profissionais_multiequipe' item, COUNT(*) valor FROM (SELECT profissional_id FROM regulacao_profissional_equipes GROUP BY profissional_id HAVING COUNT(*)>1);
SELECT 'foreign_key_violations' item, COUNT(*) valor FROM pragma_foreign_key_check;
