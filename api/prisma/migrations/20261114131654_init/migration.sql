-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'pcm', 'ha', 'yo', 'ig');

-- CreateEnum
CREATE TYPE "CareTrack" AS ENUM ('PREGNANCY', 'BABY');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GIVEN');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('USSD', 'SMS', 'DASHBOARD');

-- CreateEnum
CREATE TYPE "Registrant" AS ENUM ('SELF', 'HEALTH_WORKER');

-- CreateEnum
CREATE TYPE "PatientGroup" AS ENUM ('PREGNANT', 'AFTER_BIRTH', 'BABY');

-- CreateEnum
CREATE TYPE "TriageLevel" AS ENUM ('ROUTINE', 'SOON', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "TriageSource" AS ENUM ('MENU', 'RULES', 'AI');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'CONTACTED');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'DONE');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('CONSENT', 'WELCOME', 'REMINDER', 'MISSED', 'TIP', 'ANSWER', 'URGENT', 'CLINIC', 'HEALTH_WORKER');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'SIMULATED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('MOTHER', 'HEALTH_WORKER', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lga" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "hfr_code" TEXT,
    "services" TEXT NOT NULL,
    "emergency_obstetric" BOOLEAN NOT NULL DEFAULT false,
    "places" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_workers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "places" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pin_hash" TEXT,
    "pin_salt" TEXT,
    "pin_set_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pin_failures" (
    "id" TEXT NOT NULL,
    "health_worker_id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pin_failures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mothers" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "track" "CareTrack" NOT NULL,
    "expected_due_date" TIMESTAMP(3),
    "baby_birth_date" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "name" TEXT,
    "anc_card_number" TEXT,
    "facility_id" TEXT,
    "health_worker_id" TEXT,
    "registered_by" "Registrant" NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "track_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consent_status" "ConsentStatus" NOT NULL,
    "consent_requested_at" TIMESTAMP(3),
    "consent_given_at" TIMESTAMP(3),
    "consent_channel" "Channel",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mothers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_records" (
    "id" TEXT NOT NULL,
    "mother_id" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" "Channel" NOT NULL,

    CONSTRAINT "care_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sent_reminders" (
    "id" TEXT NOT NULL,
    "mother_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "mother_id" TEXT,
    "phone" TEXT NOT NULL,
    "group" "PatientGroup" NOT NULL,
    "sign" TEXT NOT NULL,
    "sign_label" TEXT NOT NULL,
    "source" "TriageSource" NOT NULL,
    "location" TEXT,
    "detail" TEXT,
    "facility_id" TEXT,
    "health_worker_id" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "contacted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "mother_id" TEXT,
    "phone" TEXT NOT NULL,
    "item_key" TEXT,
    "reason" TEXT NOT NULL,
    "health_worker_id" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "done_at" TIMESTAMP(3),

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "mother_id" TEXT,
    "phone" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "is_problem" BOOLEAN NOT NULL DEFAULT false,
    "text" TEXT NOT NULL,
    "level" "TriageLevel" NOT NULL,
    "rule_signs" TEXT[],
    "used_ai" BOOLEAN NOT NULL DEFAULT false,
    "answer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_messages" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_messages" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "interpreted_as" TEXT,
    "provider_id" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ussd_sessions" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "asked_language" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ussd_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "subject_type" TEXT,
    "subject_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facilities_hfr_code_key" ON "facilities"("hfr_code");

-- CreateIndex
CREATE UNIQUE INDEX "health_workers_phone_key" ON "health_workers"("phone");

-- CreateIndex
CREATE INDEX "pin_failures_health_worker_id_at_idx" ON "pin_failures"("health_worker_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "mothers_phone_key" ON "mothers"("phone");

-- CreateIndex
CREATE INDEX "mothers_health_worker_id_idx" ON "mothers"("health_worker_id");

-- CreateIndex
CREATE INDEX "mothers_consent_status_idx" ON "mothers"("consent_status");

-- CreateIndex
CREATE UNIQUE INDEX "care_records_mother_id_item_key_key" ON "care_records"("mother_id", "item_key");

-- CreateIndex
CREATE UNIQUE INDEX "sent_reminders_mother_id_key_key" ON "sent_reminders"("mother_id", "key");

-- CreateIndex
CREATE INDEX "alerts_status_health_worker_id_idx" ON "alerts"("status", "health_worker_id");

-- CreateIndex
CREATE INDEX "follow_ups_status_health_worker_id_idx" ON "follow_ups"("status", "health_worker_id");

-- CreateIndex
CREATE INDEX "questions_created_at_idx" ON "questions"("created_at");

-- CreateIndex
CREATE INDEX "outbound_messages_to_created_at_idx" ON "outbound_messages"("to", "created_at");

-- CreateIndex
CREATE INDEX "outbound_messages_status_idx" ON "outbound_messages"("status");

-- CreateIndex
CREATE INDEX "inbound_messages_from_received_at_idx" ON "inbound_messages"("from", "received_at");

-- CreateIndex
CREATE INDEX "ussd_sessions_updated_at_idx" ON "ussd_sessions"("updated_at");

-- CreateIndex
CREATE INDEX "audit_events_subject_type_subject_id_idx" ON "audit_events"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "pin_failures" ADD CONSTRAINT "pin_failures_health_worker_id_fkey" FOREIGN KEY ("health_worker_id") REFERENCES "health_workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mothers" ADD CONSTRAINT "mothers_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mothers" ADD CONSTRAINT "mothers_health_worker_id_fkey" FOREIGN KEY ("health_worker_id") REFERENCES "health_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_records" ADD CONSTRAINT "care_records_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sent_reminders" ADD CONSTRAINT "sent_reminders_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "mothers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_health_worker_id_fkey" FOREIGN KEY ("health_worker_id") REFERENCES "health_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_health_worker_id_fkey" FOREIGN KEY ("health_worker_id") REFERENCES "health_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_mother_id_fkey" FOREIGN KEY ("mother_id") REFERENCES "mothers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
