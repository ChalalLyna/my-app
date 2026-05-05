-- ============================================================
--  Schéma MySQL v2
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Tables de base (sans dépendances)
-- ------------------------------------------------------------

CREATE TABLE Compte (
    IdCompte        INT          NOT NULL AUTO_INCREMENT,
    email           VARCHAR(255) NOT NULL UNIQUE,
    mdp             VARCHAR(255) NOT NULL,
    DateCreation    DATE         NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (IdCompte)
);

CREATE TABLE MachineVirtuelle (
    IdVM            INT          NOT NULL AUTO_INCREMENT,
    nomMachine      VARCHAR(255) NOT NULL,
    OS              VARCHAR(100),
    IP              VARCHAR(45),
    Vlan            VARCHAR(50),
    VmIdProxmox 	INT			 NOT NULL,
    CPUmax			VARCHAR(45),
    RAMmax			VARCHAR(45),
    Disk			VARCHAR(45),
    PRIMARY KEY (IdVM)
);

CREATE TABLE ResultatMission (
    IdResultatMission   INT  NOT NULL AUTO_INCREMENT,
    description         TEXT,
    rapport             LONGTEXT,
    PRIMARY KEY (IdResultatMission)
);

CREATE TABLE ResultatAttaque (
    IdResultatAttaque   INT  NOT NULL AUTO_INCREMENT,
    description         TEXT,
    rapport             TEXT,
    IdResultatMission   INT,
    PRIMARY KEY (IdResultatAttaque),
    CONSTRAINT fk_resultatattaque_mission FOREIGN KEY (IdResultatMission)
        REFERENCES ResultatMission(IdResultatMission)
);

CREATE TABLE RegleDeDetection (
    IdRegle         INT  NOT NULL AUTO_INCREMENT,
    DateCreation    DATE NOT NULL DEFAULT (CURRENT_DATE),
    description     TEXT,
    PRIMARY KEY (IdRegle)
);

CREATE TABLE Technique (
    IdTechnique     INT          NOT NULL AUTO_INCREMENT,
    mitreID         VARCHAR(50)  NOT NULL,
    nom             VARCHAR(255) NOT NULL,
    tactique        VARCHAR(255),
    description     TEXT,
    PRIMARY KEY (IdTechnique)
);

CREATE TABLE ProfilAdversaire (
    IdProfil        INT          NOT NULL AUTO_INCREMENT,
    nom             VARCHAR(255) NOT NULL,
    description     TEXT,
    PRIMARY KEY (IdProfil)
);

-- ------------------------------------------------------------
-- Utilisateur (dépend de Compte)
-- ------------------------------------------------------------

CREATE TABLE Utilisateur (
    IdUtilisateur   INT          NOT NULL AUTO_INCREMENT,
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    role            ENUM('apprenant','consultant','admin') NOT NULL,
    IdCompte        INT          NOT NULL,
    PRIMARY KEY (IdUtilisateur),
    CONSTRAINT fk_utilisateur_compte FOREIGN KEY (IdCompte)
        REFERENCES Compte(IdCompte)
);

-- ------------------------------------------------------------
-- Mission (dépend de Utilisateur et ResultatMission)
-- ------------------------------------------------------------

CREATE TABLE Mission (
    IdMission           INT          NOT NULL AUTO_INCREMENT,
    titre               VARCHAR(255) NOT NULL,
    client              VARCHAR(255),
    statut              VARCHAR(50),
    DateDebut           DATE,
    DateFin             DATE,
    description         TEXT,
    IdConsultant        INT          NOT NULL,
    IdResultatMission   INT          NOT NULL,
    PRIMARY KEY (IdMission),
    CONSTRAINT fk_mission_consultant    FOREIGN KEY (IdConsultant)
        REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT fk_mission_resultat      FOREIGN KEY (IdResultatMission)
        REFERENCES ResultatMission(IdResultatMission)
);

-- ------------------------------------------------------------
-- Actif (dépend de MachineVirtuelle, Utilisateur, Mission)
-- ------------------------------------------------------------

