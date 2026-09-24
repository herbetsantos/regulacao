PRAGMA foreign_keys = ON;

-- eMulti / Regulação — agenda: intervalos e horário de almoço
-- Migração aditiva. Escalas existentes permanecem válidas.

ALTER TABLE agenda_escalas
ADD COLUMN intervalo_entre_atendimentos_min INTEGER NOT NULL DEFAULT 0;

ALTER TABLE agenda_escalas
ADD COLUMN almoco_inicio TEXT;

ALTER TABLE agenda_escalas
ADD COLUMN almoco_fim TEXT;

UPDATE emulti_schema_version
SET version = '2.27.1',
    updated_at = datetime('now')
WHERE id = 1;
