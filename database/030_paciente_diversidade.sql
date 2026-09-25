PRAGMA defer_foreign_keys = ON;

CREATE TABLE pacientes_2_27_2 (
  cpf TEXT PRIMARY KEY,
  cns TEXT,
  nome TEXT NOT NULL,
  nome_social TEXT,
  data_nascimento TEXT NOT NULL,
  sexo TEXT NOT NULL CHECK (sexo IN ('F','M','I')),
  identidade_genero TEXT,
  tel1 TEXT,
  tel2 TEXT,
  tel3 TEXT,
  unidade_referencia_code TEXT NOT NULL,
  endereco TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  uf TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO pacientes_2_27_2 (
  cpf,cns,nome,nome_social,data_nascimento,sexo,identidade_genero,
  tel1,tel2,tel3,unidade_referencia_code,endereco,
  cep,logradouro,numero,complemento,bairro,municipio,uf,created_at,updated_at
)
SELECT
  cpf,cns,nome,NULL,data_nascimento,sexo,NULL,
  tel1,tel2,tel3,unidade_referencia_code,endereco,
  cep,logradouro,numero,complemento,bairro,municipio,uf,created_at,updated_at
FROM pacientes;

DROP TABLE pacientes;
ALTER TABLE pacientes_2_27_2 RENAME TO pacientes;

INSERT INTO emulti_schema_version(id,version,updated_at)
VALUES(1,'2.27.2',datetime('now'))
ON CONFLICT(id) DO UPDATE SET version='2.27.2',updated_at=datetime('now');

PRAGMA foreign_key_check;
PRAGMA defer_foreign_keys = OFF;
