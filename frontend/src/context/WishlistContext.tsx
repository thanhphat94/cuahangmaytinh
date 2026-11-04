import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import api from '../api/api'
import { useAppSelector } from '../redux/hooks'
import type { WishlistEntry } from '../types'

interface WishlistContextValue {
  wishlist: WishlistEntry[]
  wishlistCount: number
  isInWishlist(productId: string): boolean
  addToWishlist(product: WishlistEntry): Promise<void>
  removeFromWishlist(productId: string): Promise<void>
  toggleWishlist(product: WishlistEntry): void
  clearWishlist(): Promise<void>
}

const WishlistContext = createContext<WishlistContextValue | null>(null)
export const useWishlist = (): WishlistContextValue => {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider')
  return context
}

const LS_KEY = 'cuahangmaytinh_wishlist'
const loadLocalIds = (): string[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

type Props = { children: ReactNode }

export function WishlistProvider({ children }: Props) {
  const { token } = useAppSelector((state) => state.auth)
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([])

  const syncAccountWishlist = useCallback(async (): Promise<WishlistEntry[]> => {
    const productIds = loadLocalIds()
    if (productIds.length > 0) {
      const response = await api.post('/wishlist/sync', { productIds })
      const items = Array.isArray(response.data) ? response.data : response.data?.data
      if (!Array.isArray(items)) throw new Error('API wishlist sync trả dữ liệu không hợp lệ')
      localStorage.removeItem(LS_KEY)
      return items as WishlistEntry[]
    }
    const response = await api.get('/wishlist')
    return Array.isArray(response.data) ? response.data : []
  }, [])

  useEffect(() => {
    if (!token) {
      setWishlist(loadLocalIds().map((id) => ({ _id: id, id })))
      return
    }
    let cancelled = false
    syncAccountWishlist()
      .then((items) => { if (!cancelled) setWishlist(items) })
      .catch((error) => {
        console.error('Không thể đồng bộ danh sách yêu thích:', error)
        if (!cancelled) setWishlist(loadLocalIds().map((id) => ({ _id: id, id })))
      })
    return () => { cancelled = true }
  }, [token, syncAccountWishlist])

  useEffect(() => {
    if (!token) localStorage.setItem(LS_KEY, JSON.stringify(wishlist.map((item) => item._id || item.id)))
  }, [wishlist, token])

  const isInWishlist = useCallback(
    (productId: string) => wishlist.some((item) => (item._id || item.id) === productId),
    [wishlist],
  )

  const addToWishlist = useCallback(async (product: WishlistEntry): Promise<void> => {
    const productId = product._id || product.id
    if (isInWishlist(productId)) return
    if (token) {
      try {
        await syncAccountWishlist()
        await api.post('/wishlist', { productId })
        const response = await api.get('/wishlist')
        setWishlist(Array.isArray(response.data) ? response.data : [])
      } catch (error) {
        console.error('Không thể thêm sản phẩm yêu thích:', error)
      }
      return
    }
    setWishlist((previous) => [...previous, product])
  }, [token, isInWishlist, syncAccountWishlist])

  const removeFromWishlist = useCallback(async (productId: string): Promise<void> => {
    if (token) {
      try {
        await syncAccountWishlist()
        await api.delete(`/wishlist/${productId}`)
        const response = await api.get('/wishlist')
        setWishlist(Array.isArray(response.data) ? response.data : [])
      } catch (error) {
        console.error('Không thể xóa sản phẩm yêu thích:', error)
      }
      return
    }
    setWishlist((previous) => previous.filter((item) => (item._id || item.id) !== productId))
  }, [token, syncAccountWishlist])

  const toggleWishlist = useCallback((product: WishlistEntry): void => {
    const productId = product._id || product.id
    if (isInWishlist(productId)) void removeFromWishlist(productId)
    else void addToWishlist(product)
  }, [isInWishlist, addToWishlist, removeFromWishlist])

  const clearWishlist = useCallback(async (): Promise<void> => {
    if (token) {
      try {
        await syncAccountWishlist()
        await api.delete('/wishlist')
      } catch (error) {
        console.error('Không thể xóa danh sách yêu thích trên server:', error)
        throw error
      }
    }
    setWishlist([])
    localStorage.removeItem(LS_KEY)
  }, [token, syncAccountWishlist])

  const wishlistCount = useMemo(() => wishlist.length, [wishlist.length])
  return (
    <WishlistContext.Provider value={{
      wishlist, wishlistCount, isInWishlist, addToWishlist,
      removeFromWishlist, toggleWishlist, clearWishlist,
    }}>
      {children}
    </WishlistContext.Provider>
  )
}
