-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "businessCategory" TEXT;

-- CreateIndex
CREATE INDEX "Member_businessCategory_trgm_idx" ON "Member" USING GIN ("businessCategory" gin_trgm_ops);
