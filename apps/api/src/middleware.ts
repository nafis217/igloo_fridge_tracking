import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError, type ZodType } from "zod";
import type { Role } from "@prisma/client";
import { config } from "./config.js";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = jwt.verify(token, config.jwtSecret) as Request["user"];
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export const allowRoles = (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ error: "Insufficient permission" });

export const validate = (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.flatten() });
      }
      next(error);
    }
  };

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}
