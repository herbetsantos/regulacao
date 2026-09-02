-- eMulti Regulação v2.15.2 — identificador público da guia
-- Execute UMA vez em regulacao-vagas-db.
-- Formato: AAAA + id com 6 dígitos (ex.: 2026000001).
-- O ano é obtido de created_at, portanto corresponde ao ano do cadastro da guia.

UPDATE guias
SET codigo_guia = substr(COALESCE(created_at, datetime('now')), 1, 4) || printf('%06d', id)
WHERE codigo_guia IS NULL
   OR trim(codigo_guia) = ''
   OR instr(codigo_guia, '-') > 0
   OR length(replace(codigo_guia, '-', '')) <> 10;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guias_codigo ON guias(codigo_guia);
