import api from '../api/api'
import type { AuthResponse, Credentials, RegisterPayload, User } from '../types'

/** Body cho `PUT /users/profile` — khớp `UpdateProfileInput` phía backend. */
export type ProfileUpdate = Partial<Pick<User, 'fullName' | 'phone' | 'avatar'>>

export const authService = {
  login: (credentials: Credentials) => api.post<AuthResponse>('/users/login', credentials),
  register: (data: RegisterPayload) => api.post<AuthResponse>('/users/register', data),
  getProfile: () => api.get<User>('/users/profile'),
  updateProfile: (data: ProfileUpdate) => api.put<User>('/users/profile', data),
  logout: async () => {
    try {
      // Thu hồi refresh session phía server; dù mạng lỗi vẫn xóa thông tin cục bộ.
      await api.post('/users/logout')
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  },
}
