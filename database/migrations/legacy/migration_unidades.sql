-- Migração: cadastro de unidades de saúde no banco (antes vivia hardcoded em
-- receituario/index.html e functions/api/_unidades.js).
--
-- Passa a ser a fonte única de verdade para:
--  - a lista de unidades disponível no Receituário;
--  - a lista de unidades que um administrador pode atribuir a um usuário
--    comum (aba Usuários > Configurações > Unidades (Receituário));
--  - a lista de unidades que um Administrador de Unidade pode gerenciar
--    (aba Usuários > Configurações > Unidades que gerencia).
--
-- Rode com: wrangler d1 execute portal-saude-db --file=./migration_unidades.sql

CREATE TABLE IF NOT EXISTS unidades (
  code TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cnes TEXT,
  endereco TEXT,
  tel TEXT,
  -- Unidades inativas somem do Receituário e das telas de atribuição, mas
  -- não são apagadas (preserva histórico de atribuições já feitas).
  ativo INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Semeia com as unidades que já existiam hardcoded, preservando os mesmos
-- códigos usados em user_unidades (para não quebrar atribuições existentes).
INSERT OR IGNORE INTO unidades (code, nome, cnes, endereco, tel, sort_order) VALUES
('upa', 'UPA 24h Vereador Luiz dos Santos Faria', '7068824', 'Rua Alfredo Del''Vigna, 253 - Jordanésia, Cajamar/SP', '(11) 4447-4058', 1),
('policlinica', 'Policlínica Municipal de Cajamar', '4982037', 'Av. Dr. Antonio João Abdalla, 1500 - Cristais, Cajamar/SP', '(11) 4446-0100', 2),
('cer2', 'Centro Especializado em Reabilitação CER II', '5204887', 'Av. Dr. Antonio João Abdalla, 1500 - Cristais, Cajamar/SP', '(11) 4446-0100', 3),
('portal', 'ESF Carlos dos Santos', '968358', 'Rua das Cravinas, 198 - Portal Ipês III, Cajamar/SP', '(11) 4446-0124', 4),
('km43', 'Posto de Saúde Nadília de Oliveira Santos', '5270006', 'Rua Bela Vista, 1200 - São Benedito, Cajamar/SP', '(11) 4446-0115', 5),
('beloplanalto', 'PSF Belo Planalto', '3672891', 'Rua Nercílio José dos Santos, 58 - Polvilho, Cajamar/SP', '(11) 4446-0112', 6),
('marialuiza', 'PSF Dra. Maria de Lourdes Mendonça Bravo', '2096269', 'Av. Arujá, 208 - Colina Maria Luíza, Cajamar/SP', '(11) 4446-0116', 7),
('guaturinho', 'PSF Edivaldo Soares Massagardi', '7068840', 'Rua Barueri, 198 - Guaturinho, Cajamar/SP', '(11) 4446-0111', 8),
('parquesaoroberto', 'UBS Enf. Leontina Martins França', '2096242', 'Av. Dr. José Luíz Leme Maciel, 179 - Jordanésia, Cajamar/SP', '(11) 4446-0109', 9),
('ponunduva', 'USF Maria Aparecida Missé', '2096226', 'Rua Joaquim Rodrigues Pontes, 203 - Ponunduva, Cajamar/SP', '(11) 4446-0114', 10),
('cajamarcento', 'USF Vereador Joaquim Alves de Castro', '2096161', 'Av. Prof. Walter Ribas de Andrade, 544 - Água Fria, Cajamar/SP', '(11) 4446-0110', 11),
('jordanesia', 'UBS Enfermeiro Carlos Moreira da Silva', '2096234', 'Av. Antônio Cândido Machado, 1769 - Jordanésia, Cajamar/SP', '(11) 4446-0107', 12),
('polvilho', 'UBS Dra. Izabel Gratieri', '2096188', 'Rua Timburi, 121 - Panorama I - Polvilho, Cajamar/SP', '(11) 4446-0108', 13),
('manoelinacio', 'USF Manoel Inácio da Silva', '3437280', 'Av. das Juritis, 385 - Pq. Maria Aparecida, Cajamar/SP', '(11) 4446-0117', 14),
('ceo', 'Centro de Especialidades Odontológicas', '4075773', 'Av. Dr. Antonio João Abdalla, 1500 - 2º andar - Cristais, Cajamar/SP', '(11) 4446-0117', 15),
('caps', 'CAPS Cajamar', '9077618', 'Rua Rita Maria de Jesus, 20 - Polvilho, Cajamar/SP', '(11) 4446-0121', 16),
('capsij', 'CAPS Infanto/Juvenil', '499889', 'Rua das Moréias, 55 - Portal 3 - Polvilho, Cajamar/SP', '(11) 4446-0122', 17);
