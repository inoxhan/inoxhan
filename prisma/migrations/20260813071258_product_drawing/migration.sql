-- CreateTable
CREATE TABLE "ProductDrawing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "basePath" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductDrawing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductDrawing_productId_idx" ON "ProductDrawing"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductDrawing_productId_kind_key" ON "ProductDrawing"("productId", "kind");
