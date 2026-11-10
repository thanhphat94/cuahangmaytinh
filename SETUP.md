# Cài đặt project Cửa Hàng Máy Tính trên máy mới

## 1. Cài sẵn
- **Node.js** 20.19+ hoặc 22.12+ (https://nodejs.org)
- **PostgreSQL** (nhớ mật khẩu user `postgres`)
- **Git**

## 2. Lấy code
```bash
git clone https://github.com/thanhphat94/cuahangmaytinh.git
cd cuahangmaytinh
```

## 3. Tạo database
Mở pgAdmin hoặc SQL Shell (psql), chạy:
```sql
CREATE DATABASE cuahangmaytinh;
```

## 4. Chạy Backend
```bash
cd backend
npm install
copy .env.example .env
```
(macOS/Linux: `cp .env.example .env`)

Mở `backend/.env`, sửa 3 chỗ:
```env
DATABASE_URL="postgresql://postgres:MAT_KHAU_CUA_BAN@localhost:5432/tinhocnhuy"
JWT_SECRET=chuoi_ngau_nhien_dai_it_nhat_32_ky_tu
JWT_REFRESH_SECRET=mot_chuoi_khac_cung_dai_32_ky_tu
```

Tạo bảng và chạy:
```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```
Mở http://localhost:5000 thấy `CuaHangMayTinh API is running` là được.

## 5. Chạy Frontend
Mở terminal mới:
```bash
cd frontend
npm install
npm run dev
```
Mở http://localhost:3000

## 6. Nạp dữ liệu mẫu + tài khoản admin
Database mới chưa có sản phẩm và admin. Thêm vào `backend/.env`:
```env
ENABLE_DEV_SEED=true
DEV_SEED_SECRET=chuoi_ngau_nhien_it_nhat_32_ky_tu
SEED_ADMIN_PASSWORD=matkhauadmin12kytu
```
Khởi động lại backend, rồi chạy:
```bash
curl.exe -X POST http://localhost:5000/api/seed -H "x-seed-secret: chuoi_ngau_nhien_it_nhat_32_ky_tu"
```
Đăng nhập admin: `admin@cuahangmaytinh.vn` / mật khẩu `SEED_ADMIN_PASSWORD`.

⚠️ Seed xóa sạch dữ liệu cũ. Chạy xong nhớ xóa 3 dòng trên khỏi `.env`.

## 7. Import thêm sản phẩm (không xóa dữ liệu cũ)
Các script nằm trong `backend/src/scripts/`, đọc file JSON trong `scripts/data/` và tự tạo danh mục nếu chưa có. Chạy lại nhiều lần không bị trùng sản phẩm. Chạy từ thư mục `backend/` (backend không cần đang chạy, nhưng database phải có bảng):
```bash
npm run import:laptops
npm run import:printers
npx tsx src/scripts/importThunderbitProducts.ts
```
- `import:laptops`: laptop từ `Thunderbit_laptop.json`
- `import:printers`: máy in từ `Thunderbit_mayin.json`
- `importThunderbitProducts.ts`: máy tính PC, camera, máy in từ `Thunderbit_pc.json`, `Thunderbit_camera.json`, `Thunderbit_mayin.json`

Muốn có admin thì vẫn phải seed (mục 6), vì import không tạo tài khoản. Nếu seed thì làm **trước**, rồi mới import (seed xóa sạch dữ liệu).

## 8. Logo mới (dùng offline)
Logo đã nằm sẵn trong project, clone về là có, không cần làm gì thêm:
| File | Dùng cho |
|---|---|
| `frontend/public/images/logodoan2.png` | Ảnh logo gốc |
| `frontend/public/images/logodoan2-icon.png` | Logo ở Header và Footer |
| `frontend/public/favicon.ico`, `favicon.png`, `favicon-32.png`, `apple-touch-icon.png` | Icon trên tab trình duyệt |

Nếu tab vẫn hiện icon cũ thì nhấn `Ctrl+Shift+R`.

## 9. Lỗi hay gặp
| Lỗi | Cách sửa |
|---|---|
| Không kết nối được database | Bật PostgreSQL, kiểm tra lại mật khẩu trong `DATABASE_URL` |
| `@prisma/client did not initialize` | Chạy `npx prisma generate` |
| Báo thiếu bảng | Chạy `npx prisma migrate deploy` |
| Web không có sản phẩm | Chưa seed (mục 6) hoặc backend chưa chạy |
| Cổng 5000/3000 đang bị dùng | Tắt chương trình đang dùng cổng đó |

## Ghi chú
- File `.env` và thư mục `backend/uploads/` không nằm trên GitHub. Muốn giữ dữ liệu máy cũ thì chép 2 thứ này sang.
- Chatbot AI cần cài Ollama (https://ollama.com) và chạy `ollama pull gemma3:1b`. Không cài thì web vẫn chạy bình thường.
