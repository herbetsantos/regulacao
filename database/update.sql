PRAGMA foreign_keys = ON;
-- Portal Saúde 2.10.1 / eMulti 2.18.2 — atualização consolidada para o portal-saude-db.
-- Baseada na estrutura real informada em 03/09/2026. Execute UMA VEZ.
ALTER TABLE updates ADD COLUMN image_url TEXT;
ALTER TABLE updates ADD COLUMN image_alt TEXT;

-- eMulti Regulação 2.18.0 — portal-saude-db
-- Atualização consolidada baseada na estrutura real informada em 02/09/2026.
-- Não cria usuários/senhas e não apaga dados. Pode ser reexecutada.

-- eMulti Regulação — complemento do schema no portal-saude-db
-- Este arquivo pressupõe que o Portal Saúde já tenha seu schema-base (users, unidades,
-- user_permissions, links e tabelas regulacao_equipes/regulacao_equipe_*).
-- Não cria logins e não apaga dados.

CREATE TABLE IF NOT EXISTS regulacao_link_icons (
  link_id INTEGER PRIMARY KEY,
  icon_key TEXT NOT NULL DEFAULT 'links',
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS regulacao_user_acessos (
  user_id INTEGER PRIMARY KEY,
  cadastrante INTEGER NOT NULL DEFAULT 0 CHECK (cadastrante IN (0,1)),
  regulador INTEGER NOT NULL DEFAULT 0 CHECK (regulador IN (0,1)),
  executor INTEGER NOT NULL DEFAULT 0 CHECK (executor IN (0,1)),
  administrador INTEGER NOT NULL DEFAULT 0 CHECK (administrador IN (0,1)),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS regulacao_profissional_especialidades (
  user_id INTEGER NOT NULL,
  especialidade_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, especialidade_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS regulacao_profissionais_base (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
 especialidade TEXT NOT NULL,
 user_id INTEGER,
 ativo INTEGER NOT NULL DEFAULT 1,
 origem TEXT NOT NULL DEFAULT 'escala_emulti_2026',
 created_at TEXT DEFAULT (datetime('now')),
 updated_at TEXT DEFAULT (datetime('now')),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS regulacao_profissionais_base_lotacoes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 profissional_base_id INTEGER NOT NULL,
 unidade_nome TEXT NOT NULL,
 created_at TEXT DEFAULT (datetime('now')),
 UNIQUE(profissional_base_id, unidade_nome),
 FOREIGN KEY (profissional_base_id) REFERENCES regulacao_profissionais_base(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS regulacao_profissionais_base_escalas (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 lotacao_id INTEGER NOT NULL,
 dia_semana INTEGER NOT NULL CHECK(dia_semana BETWEEN 1 AND 5),
 hora_inicio TEXT,
 hora_fim TEXT,
 observacao TEXT,
 created_at TEXT DEFAULT (datetime('now')),
 UNIQUE(lotacao_id,dia_semana,hora_inicio,hora_fim),
 FOREIGN KEY (lotacao_id) REFERENCES regulacao_profissionais_base_lotacoes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_prof_base_user ON regulacao_profissionais_base(user_id);
CREATE INDEX IF NOT EXISTS idx_prof_base_esp ON regulacao_profissionais_base(especialidade,ativo);

CREATE TABLE IF NOT EXISTS emulti_schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Camila Nicomedes Negrao Pimentel','Nutrição',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Gustavo Oliveira do Nascimento','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Manuela Castilho de Almeida Sa','Fonoaudiologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Marcos Otavio de Matos','Fisioterapia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Monise Elza Pardal Pinto','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Ana Paula Bizarria','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Cristina Cavalcante Lima dos Santos','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Fabiana Rodrigues Lameira Belchior','Nutrição',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Gabriella Gonçalves Ramos Tupinelli','Fonoaudiologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Helena Derica Marques da Cunha','Fisioterapia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Manuella Mantovan Juliani','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Mariana Gomes Siqueira','Fisioterapia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Sara Simonato Bragile','Fonoaudiologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Angelina de Lourdes Escrovi','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Cristina Soares Zambello','Fonoaudiologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Danielle Sena Moura','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Elaine Franco Penteado','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Fernanda Cristina Belchior Oliveira Palma','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Luana Dias Campos','Nutrição',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Marcela Almeida Dias','Fisioterapia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('Maria Cristina Martin Durante','Fonoaudiologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('DENISE DA SILVA DAVID','Fisioterapia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('LAIS SANTANA SARMENTO','Fonoaudiologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('MARIANA BELCHIOR OLIVEIRA NARCISO','Nutrição',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('MOISES FERREIRA CAMARA','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('PATRICIA LILIANE DE OLIVEIRA TAVARES SILVA','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('PATRICIA SILVA MORAIS','Fisioterapia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT INTO regulacao_profissionais_base (nome,especialidade,ativo,origem)
VALUES ('PAULA CRISTINA MARCIANO','Psicologia',1,'escala_emulti_2026')
ON CONFLICT(nome) DO UPDATE SET especialidade=excluded.especialidade,ativo=1,updated_at=datetime('now');

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Posto de Saúde Nadilia de Oliveira Santos' FROM regulacao_profissionais_base WHERE nome='Camila Nicomedes Negrao Pimentel';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Camila Nicomedes Negrao Pimentel' AND l.unidade_nome='Posto de Saúde Nadilia de Oliveira Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Camila Nicomedes Negrao Pimentel' AND l.unidade_nome='Posto de Saúde Nadilia de Oliveira Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Dra Maria de Lourdes Mendonca Bravo' FROM regulacao_profissionais_base WHERE nome='Camila Nicomedes Negrao Pimentel';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Camila Nicomedes Negrao Pimentel' AND l.unidade_nome='Psf Dra Maria de Lourdes Mendonca Bravo';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Camila Nicomedes Negrao Pimentel' AND l.unidade_nome='Psf Dra Maria de Lourdes Mendonca Bravo';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Maria Aparecida Misse' FROM regulacao_profissionais_base WHERE nome='Camila Nicomedes Negrao Pimentel';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Camila Nicomedes Negrao Pimentel' AND l.unidade_nome='Usf Maria Aparecida Misse';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Posto de Saúde Nadilia de Oliveira Santos' FROM regulacao_profissionais_base WHERE nome='Gustavo Oliveira do Nascimento';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Gustavo Oliveira do Nascimento' AND l.unidade_nome='Posto de Saúde Nadilia de Oliveira Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Dra Maria de Lourdes Mendonca Bravo' FROM regulacao_profissionais_base WHERE nome='Gustavo Oliveira do Nascimento';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Gustavo Oliveira do Nascimento' AND l.unidade_nome='Psf Dra Maria de Lourdes Mendonca Bravo';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Maria Aparecida Misse' FROM regulacao_profissionais_base WHERE nome='Gustavo Oliveira do Nascimento';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Gustavo Oliveira do Nascimento' AND l.unidade_nome='Usf Maria Aparecida Misse';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Posto de Saúde Nadilia de Oliveira Santos' FROM regulacao_profissionais_base WHERE nome='Manuela Castilho de Almeida Sa';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Manuela Castilho de Almeida Sa' AND l.unidade_nome='Posto de Saúde Nadilia de Oliveira Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Dra Maria de Lourdes Mendonca Bravo' FROM regulacao_profissionais_base WHERE nome='Manuela Castilho de Almeida Sa';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Manuela Castilho de Almeida Sa' AND l.unidade_nome='Psf Dra Maria de Lourdes Mendonca Bravo';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Maria Aparecida Misse' FROM regulacao_profissionais_base WHERE nome='Manuela Castilho de Almeida Sa';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Manuela Castilho de Almeida Sa' AND l.unidade_nome='Usf Maria Aparecida Misse';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Posto de Saúde Nadilia de Oliveira Santos' FROM regulacao_profissionais_base WHERE nome='Marcos Otavio de Matos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Marcos Otavio de Matos' AND l.unidade_nome='Posto de Saúde Nadilia de Oliveira Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Dra Maria de Lourdes Mendonca Bravo' FROM regulacao_profissionais_base WHERE nome='Marcos Otavio de Matos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Marcos Otavio de Matos' AND l.unidade_nome='Psf Dra Maria de Lourdes Mendonca Bravo';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Maria Aparecida Misse' FROM regulacao_profissionais_base WHERE nome='Marcos Otavio de Matos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Marcos Otavio de Matos' AND l.unidade_nome='Usf Maria Aparecida Misse';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Posto de Saúde Nadilia de Oliveira Santos' FROM regulacao_profissionais_base WHERE nome='Monise Elza Pardal Pinto';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Monise Elza Pardal Pinto' AND l.unidade_nome='Posto de Saúde Nadilia de Oliveira Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Dra Maria de Lourdes Mendonca Bravo' FROM regulacao_profissionais_base WHERE nome='Monise Elza Pardal Pinto';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Monise Elza Pardal Pinto' AND l.unidade_nome='Psf Dra Maria de Lourdes Mendonca Bravo';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Monise Elza Pardal Pinto' AND l.unidade_nome='Psf Dra Maria de Lourdes Mendonca Bravo';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Maria Aparecida Misse' FROM regulacao_profissionais_base WHERE nome='Monise Elza Pardal Pinto';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Belo Planalto' FROM regulacao_profissionais_base WHERE nome='Ana Paula Bizarria';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Ana Paula Bizarria' AND l.unidade_nome='Psf Belo Planalto';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Dra Izabel Gratieri' FROM regulacao_profissionais_base WHERE nome='Ana Paula Bizarria';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Ana Paula Bizarria' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Ana Paula Bizarria' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Ana Paula Bizarria' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Ana Paula Bizarria' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Manoel Inacio da Silva' FROM regulacao_profissionais_base WHERE nome='Ana Paula Bizarria';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Belo Planalto' FROM regulacao_profissionais_base WHERE nome='Cristina Cavalcante Lima dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Cristina Cavalcante Lima dos Santos' AND l.unidade_nome='Psf Belo Planalto';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Dra Izabel Gratieri' FROM regulacao_profissionais_base WHERE nome='Cristina Cavalcante Lima dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Cristina Cavalcante Lima dos Santos' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Manoel Inacio da Silva' FROM regulacao_profissionais_base WHERE nome='Cristina Cavalcante Lima dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Cristina Cavalcante Lima dos Santos' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Belo Planalto' FROM regulacao_profissionais_base WHERE nome='Fabiana Rodrigues Lameira Belchior';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fabiana Rodrigues Lameira Belchior' AND l.unidade_nome='Psf Belo Planalto';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Dra Izabel Gratieri' FROM regulacao_profissionais_base WHERE nome='Fabiana Rodrigues Lameira Belchior';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fabiana Rodrigues Lameira Belchior' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fabiana Rodrigues Lameira Belchior' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Manoel Inacio da Silva' FROM regulacao_profissionais_base WHERE nome='Fabiana Rodrigues Lameira Belchior';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fabiana Rodrigues Lameira Belchior' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fabiana Rodrigues Lameira Belchior' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Belo Planalto' FROM regulacao_profissionais_base WHERE nome='Gabriella Gonçalves Ramos Tupinelli';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Gabriella Gonçalves Ramos Tupinelli' AND l.unidade_nome='Psf Belo Planalto';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Dra Izabel Gratieri' FROM regulacao_profissionais_base WHERE nome='Gabriella Gonçalves Ramos Tupinelli';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Gabriella Gonçalves Ramos Tupinelli' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Gabriella Gonçalves Ramos Tupinelli' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Manoel Inacio da Silva' FROM regulacao_profissionais_base WHERE nome='Gabriella Gonçalves Ramos Tupinelli';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Gabriella Gonçalves Ramos Tupinelli' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Gabriella Gonçalves Ramos Tupinelli' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Belo Planalto' FROM regulacao_profissionais_base WHERE nome='Helena Derica Marques da Cunha';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Dra Izabel Gratieri' FROM regulacao_profissionais_base WHERE nome='Helena Derica Marques da Cunha';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Helena Derica Marques da Cunha' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Helena Derica Marques da Cunha' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Helena Derica Marques da Cunha' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Helena Derica Marques da Cunha' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Manoel Inacio da Silva' FROM regulacao_profissionais_base WHERE nome='Helena Derica Marques da Cunha';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Helena Derica Marques da Cunha' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Belo Planalto' FROM regulacao_profissionais_base WHERE nome='Manuella Mantovan Juliani';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'08:00','14:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Manuella Mantovan Juliani' AND l.unidade_nome='Psf Belo Planalto';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'08:00','14:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Manuella Mantovan Juliani' AND l.unidade_nome='Psf Belo Planalto';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Dra Izabel Gratieri' FROM regulacao_profissionais_base WHERE nome='Manuella Mantovan Juliani';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Manoel Inacio da Silva' FROM regulacao_profissionais_base WHERE nome='Manuella Mantovan Juliani';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'08:00','14:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Manuella Mantovan Juliani' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'08:00','14:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Manuella Mantovan Juliani' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'08:00','14:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Manuella Mantovan Juliani' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Belo Planalto' FROM regulacao_profissionais_base WHERE nome='Mariana Gomes Siqueira';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Mariana Gomes Siqueira' AND l.unidade_nome='Psf Belo Planalto';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Mariana Gomes Siqueira' AND l.unidade_nome='Psf Belo Planalto';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Dra Izabel Gratieri' FROM regulacao_profissionais_base WHERE nome='Mariana Gomes Siqueira';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Mariana Gomes Siqueira' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Manoel Inacio da Silva' FROM regulacao_profissionais_base WHERE nome='Mariana Gomes Siqueira';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Psf Belo Planalto' FROM regulacao_profissionais_base WHERE nome='Sara Simonato Bragile';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Sara Simonato Bragile' AND l.unidade_nome='Psf Belo Planalto';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Dra Izabel Gratieri' FROM regulacao_profissionais_base WHERE nome='Sara Simonato Bragile';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Sara Simonato Bragile' AND l.unidade_nome='UBS Dra Izabel Gratieri';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'Usf Manoel Inacio da Silva' FROM regulacao_profissionais_base WHERE nome='Sara Simonato Bragile';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Sara Simonato Bragile' AND l.unidade_nome='Usf Manoel Inacio da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enf Leontina Martins Franca' FROM regulacao_profissionais_base WHERE nome='Angelina de Lourdes Escrovi';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enfermeiro Carlos Moreira da Silva' FROM regulacao_profissionais_base WHERE nome='Angelina de Lourdes Escrovi';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enf Leontina Martins Franca' FROM regulacao_profissionais_base WHERE nome='Cristina Soares Zambello';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Cristina Soares Zambello' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enfermeiro Carlos Moreira da Silva' FROM regulacao_profissionais_base WHERE nome='Cristina Soares Zambello';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Cristina Soares Zambello' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Cristina Soares Zambello' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enf Leontina Martins Franca' FROM regulacao_profissionais_base WHERE nome='Danielle Sena Moura';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Danielle Sena Moura' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enfermeiro Carlos Moreira da Silva' FROM regulacao_profissionais_base WHERE nome='Danielle Sena Moura';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Danielle Sena Moura' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Danielle Sena Moura' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enf Leontina Martins Franca' FROM regulacao_profissionais_base WHERE nome='Elaine Franco Penteado';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Elaine Franco Penteado' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enfermeiro Carlos Moreira da Silva' FROM regulacao_profissionais_base WHERE nome='Elaine Franco Penteado';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Elaine Franco Penteado' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Elaine Franco Penteado' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enf Leontina Martins Franca' FROM regulacao_profissionais_base WHERE nome='Fernanda Cristina Belchior Oliveira Palma';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fernanda Cristina Belchior Oliveira Palma' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fernanda Cristina Belchior Oliveira Palma' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fernanda Cristina Belchior Oliveira Palma' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enfermeiro Carlos Moreira da Silva' FROM regulacao_profissionais_base WHERE nome='Fernanda Cristina Belchior Oliveira Palma';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fernanda Cristina Belchior Oliveira Palma' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Fernanda Cristina Belchior Oliveira Palma' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enf Leontina Martins Franca' FROM regulacao_profissionais_base WHERE nome='Luana Dias Campos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Luana Dias Campos' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Luana Dias Campos' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enfermeiro Carlos Moreira da Silva' FROM regulacao_profissionais_base WHERE nome='Luana Dias Campos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Luana Dias Campos' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enf Leontina Martins Franca' FROM regulacao_profissionais_base WHERE nome='Marcela Almeida Dias';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'08:00','14:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Marcela Almeida Dias' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'10:00','15:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Marcela Almeida Dias' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'10:00','17:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Marcela Almeida Dias' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enfermeiro Carlos Moreira da Silva' FROM regulacao_profissionais_base WHERE nome='Marcela Almeida Dias';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'08:00','14:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Marcela Almeida Dias' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Marcela Almeida Dias' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enf Leontina Martins Franca' FROM regulacao_profissionais_base WHERE nome='Maria Cristina Martin Durante';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Maria Cristina Martin Durante' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Maria Cristina Martin Durante' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enfermeiro Carlos Moreira da Silva' FROM regulacao_profissionais_base WHERE nome='Maria Cristina Martin Durante';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Maria Cristina Martin Durante' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enf Leontina Martins Franca' FROM regulacao_profissionais_base WHERE nome='Mariana Gomes Siqueira';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Mariana Gomes Siqueira' AND l.unidade_nome='UBS Enf Leontina Martins Franca';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'UBS Enfermeiro Carlos Moreira da Silva' FROM regulacao_profissionais_base WHERE nome='Mariana Gomes Siqueira';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='Mariana Gomes Siqueira' AND l.unidade_nome='UBS Enfermeiro Carlos Moreira da Silva';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'ESF Carlos dos Santos' FROM regulacao_profissionais_base WHERE nome='DENISE DA SILVA DAVID';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='DENISE DA SILVA DAVID' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='DENISE DA SILVA DAVID' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'PSF Edivaldo Soares Massagardi' FROM regulacao_profissionais_base WHERE nome='DENISE DA SILVA DAVID';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'USF Vereador Joaquim Alves de Castro' FROM regulacao_profissionais_base WHERE nome='DENISE DA SILVA DAVID';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='DENISE DA SILVA DAVID' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='DENISE DA SILVA DAVID' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','13:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='DENISE DA SILVA DAVID' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'ESF Carlos dos Santos' FROM regulacao_profissionais_base WHERE nome='LAIS SANTANA SARMENTO';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','12:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='LAIS SANTANA SARMENTO' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','12:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='LAIS SANTANA SARMENTO' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'PSF Edivaldo Soares Massagardi' FROM regulacao_profissionais_base WHERE nome='LAIS SANTANA SARMENTO';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','12:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='LAIS SANTANA SARMENTO' AND l.unidade_nome='PSF Edivaldo Soares Massagardi';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'07:00','12:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='LAIS SANTANA SARMENTO' AND l.unidade_nome='PSF Edivaldo Soares Massagardi';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'USF Vereador Joaquim Alves de Castro' FROM regulacao_profissionais_base WHERE nome='LAIS SANTANA SARMENTO';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='LAIS SANTANA SARMENTO' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'ESF Carlos dos Santos' FROM regulacao_profissionais_base WHERE nome='MARIANA BELCHIOR OLIVEIRA NARCISO';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'11:00','17:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='MARIANA BELCHIOR OLIVEIRA NARCISO' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'11:00','17:00','Horário normalizado da origem: 11:00: 17:00'
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='MARIANA BELCHIOR OLIVEIRA NARCISO' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'PSF Edivaldo Soares Massagardi' FROM regulacao_profissionais_base WHERE nome='MARIANA BELCHIOR OLIVEIRA NARCISO';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'11:00','17:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='MARIANA BELCHIOR OLIVEIRA NARCISO' AND l.unidade_nome='PSF Edivaldo Soares Massagardi';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'USF Vereador Joaquim Alves de Castro' FROM regulacao_profissionais_base WHERE nome='MARIANA BELCHIOR OLIVEIRA NARCISO';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'11:00','17:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='MARIANA BELCHIOR OLIVEIRA NARCISO' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,5,'11:00','17:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='MARIANA BELCHIOR OLIVEIRA NARCISO' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'ESF Carlos dos Santos' FROM regulacao_profissionais_base WHERE nome='MOISES FERREIRA CAMARA';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='MOISES FERREIRA CAMARA' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'PSF Edivaldo Soares Massagardi' FROM regulacao_profissionais_base WHERE nome='MOISES FERREIRA CAMARA';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'USF Vereador Joaquim Alves de Castro' FROM regulacao_profissionais_base WHERE nome='MOISES FERREIRA CAMARA';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='MOISES FERREIRA CAMARA' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='MOISES FERREIRA CAMARA' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'ESF Carlos dos Santos' FROM regulacao_profissionais_base WHERE nome='PATRICIA LILIANE DE OLIVEIRA TAVARES SILVA';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='PATRICIA LILIANE DE OLIVEIRA TAVARES SILVA' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='PATRICIA LILIANE DE OLIVEIRA TAVARES SILVA' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'PSF Edivaldo Soares Massagardi' FROM regulacao_profissionais_base WHERE nome='PATRICIA LILIANE DE OLIVEIRA TAVARES SILVA';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='PATRICIA LILIANE DE OLIVEIRA TAVARES SILVA' AND l.unidade_nome='PSF Edivaldo Soares Massagardi';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'USF Vereador Joaquim Alves de Castro' FROM regulacao_profissionais_base WHERE nome='PATRICIA LILIANE DE OLIVEIRA TAVARES SILVA';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'ESF Carlos dos Santos' FROM regulacao_profissionais_base WHERE nome='PATRICIA SILVA MORAIS';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,1,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='PATRICIA SILVA MORAIS' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='PATRICIA SILVA MORAIS' AND l.unidade_nome='ESF Carlos dos Santos';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'PSF Edivaldo Soares Massagardi' FROM regulacao_profissionais_base WHERE nome='PATRICIA SILVA MORAIS';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='PATRICIA SILVA MORAIS' AND l.unidade_nome='PSF Edivaldo Soares Massagardi';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'USF Vereador Joaquim Alves de Castro' FROM regulacao_profissionais_base WHERE nome='PATRICIA SILVA MORAIS';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'ESF Carlos dos Santos' FROM regulacao_profissionais_base WHERE nome='PAULA CRISTINA MARCIANO';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'PSF Edivaldo Soares Massagardi' FROM regulacao_profissionais_base WHERE nome='PAULA CRISTINA MARCIANO';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,2,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='PAULA CRISTINA MARCIANO' AND l.unidade_nome='PSF Edivaldo Soares Massagardi';

INSERT OR IGNORE INTO regulacao_profissionais_base_lotacoes (profissional_base_id,unidade_nome)
SELECT id,'USF Vereador Joaquim Alves de Castro' FROM regulacao_profissionais_base WHERE nome='PAULA CRISTINA MARCIANO';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,3,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='PAULA CRISTINA MARCIANO' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

INSERT OR IGNORE INTO regulacao_profissionais_base_escalas (lotacao_id,dia_semana,hora_inicio,hora_fim,observacao)
SELECT l.id,4,'07:00','18:00',NULL
FROM regulacao_profissionais_base_lotacoes l JOIN regulacao_profissionais_base p ON p.id=l.profissional_base_id
WHERE p.nome='PAULA CRISTINA MARCIANO' AND l.unidade_nome='USF Vereador Joaquim Alves de Castro';

-- As classes Cadastrante, Regulador, Executor e Administrador são definidas
-- explicitamente pelo Administrador. O vínculo com equipe/unidade concede
-- acesso ao eMulti, mas não altera automaticamente essas classes.

INSERT INTO user_permissions (user_id, feature_key, enabled)
SELECT u.id, 'regulacao_vagas',
       CASE
         WHEN u.role = 'super_admin' THEN 1
         WHEN EXISTS (SELECT 1 FROM regulacao_user_acessos a WHERE a.user_id=u.id AND (a.cadastrante=1 OR a.regulador=1 OR a.executor=1 OR a.administrador=1)) THEN 1
         WHEN EXISTS (SELECT 1 FROM regulacao_equipe_profissionais ep JOIN regulacao_equipes e ON e.id=ep.equipe_id AND e.ativo=1 WHERE ep.user_id=u.id) THEN 1
         WHEN EXISTS (SELECT 1 FROM regulacao_user_unidades ru JOIN unidades un ON un.code=ru.unidade_code AND un.ativo=1 WHERE ru.user_id=u.id) THEN 1
         ELSE 0
       END
FROM users u WHERE u.active=1
ON CONFLICT(user_id, feature_key) DO UPDATE SET enabled=excluded.enabled;

INSERT INTO emulti_schema_version (id, version, updated_at)
VALUES (1, '2.18.2', datetime('now'))
ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at;

-- Comunicação interna, suporte e chamados (Portal + eMulti)
CREATE TABLE IF NOT EXISTS chat_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  internal_retention_days INTEGER NOT NULL DEFAULT 30 CHECK (internal_retention_days BETWEEN 1 AND 3650),
  support_retention_days INTEGER NOT NULL DEFAULT 30 CHECK (support_retention_days BETWEEN 1 AND 3650),
  updated_by INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
INSERT OR IGNORE INTO chat_config (id, internal_retention_days, support_retention_days) VALUES (1, 30, 30);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('internal','support')),
  title TEXT,
  created_by INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_internal_singleton ON chat_rooms(type) WHERE type='internal';
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_support_user_open ON chat_rooms(created_by) WHERE type='support' AND status='open';
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type_updated ON chat_rooms(type, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'portal' CHECK (platform IN ('portal','emulti')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at, id);

CREATE TABLE IF NOT EXISTS chamados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL DEFAULT 'portal' CHECK (platform IN ('portal','emulti','ambos')),
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa','normal','alta','critica')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_analise','em_atendimento','aguardando_usuario','resolvido','encerrado')),
  requester_user_id INTEGER NOT NULL,
  assigned_user_id INTEGER,
  source_room_id INTEGER,
  resolution TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  closed_at TEXT,
  FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_room_id) REFERENCES chat_rooms(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_chamados_status_updated ON chamados(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chamados_requester ON chamados(requester_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chamado_eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chamado_id INTEGER NOT NULL,
  actor_user_id INTEGER,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_chamado_eventos_chamado ON chamado_eventos(chamado_id, created_at, id);

-- Base documental para o futuro Assistente de Rotinas (sem IA ativada nesta versão)
CREATE TABLE IF NOT EXISTS assistente_documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source_scope TEXT NOT NULL CHECK (source_scope IN ('municipal','federal')),
  issuing_body TEXT,
  version_label TEXT,
  subject TEXT,
  source_url TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  effective_date TEXT,
  supersedes_id INTEGER,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (supersedes_id) REFERENCES assistente_documentos(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_assistente_docs_scope_active ON assistente_documentos(source_scope, active, subject);





-- v2.10.1 — acessos opt-in aos ambientes externos Produção e Apoio Clínico
INSERT INTO user_permissions (user_id, feature_key, enabled)
SELECT id, 'producao', 0 FROM users WHERE role <> 'super_admin'
ON CONFLICT(user_id, feature_key) DO NOTHING;

INSERT INTO user_permissions (user_id, feature_key, enabled)
SELECT id, 'apoio_clinico', 0 FROM users WHERE role <> 'super_admin'
ON CONFLICT(user_id, feature_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS app_db_meta (
  app_key TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO app_db_meta (app_key, schema_version, updated_at)
VALUES ('portal_saude', '2.10.1', datetime('now'))
ON CONFLICT(app_key) DO UPDATE SET schema_version=excluded.schema_version, updated_at=excluded.updated_at;


-- v2.9.1 — presença, não lidas e atendimento de suporte
CREATE TABLE IF NOT EXISTS chat_presence (
  user_id INTEGER PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'portal' CHECK (platform IN ('portal','emulti')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_presence_last_seen ON chat_presence(last_seen DESC);

CREATE TABLE IF NOT EXISTS chat_read_state (
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  last_read_message_id INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_read_state_user ON chat_read_state(user_id, updated_at DESC);
