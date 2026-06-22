import { Router } from "express";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { FridgeStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { allowRoles, validate } from "../middleware.js";
import { fridgeSchema, scanSchema, transferSchema } from "../schemas.js";

export const fridgesRouter = Router();
const profileInclude = {
  currentOwner: true,
  transfers: {
    include: { fromOwner: true, toOwner: true, transferredBy: { select: { id: true, name: true } } },
    orderBy: { transferredAt: "desc" as const },
  },
  scans: { orderBy: { scannedAt: "desc" as const }, take: 1 },
};

fridgesRouter.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const search = String(req.query.search || "").trim();
  const area = String(req.query.area || "").trim();
  const status = String(req.query.status || "") as FridgeStatus;
  const where = {
    ...(status && Object.values(FridgeStatus).includes(status) ? { status } : {}),
    ...(area ? { currentOwner: { area: { equals: area, mode: "insensitive" as const } } } : {}),
    ...(search ? { OR: [
      { serialNumber: { contains: search, mode: "insensitive" as const } },
      { model: { contains: search, mode: "insensitive" as const } },
      { currentOwner: { shopName: { contains: search, mode: "insensitive" as const } } },
      { currentOwner: { name: { contains: search, mode: "insensitive" as const } } },
    ] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.fridge.findMany({
      where, include: { currentOwner: true, scans: { take: 1, orderBy: { scannedAt: "desc" } } },
      skip: (page - 1) * pageSize, take: pageSize, orderBy: { updatedAt: "desc" },
    }),
    prisma.fridge.count({ where }),
  ]);
  res.json({ items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
});

fridgesRouter.post("/", allowRoles("ADMIN"), validate(fridgeSchema), async (req, res) => {
  const id = crypto.randomUUID();
  const qrCodeValue = `iglootrack://fridge/${id}`;
  const { ownerId, owner, ...fridge } = req.body;
  const created = await prisma.$transaction(async (tx) => {
    const targetOwner = ownerId
      ? await tx.shopOwner.findUniqueOrThrow({ where: { id: ownerId } })
      : await tx.shopOwner.create({ data: owner });
    const record = await tx.fridge.create({ data: { ...fridge, id, qrCodeValue, currentOwnerId: targetOwner.id } });
    await tx.transferHistory.create({
      data: {
        fridgeId: id, toOwnerId: targetOwner.id, addressAtTransfer: targetOwner.fullAddress,
        latitude: targetOwner.latitude, longitude: targetOwner.longitude,
        transferredByUserId: req.user!.id, notes: "Initial installation",
      },
    });
    return record;
  });
  res.status(201).json({ ...created, qrCodeDataUrl: await QRCode.toDataURL(qrCodeValue) });
});

fridgesRouter.get("/:id", async (req, res) => {
  const idOrQr = decodeURIComponent(req.params.id);
  const fridge = await prisma.fridge.findFirst({
    where: { OR: [{ id: idOrQr }, { qrCodeValue: idOrQr }] }, include: profileInclude,
  });
  fridge ? res.json(fridge) : res.status(404).json({ error: "Fridge not found" });
});
fridgesRouter.get("/:id/history", async (req, res) => {
  res.json(await prisma.transferHistory.findMany({
    where: { fridgeId: String(req.params.id) },
    include: { fromOwner: true, toOwner: true, transferredBy: { select: { id: true, name: true } } },
    orderBy: { transferredAt: "desc" },
  }));
});
fridgesRouter.post("/:id/scan", allowRoles("ADMIN", "FIELD_STAFF"), validate(scanSchema), async (req, res) => {
  const fridge = await prisma.fridge.findUnique({ where: { id: String(req.params.id) }, include: { currentOwner: true } });
  if (!fridge) return res.status(404).json({ error: "Fridge not found" });
  if (req.user!.role === "FIELD_STAFF" && req.user!.assignedArea &&
      fridge.currentOwner.area.toLowerCase() !== req.user!.assignedArea.toLowerCase()) {
    return res.status(403).json({ error: "Fridge is outside your assigned area" });
  }
  res.status(201).json(await prisma.scanLog.create({
    data: { fridgeId: fridge.id, scannedByUserId: req.user!.id, ...req.body },
  }));
});
fridgesRouter.post("/:id/transfer", allowRoles("ADMIN", "FIELD_STAFF"), validate(transferSchema), async (req, res) => {
  const { expectedVersion, toOwnerId, ...transfer } = req.body;
  const fridgeId = String(req.params.id);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const fridge = await tx.fridge.findUniqueOrThrow({ where: { id: fridgeId }, include: { currentOwner: true } });
      if (fridge.version !== expectedVersion) throw new Error("VERSION_CONFLICT");
      if (req.user!.role === "FIELD_STAFF" && req.user!.assignedArea &&
          fridge.currentOwner.area.toLowerCase() !== req.user!.assignedArea.toLowerCase()) throw new Error("AREA_FORBIDDEN");
      await tx.shopOwner.findUniqueOrThrow({ where: { id: toOwnerId } });
      const updated = await tx.fridge.update({
        where: { id: fridge.id, version: expectedVersion },
        data: { currentOwnerId: toOwnerId, version: { increment: 1 } },
      });
      await tx.transferHistory.create({
        data: {
          fridgeId: fridge.id, fromOwnerId: fridge.currentOwnerId, toOwnerId,
          transferredByUserId: req.user!.id, ...transfer,
        },
      });
      return updated;
    }, { isolationLevel: "Serializable" });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "VERSION_CONFLICT") return res.status(409).json({ error: "Fridge changed since it was loaded. Refresh before transferring." });
    if (message === "AREA_FORBIDDEN") return res.status(403).json({ error: "Fridge is outside your assigned area" });
    throw error;
  }
});
