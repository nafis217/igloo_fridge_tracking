import { Router } from "express";
import { prisma } from "../db.js";
import { allowRoles, validate } from "../middleware.js";
import { ownerSchema } from "../schemas.js";

export const ownersRouter = Router();
ownersRouter.get("/", async (req, res) => {
  const search = String(req.query.search || "").trim();
  const owners = await prisma.shopOwner.findMany({
    where: search ? { OR: [
      { name: { contains: search, mode: "insensitive" } },
      { shopName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ] } : undefined,
    take: 30, orderBy: { shopName: "asc" },
  });
  res.json(owners);
});
ownersRouter.get("/:id", async (req, res) => {
  const owner = await prisma.shopOwner.findUnique({ where: { id: req.params.id }, include: { fridges: true } });
  owner ? res.json(owner) : res.status(404).json({ error: "Shop owner not found" });
});
ownersRouter.post("/", allowRoles("ADMIN", "FIELD_STAFF"), validate(ownerSchema), async (req, res) => {
  res.status(201).json(await prisma.shopOwner.create({ data: req.body }));
});
