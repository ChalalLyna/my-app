import { HelpSection } from "@/app/components/HelpPanel";

export const ATTACK_SIMULATION_HELP: HelpSection[] = [
  {
    title: "C'est quoi une simulation d'attaque ?",
    content:
      "Une simulation d'attaque reproduit le comportement d'un vrai attaquant sur un système cible, sans causer de dommages réels. L'objectif est de tester les défenses et d'identifier les failles avant qu'un vrai attaquant ne le fasse.",
    tip: "Pensez-y comme un exercice d'incendie : on simule la menace pour être prêt quand elle arrive vraiment.",
  },
  {
    title: "Étape 1 — Choisir un asset cible",
    content:
      "Un asset est une machine du réseau (poste de travail, serveur, laptop…). En choisissant une cible, vous définissez sur quel système l'attaque simulée va s'exécuter. Seuls les assets 'Online' peuvent être ciblés.",
    tip: "Commencez par un poste Windows (WS-CORP-042) — c'est la cible la plus courante dans les attaques réelles.",
  },
  {
    title: "Étape 2 — Choisir un adversaire / TTP",
    content:
      "Un adversaire représente un groupe d'attaquants réels (ex: APT29) avec ses techniques, tactiques et procédures (TTP). Les TTP sont référencés dans le framework MITRE ATT&CK sous la forme T1566, T1078, etc.",
    tip: "APT29 est un groupe étatique russe connu. Étudier ses TTPs vous prépare aux menaces les plus sophistiquées.",
  },
  {
    title: "Comprendre les TTPs MITRE",
    content:
      "MITRE ATT&CK est un référentiel mondial qui documente les techniques d'attaque. Chaque code T#### correspond à une technique précise : T1566 = Phishing, T1078 = Utilisation de comptes valides, T1486 = Chiffrement de données (ransomware).",
    tip: "Consultez attack.mitre.org pour explorer chaque technique en détail avec des exemples réels.",
  },
  {
    title: "Étape 3 — Confirmer & Lancer",
    content:
      "Avant de lancer, vérifiez la checklist : l'asset doit être en ligne, le profil adversaire chargé, et le SIEM actif pour capturer les événements générés par la simulation.",
    tip: "Le SIEM (Ludus) va enregistrer toutes les actions simulées. Après la simulation, analysez les alertes générées pour comprendre ce qu'un attaquant réel aurait pu faire.",
  },
];

export const DETECTION_HELP: HelpSection[] = [
  {
    title: "C'est quoi une alerte SIEM ?",
    content:
      "Un SIEM (Security Information and Event Management) collecte les logs de tous vos systèmes et génère des alertes quand il détecte un comportement suspect. Chaque alerte correspond à un événement anormal détecté sur un asset.",
    tip: "Une alerte n'est pas forcément une vraie attaque — c'est un signal qui mérite investigation. C'est à vous de décider si c'est un vrai positif ou un faux positif.",
  },
  {
    title: "Lire une alerte — les champs clés",
    content:
      "Chaque alerte contient : la sévérité (Critical/High/Medium/Low), l'asset ciblé, le TTP MITRE associé, l'horodatage et la source de détection. Ces informations permettent de prioriser et contextualiser la menace.",
    tip: "Commencez toujours par les alertes 'Critical' puis 'High'. Une alerte 'Medium' sur un DC (Domain Controller) est souvent plus dangereuse qu'une 'High' sur un laptop.",
  },
  {
    title: "Les niveaux de sévérité",
    content:
      "Critical = compromission probable, action immédiate requise. High = activité suspecte avancée, investigation urgente. Medium = comportement anormal, à surveiller. Low = information, peut être un faux positif.",
    tip: "Dans un vrai SOC, une alerte Critical doit être traitée en moins de 15 minutes.",
  },
  {
    title: "Investiguer une alerte",
    content:
      "L'investigation consiste à analyser les logs bruts, comprendre la chaîne d'événements (kill chain), identifier si d'autres assets sont touchés et déterminer si l'alerte est un vrai ou faux positif.",
    tip: "Regardez toujours le 'Raw Log' — les détails techniques (IP source, utilisateur, commande exécutée) sont essentiels pour comprendre ce qui s'est vraiment passé.",
  },
  {
    title: "Rule Tuning — affiner les règles",
    content:
      "Le Rule Tuning permet d'ajuster les règles de détection pour réduire les faux positifs (alertes sur du comportement légitime) ou les faux négatifs (attaques non détectées). C'est un équilibre permanent.",
    tip: "Si vous recevez beaucoup d'alertes Medium sur un même asset pour la même raison, c'est souvent un candidat pour le tuning.",
  },
];
