-- eMulti v2.8 — endereço estruturado para integração com BrasilAPI
-- Banco: regulacao-vagas-db (DB_REGULACAO)
-- Migração NÃO destrutiva. Execute uma única vez se preferir via console SQL.
-- Alternativamente, em Administração > Diagnóstico, use o reparo do banco.

ALTER TABLE pacientes ADD COLUMN cep TEXT;
ALTER TABLE pacientes ADD COLUMN logradouro TEXT;
ALTER TABLE pacientes ADD COLUMN numero TEXT;
ALTER TABLE pacientes ADD COLUMN complemento TEXT;
ALTER TABLE pacientes ADD COLUMN bairro TEXT;
ALTER TABLE pacientes ADD COLUMN municipio TEXT;
ALTER TABLE pacientes ADD COLUMN uf TEXT;