CREATE TABLE Actif (
    IdActif             INT          NOT NULL AUTO_INCREMENT,
    nom                 VARCHAR(255) NOT NULL,
    catégorie                 VARCHAR(255) NOT NULL,
    description         TEXT,
    DateCreation        DATE         DEFAULT (CURRENT_DATE),
    TypeActif           ENUM('lab','client') NOT NULL,
    IdVM                INT          NOT NULL,
    IdAdministrateur    INT,            -- NULL si TypeActif = 'client'
    IdMission           INT,            -- NULL si non lié à une mission
    PRIMARY KEY (IdActif),
    CONSTRAINT fk_actif_vm              FOREIGN KEY (IdVM)
        REFERENCES MachineVirtuelle(IdVM),
    CONSTRAINT fk_actif_administrateur  FOREIGN KEY (IdAdministrateur)
        REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT fk_actif_mission         FOREIGN KEY (IdMission)
        REFERENCES Mission(IdMission)
);

-- ------------------------------------------------------------
-- Attaque (dépend de ResultatAttaque)
-- ------------------------------------------------------------

CREATE TABLE Attaque (
    IdAttaque           INT NOT NULL AUTO_INCREMENT,
    DateExecution       DATETIME,
    statut              VARCHAR(50),
    type                ENUM('apprentissage','amelioration','mission') NOT NULL,
    IdResultatAttaque   INT NOT NULL,
    PRIMARY KEY (IdAttaque),
    CONSTRAINT fk_attaque_resultat FOREIGN KEY (IdResultatAttaque)
        REFERENCES ResultatAttaque(IdResultatAttaque)
);

-- ------------------------------------------------------------
-- Alerte (dépend de Attaque et RegleDeDetection)
-- ------------------------------------------------------------

CREATE TABLE Alerte (
    IdAlerte        INT     NOT NULL AUTO_INCREMENT,
    severite        VARCHAR(50),
    message         TEXT,
    estFauxPositif  BOOLEAN NOT NULL DEFAULT FALSE,
    IdAttaque       INT     NOT NULL,
    IdRegle         INT     NOT NULL,
    PRIMARY KEY (IdAlerte),
    CONSTRAINT fk_alerte_attaque FOREIGN KEY (IdAttaque)
        REFERENCES Attaque(IdAttaque),
    CONSTRAINT fk_alerte_regle   FOREIGN KEY (IdRegle)
        REFERENCES RegleDeDetection(IdRegle)
);

-- ------------------------------------------------------------
-- Tables d'association (many-to-many)
-- ------------------------------------------------------------

CREATE TABLE CompositionProfil (
    IdProfil    INT NOT NULL,
    IdTechnique INT NOT NULL,
    PRIMARY KEY (IdProfil, IdTechnique),
    CONSTRAINT fk_cp_profil    FOREIGN KEY (IdProfil)
        REFERENCES ProfilAdversaire(IdProfil),
    CONSTRAINT fk_cp_technique FOREIGN KEY (IdTechnique)
        REFERENCES Technique(IdTechnique)
);

CREATE TABLE CouvertureDetection (
    IdRegle     INT NOT NULL,
    IdTechnique INT NOT NULL,
    PRIMARY KEY (IdRegle, IdTechnique),
    CONSTRAINT fk_cd_regle     FOREIGN KEY (IdRegle)
        REFERENCES RegleDeDetection(IdRegle),
    CONSTRAINT fk_cd_technique FOREIGN KEY (IdTechnique)
        REFERENCES Technique(IdTechnique)
);

-- Labs (tables de participation aux attaques)

CREATE TABLE LabApprentissage (
    IdLabApprentissage INT NOT NULL,
    IdUtilisateur   INT NOT NULL,
    IdActif         INT NOT NULL,
    IdTechnique     INT NOT NULL,
    IdAttaque       INT NOT NULL,
    PRIMARY KEY (IdLabApprentissage, IdUtilisateur, IdActif, IdTechnique, IdAttaque),
    CONSTRAINT fk_la_utilisateur FOREIGN KEY (IdUtilisateur)
        REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT fk_la_actif       FOREIGN KEY (IdActif)
        REFERENCES Actif(IdActif),
    CONSTRAINT fk_la_technique   FOREIGN KEY (IdTechnique)
        REFERENCES Technique(IdTechnique),
    CONSTRAINT fk_la_attaque     FOREIGN KEY (IdAttaque)
        REFERENCES Attaque(IdAttaque)
);

