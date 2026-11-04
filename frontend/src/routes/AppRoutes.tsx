import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout  from '../layout/MainLayout'
import AdminLayout from '../admin/layout/AdminLayout'
import ProtectedRoute from '../components/ProtectedRoute'
import ScrollToTop from '../components/ScrollToTop'

// ✅ FIX: Lazy load tất cả pages — chỉ tải khi user navigate đến
// Customer pages
const HomePage      = lazy(() => import('../pages/HomePage'))
const ProductPage   = lazy(() => import('../pages/ProductPage'))
const CategoryPage  = lazy(() => import('../pages/CategoryPage'))
const SearchPage    = lazy(() => import('../pages/SearchPage'))
const CartPage      = lazy(() => import('../pages/CartPage'))
const CheckoutPage  = lazy(() => import('../pages/CheckoutPage'))
const ContactPage   = lazy(() => import('../pages/ContactPage'))
const PromotionPage = lazy(() => import('../pages/PromotionPage'))
const NewsPage      = lazy(() => import('../pages/NewsPage'))
const AboutPage     = lazy(() => import('../pages/AboutPage'))
const PriceListPage = lazy(() => import('../pages/PriceListPage'))
const ConsultPage   = lazy(() => import('../pages/ConsultPage'))
const LoginPage          = lazy(() => import('../pages/LoginPage'))
const RegisterPage       = lazy(() => import('../pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('../pages/ResetPasswordPage'))
const PaymentResultPage  = lazy(() => import('../pages/PaymentResultPage'))
const MockPaymentPage    = lazy(() => import('../pages/MockPaymentPage'))
const AccountPage   = lazy(() => import('../pages/AccountPage'))
const OrdersPage    = lazy(() => import('../pages/OrdersPage'))
const WishlistPage  = lazy(() => import('../pages/WishlistPage'))
const NotFoundPage  = lazy(() => import('../pages/NotFoundPage'))

// Admin pages
const AdminLogin      = lazy(() => import('../admin/pages/AdminLogin'))
const AdminDashboard  = lazy(() => import('../admin/pages/AdminDashboard'))
const AdminProducts   = lazy(() => import('../admin/pages/AdminProducts'))
const AdminOrders     = lazy(() => import('../admin/pages/AdminOrders'))
const AdminUsers      = lazy(() => import('../admin/pages/AdminUsers'))
const AdminCategories = lazy(() => import('../admin/pages/AdminCategories'))
const AdminNews       = lazy(() => import('../admin/pages/AdminNews'))
const AdminSettings   = lazy(() => import('../admin/pages/AdminSettings'))
const AdminReviews    = lazy(() => import('../admin/pages/AdminReviews'))
const AdminContacts   = lazy(() => import('../admin/pages/AdminContacts'))
const AdminVouchers   = lazy(() => import('../admin/pages/AdminVouchers'))
const AdminPriceLists = lazy(() => import('../admin/pages/AdminPriceLists'))

// Loading skeleton
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Đang tải...</p>
      </div>
    </div>
  )
}

/** Bảng redirect slug danh mục cũ → slug hiện hành. */
interface CategoryRedirect {
  from: string
  to: string
}

const categoryRedirects: CategoryRedirect[] = [
  { from: 'camera',     to: 'camera-quan-sat' },
  { from: 'may-tinh',  to: 'may-tinh-pc' },
  { from: 'may-in',    to: 'may-in' },
  { from: 'linh-kien', to: 'may-tinh-pc' },
  { from: 'mang',      to: 'may-tinh-pc' },
]

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Customer Routes */}
        <Route element={<MainLayout />}>
          <Route path="/"                element={<HomePage />} />
          <Route path="/product/:slug"   element={<ProductPage />} />
          <Route path="/category/:slug"  element={<CategoryPage />} />
          <Route path="/products"        element={<Navigate to="/search" replace />} />
          <Route path="/search"          element={<SearchPage />} />
          <Route path="/cart"            element={<CartPage />} />
          <Route path="/checkout"        element={<CheckoutPage />} />
          <Route path="/contact"         element={<ContactPage />} />
          <Route path="/khuyen-mai"      element={<PromotionPage />} />
          <Route path="/tin-tuc"         element={<NewsPage />} />
          <Route path="/tin-tuc/:id"     element={<NewsPage />} />
          <Route path="/about"           element={<AboutPage />} />
          <Route path="/bang-gia"        element={<PriceListPage />} />
          <Route path="/tu-van-laptop"   element={<ConsultPage />} />
          <Route path="/login"            element={<LoginPage />} />
          <Route path="/register"         element={<RegisterPage />} />
          <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />
          <Route path="/payment/result"   element={<PaymentResultPage />} />
          <Route path="/account"         element={<AccountPage />} />
          <Route path="/orders"          element={<OrdersPage />} />
          <Route path="/wishlist"        element={<WishlistPage />} />
          {categoryRedirects.map(({ from, to }) => (
            <Route key={from} path={`/${from}`} element={<Navigate to={`/category/${to}`} replace />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Cổng thanh toán GIẢ LẬP (MoMo/VNPay) — trang độc lập, không dùng header/footer của cửa hàng */}
        <Route path="/payment/mock/:method" element={<MockPaymentPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute requireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin"              element={<AdminDashboard />} />
            <Route path="/admin/dashboard"    element={<AdminDashboard />} />
            <Route path="/admin/products"     element={<AdminProducts />} />
            <Route path="/admin/orders"       element={<AdminOrders />} />
            <Route path="/admin/users"        element={<AdminUsers />} />
            <Route path="/admin/categories"   element={<AdminCategories />} />
            <Route path="/admin/news"         element={<AdminNews />} />
            <Route path="/admin/reviews"      element={<AdminReviews />} />
            <Route path="/admin/contacts"     element={<AdminContacts />} />
            <Route path="/admin/vouchers"     element={<AdminVouchers />} />
            <Route path="/admin/price-lists"  element={<AdminPriceLists />} />
            <Route path="/admin/settings"     element={<AdminSettings />} />
          </Route>
        </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default AppRoutes
