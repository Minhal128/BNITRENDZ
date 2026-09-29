-- Trigram operators for the search indexes below (Prisma does not manage extensions).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "birthday" DATE,
    "anniversary" DATE,
    "website" TEXT,
    "instagram" TEXT,
    "email" TEXT,
    "facebook" TEXT,
    "youtube" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_publicToken_key" ON "Member"("publicToken");

-- CreateIndex
CREATE INDEX "Member_memberName_trgm_idx" ON "Member" USING GIN ("memberName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Member_companyName_trgm_idx" ON "Member" USING GIN ("companyName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Member_email_trgm_idx" ON "Member" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Member_phone_trgm_idx" ON "Member" USING GIN ("phone" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Member_memberName_idx" ON "Member"("memberName");

-- CreateIndex
CREATE INDEX "Member_createdAt_idx" ON "Member"("createdAt");
