CREATE TYPE "ProjectCurrency" AS ENUM ('GTQ', 'USD');

ALTER TABLE "projects"
ADD COLUMN "currency" "ProjectCurrency" NOT NULL DEFAULT 'GTQ';

CREATE TABLE "budget_base_lines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "BudgetItemType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_base_lines_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "budget_lines"
ADD COLUMN "baseLineId" TEXT;

ALTER TABLE "schedule_items"
ADD COLUMN "budgetLineId" TEXT;

CREATE UNIQUE INDEX "budget_base_lines_code_key" ON "budget_base_lines"("code");
CREATE INDEX "budget_base_lines_isActive_order_idx" ON "budget_base_lines"("isActive", "order");
CREATE UNIQUE INDEX "budget_lines_projectId_baseLineId_key" ON "budget_lines"("projectId", "baseLineId");
CREATE INDEX "schedule_items_budgetLineId_idx" ON "schedule_items"("budgetLineId");

ALTER TABLE "budget_lines"
ADD CONSTRAINT "budget_lines_baseLineId_fkey"
FOREIGN KEY ("baseLineId") REFERENCES "budget_base_lines"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "schedule_items"
ADD CONSTRAINT "schedule_items_budgetLineId_fkey"
FOREIGN KEY ("budgetLineId") REFERENCES "budget_lines"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
