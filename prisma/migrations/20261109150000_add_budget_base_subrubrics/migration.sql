CREATE TABLE "budget_base_subrubrics" (
    "id" TEXT NOT NULL,
    "baseLineId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_base_subrubrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "budget_base_subrubrics_baseLineId_code_key"
ON "budget_base_subrubrics"("baseLineId", "code");

CREATE INDEX "budget_base_subrubrics_baseLineId_isActive_order_idx"
ON "budget_base_subrubrics"("baseLineId", "isActive", "order");

ALTER TABLE "budget_base_subrubrics"
ADD CONSTRAINT "budget_base_subrubrics_baseLineId_fkey"
FOREIGN KEY ("baseLineId") REFERENCES "budget_base_lines"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
