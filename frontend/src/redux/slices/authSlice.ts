import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import { authService } from '../../services/authService'
import type {
  AuthResponse,
  AuthState,
  Credentials,
  RegisterPayload,
  User,
} from '../../types'

const storedUser: User | null = (() => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
})()

/**
 * Giữ đúng hành vi gốc: chỉ lấy `message` trong body lỗi của backend,
 * mọi trường hợp khác dùng fallback tiếng Việt.
 */
const getBackendMessage = (error: unknown, fallback: string): string => {
  const message = isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message
    : undefined
  return message || fallback
}

const initialState: AuthState = {
  user: storedUser,
  token: localStorage.getItem('token'),
  status: 'idle',
  error: null,
}

export const loginUser = createAsyncThunk<AuthResponse, Credentials, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authService.login(credentials)
      return data
    } catch (err) {
      return rejectWithValue(getBackendMessage(err, 'Đăng nhập thất bại'))
    }
  }
)

export const logout = createAsyncThunk<void, void>(
  'auth/logout',
  async () => {
    try { await authService.logout() } catch {
      // Luôn xóa phiên ở trình duyệt; server-side token đã hết hạn/không hợp lệ cũng không cần giữ local.
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
    sessionStorage.removeItem('cuahangmaytinh_orders')
  }
)

export const registerUser = createAsyncThunk<AuthResponse, RegisterPayload, { rejectValue: string }>(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await authService.register(payload)
      return data
    } catch (err) {
      return rejectWithValue(getBackendMessage(err, 'Đăng ký thất bại'))
    }
  }
)

/** Payload của `setCredentials` — user đã đăng nhập kèm access token. */
type SetCredentialsPayload = { user: User; token: string }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => { state.user = action.payload; },
    clearLocalSession: (state) => {
      sessionStorage.removeItem('cuahangmaytinh_orders')
      state.user  = null
      state.token = null
      state.error = null
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    },
    setCredentials: (state, action: PayloadAction<SetCredentialsPayload>) => {
      state.user = action.payload.user
      state.token = action.payload.token
      localStorage.setItem('token', action.payload.token)
      localStorage.setItem('user', JSON.stringify(action.payload.user))
    },
  },
  extraReducers: (builder) => {
    const handleAuthFulfilled = (state: AuthState, action: PayloadAction<AuthResponse>) => {
      sessionStorage.removeItem('cuahangmaytinh_orders') // đơn của khách vãng lai không được chuyển sang tài khoản khác
      state.status = 'succeeded'
      state.token = action.payload.token
      // Backend chỉ trả `_id` trong response login/register — giữ nguyên như code gốc.
      state.user = {
        _id: action.payload._id,
        fullName: action.payload.fullName,
        email: action.payload.email,
        role: action.payload.role,
        avatar: action.payload.avatar,
      } as User
      state.error = null
      localStorage.setItem('token', action.payload.token)
      localStorage.setItem('user', JSON.stringify(state.user))
      // ✅ Lưu refresh token
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken)
      }
    }

    builder
      .addCase(logout.pending, (state) => {
        sessionStorage.removeItem('cuahangmaytinh_orders')
        // Xóa trạng thái UI ngay; authService vẫn giữ token trong localStorage cho request thu hồi server-side.
        state.user = null
        state.token = null
        state.status = 'idle'
        state.error = null
      })
      .addCase(logout.fulfilled, (state) => {
        sessionStorage.removeItem('cuahangmaytinh_orders')
        state.user = null
        state.token = null
        state.status = 'idle'
        state.error = null
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginUser.fulfilled, handleAuthFulfilled)
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? null
      })
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(registerUser.fulfilled, handleAuthFulfilled)
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? null
      })
  },
})

export const { clearLocalSession, setCredentials, setUser } = authSlice.actions
export default authSlice.reducer
