-- eMulti / Regulação 2.25.0 — validação somente leitura
SELECT 'schema_version' AS item, version AS valor FROM emulti_schema_version WHERE id=1;
SELECT 'gestor_column' AS item, COUNT(*) AS valor FROM pragma_table_info('regulacao_principal_acessos') WHERE name='gestor';
SELECT 'regulacao_etiquetas' AS item, COUNT(*) AS valor FROM sqlite_master WHERE type='table' AND name='regulacao_etiquetas';
SELECT 'guia_etiquetas' AS item, COUNT(*) AS valor FROM sqlite_master WHERE type='table' AND name='guia_etiquetas';
SELECT 'execucoes_administrativas' AS item, COUNT(*) AS valor FROM sqlite_master WHERE type='table' AND name='regulacao_execucoes_administrativas';
SELECT 'etiquetas_ativas' AS item, COUNT(*) AS valor FROM regulacao_etiquetas WHERE ativo=1;
SELECT 'guias' AS item, COUNT(*) AS valor FROM guias;
SELECT 'pacientes' AS item, COUNT(*) AS valor FROM pacientes;
