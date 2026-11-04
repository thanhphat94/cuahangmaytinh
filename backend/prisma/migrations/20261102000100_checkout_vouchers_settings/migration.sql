-- Centralize shipping/payment policy and persist voucher management.
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "defaultShippingFee" DOUBLE PRECISION NOT NULL DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS "enableCod" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "enableBankTransfer" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bankName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "bankAccount" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "enableMomo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "enableVnpay" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "guestAccessToken" TEXT,
  ADD COLUMN IF NOT EXISTS "voucherId" TEXT,
  ADD COLUMN IF NOT EXISTS "voucherCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_guestAccessToken_key" ON "Order"("guestAccessToken");

CREATE TABLE IF NOT EXISTS "Voucher" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "label" TEXT NOT NULL,
  "minOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Voucher_code_key" ON "Voucher"("code");

DO $$ BEGIN
  ALTER TABLE "Order" ADD CONSTRAINT "Order_voucherId_fkey"
    FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed voucher records that previously existed only in application memory.
INSERT INTO "Voucher" ("id", "code", "type", "value", "label", "minOrder", "active", "usedCount", "createdAt", "updatedAt")
VALUES
  ('voucher-tinhoc10', 'TINHOC10', 'percent', 10, 'Giảm 10%', 0, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('voucher-giam50k', 'GIAM50K', 'flat', 50000, 'Giảm 50.000đ', 200000, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('voucher-freeship', 'FREESHIP', 'freeship', 0, 'Miễn phí vận chuyển', 0, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('voucher-sale20', 'SALE20', 'percent', 20, 'Giảm 20% (đơn từ 1 triệu)', 1000000, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
