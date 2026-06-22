import { z } from "zod";

const location = {
  fullAddress: z.string().min(5),
  area: z.string().min(2),
  district: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
};

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export const registerUserSchema = z.object({
  name: z.string().min(2), email: z.string().email(), phone: z.string().optional(),
  password: z.string().min(8), role: z.enum(["ADMIN", "FIELD_STAFF", "VIEWER"]),
  assignedArea: z.string().optional(),
});
export const ownerSchema = z.object({
  name: z.string().min(2), phone: z.string().min(7), shopName: z.string().min(2),
  ...location, photoUrl: z.string().url().optional(),
});
export const fridgeSchema = z.object({
  serialNumber: z.string().min(3), model: z.string().min(2), capacity: z.string().min(1),
  installDate: z.coerce.date(), photoUrl: z.string().url().optional(),
  ownerId: z.string().uuid().optional(), owner: ownerSchema.optional(),
}).refine((data) => data.ownerId || data.owner, "ownerId or owner is required");
export const transferSchema = z.object({
  toOwnerId: z.string().uuid(), expectedVersion: z.number().int().positive(),
  addressAtTransfer: z.string().min(5), latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180), notes: z.string().max(500).optional(),
});
export const scanSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
