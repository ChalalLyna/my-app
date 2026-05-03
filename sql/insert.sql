-- ============================================================
--  Donnees de test - v2
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Compte
-- ------------------------------------------------------------
INSERT INTO Compte (IdCompte, email, mdp, DateCreation) VALUES
(1, 'admin@cyberlab.io',       '$2a$12$LRrMVxTCMGVS7WbXBwcmxuSBmFmRoRMnFhmLovlMpbsVPQvAJFBxy',   '2024-01-01'),
(2, 'consultant1@cyberlab.io', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '2024-01-05'),
(3, 'consultant2@cyberlab.io', '$2a$12$GRvPvqGvmFQJMqNFRHbRyuVqyidBFBqxFr0C/l3mPYkNZJo9HBZBC', '2024-01-06'),
(4, 'apprenant1@cyberlab.io',  '$2a$12$TfzM1BiFBSqmKMbBVJxZpu/FZoF4E0g9VWrFjJmFBnSfRy9G0tU4y',   '2024-02-01'),
(5, 'apprenant2@cyberlab.io',  '$2a$12$MFvBa/5A1lQdM8HXKUFRAO6f.jG0MfBJfvMHqA4OJND2hJJC8NQRG',   '2024-02-15');
--IdCompte 1 → Admin@1234
--IdCompte 2 → Consult@1234
--IdCompte 3 → Consult@5678
--IdCompte 4 → Learn@1234
--IdCompte 5 → Learn@5678
-- ------------------------------------------------------------
-- Utilisateur
-- ------------------------------------------------------------
INSERT INTO Utilisateur (IdUtilisateur, nom, prenom, role, IdCompte) VALUES
(1, 'Martin',  'Sophie', 'admin',      1),
(2, 'Dupont',  'Lucas',  'consultant', 2),
(3, 'Bernard', 'Emma',   'consultant', 3),
(4, 'Moreau',  'Noah',   'apprenant',  4),
(5, 'Lefevre', 'Chloe',  'apprenant',  5);

-- ------------------------------------------------------------
-- MachineVirtuelle
-- ------------------------------------------------------------
INSERT INTO MachineVirtuelle 
(nomMachine, OS, IP, Vlan, VmIdProxmox, CPUmax, RAMmax, Disk)
VALUES
('GOADLightec7eaa-wazuh-server', 'kali linux','10.2.20.80', '20', 102, '4', '8589934592', '268435456000'),
('GOADLightec7eaa-caldera-server', 'debian 12 ', '10.2.30.49', '30', 103, '2', '4294967296', '214748364800'),
('GOADLightec7eaa-appli-web-server', 'debian 12', '10.2.40.90', '40', 105, '4', '4294967296', '214748364800'),
('GOADLightec7eaa-router-debian11-x64', 'debian 11', NULL, NULL, 108, '2', '2147483648', '214748364800'),
('GOADLight-DC01', 'Windows Server 2019', '10.2.10.10','10', 201, '2', '4294967296', '268435456000'),
('GOADLight-DC02', 'Windows Server 2019', '10.2.10.11', '10', 202, '2', '4294967296', '268435456000'),
('GOADLight-SRV02', 'Windows Server 2019', '10.2.10.22', '10', 203, '2', '4294967296', '268435456000');

-- ------------------------------------------------------------
-- ResultatMission
-- ------------------------------------------------------------
INSERT INTO ResultatMission (IdResultatMission, description, rapport) VALUES
(1, 'Audit complet SI client BankSecure',       '3 vulnerabilites critiques identifiees, correctifs recommandes.'),
(2, 'Test penetration reseau interne ShopCorp', 'Acces non autorise au VLAN admin obtenu via SSRF.');

-- ------------------------------------------------------------
-- Mission
-- ------------------------------------------------------------
INSERT INTO Mission (IdMission, titre, client, statut, DateDebut, DateFin, description, IdConsultant, IdResultatMission) VALUES
(1, 'Pentest BankSecure 2024', 'BankSecure', 'terminee', '2024-03-01', '2024-03-31', 'Audit securite complet du SI de BankSecure.', 2, 1),
(2, 'Pentest ShopCorp 2024',   'ShopCorp',   'en cours', '2024-06-01', NULL,         'Test intrusion reseau interne ShopCorp.',      3, 2);

-- ------------------------------------------------------------
-- Actif
-- ------------------------------------------------------------
INSERT INTO Actif
(nom, catégorie, description, TypeActif, IdVM, IdAdministrateur, IdMission)
VALUES
('GOAD-DC01 : kingslanding', 'active directory' ,'controleur de domaine', 'lab', 5, NULL, NULL),
('GOAD-DC02 : winterfell', 'active directory' , 'controleur de domaine', 'lab', 6, NULL, NULL),
('GOAD-SRV02 : castelblack ', 'active directory', 'serveur', 'lab', 7, NULL, NULL);
-- ------------------------------------------------------------
-- Technique
-- ------------------------------------------------------------
INSERT INTO Technique (IdTechnique, mitreID, nom, tactique, description) VALUES
(1, 'T1190', 'Exploit Public-Facing Application', 'Initial Access',      'Exploitation application exposee publiquement.'),
(2, 'T1059', 'Command and Scripting Interpreter',  'Execution',           'Utilisation interpreteurs de commandes.'),
(3, 'T1078', 'Valid Accounts',                     'Privilege Escalation','Utilisation de comptes legitimes compromis.'),
(4, 'T1110', 'Brute Force',                        'Credential Access',   'Tentatives repetees pour deviner des identifiants.'),
(5, 'T1046', 'Network Service Discovery',          'Discovery',           'Identification des services reseau actifs.');

