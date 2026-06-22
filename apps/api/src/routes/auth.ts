import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { allowRoles, authenticate, validate } from "../middleware.js";
import { loginSchema, registerUserSchema } from "../schemas.js";

export const authRouter = Router();
authRouter.post("/login", validate(loginSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const payload = { id: user.id, role: user.role, assignedArea: user.assignedArea };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: "12h" });
  res.json({ token, user: { ...payload, name: user.name, email: user.email } });
});
authRouter.post("/register", authenticate, allowRoles("ADMIN"), validate(registerUserSchema), async (req, res) => {
  const { password, email, ...data } = req.body;
  const user = await prisma.user.create({
    data: { ...data, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) },
    select: { id: true, name: true, email: true, role: true, assignedArea: true, createdAt: true },
  });
  res.status(201).json(user);
});
