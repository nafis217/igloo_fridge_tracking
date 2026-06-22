-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'FIELD_STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "FridgeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REPAIR', 'DECOMMISSIONED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "assignedArea" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOwner" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fridge" (
    "id" UUID NOT NULL,
    "qrCodeValue" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "capacity" TEXT NOT NULL,
    "installDate" TIMESTAMP(3) NOT NULL,
    "status" "FridgeStatus" NOT NULL DEFAULT 'ACTIVE',
    "photoUrl" TEXT,
    "currentOwnerId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fridge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferHistory" (
    "id" UUID NOT NULL,
    "fridgeId" UUID NOT NULL,
    "fromOwnerId" UUID,
    "toOwnerId" UUID NOT NULL,
    "addressAtTransfer" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "transferredByUserId" UUID NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "TransferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" UUID NOT NULL,
    "fridgeId" UUID NOT NULL,
    "scannedByUserId" UUID NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_assignedArea_idx" ON "User"("assignedArea");

-- CreateIndex
CREATE INDEX "ShopOwner_shopName_idx" ON "ShopOwner"("shopName");

-- CreateIndex
CREATE INDEX "ShopOwner_name_idx" ON "ShopOwner"("name");

-- CreateIndex
CREATE INDEX "ShopOwner_area_district_idx" ON "ShopOwner"("area", "district");

-- CreateIndex
CREATE INDEX "ShopOwner_phone_idx" ON "ShopOwner"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Fridge_qrCodeValue_key" ON "Fridge"("qrCodeValue");

-- CreateIndex
CREATE UNIQUE INDEX "Fridge_serialNumber_key" ON "Fridge"("serialNumber");

-- CreateIndex
CREATE INDEX "Fridge_status_idx" ON "Fridge"("status");

-- CreateIndex
CREATE INDEX "Fridge_currentOwnerId_idx" ON "Fridge"("currentOwnerId");

-- CreateIndex
CREATE INDEX "Fridge_updatedAt_idx" ON "Fridge"("updatedAt");

-- CreateIndex
CREATE INDEX "TransferHistory_fridgeId_transferredAt_idx" ON "TransferHistory"("fridgeId", "transferredAt" DESC);

-- CreateIndex
CREATE INDEX "TransferHistory_transferredAt_idx" ON "TransferHistory"("transferredAt");

-- CreateIndex
CREATE INDEX "TransferHistory_toOwnerId_idx" ON "TransferHistory"("toOwnerId");

-- CreateIndex
CREATE INDEX "ScanLog_fridgeId_scannedAt_idx" ON "ScanLog"("fridgeId", "scannedAt" DESC);

-- CreateIndex
CREATE INDEX "ScanLog_scannedAt_idx" ON "ScanLog"("scannedAt");

-- AddForeignKey
ALTER TABLE "Fridge" ADD CONSTRAINT "Fridge_currentOwnerId_fkey" FOREIGN KEY ("currentOwnerId") REFERENCES "ShopOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferHistory" ADD CONSTRAINT "TransferHistory_fridgeId_fkey" FOREIGN KEY ("fridgeId") REFERENCES "Fridge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferHistory" ADD CONSTRAINT "TransferHistory_fromOwnerId_fkey" FOREIGN KEY ("fromOwnerId") REFERENCES "ShopOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferHistory" ADD CONSTRAINT "TransferHistory_toOwnerId_fkey" FOREIGN KEY ("toOwnerId") REFERENCES "ShopOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferHistory" ADD CONSTRAINT "TransferHistory_transferredByUserId_fkey" FOREIGN KEY ("transferredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_fridgeId_fkey" FOREIGN KEY ("fridgeId") REFERENCES "Fridge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_scannedByUserId_fkey" FOREIGN KEY ("scannedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
