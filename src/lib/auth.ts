import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "cyberlab_jwt_secret_change_in_prod";
const EXPIRES = "8h"; // durée de validité du token

export interface JWTPayload {
  idUtilisateur: number;
  idCompte:      number;
  email:         string;
  role:          "admin" | "consultant" | "apprenant";
  nom:           string;
  prenom:        string;
}

// Créer un token JWT
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

// Vérifier et décoder un token JWT
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Nom du cookie
export const COOKIE_NAME = "cyberlab_session";
