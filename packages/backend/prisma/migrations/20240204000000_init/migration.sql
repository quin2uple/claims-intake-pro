-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('new', 'pending', 'flagged', 'approved', 'rejected', 'duplicate');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('ClaimDepot', 'ClassActionOrg', 'TopClassActions', 'Manual');

-- CreateTable
CREATE TABLE "cases" (
    "id" SERIAL NOT NULL,
    "brand" VARCHAR(255) NOT NULL,
    "case_title" TEXT NOT NULL,
    "source" "SourceType" NOT NULL,
    "source_url" TEXT NOT NULL,
    "deadline" DATE,
    "description" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'new',
    "duplicate_of" INTEGER,
    "similarity_score" DECIMAL(5,4),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "reviewed_at" TIMESTAMP,
    "reviewed_by" VARCHAR(255),

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_history" (
    "id" SERIAL NOT NULL,
    "source" "SourceType" NOT NULL,
    "started_at" TIMESTAMP NOT NULL,
    "completed_at" TIMESTAMP,
    "status" VARCHAR(50) NOT NULL,
    "cases_found" INTEGER NOT NULL DEFAULT 0,
    "cases_added" INTEGER NOT NULL DEFAULT 0,
    "cases_skipped" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrape_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "previous_status" "CaseStatus",
    "new_status" "CaseStatus",
    "user_name" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_source_url_key" ON "cases"("source_url");

-- CreateIndex
CREATE INDEX "cases_brand_idx" ON "cases"("brand");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_source_idx" ON "cases"("source");

-- CreateIndex
CREATE INDEX "cases_created_at_idx" ON "cases"("created_at" DESC);

-- CreateIndex
CREATE INDEX "cases_deadline_idx" ON "cases"("deadline");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_duplicate_of_fkey" FOREIGN KEY ("duplicate_of") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