CREATE TABLE LabAmelioration (
    IdUtilisateur   INT NOT NULL,
    IdActif         INT NOT NULL,
    IdTechnique     INT NOT NULL,
    IdAttaque       INT NOT NULL,
    PRIMARY KEY (IdUtilisateur, IdActif, IdTechnique, IdAttaque),
    CONSTRAINT fk_lam_utilisateur FOREIGN KEY (IdUtilisateur)
        REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT fk_lam_actif       FOREIGN KEY (IdActif)
        REFERENCES Actif(IdActif),
    CONSTRAINT fk_lam_technique   FOREIGN KEY (IdTechnique)
        REFERENCES Technique(IdTechnique),
    CONSTRAINT fk_lam_attaque     FOREIGN KEY (IdAttaque)
        REFERENCES Attaque(IdAttaque)
);

CREATE TABLE LabMission (
    IdUtilisateur   INT NOT NULL,
    IdActif         INT NOT NULL,
    IdTechnique     INT NOT NULL,
    IdAttaque       INT NOT NULL,
    PRIMARY KEY (IdUtilisateur, IdActif, IdTechnique, IdAttaque),
    CONSTRAINT fk_lm_utilisateur FOREIGN KEY (IdUtilisateur)
        REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT fk_lm_actif       FOREIGN KEY (IdActif)
        REFERENCES Actif(IdActif),
    CONSTRAINT fk_lm_technique   FOREIGN KEY (IdTechnique)
        REFERENCES Technique(IdTechnique),
    CONSTRAINT fk_lm_attaque     FOREIGN KEY (IdAttaque)
        REFERENCES Attaque(IdAttaque)
);

-- ------------------------------------------------------------
-- Héritage de RegleDeDetection (table par sous-type)
-- ------------------------------------------------------------

CREATE TABLE RegleAjouteParConsultant (
    IdRegle         INT NOT NULL,
    IdConsultant    INT NOT NULL,
    IdMission       INT,            -- NULL si hors mission
    PRIMARY KEY (IdRegle),
    CONSTRAINT fk_rapc_regle      FOREIGN KEY (IdRegle)
        REFERENCES RegleDeDetection(IdRegle),
    CONSTRAINT fk_rapc_consultant FOREIGN KEY (IdConsultant)
        REFERENCES Utilisateur(IdUtilisateur),
    CONSTRAINT fk_rapc_mission    FOREIGN KEY (IdMission)
        REFERENCES Mission(IdMission)
);

CREATE TABLE RegleCTI (
    IdRegle     INT          NOT NULL,
    source      VARCHAR(255),
    DateAjout   DATE         NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (IdRegle),
    CONSTRAINT fk_cti_regle FOREIGN KEY (IdRegle)
        REFERENCES RegleDeDetection(IdRegle)
);

CREATE TABLE RegleClient (
    IdRegle     INT NOT NULL,
    IdMission   INT NOT NULL,
    PRIMARY KEY (IdRegle),
    CONSTRAINT fk_rc_regle   FOREIGN KEY (IdRegle)
        REFERENCES RegleDeDetection(IdRegle),
    CONSTRAINT fk_rc_mission FOREIGN KEY (IdMission)
        REFERENCES Mission(IdMission)
);

-- ------------------------------------------------------------
-- Règle Exportée (dépend de Mission, RegleAjouteParConsultant, RegleCTI)
-- ------------------------------------------------------------

CREATE TABLE RegleExportee (
    IdMission           INT  NOT NULL,
    IdRegleAjoute       INT  NOT NULL,
    IdRegleCTI          INT  NOT NULL,
    DateExport          DATE NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (IdMission, IdRegleAjoute, IdRegleCTI),
    CONSTRAINT fk_re_mission      FOREIGN KEY (IdMission)
        REFERENCES Mission(IdMission),
    CONSTRAINT fk_re_regle_ajoute FOREIGN KEY (IdRegleAjoute)
        REFERENCES RegleAjouteParConsultant(IdRegle),
    CONSTRAINT fk_re_regle_cti    FOREIGN KEY (IdRegleCTI)
        REFERENCES RegleCTI(IdRegle)
);

-- ------------------------------------------------------------

CREATE TABLE Guide (
    IdGuide INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    contenu LONGTEXT NOT NULL,
    categorie VARCHAR(50),
    DateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
    DateModification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE Scenario (
    IdScenario       INT          NOT NULL AUTO_INCREMENT,
    titre            VARCHAR(255) NOT NULL,
    description      TEXT,
    objectif         TEXT,
    niveau           VARCHAR(50),
    bruit_recommande BOOLEAN      DEFAULT FALSE,
    contenu          LONGTEXT     NOT NULL,
    DateCreation     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (IdScenario)
);

SET FOREIGN_KEY_CHECKS = 1;
