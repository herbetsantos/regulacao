-- eMulti / Regulação 2.26.3
-- ARQUIVO DE COMPATIBILIDADE: NÃO use este arquivo para atualizar o banco.
--
-- O antigo update.sql pertencia à linha 2.18.x e podia rebaixar o marcador de
-- versão do schema quando executado em uma base moderna. Ele foi aposentado.
--
-- Caminho correto:
--   025_consolidacao_2_25_0.sql       (se ainda não aplicada)
--   026_multiplas_equipes_profissional.sql (se ainda não aplicada)
--   027_desmembramento_portal.sql     (2.26.0)
--   028_restaurar_acesso_interno.sql  (2.26.3)
--
-- Esta consulta é somente leitura e existe para evitar execução destrutiva/acidental.
SELECT version AS schema_atual, updated_at
FROM emulti_schema_version
WHERE id = 1;