-- ------------------------------------------------------------
-- ProfilAdversaire
-- ------------------------------------------------------------
INSERT INTO ProfilAdversaire (IdProfil, nom, description) VALUES
(1, 'Script Kiddie',  'Attaquant peu experimente utilisant des outils automatises.'),
(2, 'Insider Threat', 'Menace interne avec acces legitimes au SI.'),
(3, 'APT Simule',     'Simulation groupe APT avec techniques avancees.');

-- ------------------------------------------------------------
-- CompositionProfil
-- ------------------------------------------------------------
INSERT INTO CompositionProfil (IdProfil, IdTechnique) VALUES
(1, 1), (1, 4),
(2, 3), (2, 2),
(3, 1), (3, 2), (3, 3), (3, 5);

-- ------------------------------------------------------------
-- RegleDeDetection
-- ------------------------------------------------------------
INSERT INTO RegleDeDetection (IdRegle, DateCreation, description) VALUES
(1, '2024-01-20', 'Detection tentatives connexion multiples echouees (brute force)'),
(2, '2024-01-25', 'Detection injection SQL dans parametres HTTP'),
(3, '2024-02-10', 'Detection scan de ports reseau'),
(4, '2024-03-05', 'Regle BankSecure : acces hors horaires ouvrables'),
(5, '2024-06-10', 'Regle CTI : C2 Cobalt Strike detecte'),
(6, '2024-06-15', 'Regle ShopCorp : anomalie sur exports CSV');

-- ------------------------------------------------------------
-- Sous-types RegleDeDetection
-- ------------------------------------------------------------
INSERT INTO RegleCTI (IdRegle, source, DateAjout) VALUES
(1, 'MITRE ATT&CK',               '2024-01-20'),
(2, 'OWASP Top 10',               '2024-01-25'),
(3, 'Sigma Rules',                '2024-02-10'),
(5, 'RecordedFuture Threat Feed', '2024-06-10');

INSERT INTO RegleClient (IdRegle, IdMission) VALUES
(6, 2);

INSERT INTO RegleAjouteParConsultant (IdRegle, IdConsultant, IdMission) VALUES
(4, 2, 1);

-- ------------------------------------------------------------
-- CouvertureDetection
-- ------------------------------------------------------------
INSERT INTO CouvertureDetection (IdRegle, IdTechnique) VALUES
(1, 4), (2, 1), (3, 5), (4, 3), (5, 2), (6, 1);

-- ------------------------------------------------------------
-- ResultatAttaque (IdResultatMission nullable pour labs hors mission)
-- ------------------------------------------------------------
INSERT INTO ResultatAttaque (IdResultatAttaque, description, rapport, IdResultatMission) VALUES
(1, 'SQLi reussie sur formulaire login',          'CVSS 9.1 - acces BDD obtenu.',        1),
(2, 'Brute force SSH bloque par fail2ban',         'Attaque detectee apres 5 tentatives.', 1),
(3, 'Escalade de privileges via SUID',             'Root obtenu sur VM Ubuntu.',           1),
(4, 'Scan reseau ShopCorp 12 services trouves',   'Rapport decouverte reseau complet.',   2),
(5, 'XSS stocke injecte sur page commentaires',   'Cookie admin vole en demonstration.',  2);

-- ------------------------------------------------------------
-- Attaque
-- ------------------------------------------------------------
INSERT INTO Attaque (IdAttaque, DateExecution, statut, type, IdResultatAttaque) VALUES
(1, '2024-03-10', 'terminee', 'mission',       1),
(2, '2024-03-15', 'terminee', 'mission',       2),
(3, '2024-03-20', 'terminee', 'apprentissage', 3),
(4, '2024-06-12', 'en cours', 'mission',       4),
(5, '2024-04-05', 'terminee', 'amelioration',  5);

-- ------------------------------------------------------------
-- Alerte
-- ------------------------------------------------------------
INSERT INTO Alerte (IdAlerte, severite, message, estFauxPositif, IdAttaque, IdRegle) VALUES
(1, 'critique', 'Injection SQL detectee sur /login',       FALSE, 1, 2),
(2, 'haute',    'Tentatives brute force SSH repetees',     FALSE, 2, 1),
(3, 'info',     'Scan de ports detecte depuis 10.0.2.10',  FALSE, 4, 3),
(4, 'moyenne',  'Connexion admin hors horaires 22h14',     FALSE, 1, 4),
(5, 'basse',    'Export CSV inhabituel detecte',           TRUE,  4, 6);

-- ------------------------------------------------------------
-- Labs
-- ------------------------------------------------------------
INSERT INTO LabApprentissage (IdUtilisateur, IdActif, IdTechnique, IdAttaque) VALUES
(4, 1, 1, 3),
(5, 3, 3, 3);

INSERT INTO LabAmelioration (IdUtilisateur, IdActif, IdTechnique, IdAttaque) VALUES
(2, 2, 2, 5),
(3, 3, 3, 5);

INSERT INTO LabMission (IdUtilisateur, IdActif, IdTechnique, IdAttaque) VALUES
(2, 4, 1, 1),
(2, 4, 4, 2),
(3, 5, 5, 4);

-- ------------------------------------------------------------
-- RegleExportee
-- ------------------------------------------------------------
INSERT INTO RegleExportee (IdMission, IdRegleAjoute, IdRegleCTI, DateExport) VALUES
(1, 4, 1, '2024-04-01'),
(1, 4, 2, '2024-04-01');

-- ------------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 1;