import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash("IglooDemo123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@iglootrack.bd" }, update: {},
    create: { name: "Igloo Admin", email: "admin@iglootrack.bd", passwordHash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "field@iglootrack.bd" }, update: {},
    create: {
      name: "Dhaka Field Officer", email: "field@iglootrack.bd", passwordHash,
      role: "FIELD_STAFF", assignedArea: "Dhanmondi",
    },
  });
}
main().finally(() => prisma.$disconnect());
