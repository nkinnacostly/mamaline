-- CreateTable
CREATE TABLE "health_worker_sessions" (
    "id" TEXT NOT NULL,
    "health_worker_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_worker_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_worker_sessions_token_hash_key" ON "health_worker_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "health_worker_sessions_health_worker_id_idx" ON "health_worker_sessions"("health_worker_id");

-- AddForeignKey
ALTER TABLE "health_worker_sessions" ADD CONSTRAINT "health_worker_sessions_health_worker_id_fkey" FOREIGN KEY ("health_worker_id") REFERENCES "health_workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
