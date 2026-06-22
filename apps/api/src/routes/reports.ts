import { Router } from "express";
import { prisma } from "../db.js";
export const reportsRouter = Router();
reportsRouter.get("/summary", async (_req, res) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
  const [byStatus, byDistrict, recentTransfers, staleCount, total] = await prisma.$transaction([
    prisma.$queryRaw<{ status: string; fridgeCount: bigint }[]>`
      SELECT status::text, COUNT(id)::bigint AS "fridgeCount"
      FROM "Fridge"
      GROUP BY status
      ORDER BY status
    `,
    prisma.$queryRaw<{ district: string; fridgeCount: bigint }[]>`
      SELECT o.district, COUNT(f.id)::bigint AS "fridgeCount"
      FROM "ShopOwner" o
      JOIN "Fridge" f ON f."currentOwnerId" = o.id
      GROUP BY o.district
      ORDER BY COUNT(f.id) DESC
    `,
    prisma.transferHistory.findMany({
      where: { transferredAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      include: { fridge: true, toOwner: true }, orderBy: { transferredAt: "desc" }, take: 20,
    }),
    prisma.fridge.count({ where: { scans: { none: { scannedAt: { gte: ninetyDaysAgo } } } } }),
    prisma.fridge.count(),
  ]);
  res.json({
    total,
    byStatus: byStatus.map((row) => ({ status: row.status, _count: Number(row.fridgeCount) })),
    byDistrict: byDistrict.map((row) => ({ district: row.district, _count: { fridges: Number(row.fridgeCount) } })),
    recentTransfers,
    unscannedIn90Days: staleCount,
  });
});
