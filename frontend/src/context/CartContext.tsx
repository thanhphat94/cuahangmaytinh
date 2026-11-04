import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import api from '../api/api'
import { useAppSelector } from '../redux/hooks'
import type { CartLine, Product } from '../types'

interface CartContextValue {
  cartItems: CartLine[]
  totalAmount: number
  totalItems: number
  loading: boolean
  addToCart(product: Product, quantity?: number): Promise<void>
  updateQuantity(productId: string, quantity: number): Promise<void>
  removeFromCart(productId: string): Promise<void>
  clearCart(): Promise<void>
  isCartOpen: boolean
  setIsCartOpen(open: boolean): void
}

const CartContext = createContext<CartContextValue | null>(null)
export const useCart = (): CartContextValue => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}

const LS_KEY = 'cuahangmaytinh_cart'

const loadLocal = (): CartLine[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed as CartLine[] : []
  } catch {
    return []
  }
}
const saveLocal = (items: CartLine[]) => localStorage.setItem(LS_KEY, JSON.stringify(items))
const unwrapCart = (data: any): CartLine[] => {
  const value = Array.isArray(data) ? data : data?.data ?? data?.cart ?? data?.items
  return Array.isArray(value) ? value as CartLine[] : []
}

type Props = { children: ReactNode }

export function CartProvider({ children }: Props) {
  const { token } = useAppSelector((state) => state.auth)
  const [cartItems, setCartItems] = useState<CartLine[]>(() =>
    localStorage.getItem('token') ? [] : loadLocal()
  )
  const [loading, setLoading] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Merge guest cart into account cart before removing local data.
  const syncAccountCart = useCallback(async (): Promise<CartLine[]> => {
    const localItems = loadLocal()
    if (localItems.length > 0) {
      const response = await api.post('/cart/sync', { items: localItems })
      const items = unwrapCart(response.data)
      localStorage.removeItem(LS_KEY)
      return items
    }
    const response = await api.get('/cart')
    return unwrapCart(response.data)
  }, [])

  useEffect(() => {
    if (!token) {
      setCartItems(loadLocal())
      return
    }

    let cancelled = false
    setLoading(true)
    syncAccountCart()
      .then((items) => { if (!cancelled) setCartItems(items) })
      .catch((error) => {
        console.error('Không thể đồng bộ giỏ hàng tài khoản:', error)
        // Keep localStorage intact so that a temporary API failure never deletes the guest cart.
        if (!cancelled) setCartItems(loadLocal())
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, syncAccountCart])

  useEffect(() => {
    if (!token) saveLocal(cartItems)
  }, [cartItems, token])

  const totalAmount = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems])
  const totalItems = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems])

  const addToCart = useCallback(async (product: Product, quantity = 1): Promise<void> => {
    const productId = product._id || product.id
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return
    if (token) {
      try {
        await syncAccountCart()
        const response = await api.post('/cart', { productId, quantity })
        setCartItems(unwrapCart(response.data))
      } catch (error) {
        console.error('Không thể thêm sản phẩm vào giỏ hàng:', error)
      }
      return
    }

    if (product.stock <= 0) return
    setCartItems((previous) => {
      const index = previous.findIndex((item) => (item._id || item.id) === productId)
      const currentQuantity = index >= 0 ? previous[index].quantity : 0
      const nextQuantity = Math.min(product.stock || 99, 99, currentQuantity + quantity)
      if (index >= 0) {
        const updated = [...previous]
        updated[index] = { ...updated[index], quantity: nextQuantity }
        return updated
      }
      return [...previous, { ...product, _id: productId, id: productId, quantity: nextQuantity }]
    })
  }, [token, syncAccountCart])

  const updateQuantity = useCallback(async (productId: string, quantity: number): Promise<void> => {
    if (!Number.isInteger(quantity) || quantity < 1) return
    if (token) {
      try {
        await syncAccountCart()
        const response = await api.put(`/cart/${productId}`, { quantity })
        setCartItems(unwrapCart(response.data))
      } catch (error) {
        console.error('Không thể cập nhật số lượng giỏ hàng:', error)
      }
      return
    }
    setCartItems((previous) => previous.map((item) =>
      (item._id || item.id) === productId ? { ...item, quantity: Math.min(quantity, item.stock || 99, 99) } : item
    ))
  }, [token, syncAccountCart])

  const removeFromCart = useCallback(async (productId: string): Promise<void> => {
    if (token) {
      try {
        await syncAccountCart()
        const response = await api.delete(`/cart/${productId}`)
        setCartItems(unwrapCart(response.data))
      } catch (error) {
        console.error('Không thể xóa sản phẩm khỏi giỏ:', error)
      }
      return
    }
    setCartItems((previous) => previous.filter((item) => (item._id || item.id) !== productId))
  }, [token, syncAccountCart])

  const clearCart = useCallback(async (): Promise<void> => {
    if (token) {
      try {
        await syncAccountCart()
        await api.delete('/cart/clear')
      } catch (error) {
        console.error('Không thể xóa giỏ hàng trên server:', error)
      }
    }
    setCartItems([])
    localStorage.removeItem(LS_KEY)
  }, [token, syncAccountCart])

  return (
    <CartContext.Provider value={{
      cartItems, totalAmount, totalItems, loading,
      addToCart, updateQuantity, removeFromCart, clearCart,
      isCartOpen, setIsCartOpen,
    }}>
      {children}
    </CartContext.Provider>
  )
}
