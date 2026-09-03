-- eMulti Regulação 2.17.6 — portal-saude-db
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
VALUES (1, '2.17.6', datetime('now'))
ON CONFLICT(id) DO UPDATE SET version=excluded.version, updated_at=excluded.updated_at;
