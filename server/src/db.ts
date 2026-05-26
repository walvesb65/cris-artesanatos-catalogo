import mysql from "mysql2/promise";
import { config } from "./config.js";

export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "Z"
});

export async function many<T>(sql: string, params: unknown[] = []) {
  const [rows] = await pool.execute(sql, params as never[]);
  return rows as T[];
}

export async function one<T>(sql: string, params: unknown[] = []) {
  const rows = await many<T>(sql, params);
  return rows[0] ?? null;
}

export async function run(sql: string, params: unknown[] = []) {
  const [result] = await pool.execute(sql, params as never[]);
  return result as mysql.ResultSetHeader;
}
