// Ce script génère les vrais hash bcrypt pour vos mots de passe
// Exécutez-le UNE SEULE FOIS avec : node sql/hash-passwords.js
// Puis copiez les hash dans PHPMyAdmin ou exécutez update-passwords.sql

const bcrypt = require("bcryptjs");

const passwords = [
  { id: 1, email: "admin@cyberlab.io",       password: "Admin@1234"   },
  { id: 2, email: "consultant1@cyberlab.io", password: "Consult@1234" },
  { id: 3, email: "consultant2@cyberlab.io", password: "Consult@5678" },
  { id: 4, email: "apprenant1@cyberlab.io",  password: "Learn@1234"   },
  { id: 5, email: "apprenant2@cyberlab.io",  password: "Learn@5678"   },
];

async function hashAll() {
  console.log("-- Copiez ces requêtes dans PHPMyAdmin > SQL\n");

  for (const { id, email, password } of passwords) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`-- ${email} (${password})`);
    console.log(`UPDATE Compte SET mdp = '${hash}' WHERE IdCompte = ${id};\n`);
  }
}

hashAll();
