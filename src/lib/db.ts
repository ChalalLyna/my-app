import mysql from "mysql2/promise";

// Connexion pool — réutilisé entre toutes les requêtes
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "mysql",
  port:     parseInt(process.env.DB_PORT || "3306"),
  database: process.env.DB_NAME     || "cyberlab",
  user:     process.env.DB_USER     || "cyberlab_user",
  password: process.env.DB_PASSWORD || "cyberlab_pass",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

export default pool;
