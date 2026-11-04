import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Login/register/recovery are public endpoints. A 401 here means invalid credentials
// or invalid reset data, not an expired authenticated session.
const isPublicAuthEndpoint = (url?: string): boolean => {
  const path = (url || '').split(/[?#]/, 1)[0].replace(/\/+$/, '')
  return /\/users\/(login|register|refresh-token|forgot-password|reset-password|verify-reset-token)$/i.test(path)
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

/** Yêu cầu đã đánh dấu `_retry` để tránh lặp vô hạn khi refresh token thất bại. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface QueueItem {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

let isRefreshing = false
let failedQueue: QueueItem[] = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token as string)))
  failedQueue = []
}

// ── Request interceptor: đính kèm access token ──────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isPublicAuthEndpoint(config.url)) {
      // Do not attach a stale bearer token to a public login/register request.
      config.headers.delete('Authorization')
      return config
    }
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error: unknown) => Promise.reject(error)
)

// ── Response interceptor: tự refresh khi 401 ────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    if (!original) return Promise.reject(error)

    if (error.response?.status === 401 && isPublicAuthEndpoint(original.url)) {
      // Let LoginPage/RegisterPage display the real validation message; never reload /login.
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refreshToken')

      // Không có refreshToken → logout luôn
      if (!refreshToken) return forceLogout()

      if (isRefreshing) {
        // Có request khác đang refresh → đợi vào queue
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const res = await axios.post<{ token: string; refreshToken: string }>(
          `${API_BASE_URL}/users/refresh-token`,
          { refreshToken }
        )
        const newToken = res.data.token
        localStorage.setItem('token', newToken)
        if (res.data.refreshToken) localStorage.setItem('refreshToken', res.data.refreshToken)
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        return forceLogout()
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

function forceLogout(): Promise<never> {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  const isAdmin = window.location.pathname.startsWith('/admin')
  const loginPath = isAdmin ? '/admin/login' : '/login'
  // Avoid a hard reload loop when already on a login page.
  if (window.location.pathname !== loginPath) window.location.href = loginPath
  return Promise.reject(new Error('Session expired'))
}

/** Rút thông điệp lỗi tiếng Việt từ backend để hiển thị lên UI. */
export const getErrorMessage = (error: unknown, fallback = 'Có lỗi xảy ra'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    return data?.message ?? error.message ?? fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export default api
