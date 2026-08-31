-- Portal Saúde Cajamar / eMulti — preferência de aparência compartilhada
-- Execute UMA VEZ no banco portal-saude-db.
ALTER TABLE users
ADD COLUMN theme TEXT NOT NULL DEFAULT 'light'
CHECK (theme IN ('auto','light','dark','contrast'));
