-- Validação somente leitura da evolução 2.19.0
SELECT id, version, updated_at FROM emulti_schema_version WHERE id=1;

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
    ('regulacao_local_audit')
)
SELECT nome AS tabela_ausente
FROM esperado
WHERE NOT EXISTS (
  SELECT 1 FROM sqlite_master WHERE type='table' AND name=esperado.nome
);

PRAGMA quick_check;
PRAGMA foreign_key_check;
