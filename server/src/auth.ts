import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

interface TokenPayload {
  id: number;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  admin?: TokenPayload;
}

export function createToken(payload: TokenPayload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "8h" });
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Login administrativo necessario." });
  }

  try {
    req.admin = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return next();
  } catch {
    return res.status(401).json({ message: "Sessao expirada ou invalida." });
  }
}
