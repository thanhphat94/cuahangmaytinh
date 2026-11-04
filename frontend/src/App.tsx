import AppRoutes from './routes/AppRoutes'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import { SiteSettingsProvider } from './context/SiteSettingsContext'
import { ToastProvider } from './components/Toast'

function App() {
  return (
    <ToastProvider>
      <SiteSettingsProvider>
        <CartProvider>
          <WishlistProvider>
            <AppRoutes />
          </WishlistProvider>
        </CartProvider>
      </SiteSettingsProvider>
    </ToastProvider>
  )
}

export default App
