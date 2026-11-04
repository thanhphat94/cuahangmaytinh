-- Đổi tên cửa hàng từ "Tin Học Phương Bình" thành "Cửa Hàng Máy Tính"
ALTER TABLE "SiteSettings" ALTER COLUMN "storeName" SET DEFAULT 'Cửa Hàng Máy Tính';
ALTER TABLE "SiteSettings" ALTER COLUMN "email" SET DEFAULT 'info@cuahangmaytinh.vn';
ALTER TABLE "SiteSettings" ALTER COLUMN "description" SET DEFAULT 'Cửa hàng máy tính chuyên cung cấp thiết bị tin học chính hãng';

-- Cập nhật dữ liệu đã lưu sẵn trong DB
UPDATE "SiteSettings" SET "storeName" = 'Cửa Hàng Máy Tính' WHERE "storeName" ILIKE '%Phương Bình%';
UPDATE "SiteSettings" SET "email" = 'info@cuahangmaytinh.vn' WHERE "email" LIKE '%tinhocphuongbinh%';
UPDATE "SiteSettings" SET "description" = 'Cửa hàng máy tính chuyên cung cấp thiết bị tin học chính hãng' WHERE "description" ILIKE '%Phương Bình%' OR "description" LIKE 'Công ty TNHH TM&DV Tin Học ...';
UPDATE "User" SET "email" = 'admin@cuahangmaytinh.vn', "fullName" = 'Quản trị viên' WHERE "email" = 'admin@tinhocphuongbinh.vn';
