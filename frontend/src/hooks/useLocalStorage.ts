import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * State đồng bộ với localStorage theo `key`.
 * Giá trị đã lưu được parse bằng JSON.parse và tin là đúng kiểu `T` (guard try/catch
 * như code gốc: parse lỗi thì dùng `initialValue`).
 */
export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}
