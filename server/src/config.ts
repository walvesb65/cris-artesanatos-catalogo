import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env"),
  path.resolve(process.cwd(), "server", ".env")
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanFromEnv = (value: string | undefined) => {
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

export const config = {
  port: numberFromEnv(process.env.PORT, 3333),
  db: {
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: numberFromEnv(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER ?? "cris_user",
    password: process.env.MYSQL_PASSWORD ?? "cris_password",
    database: process.env.MYSQL_DATABASE ?? "cris_catalogo",
    ssl: booleanFromEnv(process.env.MYSQL_SSL) ? { rejectUnauthorized: true } : undefined
  },
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  admin: {
    name: process.env.ADMIN_NAME ?? "Cris Artesanatos",
    email: process.env.ADMIN_EMAIL ?? "admin@crisartesanatos.local",
    password: process.env.ADMIN_PASSWORD ?? "admin123"
  }
};
