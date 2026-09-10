CREATE TABLE "Purchase" (
  "id" TEXT NOT NULL,
  "supplierName" TEXT,
  "invoiceNumber" TEXT,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseItem" (
  "id" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitCost" DECIMAL(10,2) NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StockMovement" ADD COLUMN "purchaseItemId" TEXT;
CREATE UNIQUE INDEX "StockMovement_purchaseItemId_key" ON "StockMovement"("purchaseItemId");
CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");
CREATE INDEX "Purchase_createdById_idx" ON "Purchase"("createdById");
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");
CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "PurchaseItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
