-- Admin trả lời liên hệ ngay trên website; người dùng xem lại trong tài khoản.
ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "reply" TEXT,
  ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Contact_userId_idx" ON "Contact"("userId");
