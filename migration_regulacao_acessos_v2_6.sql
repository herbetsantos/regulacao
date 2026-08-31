-- eMulti / Regulação de Vagas v2.6
-- Executar UMA VEZ (pode ser reaplicada com segurança) no portal-saude-db.
-- Não apaga dados.
--
-- Separa o papel do Portal das responsabilidades do eMulti.
-- Responsabilidades combináveis: Cadastrante, Regulador, Executor e Administrador.

CREATE TABLE IF NOT EXISTS regulacao_user_acessos (
  user_id INTEGER PRIMARY KEY,
  cadastrante INTEGER NOT NULL DEFAULT 0 CHECK (cadastrante IN (0,1)),
  regulador INTEGER NOT NULL DEFAULT 0 CHECK (regulador IN (0,1)),
  executor INTEGER NOT NULL DEFAULT 0 CHECK (executor IN (0,1)),
  administrador INTEGER NOT NULL DEFAULT 0 CHECK (administrador IN (0,1)),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Compatibilidade com vínculos já existentes.
-- Quem já emitia guia passa a ser Cadastrante.
INSERT OR IGNORE INTO regulacao_user_acessos (user_id)
SELECT DISTINCT user_id FROM regulacao_user_unidades WHERE pode_emitir = 1;

UPDATE regulacao_user_acessos
SET cadastrante = 1, updated_at = datetime('now')
WHERE EXISTS (
  SELECT 1 FROM regulacao_user_unidades ru
  WHERE ru.user_id = regulacao_user_acessos.user_id AND ru.pode_emitir = 1
);

-- Profissionais já vinculados a uma equipe passam a ser Executores.
INSERT OR IGNORE INTO regulacao_user_acessos (user_id)
SELECT DISTINCT user_id FROM regulacao_equipe_profissionais;

UPDATE regulacao_user_acessos
SET executor = 1, updated_at = datetime('now')
WHERE EXISTS (
  SELECT 1 FROM regulacao_equipe_profissionais ep
  WHERE ep.user_id = regulacao_user_acessos.user_id
);

-- Vínculo legado "pode_executar" reunia responsabilidades de fluxo e execução.
-- Para não retirar acesso após a migração, convertemos para Regulador + Executor.
INSERT OR IGNORE INTO regulacao_user_acessos (user_id)
SELECT DISTINCT user_id FROM regulacao_user_unidades WHERE pode_executar = 1;

UPDATE regulacao_user_acessos
SET regulador = 1, executor = 1, updated_at = datetime('now')
WHERE EXISTS (
  SELECT 1 FROM regulacao_user_unidades ru
  WHERE ru.user_id = regulacao_user_acessos.user_id AND ru.pode_executar = 1
);

-- Compatibilidade inicial: administradores atuais do Portal que já operavam a
-- configuração da Regulação recebem Administrador eMulti. A partir daqui os
-- dois papéis são independentes e podem ser alterados na Administração eMulti.
INSERT OR IGNORE INTO regulacao_user_acessos (user_id, administrador)
SELECT id, 1 FROM users WHERE active = 1 AND role = 'admin';

UPDATE regulacao_user_acessos
SET administrador = 1, updated_at = datetime('now')
WHERE user_id IN (SELECT id FROM users WHERE active = 1 AND role = 'admin');

-- A feature do Portal passa a significar apenas "pode abrir o eMulti".
-- O que o usuário faz lá dentro é definido pela tabela acima.
-- Sincronizamos TODOS os usuários ativos para evitar que uma permissão
-- genérica antiga permaneça ligada sem nenhuma responsabilidade eMulti.
INSERT INTO user_permissions (user_id, feature_key, enabled)
SELECT u.id, 'regulacao_vagas',
       CASE
         WHEN u.role = 'super_admin' THEN 1
         WHEN EXISTS (
           SELECT 1 FROM regulacao_user_acessos a
           WHERE a.user_id = u.id
             AND (a.cadastrante = 1 OR a.regulador = 1 OR a.executor = 1 OR a.administrador = 1)
         ) THEN 1
         ELSE 0
       END
FROM users u
WHERE u.active = 1
ON CONFLICT(user_id, feature_key) DO UPDATE SET enabled = excluded.enabled;
