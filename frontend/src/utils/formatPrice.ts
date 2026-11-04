/**
 * Định dạng tiền theo chuẩn Việt Nam, ví dụ `1234567` → `1.234.567 ₫`.
 *
 * Giữ đúng hành vi gốc của `Intl.NumberFormat(...).format(price)`: chỉ truyền `price`
 * vào `format`, không thêm guard. Vì vậy:
 * - `NaN` / `undefined` (lọt qua từ JavaScript) → chuỗi `NaN ₫`
 * - `null` (lọt qua từ JavaScript)            → `0 ₫` (ToNumber(null) = 0)
 * - số thập phân được làm tròn tới 0 chữ số (`minimumFractionDigits: 0`)
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(price)
}

/** Định dạng số thuần theo nhóm hàng nghìn kiểu Việt Nam, ví dụ `1234567` → `1.234.567`. */
export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('vi-VN').format(number)
}
