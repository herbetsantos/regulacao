-- eMulti v2.9 — Integração e-SUS PEC
-- Executar UMA VEZ no banco regulacao-vagas-db caso prefira migração manual.
-- Não apaga nem altera registros existentes.

ALTER TABLE pacientes ADD COLUMN cns TEXT;
