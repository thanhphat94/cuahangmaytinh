-- Revoke active sessions after password/security changes and rotate refresh tokens safely.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "refreshTokenHash" TEXT;
