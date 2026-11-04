import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Đưa cửa sổ trình duyệt về đầu trang mỗi khi người dùng điều hướng sang URL mới.
 * Theo dõi cả pathname và search để xử lý cả các trang dùng query string.
 */
function ScrollToTop() {
  const { pathname, search } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search])

  return null
}

export default ScrollToTop
