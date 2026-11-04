/**
 * Bộ kiểm tra dữ liệu cho form (email, SĐT, bắt buộc, độ dài).
 *
 * Lưu ý hành vi gốc: ba hàm `validateRequired/MinLength/MaxLength` viết theo dạng
 * `value && ...`, nên khi `value` rỗng chúng trả về **chính giá trị falsy đó**
 * (`''` / `null` / `undefined`) chứ không phải `false`. Vì chúng chỉ được dùng
 * làm điều kiện truthy nên giữ nguyên biểu thức, và kiểu trả về phản ánh đúng điều đó.
 */

/** Chuỗi có thể chưa được nhập. */
type MaybeString = string | null | undefined

/** `boolean` hoặc chính giá trị falsy đầu vào (xem ghi chú ở đầu file). */
export type ValidationResult = boolean | MaybeString

export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  const regex = /^(0[3|5|7|8|9])+([0-9]{8})$/
  return regex.test(phone)
}

export const validateRequired = (value: MaybeString): ValidationResult => {
  return value && value.trim().length > 0
}

export const validateMinLength = (value: MaybeString, min: number): ValidationResult => {
  return value && value.length >= min
}

export const validateMaxLength = (value: MaybeString, max: number): ValidationResult => {
  return value && value.length <= max
}
